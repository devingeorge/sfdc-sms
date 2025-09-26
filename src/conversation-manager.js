const { WebClient } = require('@slack/web-api');
const moment = require('moment');

class ConversationManager {
  constructor(slackClient) {
    this.client = slackClient;
    this.conversationThreads = new Map(); // Maps conversationId to thread info
    this.threadConversations = new Map(); // Maps "channel:thread_ts" to conversationId
  }

  async openConversationAsThread(userId, conversation) {
    try {
      // Get the app messages channel (DM between user and bot)
      const appChannel = await this.getAppMessagesChannel(userId);
      
      // Check if this conversation already has a thread
      const existingThread = this.conversationThreads.get(conversation.id);
      
      if (existingThread) {
        // Thread already exists, just post a message to it
        await this.client.chat.postMessage({
          channel: appChannel,
          thread_ts: existingThread.thread_ts,
          text: `📱 Conversation with ${conversation.phoneNumber} is already open in this thread.`
        });
        return existingThread;
      }

      // Create a new thread for this conversation
      const threadMessage = await this.client.chat.postMessage({
        channel: appChannel,
        text: `📱 SMS Conversation with ${conversation.phoneNumber}`,
        blocks: this.createConversationHeaderBlocks(conversation)
      });

      // Store the thread mapping
      this.conversationThreads.set(conversation.id, {
        channel: appChannel,
        thread_ts: threadMessage.ts,
        phoneNumber: conversation.phoneNumber
      });

      // Store reverse mapping for quick lookup
      this.threadConversations.set(`${appChannel}:${threadMessage.ts}`, conversation.id);

      // Post all existing messages in the thread
      await this.postConversationHistory(conversation, appChannel, threadMessage.ts);
      
      // Add hybrid reply instructions
      await this.client.chat.postMessage({
        channel: appChannel,
        thread_ts: threadMessage.ts,
        text: `💬 *How to reply:* Just type your message in this thread and press Enter!`,
        blocks: [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💬 Just type your message below and press Enter to send as SMS'
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Quick Reply'
                },
                action_id: 'quick_reply',
                value: conversation.id,
                style: 'primary'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Log to Salesforce'
                },
                action_id: 'log_to_salesforce',
                value: conversation.id,
                style: 'danger'
              }
            ]
          }
        ]
      });

      return {
        channel: appChannel,
        thread_ts: threadMessage.ts,
        phoneNumber: conversation.phoneNumber
      };

    } catch (error) {
      console.error('Error opening conversation as thread:', error);
      throw error;
    }
  }

  async getConversationIdFromThread(channelId, threadTs) {
    const key = `${channelId}:${threadTs}`;
    return this.threadConversations.get(key);
  }

  async updateConversationDisplay(conversationId, conversation) {
    const threadInfo = this.conversationThreads.get(conversationId);
    if (!threadInfo) return;

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const timestamp = moment(lastMessage.timestamp).format('MMM DD, h:mm A');
    
    let messageText = '';
    if (lastMessage.direction === 'incoming') {
      messageText = `📨 *From ${conversation.phoneNumber}* (${timestamp})\n${lastMessage.content}`;
    } else {
      messageText = `📤 *To ${conversation.phoneNumber}* (${timestamp})\n${lastMessage.content}`;
    }

    await this.client.chat.postMessage({
      channel: threadInfo.channel,
      thread_ts: threadInfo.thread_ts,
      text: messageText
    });
  }

  async postConversationHistory(conversation, channelId, threadTs = null) {
    const messageOptions = {
      channel: channelId,
      text: 'Conversation history'
    };

    if (threadTs) {
      messageOptions.thread_ts = threadTs;
    }

    // Group messages by date for better organization
    const messagesByDate = this.groupMessagesByDate(conversation.messages);
    
    for (const [date, messages] of messagesByDate) {
      // Add date separator
      await this.client.chat.postMessage({
        ...messageOptions,
        text: `📅 *${date}*`,
        blocks: [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📅 ${date}`
              }
            ]
          }
        ]
      });

      // Post messages for this date
      for (const message of messages) {
        const timestamp = moment(message.timestamp).format('h:mm A');
        let messageText = '';
        
        if (message.direction === 'incoming') {
          messageText = `📨 *From ${conversation.phoneNumber}* (${timestamp})\n${message.content}`;
        } else {
          messageText = `📤 *To ${conversation.phoneNumber}* (${timestamp})\n${message.content}`;
        }

        await this.client.chat.postMessage({
          ...messageOptions,
          text: messageText
        });
      }
    }
  }

  groupMessagesByDate(messages) {
    const groups = new Map();
    
    messages.forEach(message => {
      const date = moment(message.timestamp).format('MMMM DD, YYYY');
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date).push(message);
    });
    
    return groups;
  }

  createConversationHeaderBlocks(conversation) {
    const messageCount = conversation.messages.length;
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const lastActivity = moment(lastMessage.timestamp).format('MMM DD, YYYY h:mm A');
    
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📱 ${conversation.phoneNumber}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📊 ${messageCount} messages • Last activity: ${lastActivity}`
          }
        ]
      },
      {
        type: 'divider'
      }
    ];
  }

  async getAppMessagesChannel(userId) {
    // For threads mode, we'll use the app's direct message with the user
    // This creates a consistent "app messages" experience
    const dmChannel = await this.client.conversations.open({
      users: userId
    });
    return dmChannel.channel.id;
  }

  // Handle quick reply button (for thread mode)
  async handleQuickReply(conversationId, userId) {
    const threadInfo = this.conversationThreads.get(conversationId);
    if (!threadInfo) return;

    // Post a message asking for the reply text
    await this.client.chat.postMessage({
      channel: threadInfo.channel,
      thread_ts: threadInfo.thread_ts,
      text: '💬 *Quick Reply Mode* - Type your message below and press Enter to send as SMS',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '💬 *Quick Reply Mode*\n\nJust type your message below and press Enter to send as SMS to the customer.'
          }
        }
      ]
    });
  }

  // Load conversation thread mappings from database on startup
  async loadConversationThreads(database) {
    try {
      const conversations = await database.getRecentConversations(100);
      
      for (const conversation of conversations) {
        if (conversation.slack_channel_id && conversation.slack_thread_ts) {
          this.conversationThreads.set(conversation.id, {
            channel: conversation.slack_channel_id,
            thread_ts: conversation.slack_thread_ts,
            phoneNumber: conversation.phoneNumber
          });
          
          this.threadConversations.set(
            `${conversation.slack_channel_id}:${conversation.slack_thread_ts}`,
            conversation.id
          );
        }
      }
      
      console.log(`Loaded ${this.conversationThreads.size} conversation threads from database`);
    } catch (error) {
      console.error('Error loading conversation threads:', error);
    }
  }
}

module.exports = ConversationManager;
