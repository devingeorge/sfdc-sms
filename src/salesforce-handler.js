const jsforce = require('jsforce');

class SalesforceHandler {
  constructor() {
    this.conn = null;
    this.isAuthenticated = false;
    this.accessToken = null;
    this.instanceUrl = null;
  }

  async authenticate() {
    try {
      // Method 1: Use existing access token if provided (RECOMMENDED)
      if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
        this.accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
        this.instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
        
        this.conn = new jsforce.Connection({
          instanceUrl: this.instanceUrl,
          accessToken: this.accessToken
        });
        
        // Test the connection
        await this.conn.identity();
        this.isAuthenticated = true;
        console.log('✅ Successfully authenticated with Salesforce using access token');
        return true;
      }
      
      // Method 2: Use OAuth credentials to get access token
      else if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET && 
               process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
        
        this.conn = new jsforce.Connection({
          loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
        });
        
        // Use OAuth username/password flow
        const userInfo = await this.conn.login(
          process.env.SALESFORCE_USERNAME,
          process.env.SALESFORCE_PASSWORD
        );
        
        this.accessToken = this.conn.accessToken;
        this.instanceUrl = this.conn.instanceUrl;
        this.isAuthenticated = true;
        
        console.log('✅ Successfully authenticated with Salesforce using OAuth credentials');
        console.log(`🔑 Access Token: ${this.accessToken.substring(0, 20)}...`);
        console.log(`🌐 Instance URL: ${this.instanceUrl}`);
        
        return true;
      }
      
      // Method 3: Use username/password with security token (fallback)
      else if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD && 
               process.env.SALESFORCE_SECURITY_TOKEN) {
        
        this.conn = new jsforce.Connection({
          loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
        });
        
        await this.conn.login(
          process.env.SALESFORCE_USERNAME,
          process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
        );
        
        this.accessToken = this.conn.accessToken;
        this.instanceUrl = this.conn.instanceUrl;
        this.isAuthenticated = true;
        
        console.log('✅ Successfully authenticated with Salesforce using username/password');
        return true;
      }
      
      else {
        throw new Error('❌ No valid Salesforce authentication method configured');
      }
      
    } catch (error) {
      console.error('❌ Salesforce authentication failed:', error.message);
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
        Phone: conversation.phoneNumber,
        // Add custom fields if they exist in your org
        // Custom_Field__c: 'Custom Value'
      };

      const caseResult = await this.conn.sobject('Case').create(caseData);

      if (caseResult.success) {
        console.log(`📋 Case created successfully: ${caseResult.id}`);
        
        // Optionally create a custom object record for the SMS conversation
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
          // console.log(`📱 SMS record created: ${smsResult.id}`);
        } catch (smsError) {
          console.log('ℹ️ SMS custom object not available or failed to create:', smsError.message);
        }

        return {
          success: true,
          caseId: caseResult.id,
          caseNumber: caseResult.id
        };
      } else {
        return {
          success: false,
          error: caseResult.errors[0].message
        };
      }
    } catch (error) {
      console.error('❌ Error logging conversation to Salesforce:', error);
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
      console.error('❌ Error retrieving case from Salesforce:', error);
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
      console.error('❌ Error updating case status:', error);
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
      console.error('❌ Error adding comment to case:', error);
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
      console.error('❌ Error getting Salesforce org info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper method to get access token info
  getAccessTokenInfo() {
    return {
      hasAccessToken: !!this.accessToken,
      tokenPreview: this.accessToken ? `${this.accessToken.substring(0, 20)}...` : null,
      instanceUrl: this.instanceUrl,
      isAuthenticated: this.isAuthenticated
    };
  }
}

module.exports = SalesforceHandler;
