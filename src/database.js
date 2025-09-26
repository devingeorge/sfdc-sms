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

      this.db.serialize(() => {
        this.db.run(createConversationsTable);
        this.db.run(createMessagesTable);
        resolve();
      });
    });
  }

  async getOrCreateConversation(phoneNumber) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM conversations WHERE phone_number = ?',
        [phoneNumber],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve({
              id: row.id,
              phoneNumber: row.phone_number,
              created_at: row.created_at,
              updated_at: row.updated_at,
              logged_to_salesforce: row.logged_to_salesforce,
              salesforce_case_id: row.salesforce_case_id,
              slack_channel_id: row.slack_channel_id,
              slack_thread_ts: row.slack_thread_ts,
              conversation_mode: row.conversation_mode
            });
          } else {
            const conversationId = uuidv4();
            this.db.run(
              'INSERT INTO conversations (id, phone_number) VALUES (?, ?)',
              [conversationId, phoneNumber],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({
                  id: conversationId,
                  phoneNumber: phoneNumber,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  logged_to_salesforce: false,
                  salesforce_case_id: null,
                  slack_channel_id: null,
                  slack_thread_ts: null,
                  conversation_mode: 'threads'
                });
              }
            );
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

  async getRecentConversations(limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT c.*, 
               json_group_array(
                 json_object(
                   'id', m.id,
                   'content', m.content,
                   'direction', m.direction,
                   'timestamp', m.timestamp
                 )
               ) as messages
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const conversations = rows.map(row => ({
          id: row.id,
          phoneNumber: row.phone_number,
          created_at: row.created_at,
          updated_at: row.updated_at,
          logged_to_salesforce: row.logged_to_salesforce,
          salesforce_case_id: row.salesforce_case_id,
          slack_channel_id: row.slack_channel_id,
          slack_thread_ts: row.slack_thread_ts,
          conversation_mode: row.conversation_mode,
          messages: JSON.parse(row.messages).filter(msg => msg.id !== null)
        }));

        resolve(conversations);
      });
    });
  }

  async getConversation(conversationId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT c.*, 
               json_group_array(
                 json_object(
                   'id', m.id,
                   'content', m.content,
                   'direction', m.direction,
                   'timestamp', m.timestamp
                 )
               ) as messages
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.id = ?
        GROUP BY c.id
      `;

      this.db.get(query, [conversationId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        resolve({
          id: row.id,
          phoneNumber: row.phone_number,
          created_at: row.created_at,
          updated_at: row.updated_at,
          logged_to_salesforce: row.logged_to_salesforce,
          salesforce_case_id: row.salesforce_case_id,
          slack_channel_id: row.slack_channel_id,
          slack_thread_ts: row.slack_thread_ts,
          conversation_mode: row.conversation_mode,
          messages: JSON.parse(row.messages).filter(msg => msg.id !== null)
        });
      });
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
            resolve();
          }
        }
      );
    });
  }

  async updateConversationSlackInfo(conversationId, channelId, threadTs = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE conversations SET slack_channel_id = ?, slack_thread_ts = ? WHERE id = ?',
        [channelId, threadTs, conversationId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getConversationByThread(channelId, threadTs) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM conversations WHERE slack_channel_id = ? AND slack_thread_ts = ?',
        [channelId, threadTs],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          resolve({
            id: row.id,
            phoneNumber: row.phone_number,
            created_at: row.created_at,
            updated_at: row.updated_at,
            logged_to_salesforce: row.logged_to_salesforce,
            salesforce_case_id: row.salesforce_case_id,
            slack_channel_id: row.slack_channel_id,
            slack_thread_ts: row.slack_thread_ts,
            conversation_mode: row.conversation_mode
          });
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
