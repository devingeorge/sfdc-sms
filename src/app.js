const { App } = require('@slack/bolt');
const Database = require('./database');
const SMSHandler = require('./sms-handler');
const MockSMSHandler = require('./sms-handler-mock');
const SalesforceHandler = require('./salesforce-handler');
const ConversationManager = require('./conversation-manager');
const routes = require('./routes');

// Load environment variables
require('dotenv').config();

// Initialize database
const database = new Database();

// Initialize SMS handler (use mock if Twilio credentials not available)
let smsHandler;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    smsHandler = new SMSHandler();
    console.log('📱 Using Twilio SMS Handler');
  } else {
    throw new Error('Twilio credentials not found');
  }
} catch (error) {
  smsHandler = new MockSMSHandler();
  console.log('📱 Using Mock SMS Handler (Twilio credentials not configured)');
}

// Initialize Salesforce handler
const salesforceHandler = new SalesforceHandler();

// Initialize conversation manager
const conversationManager = new ConversationManager();

console.log('🔧 Initializing Slack Bolt app...');
console.log('🔧 Environment variables check:');
console.log('  - SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing');
console.log('  - SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - PORT:', process.env.PORT || 3000);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000
});

console.log('🔧 Slack Bolt app created successfully');

// Handle SMS webhooks directly in the requestListener
if (app.receiver && app.receiver.requestListener) {
  console.log('🔧 Setting up SMS webhook handler using receiver.requestListener...');
  
  // Store the original requestListener
  const originalRequestListener = app.receiver.requestListener;
  
  // Override the requestListener to handle SMS webhooks directly
  app.receiver.requestListener = (req, res) => {
    console.log('🔍 Incoming request:', {
      method: req.method,
      url: req.url,
      path: req.path
    });
    
    // Check if this is an SMS webhook
    if (req.url === '/webhook/sms/sms' && req.method === 'POST') {
      console.log('🔧 Handling SMS webhook directly...');
      
      // Handle SMS webhook directly
      handleSMSWebhook(req, res);
    } else if (req.url === '/webhook/sms/test' && req.method === 'GET') {
      console.log('🔧 Handling test endpoint...');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', message: 'SMS webhook routes are working!' }));
    } else {
      // For all other requests, use the original listener
      originalRequestListener(req, res);
    }
  };
  
  console.log('✅ SMS webhook handler configured using receiver.requestListener');
} else {
  console.log('❌ Cannot setup SMS webhook handler - receiver.requestListener not available');
}

// Function to notify users about new SMS messages
async function notifyUsersAboutNewSMS(phoneNumber, messageBody, conversationId) {
  try {
    console.log('📢 Notifying users about new SMS from:', phoneNumber);
    
    // Create a simple notification in the App Home
    // We'll post a message to the App Home that users can see
    // This will allow them to see new SMS messages and reply to them
    
    console.log('📱 New SMS received:');
    console.log('   From:', phoneNumber);
    console.log('   Message:', messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : ''));
    console.log('   Conversation ID:', conversationId);
    
    // For now, we'll just log the notification
    // The App Home will show the conversation when users open it
    // Users can then use the existing thread-based reply system
    
  } catch (error) {
    console.error('❌ Error notifying users about new SMS:', error);
  }
}

// Direct SMS webhook handler
async function handleSMSWebhook(req, res) {
  try {
    console.log('📨 SMS webhook received!');
    
    // Parse the request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // Parse form data (Twilio sends form-encoded data)
        const params = new URLSearchParams(body);
        const smsData = {
          From: params.get('From'),
          To: params.get('To'),
          Body: params.get('Body'),
          MessageSid: params.get('MessageSid'),
          MessageStatus: params.get('MessageStatus')
        };
        
        console.log('📨 Parsed SMS data:', { 
          From: smsData.From, 
          To: smsData.To, 
          Body: smsData.Body ? smsData.Body.substring(0, 50) + (smsData.Body.length > 50 ? '...' : '') : 'No body', 
          MessageSid: smsData.MessageSid, 
          MessageStatus: smsData.MessageStatus 
        });

        if (!smsData.From || !smsData.Body) {
          console.log('❌ Missing required SMS data (From or Body)');
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing required data');
          return;
        }

        // Store the incoming message
        console.log('💾 Storing SMS in database...');
        await database.addMessage(smsData.From, smsData.Body, 'incoming', smsData.MessageSid);
        console.log('✅ SMS stored in database');

        // Get the conversation to update Slack display
        console.log('💬 Getting/creating conversation...');
        const conversation = await database.getOrCreateConversation(smsData.From);
        console.log('✅ Conversation ready:', conversation.id);
        
        // Notify users about the new SMS message
        await notifyUsersAboutNewSMS(smsData.From, smsData.Body, conversation.id);
        console.log('✅ SMS notification sent to users');

        console.log('✅ SMS webhook processed successfully');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } catch (error) {
        console.error('❌ Error processing SMS webhook:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error processing SMS');
      }
    });
  } catch (error) {
    console.error('❌ Error handling SMS webhook:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error processing SMS');
  }
}

// App Home Event Handler
app.event('app_home_opened', async ({ event, client }) => {
  try {
    const conversations = await database.getRecentConversations(10);
    const userPhoneNumber = await database.getUserPhoneNumber(event.user);
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📱 SMS Conversations'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💬 *Hybrid Mode*: Type directly in threads OR use Quick Reply buttons'
          }
        ]
      },
      {
        type: 'divider'
      }
    ];

    // Phone Number Setup Section
    if (!userPhoneNumber) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '⚠️ *Setup Required*: You need to set your phone number to send SMS replies.'
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Set Phone Number'
          },
          action_id: 'set_phone_number',
          style: 'primary'
        }
      });
      blocks.push({
        type: 'divider'
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Your SMS Phone Number:* ${userPhoneNumber.phone_number}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Change'
          },
          action_id: 'set_phone_number'
        }
      });
      blocks.push({
        type: 'divider'
      });
    }

    if (conversations.length === 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'No SMS conversations yet. Send an SMS to get started!'
        }
      });
    } else {
      conversations.forEach(conv => {
        const lastMessage = conv.messages[conv.messages.length - 1];
        const timeAgo = new Date(lastMessage.timestamp).toLocaleString();
        const messageCount = conv.messages.length;
        
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${conv.phoneNumber}*\nLast message: ${lastMessage.content}\n_${timeAgo}_ • ${messageCount} messages`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Log to Salesforce'
            },
            action_id: 'log_to_salesforce',
            value: conv.id
          }
        });
        
        // Add button to open conversation
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Open Conversation'
              },
              action_id: 'open_conversation',
              value: conv.id,
              style: 'primary'
            }
          ]
        });
        
        blocks.push({
          type: 'divider'
        });
      });
    }

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: blocks
      }
    });
  } catch (error) {
    console.error('Error updating App Home:', error);
  }
});

// Handle "Open Conversation" button
app.action('open_conversation', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const conversationId = body.actions[0].value;
    const conversation = await database.getConversation(conversationId);
    
    if (!conversation) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: 'Conversation not found.'
      });
      return;
    }

    // Check if user has a phone number set
    const userPhoneNumber = await database.getUserPhoneNumber(body.user.id);
    if (!userPhoneNumber) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: '⚠️ You need to set your phone number first to send SMS replies. Use the "Set Phone Number" button in the App Home.'
      });
      return;
    }

    // Create a simple thread in the user's DM with the bot
    const dmChannel = await client.conversations.open({
      users: body.user.id
    });

    // Post the conversation starter message
    const threadMessage = await client.chat.postMessage({
      channel: dmChannel.channel.id,
      text: `📱 *SMS Conversation with ${conversation.phoneNumber}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📱 *SMS Conversation with ${conversation.phoneNumber}*\n\n*Your SMS Number:* ${userPhoneNumber.phone_number}\n\n*Recent Messages:*`
          }
        }
      ]
    });

    // Add recent messages to the thread
    const messages = await database.getConversationMessages(conversationId);
    for (const message of messages.slice(-5)) { // Show last 5 messages
      await client.chat.postMessage({
        channel: dmChannel.channel.id,
        thread_ts: threadMessage.ts,
        text: `${message.direction === 'incoming' ? '📨' : '📤'} *${message.direction === 'incoming' ? 'From' : 'To'} ${conversation.phoneNumber}:* ${message.content}`,
        reply_broadcast: false
      });
    }

    // Add instructions
    await client.chat.postMessage({
      channel: dmChannel.channel.id,
      thread_ts: threadMessage.ts,
      text: `💬 *How to reply:* Just type your message in this thread and press Enter!`,
      blocks: [
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💬 Just type your message below and press Enter to send as SMS'
            }
          ]
        }
      ]
    });

    // Store thread info in database
    await database.updateConversationSlackInfo(conversationId, dmChannel.channel.id, threadMessage.ts);
    
    // Store thread mapping in conversation manager
    conversationManager.threadConversations.set(`${dmChannel.channel.id}:${threadMessage.ts}`, conversationId);

    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: `✅ Conversation opened! Check your DMs with the bot to continue the SMS conversation with ${conversation.phoneNumber}.`
    });
  } catch (error) {
    console.error('Error opening conversation:', error);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: '❌ Error opening conversation. Please try again.'
    });
  }
});

// Handle "Set Phone Number" button
app.action('set_phone_number', async ({ ack, body, client }) => {
  await ack();
  
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'phone_number_modal',
        title: {
          type: 'plain_text',
          text: 'Set Your SMS Phone Number'
        },
        submit: {
          type: 'plain_text',
          text: 'Save'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Enter the phone number you want to use for sending SMS replies. This should be a Twilio-enabled phone number.'
            }
          },
          {
            type: 'input',
            block_id: 'phone_number_input',
            element: {
              type: 'plain_text_input',
              action_id: 'phone_number',
              placeholder: {
                type: 'plain_text',
                text: '+1234567890'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Phone Number'
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error opening phone number modal:', error);
  }
});

// Handle phone number modal submission
app.view('phone_number_modal', async ({ ack, body, client, view }) => {
  await ack();
  
  try {
    const phoneNumber = view.state.values.phone_number_input.phone_number.value;
    
    if (!phoneNumber) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: '❌ Please enter a valid phone number.'
      });
      return;
    }

    // Save phone number to database
    await database.setUserPhoneNumber(body.user.id, phoneNumber);
    
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: `✅ Phone number ${phoneNumber} saved! You can now send SMS replies.`
    });
  } catch (error) {
    console.error('Error saving phone number:', error);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: '❌ Error saving phone number. Please try again.'
    });
  }
});

// Handle "Log to Salesforce" button
app.action('log_to_salesforce', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const conversationId = body.actions[0].value;
    const conversation = await database.getConversation(conversationId);
    
    if (!conversation) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: 'Conversation not found.'
      });
      return;
    }

    if (conversation.logged_to_salesforce) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `This conversation has already been logged to Salesforce as Case ${conversation.salesforce_case_id}.`
      });
      return;
    }

    // Get conversation messages
    const messages = await database.getConversationMessages(conversationId);
    
    // Create Salesforce case
    const caseResult = await salesforceHandler.logConversationAsCase(conversation, messages);
    
    if (caseResult.success) {
      // Mark conversation as logged
      await database.markConversationAsLogged(conversationId, caseResult.caseId);
      
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ Conversation logged to Salesforce as Case ${caseResult.caseId}.`
      });
    } else {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Error logging to Salesforce: ${caseResult.error}`
      });
    }
  } catch (error) {
    console.error('Error logging to Salesforce:', error);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: '❌ Error logging to Salesforce. Please try again.'
    });
  }
});

// Handle "Quick Reply" button
app.action('quick_reply', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const conversationId = body.actions[0].value;
    await conversationManager.handleQuickReply(conversationId, body.user.id);
  } catch (error) {
    console.error('Error handling quick reply:', error);
  }
});

// Handle thread messages for SMS replies
app.message(async ({ message, client }) => {
  // Only handle messages in threads
  if (!message.thread_ts) return;
  
  // Skip bot messages
  if (message.bot_id) return;
  
  // Check if this thread represents a conversation
  const conversationId = await conversationManager.getConversationIdFromThread(message.channel, message.thread_ts);
  if (!conversationId) return;
  
  try {
    const conversation = await database.getConversation(conversationId);
    if (!conversation) return;
    
    // Get user's phone number
    const userPhoneNumber = await database.getUserPhoneNumber(message.user);
    if (!userPhoneNumber) {
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.thread_ts,
        text: '⚠️ You need to set your phone number first to send SMS replies. Use the "Set Phone Number" button in the App Home.',
        reply_broadcast: false
      });
      return;
    }
    
    // Send SMS reply using the user's phone number
    const result = await smsHandler.sendSMS(conversation.phoneNumber, message.text, userPhoneNumber.phone_number);
    
    if (result.success) {
      // Store the outgoing message
      await database.addMessage(conversation.phoneNumber, message.text, 'outgoing', result.messageId, message.ts);
      
      // Update the conversation thread with the sent message
      await conversationManager.updateConversationDisplay(conversationId, conversation);
      
      // Confirm message sent
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.thread_ts,
        text: `✅ SMS sent to ${conversation.phoneNumber} from ${userPhoneNumber.phone_number}`,
        reply_broadcast: false
      });
    } else {
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.thread_ts,
        text: `❌ Failed to send SMS: ${result.error}`,
        reply_broadcast: false
      });
    }
  } catch (error) {
    console.error('Error handling thread message:', error);
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.thread_ts,
      text: '❌ An error occurred while sending the SMS.',
      reply_broadcast: false
    });
  }
});

// Handle slash command
app.command('/sms', async ({ command, ack, client }) => {
  await ack();
  
  try {
    const [action, phoneNumber, ...messageParts] = command.text.split(' ');
    const message = messageParts.join(' ');
    
    if (action === 'send' && phoneNumber && message) {
      // Get user's phone number
      const userPhoneNumber = await database.getUserPhoneNumber(command.user_id);
      if (!userPhoneNumber) {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: '⚠️ You need to set your phone number first. Use the "Set Phone Number" button in the App Home.'
        });
        return;
      }
      
      const result = await smsHandler.sendSMS(phoneNumber, message, userPhoneNumber.phone_number);
      
      if (result.success) {
        await database.addMessage(phoneNumber, message, 'outgoing', result.messageId);
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: `✅ SMS sent to ${phoneNumber} from ${userPhoneNumber.phone_number}`
        });
      } else {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: `❌ Failed to send SMS: ${result.error}`
        });
      }
    } else {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Usage: `/sms send <phone_number> <message>`'
      });
    }
  } catch (error) {
    console.error('Error handling SMS command:', error);
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: '❌ Error processing SMS command.'
    });
  }
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack SMS Salesforce app is running!');
    console.log('💬 Hybrid mode: Direct thread replies + Quick Reply buttons');
    console.log('✅ SMS webhook endpoints configured');
    
    // Initialize database
    await database.init();
    console.log('✅ Connected to SQLite database');
    
    // Load conversation threads
    const threads = await database.getConversationThreads();
    console.log(`Loaded ${threads.length} conversation threads from database`);
    
    // Store thread mappings in conversation manager
    threads.forEach(thread => {
      conversationManager.threadConversations.set(`${thread.slack_channel_id}:${thread.slack_thread_ts}`, thread.id);
    });
    
    console.log('✅ Database and conversation threads loaded successfully');
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
})();