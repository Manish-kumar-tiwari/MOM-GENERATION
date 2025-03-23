getTransScript = async (req, res) => {
    try {
        const { teamId } = req.body;
        console.log(teamId);
        return res.status  (200).json({ message: "Transcript generated successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
module.exports = { getTransScript };
  