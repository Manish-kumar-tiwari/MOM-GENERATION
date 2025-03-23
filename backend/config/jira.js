const axios = require("axios");
require("dotenv").config();
const { getMultipleAccountIds } = require("../utils/getAccountIdHelper");

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

async function createJiraIssues(tasks) {
  // Get Account IDs for all emails
  const accountIds = await getMultipleAccountIds(tasks);

  // Check if account IDs were found
  if (Object.keys(accountIds).length === 0) {
    console.error("❌ No account IDs found for the given emails.");
    return;
  }

  const createdIssues = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const assigneeEmail = task.gmail; // Assign in a round-robin fashion
    let assigneeId = accountIds[assigneeEmail];

    if (!assigneeId) {
      // console.warn(
      //   `⚠️ No account ID found for ${assigneeEmail}. Skipping task.`
      // );
      // continue;

      assigneeId = "712020:7c793b29-3ecb-4f9b-a5f2-90036a339062";
    }

    const issueData = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: task.summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: task.description,
                },
              ],
            },
          ],
        },
        issuetype: { id: "10001" }, // Ensure this ID is correct
        assignee: {
          accountId: assigneeId,
        },
      },
    };

    try {
      const response = await axios.post(
        `${JIRA_BASE_URL}/rest/api/3/issue`,
        issueData,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `✅ Created JIRA Issue: ${response.data.key} (Assigned to ${assigneeEmail})`
      );
      createdIssues.push({ id: response.data.key, assignee: assigneeEmail });
    } catch (error) {
      console.error(
        `❌ Error creating JIRA issue for ${assigneeEmail}:`,
        error.response?.data || error.message
      );
    }
  }

  return createdIssues;
}

module.exports = { createJiraIssues };
