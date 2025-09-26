// Demo script to show how the mock SMS handler works
const MockSMSHandler = require('./sms-handler-mock');
const Database = require('./database');

async function runDemo() {
  console.log('🎬 SMS Salesforce Integration Demo\n');
  
  // Initialize components
  const smsHandler = new MockSMSHandler();
  const database = new Database();
  await database.init();
  
  console.log('📱 Demo: Sending SMS messages...\n');
  
  // Demo 1: Send SMS messages
  const phoneNumbers = ['+1234567890', '+1987654321'];
  const messages = [
    'Hello! This is a test message from Slack.',
    'How can I help you today?',
    'Thank you for contacting us!'
  ];
  
  for (let i = 0; i < phoneNumbers.length; i++) {
    const phoneNumber = phoneNumbers[i];
    const message = messages[i % messages.length];
    
    console.log(`📤 Sending SMS to ${phoneNumber}: "${message}"`);
    
    const result = await smsHandler.sendSMS(phoneNumber, message);
    
    if (result.success) {
      console.log(`✅ SMS sent successfully! Message ID: ${result.messageId}\n`);
      
      // Store in database
      await database.addMessage(phoneNumber, message, 'outgoing', result.messageId);
    } else {
      console.log(`❌ Failed to send SMS: ${result.error}\n`);
    }
  }
  
  // Demo 2: Simulate incoming SMS
  console.log('📨 Demo: Simulating incoming SMS messages...\n');
  
  const incomingMessages = [
    { from: '+1234567890', message: 'Hi! I need help with my order.' },
    { from: '+1987654321', message: 'Can you tell me about your services?' },
    { from: '+1234567890', message: 'Thanks for the quick response!' }
  ];
  
  for (const msg of incomingMessages) {
    console.log(`📨 Simulating SMS from ${msg.from}: "${msg.message}"`);
    
    const result = await smsHandler.simulateIncomingSMS(msg.from, msg.message);
    
    if (result.success) {
      console.log(`✅ SMS received! Message ID: ${result.messageId}\n`);
      
      // Store in database
      await database.addMessage(msg.from, msg.message, 'incoming', result.messageId);
    }
  }
  
  // Demo 3: Show conversation history
  console.log('📊 Demo: Conversation history from database...\n');
  
  const conversations = await database.getRecentConversations(5);
  
  conversations.forEach((conv, index) => {
    console.log(`📱 Conversation ${index + 1}: ${conv.phoneNumber}`);
    console.log(`   Messages: ${conv.messages.length}`);
    console.log(`   Last activity: ${conv.updated_at}`);
    
    if (conv.messages.length > 0) {
      const lastMessage = conv.messages[conv.messages.length - 1];
      console.log(`   Last message: "${lastMessage.content}" (${lastMessage.direction})`);
    }
    console.log('');
  });
  
  // Demo 4: Show sent messages
  console.log('📤 Demo: All sent messages from mock handler...\n');
  
  const sentMessages = smsHandler.getSentMessages();
  sentMessages.forEach((msg, index) => {
    console.log(`📤 Sent ${index + 1}: ${msg.to} - "${msg.message}"`);
    console.log(`   Time: ${msg.timestamp}`);
    console.log(`   Status: ${msg.status}\n`);
  });
  
  // Demo 5: Show received messages
  console.log('📨 Demo: All received messages from mock handler...\n');
  
  const receivedMessages = smsHandler.getReceivedMessages();
  receivedMessages.forEach((msg, index) => {
    console.log(`📨 Received ${index + 1}: ${msg.from} - "${msg.message}"`);
    console.log(`   Time: ${msg.timestamp}\n`);
  });
  
  console.log('🎉 Demo completed!');
  console.log('\n💡 What this demonstrates:');
  console.log('• SMS sending and receiving simulation');
  console.log('• Database storage of conversations');
  console.log('• Phone number validation and formatting');
  console.log('• Message tracking and history');
  console.log('\n🚀 Next steps:');
  console.log('1. Get a Twilio account (free trial available)');
  console.log('2. Set up your Slack app');
  console.log('3. Configure Salesforce access');
  console.log('4. Deploy to the cloud');
  console.log('5. Start using real SMS integration!');
  
  // Clean up
  database.close();
}

if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
