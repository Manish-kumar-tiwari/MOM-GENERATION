require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit");
const axios = require("axios"); // For making HTTP requests

// Replace with your actual API key for Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

let key = [];

// Function to fetch chatInfo from MS Graph API
let meetingTopic = "";
async function fetchChatInfo(meetingTopic) {
  const chatsUrl = "https://graph.microsoft.com/v1.0/chats";
  const authToken = process.env.chat_authToken; // Graph token from .env

  try {
    // 1. Fetch the list of chats
    const chatsResponse = await axios.get(chatsUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const chats = chatsResponse.data.value;

    // 2. Find the chat where the topic matches the meeting topic (trim to avoid whitespace issues)
    const matchingChat = chats.find(
      (chat) => chat.topic && chat.topic.trim() === meetingTopic.trim()
    );
    if (!matchingChat) {
      throw new Error(`No chat found with topic: ${meetingTopic}`);
    }

    // 3. Extract the chat id and construct the new URL
    const chatId = matchingChat.id;
    const chatDetailUrl = `https://graph.microsoft.com/v1.0/chats/${chatId}`;

    // 4. Fetch detailed chat info using the new URL
    const chatDetailResponse = await axios.get(chatDetailUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return JSON.stringify(chatDetailResponse.data, null, 2);
  } catch (error) {
    console.error("Error fetching chat info from MS Graph API:", error);
    throw error;
  }
}

async function summarizeAndExtract(transcriptText, chatInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are given a transcript of a meeting and additional chat information. Please analyze the data and produce a JSON array with the following structure:

[
  {
    "summary": "A plain text summary of the meeting discussion.",
    "meeting title": "The title of the meeting.",
    "meeting id": "The meeting identifier.",
    "duration": "The duration of the meeting. If not explicitly provided, infer the duration from the meeting's timestamps.",
    "members": "A comma-separated list of meeting member names.",
    "decisions": "Any decisions made during the meeting. If not explicitly provided, infer the decisions from the summarized content.",
    "key extractions": "An array of objects in the following format. Note that the example values below are only for illustration and should not be used as final values. Instead, extract and fill in the actual details from the transcript and chat information. If any of the details are not available, use 'Not specified.' \\n\\nExample format:\\n[\\n  { taskName: 'MOM report Generation', taskDescription: 'Users are unable to login with Google OAuth', assigneeName: 'Mani' },\\n  { taskName: 'MOM report Generation', taskDescription: 'Users are unable to login with Google OAuth', assigneeName: 'Manish' },\\n  { taskName: 'MOM report Generation', taskDescription: 'Users are unable to login with Google OAuth', assigneeName: 'Rahul' }\\n]"
  }
]

Here is the data:
Transcript:
${transcriptText}

Chat Info:
${chatInfo}

Please output only valid JSON without markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(typeof text);
    return text;
  } catch (error) {
    console.error("Error processing transcript:", error);
    throw error;
  }
}

// New endpoint that combines summarization, PDF generation, and emailing the PDF.
const summarizeAndEmail = async (req, res) => {
  try {
    // Input from request
    const transcriptText = req.body.transcript;
    let chatInfo = req.body.chatInfo; // Optionally provided
    const recipientEmails = req.body.recipientEmails; // Expect an array of emails
    const graphToken = process.env.sendemail_graphToken;
    const meatingTopic = req.body.meatingTopic;

    if (!transcriptText) {
      return res.status(400).json({ error: "Transcript text is required." });
    }
    if (!graphToken) {
      return res.status(400).json({ error: "Graph access token is required." });
    }
    if (
      !recipientEmails ||
      !Array.isArray(recipientEmails) ||
      recipientEmails.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "An array of recipient emails is required." });
    }
    if (!chatInfo) {
      chatInfo = await fetchChatInfo(meatingTopic);
    }

    // Get the summary from Gemini AI
    let summaryJsonStr = await summarizeAndExtract(transcriptText, chatInfo);
    // console.log(summaryJsonStr);

    // Remove markdown formatting if present (e.g., ```json ... ```)
    summaryJsonStr = summaryJsonStr.trim();
    if (summaryJsonStr.startsWith("```")) {
      const lines = summaryJsonStr.split("\n");
      lines.shift(); // Remove first line (```json)
      lines.pop(); // Remove last line (```)
      summaryJsonStr = lines.join("\n");
    }

    let summaryData;
    try {
      summaryData = JSON.parse(summaryJsonStr);
    } catch (parseError) {
      return res
        .status(400)
        .json({ error: "Invalid JSON summary provided by Gemini." });
    }

    // Expect summaryData to be an array with one object.
    const meetingData =
      Array.isArray(summaryData) && summaryData.length > 0
        ? summaryData[0]
        : {};

    // Retrieve each field from the object.
    const meetingTitle = meetingData["meeting title"] || "Meeting_Report";
    const meetingID = meetingData["meeting id"] || "";
    const duration = meetingData["duration"] || "";
    const members = meetingData["members"] || "";
    const summaryText = meetingData["summary"] || "";
    const decisions = meetingData["decisions"] || "";
    const keyExtractions = meetingData["key extractions"] || "";
    key = keyExtractions;
    console.log(keyExtractions[0].taskName);

    // Generate the PDF in memory.
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Prepare the email message with attachment using Microsoft Graph's sendMail endpoint.
      const mailBody = {
        message: {
          subject: `MOM Report - ${meetingTitle}`,
          body: {
            contentType: "Text",
            content: `Please find attached the MOM Report PDF for the meeting "${meetingTitle}".`,
          },
          toRecipients: recipientEmails.map((email) => ({
            emailAddress: { address: email },
          })),
          attachments: [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: `${meetingTitle}.pdf`,
              contentType: "application/pdf",
              contentBytes: pdfBuffer.toString("base64"),
            },
          ],
        },
        saveToSentItems: "true",
      };

      try {
        await axios.post(
          "https://graph.microsoft.com/v1.0/me/sendMail",
          mailBody,
          {
            headers: {
              Authorization: `Bearer ${graphToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        res.json({ message: "Email sent successfully with PDF attachment." });
      } catch (sendError) {
        console.error(
          "Error sending email via Graph:",
          sendError.response ? sendError.response.data : sendError
        );
        res.status(500).json({ error: "Failed to send email." });
      }
    });

    // Populate PDF content.
    doc.fontSize(20).text(meetingTitle, { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(12).text(`Meeting ID: ${meetingID}`);
    doc.moveDown(0.75);
    doc.text(`Duration: ${duration}`);
    doc.moveDown(0.75);
    doc.text(`Members: ${members}`);
    doc.moveDown(1);

    // Summary of Meeting
    doc.fontSize(14).text("Summary of Meeting:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(summaryText);
    doc.moveDown(1);

    // Decisions Made
    if (decisions) {
      doc.fontSize(14).text("Decisions Made:", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(decisions);
      doc.moveDown(1);
    }

    // Key Extractions
    if (keyExtractions) {
      doc.fontSize(14).text("Key Extractions:", { underline: true });
      doc.moveDown(0.5);

      // Check if keyExtractions is an array, object, or string
      if (Array.isArray(keyExtractions)) {
        keyExtractions.forEach((extraction, index) => {
          doc.fontSize(12).text(`Extraction #${index + 1}:`, { bold: true });
          doc.moveDown(0.3);

          if (extraction && typeof extraction === "object") {
            // Print each key-value in the object
            Object.entries(extraction).forEach(([k, v]) => {
              doc.text(`${k}: ${v || "N/A"}`);
            });
          } else {
            // If it's a string or something else, just print it
            doc.text(String(extraction));
          }
          doc.moveDown(1);
        });
      } else if (typeof keyExtractions === "object") {
        // Single object
        Object.entries(keyExtractions).forEach(([k, v]) => {
          doc.fontSize(12).text(`${k}: ${v || "N/A"}`);
        });
        doc.moveDown(1);
      } else {
        // String or other primitive
        doc.fontSize(12).text(String(keyExtractions));
        doc.moveDown(1);
      }
    }

    // Finalize the PDF.
    doc.end();

    // Jira Integration

    await axios.post("http://localhost:3000/api/meetings/create-jira", [
      {
        taskName: "MOM report Generation",
        taskDescription: "Users are unable to login with Google OAuth",
        assigneeName: "MaNISH KUMAR",
      },
      {
        taskName: "MOM report Generation",
        taskDescription: "Users are unable to login with Google OAuth",
        assigneeName: "Manish",
      },
      {
        taskName: "MOM report Generation",
        taskDescription: "Users are unable to login with Google OAuth",
        assigneeName: "Rahul",
      },
    ]);
  } catch (error) {
    console.error("Error in /summarize-and-email endpoint:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { summarizeAndEmail };
