// Mock SMS Handler for testing without Twilio
// This simulates SMS functionality for development and testing

class MockSMSHandler {
  constructor() {
    this.sentMessages = [];
    this.receivedMessages = [];
    console.log('📱 Mock SMS Handler initialized (no Twilio account required)');
  }

  async sendSMS(to, message) {
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

      // Simulate SMS sending
      const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the sent message
      this.sentMessages.push({
        id: messageId,
        to: formattedNumber,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

      console.log(`📤 Mock SMS sent: ${formattedNumber} - "${message}"`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        to: formattedNumber
      };
    } catch (error) {
      console.error('Error sending mock SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMessageStatus(messageId) {
    try {
      const message = this.sentMessages.find(msg => msg.id === messageId);
      if (!message) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      return {
        success: true,
        status: message.status,
        errorCode: null,
        errorMessage: null,
        direction: 'outbound',
        from: '+1234567890', // Mock from number
        to: message.to,
        body: message.message
      };
    } catch (error) {
      console.error('Error getting mock message status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validatePhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if it's a valid phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleaned);
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add +1 if it's a 10-digit US number
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // Add + if it's missing
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // Return as-is if it already has country code
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    return `+${cleaned}`;
  }

  async getAccountInfo() {
    return {
      success: true,
      account: {
        sid: 'mock_account_sid',
        friendlyName: 'Mock Twilio Account',
        status: 'active'
      }
    };
  }

  async getPhoneNumbers() {
    return {
      success: true,
      phoneNumbers: [{
        sid: 'mock_phone_sid',
        phoneNumber: '+1234567890',
        friendlyName: 'Mock SMS Number',
        capabilities: {
          sms: true,
          voice: false
        }
      }]
    };
  }

  // Mock method to simulate receiving an SMS
  async simulateIncomingSMS(from, message) {
    const messageId = `mock_incoming_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.receivedMessages.push({
      id: messageId,
      from: from,
      message: message,
      timestamp: new Date().toISOString()
    });

    console.log(`📨 Mock SMS received: ${from} - "${message}"`);
    
    return {
      success: true,
      messageId: messageId,
      from: from,
      message: message
    };
  }

  // Get all sent messages (for testing)
  getSentMessages() {
    return this.sentMessages;
  }

  // Get all received messages (for testing)
  getReceivedMessages() {
    return this.receivedMessages;
  }

  // Clear all messages (for testing)
  clearMessages() {
    this.sentMessages = [];
    this.receivedMessages = [];
  }
}

module.exports = MockSMSHandler;
