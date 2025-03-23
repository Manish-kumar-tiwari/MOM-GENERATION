const express = require("express");
const { getTransScript } = require("../controllers/teamsController");
const router = express.Router();

router.post("/getTransScript", getTransScript);

module.exports = router;
