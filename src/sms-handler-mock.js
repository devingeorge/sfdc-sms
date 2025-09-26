const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

class MockSMSHandler {
  constructor() {
    this.sentMessages = [];
    this.receivedMessages = [];
    console.log('📱 Mock SMS Handler initialized (no Twilio account required)');
  }

  async sendSMS(to, message, fromNumber = null) {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(to)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(to);
      const from = fromNumber ? this.formatPhoneNumber(fromNumber) : '+1234567890';

      // Simulate SMS sending
      const messageId = `mock_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Store the sent message
      this.sentMessages.push({
        id: messageId,
        to: formattedNumber,
        from: from,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

      console.log(`📤 Mock SMS sent: ${from} → ${formattedNumber} - "${message}"`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending mock SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async receiveSMS(from, body) {
    try {
      const messageId = `mock_incoming_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Store the received message
      this.receivedMessages.push({
        id: messageId,
        from: from,
        body: body,
        timestamp: new Date().toISOString()
      });

      console.log(`📨 Mock SMS received: ${from} - "${body}"`);

      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('Error receiving mock SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validatePhoneNumber(phoneNumber) {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add +1 for US numbers
    if (!formatted.startsWith('+')) {
      if (formatted.length === 10) {
        formatted = '+1' + formatted;
      } else if (formatted.length === 11 && formatted.startsWith('1')) {
        formatted = '+' + formatted;
      }
    }
    
    return formatted;
  }

  async getAccountInfo() {
    return {
      sid: 'mock_account_sid',
      friendlyName: 'Mock Twilio Account',
      status: 'active'
    };
  }

  async getPhoneNumbers() {
    return [
      {
        sid: 'mock_phone_sid_1',
        phoneNumber: '+1234567890',
        friendlyName: 'Mock Phone Number 1'
      },
      {
        sid: 'mock_phone_sid_2',
        phoneNumber: '+1987654321',
        friendlyName: 'Mock Phone Number 2'
      }
    ];
  }

  // Get all sent messages
  getSentMessages() {
    return this.sentMessages;
  }

  // Get all received messages
  getReceivedMessages() {
    return this.receivedMessages;
  }

  // Clear all messages (useful for testing)
  clearMessages() {
    this.sentMessages = [];
    this.receivedMessages = [];
    console.log('📱 Mock SMS messages cleared');
  }

  // Get message statistics
  getStats() {
    return {
      sent: this.sentMessages.length,
      received: this.receivedMessages.length,
      total: this.sentMessages.length + this.receivedMessages.length
    };
  }
}

module.exports = MockSMSHandler;