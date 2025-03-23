const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const meetingRoutes = require("./routes/meetingRoutes");
const teamsRoutes = require("./routes/teamsRoutes");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/teams", teamsRoutes);
app.use("/api/meetings", meetingRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));
