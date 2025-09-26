# Complete Setup Guide - Slack SMS Salesforce Integration

## 🎯 **What You'll Build**

A Slack app that can:
- 📱 Send and receive SMS messages
- 💬 Manage conversations in organized threads
- 📊 Log conversations to Salesforce as Cases
- 🔄 Handle multiple conversations simultaneously

## 📋 **Prerequisites**

- Node.js (version 14 or higher)
- A Slack workspace where you can create apps
- A Salesforce org (free Developer Edition works)
- A Twilio account (free trial available)

## 🚀 **Step 1: Get a Twilio Account (Free Trial)**

### **1.1 Sign Up for Twilio**
1. Go to [twilio.com](https://www.twilio.com)
2. Click "Sign up for free"
3. Fill out the registration form
4. Verify your phone number and email

### **1.2 Get Your Credentials**
1. After signing up, go to your [Twilio Console](https://console.twilio.com)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Note these down - you'll need them later

### **1.3 Get a Phone Number**
1. In the Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with SMS capabilities
3. Purchase the number (free trial includes $15 credit)
4. Note the phone number - you'll need it later

### **1.4 Configure Webhook (Later)**
We'll set up the webhook after deploying the app.

## 🏗️ **Step 2: Set Up Slack App**

### **Option A: Use App Manifest (Recommended) 🚀**

1. **Go to Slack API Dashboard**
   - Visit [api.slack.com/apps](https://api.slack.com/apps)
   - Click **"Create New App"**
   - Select **"From an app manifest"**

2. **Choose Your Workspace**
   - Select the workspace where you want to install the app
   - Click **"Next"**

3. **Upload the Manifest**
   - Copy the contents of `slack-app-manifest.yaml` from this project
   - Paste it into the manifest editor
   - Click **"Next"**

4. **Review and Create**
   - Review the app configuration
   - Click **"Create"**

5. **Install the App**
   - Click **"Install to Workspace"**
   - Authorize the app
   - Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)
   - Go to **"Basic Information"** and copy the **"Signing Secret"**

**📋 See `MANIFEST_SETUP.md` for detailed manifest instructions**

### **Option B: Manual Setup**

If you prefer to set up manually:

1. **Create Slack App**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click **"Create New App"** → **"From scratch"**
   - Enter app name: "SMS Salesforce Integration"
   - Select your workspace

2. **Configure OAuth & Permissions**
   - Go to **"OAuth & Permissions"**
   - Add these Bot Token Scopes:
     - `app_mentions:read`, `channels:history`, `chat:write`
     - `commands`, `im:history`, `im:read`, `im:write`, `users:read`

3. **Create Slash Command**
   - Go to **"Slash Commands"** → **"Create New Command"**
   - Command: `/sms`, Description: `Send SMS message`
   - Usage Hint: `<phone_number> <message>`

4. **Enable Event Subscriptions**
   - Go to **"Event Subscriptions"** → Toggle **"Enable Events"** On
   - Subscribe to bot events: `app_home_opened`

5. **Configure App Home**
   - Go to **"App Home"** → Enable messages tab

6. **Install App**
   - Go to **"Install App"** → **"Install to Workspace"**
   - Copy **"Bot User OAuth Token"** and **"Signing Secret"**

## ☁️ **Step 3: Set Up Salesforce**

### **3.1 Get Salesforce Developer Edition (Free)**
1. Go to [developer.salesforce.com](https://developer.salesforce.com)
2. Click **"Sign Up"**
3. Fill out the form to get a free Developer Edition org
4. Verify your email and set up your org

### **3.2 Get Your Credentials**
1. Log into your Salesforce org
2. Go to **Setup** (gear icon) → **My Personal Information** → **Reset My Security Token**
3. Click **"Reset Security Token"**
4. Check your email for the security token
5. Note your username, password, and security token

### **3.3 Verify Case Object Access**
1. In Salesforce, go to **Setup** → **Object Manager** → **Case**
2. Ensure you have **Create** and **Read** permissions
3. If not, contact your Salesforce admin

## 💻 **Step 4: Set Up the Application**

### **4.1 Install Dependencies**
```bash
cd "/Users/devin.george/Salesforce SMS"
npm install
```

### **4.2 Configure Environment Variables**
```bash
cp env.example .env
```

Edit the `.env` file with your credentials:

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

# Server Configuration
PORT=3000
NODE_ENV=development
```

### **4.3 Test the Setup**
```bash
npm test
```

You should see:
```
🧪 Running basic tests...
📊 Testing database...
✅ Database initialization successful
📱 Testing SMS handler...
✅ Mock SMS handler initialization successful
📞 Testing phone number validation...
  +1234567890 → Valid: true, Formatted: +1234567890
  ...
🎉 All tests passed!
```

### **4.4 Start the Application**
```bash
npm start
```

You should see:
```
⚡️ Slack SMS Salesforce app is running!
💬 Hybrid mode: Direct thread replies + Quick Reply buttons
```

## 🌐 **Step 5: Deploy to the Cloud**

### **5.1 Deploy to Heroku (Recommended)**

1. **Install Heroku CLI** from [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

2. **Create Heroku App**:
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables**:
   ```bash
   heroku config:set SLACK_BOT_TOKEN=your-bot-token
   heroku config:set SLACK_SIGNING_SECRET=your-signing-secret
   heroku config:set TWILIO_ACCOUNT_SID=your-account-sid
   heroku config:set TWILIO_AUTH_TOKEN=your-auth-token
   heroku config:set TWILIO_PHONE_NUMBER=+1234567890
   heroku config:set SALESFORCE_USERNAME=your-username
   heroku config:set SALESFORCE_PASSWORD=your-password
   heroku config:set SALESFORCE_SECURITY_TOKEN=your-security-token
   ```

4. **Deploy**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

5. **Get Your App URL**:
   ```bash
   heroku apps:info
   ```
   Note the URL (e.g., `https://your-app-name.herokuapp.com`)

### **5.2 Alternative: Deploy to Railway**

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables in the dashboard
4. Deploy automatically

## 🔗 **Step 6: Configure Webhooks**

### **6.1 Update Slack App URLs**
1. Go back to your Slack app settings
2. Update these URLs with your deployed app URL:
   - **Event Subscriptions** → Request URL: `https://your-app-name.herokuapp.com/slack/events`
   - **Slash Commands** → Request URL: `https://your-app-name.herokuapp.com/slack/events`

### **6.2 Configure Twilio Webhook**
1. Go to your [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number
4. In the **Messaging** section, set:
   - **Webhook URL**: `https://your-app-name.herokuapp.com/webhook/sms/sms`
   - **HTTP Method**: POST
5. Click **"Save Configuration"**

## 🧪 **Step 7: Test the Integration**

### **7.1 Test Slack App**
1. Go to your Slack workspace
2. Find your app in the sidebar
3. Click on it to open the App Home
4. You should see the SMS Conversations interface

### **7.2 Test SMS Sending**
1. Use the slash command: `/sms +1234567890 Hello from Slack!`
2. Check that the message appears in the App Home
3. Open the conversation to see the thread

### **7.3 Test SMS Receiving**
1. Send an SMS to your Twilio number from your phone
2. Check that it appears in the Slack App Home
3. Open the conversation to see the thread

### **7.4 Test Salesforce Logging**
1. Open a conversation in Slack
2. Click **"Log to Salesforce"**
3. Check your Salesforce org for the new Case

## 🎉 **You're Done!**

Your Slack SMS Salesforce integration is now working! Here's what you can do:

### **Daily Usage**
1. **Send SMS**: Use `/sms +1234567890 Hello!` or open conversations in App Home
2. **Receive SMS**: Messages automatically appear in Slack threads
3. **Reply**: Type directly in threads or use Quick Reply buttons
4. **Log to Salesforce**: Click the button to create Cases

### **Features You Now Have**
- ✅ Multiple SMS conversations in organized threads
- ✅ Direct thread replies (no slash commands needed)
- ✅ Quick Reply buttons for longer messages
- ✅ Automatic conversation tracking
- ✅ One-click Salesforce logging
- ✅ Real-time message synchronization

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Slack app not responding**
   - Check that webhook URLs are correct
   - Verify bot token and signing secret
   - Ensure app is installed in workspace

2. **SMS not sending**
   - Verify Twilio credentials
   - Check Twilio account balance
   - Ensure phone number format is correct

3. **Salesforce login fails**
   - Check username, password, and security token
   - Verify user has Case creation permissions
   - Ensure org is accessible

4. **Webhooks not working**
   - Ensure your app is publicly accessible
   - Check that HTTPS is enabled
   - Verify webhook URLs are correct

### **Getting Help**

1. Check the application logs: `heroku logs --tail`
2. Test individual components using the health check endpoints
3. Review the troubleshooting section in README.md

## 🚀 **Next Steps**

- **Customize Salesforce fields** for your specific use case
- **Add conversation templates** for common responses
- **Implement user authentication** for multi-user access
- **Add conversation search** functionality
- **Create conversation analytics** dashboard

---

**Congratulations! You've successfully built a powerful SMS-Slack-Salesforce integration! 🎉**
