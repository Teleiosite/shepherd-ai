/**
 * WhatsApp Group Management Module
 * Handles group sync, member events, and group messaging
 */

const axios = require('axios');
const wppconnect = require('@wppconnect-team/wppconnect');

let client = null;
let BACKEND_URL = '';
let CONNECTION_CODE = '';
let syncRetryCount = 0;

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

    // Do initial sync - wait longer for WhatsApp to fully load
    console.log('⏳ Waiting 30 seconds for WhatsApp to fully load all chats...');
    setTimeout(() => {
        syncGroups();
    }, 30000); // Wait 30 seconds for WhatsApp to load
}

/**
 * Sync all groups with backend
 */
async function syncGroups() {
    try {
        console.log('🔄 Syncing WhatsApp groups...');

        // Use listChats instead of deprecated getAllGroups
        const allChats = await client.listChats();

        console.log(`📱 Total chats loaded: ${allChats.length}`);

        // Robust group filter - check multiple properties
        const groups = allChats.filter(chat => {
            // Check if it's a group by multiple methods
            const isGroupByFlag = chat.isGroup === true;
            const isGroupByServer = chat.id && (chat.id.server === 'g.us' || chat.id._serialized?.includes('@g.us'));
            const isGroupByKind = chat.kind === 'group';

            return isGroupByFlag || isGroupByServer || isGroupByKind;
        });

        console.log(`📊 Found ${groups.length} groups in WhatsApp`);

        // If 0 groups found and we haven't retried, wait and try again
        if (groups.length === 0 && syncRetryCount < 2) {
            syncRetryCount++;
            console.log(`⚠️ No groups found. Retrying in 10 seconds... (Attempt ${syncRetryCount}/2)`);
            setTimeout(() => syncGroups(), 10000);
            return null;
        }

        // Reset retry counter on success
        if (groups.length > 0) {
            syncRetryCount = 0;
        }

        const groupData = [];

        for (const g of groups) {
            const groupId = g.id._serialized || g.id;
            let participants = [];
            let memberCount = 0;

            // Try to get group metadata with participants
            try {
                const metadata = await client.getGroupMembers(groupId);
                if (metadata && metadata.length > 0) {
                    participants = metadata.map(p => ({
                        whatsapp_id: p.id._serialized || p.id,
                        name: p.pushname || p.name || p.shortName || null,
                        phone: p.id?.user || (p.id._serialized || p.id).replace('@c.us', ''),
                        is_admin: p.isAdmin || false
                    }));
                    memberCount = participants.length;
                    console.log(`  📋 ${g.name || 'Group'}: ${memberCount} members found`);
                }
            } catch (metaError) {
                // Fallback to chat info
                memberCount = g.participants ? g.participants.length : (g.groupMetadata?.participants?.length || 0);
                console.log(`  ⚠️ ${g.name || 'Group'}: Could not fetch members (${metaError.message})`);
            }

            groupData.push({
                whatsapp_group_id: groupId,
                name: g.name || g.contact?.name || 'Unnamed Group',
                description: g.description || null,
                avatar_url: g.profilePicUrl || null,
                member_count: memberCount,
                participants: participants // Include participants for syncing
            });
        }

        if (groupData.length === 0) {
            console.log('📭 No group data to sync');
            return null;
        }

        const response = await axios.post(
            `${BACKEND_URL}/api/groups/sync?code=${CONNECTION_CODE}`,
            { groups: groupData }
        );

        console.log(`✅ Synced ${response.data.synced} groups (${response.data.new} new, ${response.data.updated} updated)`);

        // Also sync participants for each group
        console.log('👥 Syncing group members...');
        let totalMembers = 0;

        for (const group of groupData) {
            if (group.participants && group.participants.length > 0) {
                try {
                    await axios.post(
                        `${BACKEND_URL}/api/groups/sync-members?code=${CONNECTION_CODE}`,
                        {
                            whatsapp_group_id: group.whatsapp_group_id,
                            members: group.participants
                        }
                    );
                    totalMembers += group.participants.length;
                } catch (memberError) {
                    console.error(`  ⚠️ Could not sync members for ${group.name}: ${memberError.message}`);
                }
            }
        }

        console.log(`✅ Synced ${totalMembers} total group members`);

        return response.data;
    } catch (error) {
        console.error('❌ Error syncing groups:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
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
