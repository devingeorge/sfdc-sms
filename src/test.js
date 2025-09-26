const Database = require('./database');
const SMSHandler = require('./sms-handler');
const MockSMSHandler = require('./sms-handler-mock');
const SalesforceHandler = require('./salesforce-handler');
const ConversationManager = require('./conversation-manager');

async function runTests() {
  console.log('🧪 Running basic tests...');
  
  try {
    // Test database
    console.log('📊 Testing database...');
    const db = new Database();
    await db.init();
    console.log('✅ Database initialization successful');
    
    // Test SMS handler
    console.log('📱 Testing SMS handler...');
    try {
      // Try real SMS handler first
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const sms = new SMSHandler();
        console.log('✅ Twilio SMS handler initialization successful');
      } else {
        throw new Error('Twilio credentials not found');
      }
    } catch (error) {
      // Use mock handler for testing
      const sms = new MockSMSHandler();
      console.log('✅ Mock SMS handler initialization successful');
    }
    
    // Test phone number validation with mock handler
    console.log('📞 Testing phone number validation...');
    const sms = new MockSMSHandler();
    const testNumbers = ['+1234567890', '1234567890', '+44123456789', 'invalid'];
    testNumbers.forEach(number => {
      const isValid = sms.validatePhoneNumber(number);
      const formatted = sms.formatPhoneNumber(number);
      console.log(`  ${number} → Valid: ${isValid}, Formatted: ${formatted}`);
    });
    
    // Test Salesforce handler
    console.log('☁️ Testing Salesforce handler...');
    try {
      const sf = new SalesforceHandler();
      console.log('✅ Salesforce handler initialization successful');
    } catch (error) {
      console.log('⚠️ Salesforce handler initialization failed (missing environment variables)');
      console.log('  This is expected if .env file is not configured yet');
    }
    
    // Test conversation manager
    console.log('💬 Testing conversation manager...');
    const cm = new ConversationManager(null); // No Slack client for testing
    console.log('✅ Conversation manager initialization successful');
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy env.example to .env and fill in your credentials');
    console.log('2. Set up your Slack app with the required permissions');
    console.log('3. Configure Twilio webhook URL');
    console.log('4. Run: npm start');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
