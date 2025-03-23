const sendEmail = require("../utils/emailService");
const { createJiraIssues } = require("../config/jira");

let tasks = []; // Simulated task database

exports.createJIRA = async (req, res) => {
  try {
    const task = req.body;

    const jiraResponse = await createJiraIssues(task);
    if (jiraResponse) {
      task.jiraId = jiraResponse.id; // Store JIRA Issue ID
      tasks.push(task); // Store locally
      return res
        .status(201)
        .json({ message: "Task created", jiraId: task.jiraId });
    }
    res.status(500).json({ error: "Failed to sync with JIRA" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
