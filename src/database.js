const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Use in-memory database for cloud deployments (Render, Heroku, etc.)
      const isCloudDeployment = process.env.NODE_ENV === 'production' || 
                                process.env.RENDER || 
                                process.env.HEROKU || 
                                process.env.VERCEL;
      
      let dbPath;
      if (isCloudDeployment) {
        // Use in-memory database for cloud deployments
        dbPath = ':memory:';
        console.log('🌩️ Using in-memory database for cloud deployment');
      } else {
        // Use file-based database for local development
        dbPath = path.join(__dirname, '..', 'data', 'conversations.db');
        console.log('💾 Using file-based database for local development');
      }
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createConversationsTable = `
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          phone_number TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          logged_to_salesforce BOOLEAN DEFAULT FALSE,
          salesforce_case_id TEXT,
          slack_channel_id TEXT,
          slack_thread_ts TEXT,
          conversation_mode TEXT DEFAULT 'threads'
        )
      `;

      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          content TEXT NOT NULL,
          direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          twilio_message_id TEXT,
          slack_message_ts TEXT,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
      `;

      const createUserPhoneNumbersTable = `
        CREATE TABLE IF NOT EXISTS user_phone_numbers (
          slack_user_id TEXT PRIMARY KEY,
          phone_number TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create tables sequentially to ensure they're ready
      this.db.run(createConversationsTable, (err) => {
        if (err) {
          console.error('Error creating conversations table:', err);
          reject(err);
          return;
        }
        console.log('✅ Conversations table created');
        
        this.db.run(createMessagesTable, (err) => {
          if (err) {
            console.error('Error creating messages table:', err);
            reject(err);
            return;
          }
          console.log('✅ Messages table created');
          
          this.db.run(createUserPhoneNumbersTable, (err) => {
            if (err) {
              console.error('Error creating user_phone_numbers table:', err);
              reject(err);
              return;
            }
            console.log('✅ User phone numbers table created');
            resolve();
          });
        });
      });
    });
  }

  // User Phone Number Methods
  async setUserPhoneNumber(slackUserId, phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO user_phone_numbers (slack_user_id, phone_number, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [slackUserId, phoneNumber],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ slack_user_id: slackUserId, phone_number: phoneNumber });
          }
        }
      );
    });
  }

  async getUserPhoneNumber(slackUserId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM user_phone_numbers WHERE slack_user_id = ?',
        [slackUserId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getAllUserPhoneNumbers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM user_phone_numbers ORDER BY updated_at DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Conversation Methods
  async getOrCreateConversation(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM conversations WHERE phone_number = ?',
        [phoneNumber],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(row);
          } else {
            const conversationId = uuidv4();
            this.db.run(
              'INSERT INTO conversations (id, phone_number) VALUES (?, ?)',
              [conversationId, phoneNumber],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: conversationId, phone_number: phoneNumber });
                }
              }
            );
          }
        }
      );
    });
  }

  async getConversation(conversationId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getRecentConversations(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?',
        [limit],
        async (err, conversations) => {
          if (err) {
            reject(err);
          } else {
            // Get messages for each conversation
            for (let conv of conversations) {
              conv.messages = await this.getConversationMessages(conv.id);
            }
            resolve(conversations);
          }
        }
      );
    });
  }

  async getConversationMessages(conversationId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
        [conversationId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async addMessage(phoneNumber, content, direction, twilioMessageId = null, slackMessageTs = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const conversation = await this.getOrCreateConversation(phoneNumber);
        
        const messageId = uuidv4();
        this.db.run(
          'INSERT INTO messages (id, conversation_id, content, direction, twilio_message_id, slack_message_ts) VALUES (?, ?, ?, ?, ?, ?)',
          [messageId, conversation.id, content, direction, twilioMessageId, slackMessageTs],
          (err) => {
            if (err) {
              reject(err);
            } else {
              this.db.run(
                'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [conversation.id]
              );
              resolve({ id: messageId, conversation_id: conversation.id });
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateConversationSlackInfo(conversationId, channelId, threadTs) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET slack_channel_id = ?, slack_thread_ts = ? WHERE id = ?',
        [channelId, threadTs, conversationId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: conversationId, slack_channel_id: channelId, slack_thread_ts: threadTs });
          }
        }
      );
    });
  }

  async markConversationAsLogged(conversationId, salesforceCaseId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET logged_to_salesforce = TRUE, salesforce_case_id = ? WHERE id = ?',
        [salesforceCaseId, conversationId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: conversationId, salesforce_case_id: salesforceCaseId });
          }
        }
      );
    });
  }

  async getConversationThreads() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, slack_channel_id, slack_thread_ts FROM conversations WHERE slack_channel_id IS NOT NULL AND slack_thread_ts IS NOT NULL',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = Database;