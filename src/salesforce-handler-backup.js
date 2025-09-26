const jsforce = require('jsforce');

class SalesforceHandler {
  constructor() {
    this.conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });
    this.isAuthenticated = false;
  }

  async authenticate() {
    try {
      await this.conn.login(
        process.env.SALESFORCE_USERNAME,
        process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
      );
      this.isAuthenticated = true;
      console.log('Successfully authenticated with Salesforce');
      return true;
    } catch (error) {
      console.error('Salesforce authentication failed:', error);
      return false;
    }
  }

  async logConversation(conversation) {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return {
            success: false,
            error: 'Failed to authenticate with Salesforce'
          };
        }
      }

      // Create a Case in Salesforce
      const caseData = {
        Subject: `SMS Conversation with ${conversation.phoneNumber}`,
        Description: this.formatConversationForSalesforce(conversation),
        Status: 'New',
        Origin: 'SMS',
        Priority: 'Medium',
        Type: 'Question',
        // Add custom fields if they exist in your org
        Phone: conversation.phoneNumber,
        // You can add more custom fields here based on your Salesforce setup
      };

      const caseResult = await this.conn.sobject('Case').create(caseData);

      if (caseResult.success) {
        console.log(`Case created successfully: ${caseResult.id}`);
        
        // Optionally create a custom object record for the SMS conversation
        // This is useful if you want to track SMS-specific data
        try {
          const smsRecord = {
            Case__c: caseResult.id,
            Phone_Number__c: conversation.phoneNumber,
            Conversation_Start__c: conversation.created_at,
            Conversation_End__c: conversation.updated_at,
            Message_Count__c: conversation.messages.length,
            Logged_From__c: 'Slack App',
            Thread_Channel__c: conversation.slack_channel_id,
            Thread_Timestamp__c: conversation.slack_thread_ts
          };

          // Uncomment if you have a custom SMS object in Salesforce
          // const smsResult = await this.conn.sobject('SMS_Conversation__c').create(smsRecord);
          // console.log(`SMS record created: ${smsResult.id}`);
        } catch (smsError) {
          console.log('SMS custom object not available or failed to create:', smsError.message);
        }

        return {
          success: true,
          caseId: caseResult.id,
          caseNumber: caseResult.id // You might want to query for the actual case number
        };
      } else {
        return {
          success: false,
          error: caseResult.errors[0].message
        };
      }
    } catch (error) {
      console.error('Error logging conversation to Salesforce:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatConversationForSalesforce(conversation) {
    let description = `SMS Conversation with ${conversation.phoneNumber}\n\n`;
    description += `Conversation started: ${new Date(conversation.created_at).toLocaleString()}\n`;
    description += `Last updated: ${new Date(conversation.updated_at).toLocaleString()}\n`;
    description += `Total messages: ${conversation.messages.length}\n`;
    
    if (conversation.slack_channel_id && conversation.slack_thread_ts) {
      description += `Slack Thread: ${conversation.slack_channel_id} (${conversation.slack_thread_ts})\n`;
    }
    
    description += `\nMessages:\n`;
    description += '='.repeat(50) + '\n\n';

    conversation.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const direction = message.direction === 'incoming' ? 'FROM CUSTOMER' : 'TO CUSTOMER';
      
      description += `[${index + 1}] ${direction} (${timestamp})\n`;
      description += `${message.content}\n\n`;
    });

    return description;
  }

  async getCaseDetails(caseId) {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return {
            success: false,
            error: 'Failed to authenticate with Salesforce'
          };
        }
      }

      const caseData = await this.conn.sobject('Case').retrieve(caseId);
      return {
        success: true,
        case: caseData
      };
    } catch (error) {
      console.error('Error retrieving case from Salesforce:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateCaseStatus(caseId, status) {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return {
            success: false,
            error: 'Failed to authenticate with Salesforce'
          };
        }
      }

      const result = await this.conn.sobject('Case').update({
        Id: caseId,
        Status: status
      });

      if (result.success) {
        return {
          success: true,
          message: 'Case status updated successfully'
        };
      } else {
        return {
          success: false,
          error: result.errors[0].message
        };
      }
    } catch (error) {
      console.error('Error updating case status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addCommentToCase(caseId, comment) {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return {
            success: false,
            error: 'Failed to authenticate with Salesforce'
          };
        }
      }

      // Create a CaseComment
      const commentData = {
        ParentId: caseId,
        CommentBody: comment,
        IsPublished: true
      };

      const result = await this.conn.sobject('CaseComment').create(commentData);

      if (result.success) {
        return {
          success: true,
          commentId: result.id
        };
      } else {
        return {
          success: false,
          error: result.errors[0].message
        };
      }
    } catch (error) {
      console.error('Error adding comment to case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrgInfo() {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return {
            success: false,
            error: 'Failed to authenticate with Salesforce'
          };
        }
      }

      const orgInfo = await this.conn.query('SELECT Id, Name, OrganizationType FROM Organization LIMIT 1');
      return {
        success: true,
        org: orgInfo.records[0]
      };
    } catch (error) {
      console.error('Error getting Salesforce org info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SalesforceHandler;
