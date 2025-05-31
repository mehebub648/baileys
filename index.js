// index.js

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('./baileys/new');
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
      // get groups and save a json
        sock.groupFetchAllParticipating().then(groups => {
            // Save groups to a JSON file
            const groupList = Object.values(groups).map(group => ({
                id: group.id,
                subject: group.subject,
                owner: group.owner,
                participants: group.participants.length
            }));
            const fs = require('fs');
            fs.writeFileSync('groups.json', JSON.stringify(groupList, null, 2));
            console.log('Groups fetched and saved to groups.json');
        }).catch(err => {
            console.error('Error fetching groups:', err);
        });
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
        text: 'This is an Interactive message!',
        title: 'Hiii',
        subtitle: 'There is a subtitle',
        footer: '© 2025 - Ssa Team',
        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: 'quick reply',
                    id: 'your_id'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: 'cta url',
                    url: 'https://api.ssateam.my.id',
                    merchant_url: 'https://api.ssateam.my.id'
                })
            },
            {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: 'cta copy',
                    copy_code: '1234'
                })
            },
            {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: 'cta call',
                    phone_number: '628xxx'
                })
            },
            {
                name: 'cta_catalog',
                buttonParamsJson: JSON.stringify({
                    business_phone_number: '628xxx'
                })
            },
            {
                name: 'cta_reminder',
                buttonParamsJson: JSON.stringify({
                    display_text: 'cta reminder'
                })
            },
            {
                name: 'cta_cancel_reminder',
                buttonParamsJson: JSON.stringify({
                    display_text: 'cta cancel reminder'
                })
            },
            {
                name: 'address_message',
                buttonParamsJson: JSON.stringify({
                    display_text: 'address message'
                })
            },
            {
                name: 'send_location',
                buttonParamsJson: JSON.stringify({
                    display_text: 'send location'
                })
            },
            {
                name: 'open_webview',
                buttonParamsJson: JSON.stringify({
                    title: 'open webview',
                    link: {
                    in_app_webview: true, // or false
                    url: 'https://api.ssateam.my.id'
                    }
                })
            },
            {
                name: 'mpm',
                buttonParamsJson: JSON.stringify({
                    product_id: '8816262248471474'
                })
            },
            {
                name: 'wa_payment_transaction_details',
                buttonParamsJson: JSON.stringify({
                    transaction_id: '12345848'
                })
            },
            {
                name: 'automated_greeting_message_view_catalog',
                buttonParamsJson: JSON.stringify({
                    catalog_id: '12345848'
                })
            },
            {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: 'single select',
                    sections: [{
                    title: 'Title 1',
                    highlight_label: 'Highlight label 1',
                    rows: [
                        {
                            header: 'Header 1',
                            title: 'Title 1',
                            description: 'Description 1',
                            id: 'Id 1'
                        },
                        {
                            header: 'Header 2',
                            title: 'Title 2',
                            description: 'Description 2',
                            id: 'Id 2'
                        }
                    ]
                    }]
                })
            }
        ]
        });
      console.log(`↩️ Replied "Pong!" to ${sender}`);
    }
  });
}

startBot();
