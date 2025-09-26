const twilio = require('twilio');

class SMSHandler {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
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

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber
      });

      console.log(`SMS sent successfully: ${result.sid} to ${formattedNumber}`);

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: formattedNumber
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMessageStatus(messageId) {
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body
      };
    } catch (error) {
      console.error('Error getting message status:', error);
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
    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      return {
        success: true,
        account: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status
        }
      };
    } catch (error) {
      console.error('Error getting Twilio account info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPhoneNumbers() {
    try {
      const phoneNumbers = await this.client.incomingPhoneNumbers.list();
      return {
        success: true,
        phoneNumbers: phoneNumbers.map(number => ({
          sid: number.sid,
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          capabilities: number.capabilities
        }))
      };
    } catch (error) {
      console.error('Error getting Twilio phone numbers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SMSHandler;
