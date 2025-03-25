const { users } = require("./getJiraUsers");

async function getMultipleAccountIds(tasks) {
  const accountIds = {};

  for (const task of tasks) {
    const accountId = users[task.name];
    if (accountId) {
      accountIds[task.name] = accountId;
    }
  }
  return accountIds;
}

module.exports = { getMultipleAccountIds };
