# Slack SMS Salesforce Integration - Hybrid Thread Mode

A comprehensive Slack app that enables SMS communication with customers and Salesforce logging using a hybrid thread-based approach.

## 🎯 **Key Features**

- 📱 **SMS Integration**: Send and receive SMS messages via Twilio
- 💬 **Hybrid Thread Mode**: Direct thread replies + Quick Reply buttons
- 🏠 **Slack App Home**: View and manage all SMS conversations
- 📊 **Salesforce Logging**: One-click conversation logging as Cases
- 🗄️ **Database Storage**: SQLite database for conversation history
- 🔄 **Real-time Updates**: Automatic conversation synchronization

## 🚀 **Hybrid Thread Approach**

This app uses a **hybrid approach** for managing SMS conversations:

### **Method 1: Direct Thread Replies**
- Open a conversation → Creates a thread in app messages
- Type directly in the thread → Automatically sends as SMS
- Natural conversation flow without slash commands

### **Method 2: Quick Reply Buttons**
- Click "Quick Reply" button → Opens modal for longer messages
- Useful for complex responses or when you need more space

### **Method 3: Slash Commands (Backup)**
- Use `/sms +1234567890 Hello!` as a fallback method
- Helpful for quick messages from any channel

## 📁 **Project Structure**

```
src/
├── app.js                    # Main Slack app with hybrid thread handling
├── database.js              # SQLite database with thread tracking
├── conversation-manager.js  # Thread management and conversation display
├── sms-handler.js          # Twilio SMS integration
├── salesforce-handler.js   # Salesforce API integration
└── routes.js               # Webhook endpoints

data/
└── conversations.db        # SQLite database (auto-created)

env.example                 # Environment configuration template
README.md                   # This file
```

## 🛠️ **Setup Instructions**

### **1. Install Dependencies**

```bash
npm install
```

### **2. Configure Environment**

```bash
cp env.example .env
# Edit .env with your actual credentials
```

### **3. Required Environment Variables**

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Salesforce Configuration
SALESFORCE_USERNAME=your-salesforce-username
SALESFORCE_PASSWORD=your-salesforce-password
SALESFORCE_SECURITY_TOKEN=your-salesforce-security-token
```

### **4. Slack App Configuration**

1. **Create Slack App** at [api.slack.com/apps](https://api.slack.com/apps)
2. **OAuth & Permissions** - Add these Bot Token Scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
   - `commands`
   - `im:history`
   - `im:read`
   - `im:write`
   - `users:read`

3. **Slash Commands** - Create `/sms` command:
   - Command: `/sms`
   - Request URL: `https://your-domain.com/slack/events`
   - Short Description: `Send SMS message`

4. **Event Subscriptions** - Enable Events:
   - Request URL: `https://your-domain.com/slack/events`
   - Subscribe to Bot Events: `app_home_opened`

5. **App Home** - Enable "Allow users to send Slash commands and messages"

### **5. Twilio Configuration**

1. **Get Twilio Account** at [twilio.com](https://www.twilio.com)
2. **Configure SMS Webhook**:
   - URL: `https://your-domain.com/webhook/sms/sms`
   - HTTP Method: POST

### **6. Salesforce Configuration**

1. **Ensure Case Object Access** - Your user needs permissions to create Cases
2. **Get Security Token** from Salesforce user settings
3. **Optional**: Create custom fields for SMS-specific data

### **7. Start the Application**

```bash
# Development
npm run dev

# Production
npm start
```

## 💬 **Usage Guide**

### **Starting a Conversation**

1. **Send Initial SMS**: Use `/sms +1234567890 Hello!`
2. **Open Conversation**: Click "Open Conversation" in App Home
3. **Thread Created**: Each phone number gets its own thread

### **Replying to Messages**

#### **Method 1: Direct Thread Reply (Recommended)**
1. Go to the conversation thread
2. Type your message directly
3. Press Enter → Automatically sends as SMS

#### **Method 2: Quick Reply Button**
1. Click "Quick Reply" button in the thread
2. Type your message in the modal
3. Click "Send SMS"

#### **Method 3: Slash Command**
1. Use `/sms +1234567890 Your message here`
2. Works from any channel

### **Logging to Salesforce**

1. **Open App Home** → See all conversations
2. **Click "Log to Salesforce"** → Creates a Case
3. **Case Created** → Full conversation history included

## 🔄 **Conversation Flow**

```
1. Customer sends SMS → Twilio webhook → Stored in database
2. User opens App Home → Sees new conversation
3. User clicks "Open Conversation" → Thread created
4. User types in thread → SMS sent to customer
5. Customer replies → Message appears in thread
6. User clicks "Log to Salesforce" → Case created
```

## 🎨 **User Experience**

### **App Home Dashboard**
- 📱 List of all SMS conversations
- 📊 Message counts and last activity
- 🔘 Quick action buttons for each conversation

### **Conversation Threads**
- 💬 Natural chat interface
- 📅 Organized by date
- ✅ Delivery confirmations
- 🔄 Real-time updates

### **Salesforce Integration**
- 📋 Formatted conversation export
- 🏷️ Proper Case categorization
- 📞 Phone number tracking
- ⏰ Timestamp preservation

## 🔧 **Customization**

### **Custom Salesforce Fields**

Edit `salesforce-handler.js` to add custom fields:

```javascript
const caseData = {
  Subject: `SMS Conversation with ${conversation.phoneNumber}`,
  Description: this.formatConversationForSalesforce(conversation),
  Status: 'New',
  Origin: 'SMS',
  Priority: 'Medium',
  Type: 'Question',
  // Add your custom fields here
  Custom_Field__c: 'Custom Value'
};
```

### **Custom Message Formatting**

Modify `conversation-manager.js` to change how messages appear:

```javascript
// In updateConversationDisplay method
let messageText = '';
if (lastMessage.direction === 'incoming') {
  messageText = `📨 *From ${conversation.phoneNumber}* (${timestamp})\n${lastMessage.content}`;
} else {
  messageText = `📤 *To ${conversation.phoneNumber}* (${timestamp})\n${lastMessage.content}`;
}
```

## 🚀 **Deployment**

### **Heroku**
```bash
heroku create your-app-name
heroku config:set SLACK_BOT_TOKEN=your-token
heroku config:set SLACK_SIGNING_SECRET=your-secret
# ... set all other environment variables
git push heroku main
```

### **Railway**
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

### **DigitalOcean App Platform**
1. Create new app
2. Connect repository
3. Set environment variables
4. Deploy

## 🔍 **Webhook URLs**

After deployment, update these URLs:

- **Slack Event Subscriptions**: `https://your-domain.com/slack/events`
- **Slack Slash Commands**: `https://your-domain.com/slack/events`
- **Twilio SMS Webhook**: `https://your-domain.com/webhook/sms/sms`

## 🧪 **Testing**

### **Health Check**
```bash
curl https://your-domain.com/webhook/sms/health
```

### **Test SMS Sending**
```bash
curl -X POST https://your-domain.com/webhook/sms/test-sms \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'
```

### **View Conversations**
```bash
curl https://your-domain.com/webhook/sms/conversations
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Slack app not responding**
   - Check bot token and signing secret
   - Verify webhook URLs are correct

2. **SMS not sending**
   - Verify Twilio credentials
   - Check phone number format
   - Ensure Twilio account has sufficient balance

3. **Salesforce login fails**
   - Check username, password, and security token
   - Verify user has Case creation permissions

4. **Threads not working**
   - Ensure bot has proper permissions
   - Check that conversations are being stored in database

### **Debug Mode**

Set `NODE_ENV=development` for detailed logging.

## 📊 **Monitoring**

The app includes several monitoring endpoints:

- `/webhook/sms/health` - Health check
- `/webhook/sms/conversations` - View all conversations
- `/webhook/sms/twilio-info` - Twilio account information

## 🔒 **Security**

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Consider using OAuth for Salesforce instead of username/password
- Implement rate limiting for production use

## 📈 **Future Enhancements**

- [ ] Multi-user conversation collaboration
- [ ] Conversation templates
- [ ] Advanced Salesforce field mapping
- [ ] Message search functionality
- [ ] Conversation analytics
- [ ] Automated responses based on keywords

## 📄 **License**

MIT License - see LICENSE file for details

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ for seamless SMS-Slack-Salesforce integration**
