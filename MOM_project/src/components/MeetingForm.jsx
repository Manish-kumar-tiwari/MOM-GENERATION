import React, { useState } from "react";
import "./styles.css";
import axios from "axios";
import toast from "react-hot-toast";

const MeetingForm = () => {
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState(""); // New state for meeting title
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState([]);

  const isValidEmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTranscriptFile(file);
      setFilePath(e.target.value);
    }
  };

  const handleEmailChange = (e) => {
    setEmailInput(e.target.value);
  };

  const handleMeetingTitleChange = (e) => {
    setMeetingTitle(e.target.value);
  };

  const addEmail = () => {
    const trimmedEmail = emailInput.trim();

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email.");
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast.error("This email is already added.");
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setEmailInput("");
  };

  const removeEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleGenerateMOM = async () => {
    try {
      if (!transcriptFile) {
        toast.error("Please upload a transcript file.");
        return;
      }
      if (!meetingTitle.trim()) {
        toast.error("Please enter a meeting title.");
        return;
      }
      if (emails.length === 0) {
        toast.error("Please enter at least one email.");
        return;
      }

      const formData = new FormData();
      formData.append("transcriptFile", transcriptFile);
      formData.append("meetingTitle", meetingTitle);
      formData.append("emails", JSON.stringify(emails));

      console.log("Sending FormData:", {
        transcriptFile,
        meetingTitle,
        emails,
      });

      const response = await axios.post(
        "http://localhost:3000/api/teams/getTransScript",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("Response:", response.data);

      setTranscriptFile(null);
      setMeetingTitle("");
      setEmails([]);
      toast.success("Request sent successfully");
    } catch (error) {
      console.error("Error Response:", error.response);
      toast.error(
        `Error: ${error.response?.data?.message || "Internal Server Error"}`
      );
    }
  };

  return (
    <div className="container">
      <div className="center-box">
        <div className="header">MOM Generator</div>
        <div className="form-container">
          <input
            type="text"
            className="input-field"
            placeholder="Enter Meeting Title"
            value={meetingTitle}
            onChange={handleMeetingTitleChange}
          />

          <input
            type="file"
            className="input-field"
            accept=".doc,.docx"
            onChange={handleFileChange}
          />

          <div className="email-container">
            <input
              type="text"
              className="email-input"
              placeholder="Enter email and click Add"
              value={emailInput}
              onChange={handleEmailChange}
            />
            <button className="add-email-btn" onClick={addEmail}>
              Add Email
            </button>
          </div>

          <div className="email-list">
            {emails.map((email, index) => (
              <div key={index} className="email-tag">
                {email}
                <span className="remove-btn" onClick={() => removeEmail(index)}>
                  ×
                </span>
              </div>
            ))}
          </div>

          <button className="generate-btn" onClick={handleGenerateMOM}>
            Generate MOM
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingForm;
