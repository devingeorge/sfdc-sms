const express = require('express');
const Database = require('./database');
const SMSHandler = require('./sms-handler');
const MockSMSHandler = require('./sms-handler-mock');
const ConversationManager = require('./conversation-manager');

const router = express.Router();
const database = new Database();

// Initialize SMS handler (use mock if Twilio credentials not available)
let smsHandler;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    smsHandler = new SMSHandler();
  } else {
    throw new Error('Twilio credentials not found');
  }
} catch (error) {
  smsHandler = new MockSMSHandler();
}

// Twilio webhook for incoming SMS
router.post('/sms', async (req, res) => {
  try {
    console.log('📨 SMS webhook received!');
    console.log('📨 Request headers:', req.headers);
    console.log('📨 Request body:', req.body);
    console.log('📨 Request method:', req.method);
    console.log('📨 Request URL:', req.url);
    
    const { From, To, Body, MessageSid, MessageStatus } = req.body;
    
    console.log('📨 Parsed SMS data:', { 
      From, 
      To, 
      Body: Body ? Body.substring(0, 50) + (Body.length > 50 ? '...' : '') : 'No body', 
      MessageSid, 
      MessageStatus 
    });

    if (!From || !Body) {
      console.log('❌ Missing required SMS data (From or Body)');
      res.status(400).send('Missing required data');
      return;
    }

    // Store the incoming message
    console.log('💾 Storing SMS in database...');
    await database.addMessage(From, Body, 'incoming', MessageSid);
    console.log('✅ SMS stored in database');

    // Get the conversation to update Slack display
    console.log('💬 Getting/creating conversation...');
    const conversation = await database.getOrCreateConversation(From);
    console.log('✅ Conversation ready:', conversation.id);
    
    // Update conversation display in Slack if it's open
    // This requires the ConversationManager to be accessible
    // We'll need to pass it from the main app
    
    console.log('✅ SMS webhook processed successfully');
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing incoming SMS:', error);
    res.status(500).send('Error processing SMS');
  }
});

// Twilio status callback webhook
router.post('/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    
    console.log('SMS status update:', { 
      MessageSid, 
      MessageStatus, 
      ErrorCode, 
      ErrorMessage 
    });

    // You can update message status in database here if needed
    // For now, we'll just log it
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing SMS status:', error);
    res.status(500).send('Error processing status');
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SMS Webhook Handler'
  });
});

// Get conversation history (for debugging)
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await database.getRecentConversations(20);
    res.json({
      status: 'success',
      count: conversations.length,
      conversations: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to fetch conversations' 
    });
  }
});

// Get specific conversation
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const conversation = await database.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        error: 'Conversation not found'
      });
    }
    
    res.json({
      status: 'success',
      conversation: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch conversation'
    });
  }
});

// Test SMS sending endpoint (for debugging)
router.post('/test-sms', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: to, message'
      });
    }
    
    const result = await smsHandler.sendSMS(to, message);
    
    if (result.success) {
      // Store the test message
      await database.addMessage(to, message, 'outgoing', result.messageId);
      
      res.json({
        status: 'success',
        message: 'SMS sent successfully',
        messageId: result.messageId,
        to: result.to
      });
    } else {
      res.status(400).json({
        status: 'error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to send SMS'
    });
  }
});

// Get Twilio account info (for debugging)
router.get('/twilio-info', async (req, res) => {
  try {
    const accountInfo = await smsHandler.getAccountInfo();
    const phoneNumbers = await smsHandler.getPhoneNumbers();
    
    res.json({
      status: 'success',
      account: accountInfo.success ? accountInfo.account : null,
      phoneNumbers: phoneNumbers.success ? phoneNumbers.phoneNumbers : null,
      errors: {
        account: accountInfo.success ? null : accountInfo.error,
        phoneNumbers: phoneNumbers.success ? null : phoneNumbers.error
      }
    });
  } catch (error) {
    console.error('Error getting Twilio info:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get Twilio information'
    });
  }
});

module.exports = { smsWebhook: router };
