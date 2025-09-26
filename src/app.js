const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const Database = require('./database');
const SMSHandler = require('./sms-handler');
const MockSMSHandler = require('./sms-handler-mock');
const SalesforceHandler = require('./salesforce-handler');
const ConversationManager = require('./conversation-manager');
const routes = require('./routes');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000
});

// Initialize handlers
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

const salesforceHandler = new SalesforceHandler();
const conversationManager = new ConversationManager(app.client);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database and load conversation threads
(async () => {
  try {
    await database.init();
    await conversationManager.loadConversationThreads(database);
    console.log('✅ Database and conversation threads loaded successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
})();

// App Home - Show recent SMS conversations
app.event('app_home_opened', async ({ event, client }) => {
  try {
    const conversations = await database.getRecentConversations(10);
    
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
    console.error('Error updating app home:', error);
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

    // Open conversation as thread
    const threadInfo = await conversationManager.openConversationAsThread(body.user.id, conversation);
    
    // Update database with thread info
    await database.updateConversationSlackInfo(conversationId, threadInfo.channel, threadInfo.thread_ts);
    
  } catch (error) {
    console.error('Error opening conversation:', error);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: '❌ An error occurred while opening the conversation.'
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

    const result = await salesforceHandler.logConversation(conversation);
    
    if (result.success) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ Conversation logged to Salesforce! Case ID: ${result.caseId}`
      });
      
      await database.markConversationAsLogged(conversationId, result.caseId);
    } else {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Failed to log to Salesforce: ${result.error}`
      });
    }
  } catch (error) {
    console.error('Error logging to Salesforce:', error);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: '❌ An error occurred while logging to Salesforce.'
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

// Handle messages in threads (HYBRID APPROACH - Direct thread replies)
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
    
    // Send SMS reply
    const result = await smsHandler.sendSMS(conversation.phoneNumber, message.text);
    
    if (result.success) {
      // Store the outgoing message
      await database.addMessage(conversation.phoneNumber, message.text, 'outgoing', result.messageId, message.ts);
      
      // Update the conversation thread with the sent message
      await conversationManager.updateConversationDisplay(conversationId, conversation);
      
      // Confirm message sent
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.thread_ts,
        text: `✅ SMS sent to ${conversation.phoneNumber}`,
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

// Slash command to send SMS (backup method)
app.command('/sms', async ({ ack, body, client, respond }) => {
  await ack();
  
  const text = body.text;
  const parts = text.split(' ');
  
  if (parts.length < 2) {
    await respond({
      response_type: 'ephemeral',
      text: 'Usage: /sms <phone_number> <message>\nExample: /sms +1234567890 Hello from Slack!\n\n💡 *Tip*: For ongoing conversations, use the "Open Conversation" button in App Home for a better experience!'
    });
    return;
  }
  
  const phoneNumber = parts[0];
  const message = parts.slice(1).join(' ');
  
  try {
    const result = await smsHandler.sendSMS(phoneNumber, message);
    
    if (result.success) {
      await database.addMessage(phoneNumber, message, 'outgoing', result.messageId);
      
      // Update conversation display if it exists
      const conversation = await database.getOrCreateConversation(phoneNumber);
      await conversationManager.updateConversationDisplay(conversation.id, conversation);
      
      await respond({
        response_type: 'ephemeral',
        text: `✅ SMS sent to ${phoneNumber}: "${message}"\n\n💡 *Tip*: Use "Open Conversation" in App Home for ongoing conversations!`
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: `❌ Failed to send SMS: ${result.error}`
      });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ An error occurred while sending the SMS.'
    });
  }
});

// Webhook endpoint for receiving SMS
app.use('/webhook/sms', routes.smsWebhook);

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack SMS Salesforce app is running!');
    console.log('💬 Hybrid mode: Direct thread replies + Quick Reply buttons');
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();
