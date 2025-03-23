const { getAccountId } = require("./getAccountId");

async function getMultipleAccountIds(tasks) {
  const accountIds = {};

  for (const task of tasks) {
    const accountId = await getAccountId(task.gmail);
    if (accountId) {
      accountIds[task.gmail] = accountId;
    }
  }

  console.log("All Account IDs:", accountIds);
  return accountIds;
}

module.exports = { getMultipleAccountIds };
