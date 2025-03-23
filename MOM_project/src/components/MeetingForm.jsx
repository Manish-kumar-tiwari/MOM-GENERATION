import React, { useState } from "react";
import "./styles.css";
import axios from "axios";
import toast from "react-hot-toast";

const MeetingForm = () => {
  const [meetingId, setMeetingId] = useState("");
  const handleGenerateMOM = async () => {
    try {
      if (!meetingId) {
        toast.error("Please enter a Meeting ID.");
        return;
      }

      const response = await axios.post(
        "http://localhost:3000/api/teams/getTransScript",
        {
          teamId: meetingId,
        }
      );
      setMeetingId("")
      toast.success("request sent successfully");
    } catch (error) {
      toast.error("Internal Server Error");
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
            placeholder="Enter Meeting ID"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
          />
          <button className="generate-btn" onClick={handleGenerateMOM}>
            Generate MOM
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingForm;
