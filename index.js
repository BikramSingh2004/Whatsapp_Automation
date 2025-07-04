const express = require("express");
const bodyParser = require("body-parser");
const wppconnect = require("@wppconnect-team/wppconnect");

const app = express();
const PORT = process.env.PORT || 3000;

let client; // global client for access in route

app.use(bodyParser.json());

wppconnect
  .create({
    session: "familyBot",
    catchQR: (base64Qrimg, asciiQR) => {
      console.log("Scan this QR with your phone:");
      console.log(asciiQR);
    },
    headless: true,
    devtools: false,
    useChrome: false,
    browserArgs: ["--no-sandbox"],
  })
  .then((newClient) => {
    client = newClient;
    console.log("WhatsApp is ready!");
  });

// API to send message
app.post("/send-message", async (req, res) => {
  const { groupName, message } = req.body;

  try {
    const chats = await client.listChats();
    const group = chats.find((chat) => chat.name === groupName && chat.isGroup);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    await client.sendText(group.id._serialized, message);
    res.json({ success: true, sentTo: group.name, message });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message", details: err });
  }
});

app.listen(PORT, () => {
  console.log(`Bot API listening on port ${PORT}`);
});
