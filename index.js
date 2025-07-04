const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const wppconnect = require("@wppconnect-team/wppconnect");
const QRCode = require("qrcode"); // ✅ Import QRCode
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

let client;

app.use(bodyParser.json());

// ✅ Serve static files (like qr.png) from root directory
app.use(express.static(path.join(__dirname)));

// Set Puppeteer Chrome binary path
process.env.CHROME_BIN = puppeteer.executablePath();

wppconnect
  .create({
    session: "familyBot",
    autoClose: 0,
    catchQR: async (base64Qrimg, asciiQR, attempts, urlCode) => {
      console.log("🟡 QR received. Saving as image...");

      // ✅ Save QR as png using qrcode package
      await QRCode.toFile("./qr.png", urlCode, {
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        width: 300,
      });

      console.log("✅ QR saved at: http://localhost:" + PORT + "/qr.png");
    },
    headless: true,
    devtools: false,
    useChrome: true,
    browserArgs: ["--no-sandbox"],
    executablePath: process.env.CHROME_BIN,
  })
  .then((newClient) => {
    client = newClient;
    console.log("✅ WhatsApp is ready!");
  });

  app.post("/send-message", async (req, res) => {
    console.log("📩 Incoming POST /send-message");

    const { groupName, message } = req.body;
    console.log("📦 Request Body:", { groupName, message });

    if (!client) {
      console.error("❌ Client is not initialized.");
      return res.status(500).json({ error: "WhatsApp client not ready" });
    }

    try {
      console.log("📥 Fetching all chats...");
      const chats = await client.listChats();

      console.log(`✅ Total chats fetched: ${chats.length}`);
      const groupChats = chats.filter((chat) => chat.isGroup);
      console.log(
        "👥 Group chats found:",
        groupChats.map((g) => g.name)
      );

      const group = groupChats.find((chat) => chat.name === groupName);

      if (!group) {
        console.warn(`⚠️ Group '${groupName}' not found in chat list.`);
        return res.status(404).json({ error: "Group not found" });
      }

      console.log(
        `📤 Sending message to group: ${group.name} (${group.id._serialized})`
      );
      await client.sendText(group.id._serialized, message);

      console.log("✅ Message sent successfully!");
      res.json({ success: true, sentTo: group.name, message });
    } catch (err) {
      console.error("❌ Error caught during message sending:", err);
      res.status(500).json({
        error: "Failed to send message",
        details: err.message || err,
      });
    }
  });
  

// ✅ Serve QR file route (optional if you want it manually)
app.get("/qr", (req, res) => {
  const filePath = path.join(__dirname, "qr.png");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("QR not ready yet. Try again soon.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot API listening on port ${PORT}`);
});
