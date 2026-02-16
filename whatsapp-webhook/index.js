const express = require("express");
const app = express();

app.use(express.json());

app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "my_verify_token";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified!");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  console.log("Incoming WhatsApp message:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
