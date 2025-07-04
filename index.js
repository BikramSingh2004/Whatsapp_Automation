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
