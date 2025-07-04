const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const wppconnect = require("@wppconnect-team/wppconnect");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

let client;
const SESSION_FILE = path.join(__dirname, "tokens/familyBot.json");

app.use(bodyParser.json());

process.env.CHROME_BIN = puppeteer.executablePath();

async function initWhatsApp() {
  const sessionExists = fs.existsSync(SESSION_FILE);

  console.log(
    sessionExists
      ? "🔁 Session found. Skipping QR."
      : "🆕 No session. Will show QR."
  );

  wppconnect
    .create({
      session: "familyBot",
      autoClose: 0,
      catchQR: async (base64Qrimg, asciiQR) => {
        if (!sessionExists) {
          console.log("📸 QR Code:\n", asciiQR);
          console.log("⏳ Waiting for login...");
        }
      },
      headless: true,
      devtools: false,
      useChrome: true,
      browserArgs: ["--no-sandbox"],
      executablePath: process.env.CHROME_BIN,
    })
    .then((newClient) => {
      client = newClient;
      console.log("✅ WhatsApp client is ready");
    })
    .catch((err) => {
      console.error("❌ Error initializing client:", err);
    });
}

initWhatsApp();

// 👇 status check route
app.get("/status", async (req, res) => {
  if (!client) return res.json({ ready: false });

  const state = await client.getConnectionState();
  res.json({ ready: true, state });
});

// 👇 main POST route
app.post("/send-message", async (req, res) => {
  const { groupName, message } = req.body;

  if (!client) {
    return res.status(503).json({ error: "WhatsApp client not ready" });
  }

  try {
    const chats = await client.listChats();
    const group = chats.find((chat) => chat.name === groupName && chat.isGroup);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    await client.sendText(group.id._serialized, message);
    res.json({ success: true, sentTo: group.name, message });
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ error: "Failed to send message", details: err });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot API running on port ${PORT}`);
});
