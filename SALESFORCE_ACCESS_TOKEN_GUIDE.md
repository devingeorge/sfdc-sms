# Salesforce Access Token Setup Guide

## 🎯 **Why Use Access Tokens?**

Access tokens are the **modern, secure way** to authenticate with Salesforce APIs. They're better than username/password because:

- ✅ **More secure** - No need to store passwords
- ✅ **Better performance** - No login required on each request
- ✅ **Easier to manage** - Tokens can be refreshed automatically
- ✅ **Industry standard** - OAuth 2.0 best practice

## 🔑 **How to Get a Salesforce Access Token**

### **Method 1: From Salesforce Setup (Easiest)**

1. **Log into your Salesforce org**
2. **Click the gear icon** (⚙️) → **"Setup"**
3. **In Quick Find**, search for **"Connected Apps"**
4. **Click "New Connected App"**
5. **Fill in the required fields**:
   - **Connected App Name**: `SMS Salesforce Integration`
   - **API Name**: `SMS_Salesforce_Integration`
   - **Contact Email**: your email
6. **Enable OAuth Settings**:
   - ✅ Check **"Enable OAuth Settings"**
   - **Callback URL**: `https://localhost:3000/oauth/callback`
   - **Selected OAuth Scopes**: 
     - ✅ `Access and manage your data (api)`
     - ✅ `Perform requests on your behalf at any time (refresh_token, offline_access)`
7. **Click "Save"**
8. **After saving, you'll see**:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)
9. **Click "Manage Connected Apps"** → **"Edit Policies"**
10. **Set IP Relaxation**: `Relax IP restrictions`
11. **Set OAuth Policies**: `Admin approved users are pre-authorized`

### **Method 2: Using Workbench (Alternative)**

1. **Go to** [workbench.developerforce.com](https://workbench.developerforce.com)
2. **Login** with your Salesforce credentials
3. **Go to** `utilities` → `REST Explorer`
4. **Click "Get Access Token"**
5. **Copy the access token** from the response

### **Method 3: Using Postman (For Testing)**

1. **Open Postman**
2. **Create a new request**
3. **Set method to POST**
4. **URL**: `https://login.salesforce.com/services/oauth2/token`
5. **Body** (form-data):
   - `grant_type`: `password`
   - `client_id`: your connected app consumer key
   - `client_secret`: your connected app consumer secret
   - `username`: your Salesforce username
   - `password`: your Salesforce password + security token
6. **Send the request**
7. **Copy the `access_token`** from the response

## 🔧 **Using the Access Token**

### **Option 1: Direct Access Token (Simplest)**

Add these to your `.env` file:

```env
SALESFORCE_ACCESS_TOKEN=00D000000000000!AR8AQM...your-actual-token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
```

### **Option 2: OAuth Credentials (More Flexible)**

Add these to your `.env` file:

```env
SALESFORCE_CLIENT_ID=3MVG9...your-consumer-key
SALESFORCE_CLIENT_SECRET=1234567890...your-consumer-secret
SALESFORCE_USERNAME=your-username@company.com
SALESFORCE_PASSWORD=your-password
```

## 📋 **What You Need to Copy**

### **From Connected App Setup:**
- **Consumer Key** (Client ID) - starts with `3MVG9...`
- **Consumer Secret** (Client Secret) - long string of letters/numbers
- **Instance URL** - looks like `https://yourcompany.salesforce.com`

### **From Access Token Response:**
- **Access Token** - very long string starting with `00D000000000000!AR8AQM...`
- **Instance URL** - same as above

## 🧪 **Testing Your Access Token**

Once you've added your credentials to `.env`, test the connection:

```bash
npm test
```

You should see:
```
✅ Salesforce handler initialization successful
```

Or start the app:
```bash
npm start
```

You should see:
```
✅ Successfully authenticated with Salesforce using access token
```

## 🔄 **Token Refresh (Advanced)**

Access tokens expire after a certain time. The updated handler supports automatic refresh:

- **Option 1**: Use OAuth credentials - tokens refresh automatically
- **Option 2**: Use direct access token - you'll need to refresh manually

## 🚨 **Troubleshooting**

### **"Invalid access token" error:**
- Check that the token is copied correctly
- Ensure the instance URL is correct
- Verify the token hasn't expired

### **"Insufficient privileges" error:**
- Check that your user has Case creation permissions
- Verify the connected app has the right scopes

### **"Invalid client" error:**
- Check that the Consumer Key and Secret are correct
- Ensure the connected app is active

## 🎉 **Benefits of This Approach**

- ✅ **No security tokens needed**
- ✅ **No password storage**
- ✅ **Better error handling**
- ✅ **Automatic token refresh**
- ✅ **Industry standard OAuth 2.0**

---

**Using access tokens makes your Salesforce integration more secure and reliable! 🚀**
