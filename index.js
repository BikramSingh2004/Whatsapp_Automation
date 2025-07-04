const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const wppconnect = require("@wppconnect-team/wppconnect");

const app = express();
const PORT = process.env.PORT || 5000;

let client;

app.use(bodyParser.json());

process.env.CHROME_BIN = require("puppeteer").executablePath();
wppconnect
  .create({
    session: "familyBot",
    autoClose: 0, 
    catchQR: (base64Qrimg, asciiQR) => {
      console.log(asciiQR);
    },
    headless: true,
    devtools: false,
    useChrome: true,
    browserArgs: ["--no-sandbox"],
    executablePath: process.env.CHROME_BIN,
  })
  .then((newClient) => {
    client = newClient;
    console.log("WhatsApp is ready!");
  });

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
    res.status(500).json({ error: "Failed to send message", details: err });
  }
});

app.listen(PORT, () => {
  console.log(`Bot API listening on port ${PORT}`);
});
