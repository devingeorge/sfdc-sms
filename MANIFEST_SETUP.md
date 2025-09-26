# Slack App Manifest Setup Guide

## 🎯 **What is a Slack App Manifest?**

A Slack app manifest is a configuration file that defines all the settings, permissions, and features of your Slack app in a single file. Instead of manually configuring each setting in the Slack API dashboard, you can use the manifest to set up your entire app at once.

## 📁 **Manifest Files Included**

This project includes two manifest formats:

1. **`slack-app-manifest.yaml`** - YAML format (human-readable)
2. **`slack-app-manifest.json`** - JSON format (alternative)

Both contain the same configuration - use whichever you prefer.

## 🚀 **How to Use the Manifest**

### **Method 1: Create App from Manifest (Recommended)**

1. **Go to Slack API Dashboard**
   - Visit [api.slack.com/apps](https://api.slack.com/apps)
   - Click **"Create New App"**
   - Select **"From an app manifest"**

2. **Choose Your Workspace**
   - Select the workspace where you want to install the app
   - Click **"Next"**

3. **Upload the Manifest**
   - Copy the contents of `slack-app-manifest.yaml` or `slack-app-manifest.json`
   - Paste it into the manifest editor
   - Click **"Next"**

4. **Review and Create**
   - Review the app configuration
   - Click **"Create"**

5. **Install the App**
   - Click **"Install to Workspace"**
   - Authorize the app
   - Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### **Method 2: Apply Manifest to Existing App**

If you already have a Slack app created:

1. **Go to Your App Settings**
   - Visit [api.slack.com/apps](https://api.slack.com/apps)
   - Click on your existing app

2. **Go to App Manifest**
   - In the left sidebar, click **"App Manifest"**
   - Click **"Update"**

3. **Upload the Manifest**
   - Copy the contents of `slack-app-manifest.yaml` or `slack-app-manifest.json`
   - Paste it into the editor
   - Click **"Save Changes"**

4. **Reinstall the App**
   - Go to **"Install App"**
   - Click **"Reinstall to Workspace"**
   - Authorize the updated permissions

## 🔧 **Manifest Configuration Explained**

### **Display Information**
```yaml
display_information:
  name: SMS Salesforce Integration
  description: Send and receive SMS messages with Salesforce logging
  background_color: "#2c2d30"
  long_description: |
    A powerful Slack app that enables SMS communication...
```
- **name**: The app name that appears in Slack
- **description**: Short description shown in app directory
- **background_color**: App icon background color
- **long_description**: Detailed description of features

### **Features**
```yaml
features:
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: SMS Salesforce Bot
    always_online: true
  slash_commands:
    - command: /sms
      description: Send SMS message
      usage_hint: "<phone_number> <message>"
```
- **app_home**: Enables the App Home interface
- **bot_user**: Configures the bot user
- **slash_commands**: Defines the `/sms` command

### **OAuth Scopes**
```yaml
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - chat:write
      - commands
      - im:history
      - im:read
      - im:write
      - users:read
      - app_mentions:write
```
These scopes allow the app to:
- Read and write messages
- Handle slash commands
- Access user information
- Manage app home

### **Event Subscriptions**
```yaml
settings:
  event_subscriptions:
    bot_events:
      - app_home_opened
```
- **app_home_opened**: Triggers when users open the App Home

## 🔗 **After Using the Manifest**

### **1. Get Your Credentials**
After creating the app from the manifest:

1. **Bot User OAuth Token**
   - Go to **"OAuth & Permissions"**
   - Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

2. **Signing Secret**
   - Go to **"Basic Information"**
   - Copy the **"Signing Secret"**

3. **Update Your .env File**
   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_SIGNING_SECRET=your-signing-secret-here
   ```

### **2. Configure Webhook URLs**
After deploying your app, update these URLs:

1. **Event Subscriptions**
   - Go to **"Event Subscriptions"**
   - Set **Request URL**: `https://your-domain.com/slack/events`

2. **Slash Commands**
   - Go to **"Slash Commands"**
   - Set **Request URL**: `https://your-domain.com/slack/events`

### **3. Test the App**
1. **Open App Home**
   - Find your app in the Slack sidebar
   - Click on it to open the App Home

2. **Test Slash Command**
   - Use `/sms +1234567890 Hello!` in any channel

3. **Verify Permissions**
   - Check that the app has all required permissions

## 🎨 **Customizing the Manifest**

### **Change App Name**
```yaml
display_information:
  name: Your Custom SMS App
```

### **Add More Slash Commands**
```yaml
slash_commands:
  - command: /sms
    description: Send SMS message
    usage_hint: "<phone_number> <message>"
  - command: /sms-status
    description: Check SMS status
    usage_hint: "<message_id>"
```

### **Add More Bot Events**
```yaml
settings:
  event_subscriptions:
    bot_events:
      - app_home_opened
      - message.channels
      - message.groups
      - message.im
```

### **Change App Color**
```yaml
display_information:
  background_color: "#36a2eb"  # Blue
  # or
  background_color: "#ff6b6b"  # Red
  # or
  background_color: "#4ecdc4"  # Teal
```

## 🐛 **Troubleshooting**

### **Manifest Validation Errors**
- Check YAML/JSON syntax
- Ensure all required fields are present
- Verify scope names are correct

### **Permission Issues**
- Make sure all required scopes are included
- Reinstall the app after updating scopes
- Check that the app is installed in the correct workspace

### **Webhook Issues**
- Ensure your app is deployed and accessible
- Verify webhook URLs are correct
- Check that HTTPS is enabled

## 📋 **Quick Setup Checklist**

- [ ] Copy manifest content
- [ ] Create app from manifest
- [ ] Install app to workspace
- [ ] Copy Bot User OAuth Token
- [ ] Copy Signing Secret
- [ ] Update .env file
- [ ] Deploy your application
- [ ] Update webhook URLs
- [ ] Test the app

## 🎉 **Benefits of Using the Manifest**

- ✅ **Faster setup** - Configure everything at once
- ✅ **Consistent configuration** - Same settings every time
- ✅ **Version control** - Track changes to app configuration
- ✅ **Easy sharing** - Share app configuration with team
- ✅ **Reproducible** - Recreate app settings easily

---

**Using the manifest makes setting up your Slack app much faster and more reliable! 🚀**
