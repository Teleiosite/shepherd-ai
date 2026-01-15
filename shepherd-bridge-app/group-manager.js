/**
 * WhatsApp Group Management Module
 * Handles group sync, member events, and group messaging
 */

const axios = require('axios');
const wppconnect = require('@wppconnect-team/wppconnect');

let client = null;
let BACKEND_URL = '';
let CONNECTION_CODE = '';

/**
 * Initialize group manager
 */
function initialize(wppClient, backendUrl, connectionCode) {
    client = wppClient;
    BACKEND_URL = backendUrl;
    CONNECTION_CODE = connectionCode;

    console.log('✅ Group Manager initialized');

    // Set up event listeners
    setupEventListeners();

    // Do initial sync
    setTimeout(() => {
        syncGroups();
    }, 5000); // Wait 5 seconds after init
}

/**
 * Sync all groups with backend
 */
async function syncGroups() {
    try {
        console.log('🔄 Syncing WhatsApp groups...');

        const groups = await client.getAllGroups();

        const groupData = groups.map(g => ({
            whatsapp_group_id: g.id._serialized || g.id,
            name: g.name || 'Unnamed Group',
            description: g.description || null,
            avatar_url: g.profilePicUrl || null,
            member_count: g.participants ? g.participants.length : 0
        }));

        const response = await axios.post(
            `${BACKEND_URL}/api/groups/sync?code=${CONNECTION_CODE}`,
            { groups: groupData }
        );

        console.log(`✅ Synced ${response.data.synced} groups (${response.data.new} new, ${response.data.updated} updated)`);

        return response.data;
    } catch (error) {
        console.error('❌ Error syncing groups:', error.message);
        return null;
    }
}

/**
 * Set up event listeners for group changes
 */
function setupEventListeners() {
    if (!client) return;

    // Listen for participant changes
    client.onParticipantsChanged(async (event) => {
        try {
            console.log('👥 Group participant event:', event.action, event.by);

            if (event.action === 'add') {
                // Someone joined
                for (const newMember of event.who) {
                    await handleMemberJoined(event.chatId, newMember);
                }
            } else if (event.action === 'remove') {
                // Someone left or was removed
                console.log(`👋 Member left: ${event.who}`);
            }
        } catch (error) {
            console.error('❌ Error handling participant change:', error);
        }
    });

    console.log('👂 Group event listeners set up');
}

/**
 * Handle a new member joining a group
 */
async function handleMemberJoined(groupId, memberId) {
    try {
        console.log(`🆕 New member ${memberId} joined group ${groupId}`);

        // Get member details
        const contact = await client.getContact(memberId);
        const phone = contact.id.user || memberId.replace('@c.us', '');

        // Notify backend
        const response = await axios.post(
            `${BACKEND_URL}/api/groups/${groupId}/members/joined?code=${CONNECTION_CODE}`,
            {
                whatsapp_id: memberId,
                name: contact.pushname || contact.name || 'Unknown',
                phone: phone,
                joined_at: new Date().toISOString()
            }
        );

        console.log(`✅ Backend notified: ${response.data.contact_created ? 'Contact created' : 'Existing contact'}`);

    } catch (error) {
        console.error('❌ Error handling member joined:', error.message);
    }
}

/**
 * Process welcome queue (send welcome messages to new members)
 */
async function processWelcomeQueue() {
    try {
        const { data: welcomes } = await axios.get(
            `${BACKEND_URL}/api/groups/welcome-queue?code=${CONNECTION_CODE}`
        );

        if (welcomes.length === 0) return;

        console.log(`📬 Processing ${welcomes.length} welcome messages`);

        for (const welcome of welcomes) {
            try {
                // Format phone number
                const chatId = welcome.phone.includes('@') ? welcome.phone : `${welcome.phone}@c.us`;

                // Send welcome message
                await client.sendText(chatId, welcome.message);

                console.log(`✅ Sent welcome to ${welcome.phone} (${welcome.group_name})`);

                // Mark as sent
                await axios.post(
                    `${BACKEND_URL}/api/groups/welcome-queue/${welcome.id}/sent?code=${CONNECTION_CODE}`
                );

                // Delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`❌ Error sending welcome to ${welcome.phone}:`, error.message);
            }
        }
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('❌ Error processing welcome queue:', error.message);
        }
    }
}

/**
 * Process pending group messages (broadcasts)
 */
async function processGroupMessages() {
    try {
        const { data: messages } = await axios.get(
            `${BACKEND_URL}/api/groups/messages/pending?code=${CONNECTION_CODE}`
        );

        if (messages.length === 0) return;

        console.log(`📤 Processing ${messages.length} group messages`);

        for (const msg of messages) {
            try {
                // Send to group
                await client.sendText(msg.group_id, msg.content);

                console.log(`✅ Sent message to group ${msg.group_id}`);

                // Update status
                await axios.post(
                    `${BACKEND_URL}/api/groups/messages/${msg.id}/status?code=${CONNECTION_CODE}`,
                    {
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }
                );

                // Delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`❌ Error sending group message:`, error.message);

                // Mark as failed
                await axios.post(
                    `${BACKEND_URL}/api/groups/messages/${msg.id}/status?code=${CONNECTION_CODE}`,
                    {
                        status: 'failed',
                        error_message: error.message
                    }
                );
            }
        }
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('❌ Error processing group messages:', error.message);
        }
    }
}

/**
 * Start polling for group-related tasks
 */
function startPolling(intervalMs = 10000) {
    console.log(`🔄 Starting group polling (every ${intervalMs / 1000}s)`);

    setInterval(async () => {
        await processWelcomeQueue();
        await processGroupMessages();
    }, intervalMs);
}

module.exports = {
    initialize,
    syncGroups,
    processWelcomeQueue,
    processGroupMessages,
    startPolling
};
