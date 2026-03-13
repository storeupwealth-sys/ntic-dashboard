import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NTIC_GATEWAY = process.env.NTIC_GATEWAY_URL || "https://ntic-gateway-production-6e07.up.railway.app";

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "NTIC-Telegram-Bot", status: "online" });
});

app.post("/telegram-webhook", async (req, res) => {
  res.sendStatus(200);
  const update = req.body;
  try {
    const message = update?.message || update?.edited_message;
    if (!message) return;
    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.from?.username || message.from?.first_name || "Unknown";
    console.log(`[TELEGRAM] ${username}: ${text}`);
    let reply = "";
    try {
      const gatewayRes = await fetch(`${NTIC_GATEWAY}/api/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dashboard-password": process.env.DASHBOARD_PASSWORD || "NTIC2026" },
        body: JSON.stringify({ command: text, source: "telegram", from: username })
      });
      if (gatewayRes.ok) {
        const data = await gatewayRes.json();
        const messages = data?.data?.messages;
        if (messages && messages.length > 0) {
          const last = messages[messages.length - 1];
          reply = `[${last.title}] ${last.body}`;
        } else {
          reply = "NEXUS received your directive.";
        }
      } else {
        reply = `NEXUS gateway returned ${gatewayRes.status}. Directive logged.`;
      }
    } catch (e) {
      reply = "NEXUS is processing. Gateway temporarily unreachable.";
    }
    await sendTelegram(chatId, reply);
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err.message);
  }
});

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NTIC Telegram Bot running on port ${PORT}`);
});
