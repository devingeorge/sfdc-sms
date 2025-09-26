const twilio = require('twilio');

class SMSHandler {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
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
      
      // Use provided fromNumber or default
      const from = fromNumber ? this.formatPhoneNumber(fromNumber) : this.fromNumber;

      const result = await this.client.messages.create({
        body: message,
        from: from,
        to: formattedNumber
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async receiveSMS(from, body) {
    try {
      console.log(`SMS received from ${from}: ${body}`);
      return {
        success: true,
        from: from,
        body: body
      };
    } catch (error) {
      console.error('Error receiving SMS:', error);
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
    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      return {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  async getPhoneNumbers() {
    try {
      const phoneNumbers = await this.client.incomingPhoneNumbers.list();
      return phoneNumbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName
      }));
    } catch (error) {
      console.error('Error getting phone numbers:', error);
      return [];
    }
  }
}

module.exports = SMSHandler;