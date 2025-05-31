// index.js

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('./baileys');
const qrcode = require('qrcode-terminal'); // For printing QR

async function startBot() {
  // Step 1: Load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  // Step 2: Get the latest Baileys version
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using Baileys v${version.join('.')}, up to date: ${isLatest}`);

  // Step 3: Create the connection without `printQRInTerminal`
  const sock = makeWASocket({
    version,
    auth: state,
    // Removed: printQRInTerminal: true
  });

  // Step 4: Save creds whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Step 5: Handle QR code emission and reconnection logic
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // If a QR string is provided, generate and print the ASCII QR
    if (qr) {
      console.log('Please scan this QR code:');
      qrcode.generate(qr, { small: true });
    }

    // Handle closures and reconnection
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!');
    }
  });

  // Step 6: Listen for incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return; // ignore our own messages or empty
    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    if (text === '!ping') {
      await sock.sendMessage(sender, {
        text: 'This is an interactive button message!',
        footer: '© 2025 - Ssa Team',
        buttons: [
          {
            buttonId: 'id-follow',
            buttonText: { displayText: 'Follow Me' },
            type: 1
          },
          {
            buttonId: 'id-call',
            buttonText: { displayText: 'Call Me!' },
            type: 1
          },
          {
            buttonId: 'id-reply',
            buttonText: { displayText: 'Quick Reply' },
            type: 1
          }
        ],
        headerType: 1
      });
      console.log(`↩️ Replied "Pong!" to ${sender}`);
    }
  });
}

startBot();
