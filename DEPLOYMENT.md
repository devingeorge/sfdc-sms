# Deployment Guide - Slack SMS Salesforce Integration

## 🚀 **Quick Start**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. **Create data directory:**
   ```bash
   npm run setup
   ```

4. **Test the setup:**
   ```bash
   npm test
   ```

5. **Start the application:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## 🔧 **Environment Variables Required**

### **Slack Configuration**
- `SLACK_BOT_TOKEN`: Bot User OAuth Token from your Slack app
- `SLACK_SIGNING_SECRET`: Signing Secret from your Slack app

### **Twilio Configuration**
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (e.g., +1234567890)

### **Salesforce Configuration**
- `SALESFORCE_USERNAME`: Your Salesforce username
- `SALESFORCE_PASSWORD`: Your Salesforce password
- `SALESFORCE_SECURITY_TOKEN`: Your Salesforce security token

### **Optional Configuration**
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CONVERSATION_MODE`: threads (recommended) or dms

## 🌐 **Production Deployment**

### **Option 1: Heroku**

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set SLACK_BOT_TOKEN=your-token
   heroku config:set SLACK_SIGNING_SECRET=your-secret
   heroku config:set TWILIO_ACCOUNT_SID=your-account-sid
   heroku config:set TWILIO_AUTH_TOKEN=your-auth-token
   heroku config:set TWILIO_PHONE_NUMBER=+1234567890
   heroku config:set SALESFORCE_USERNAME=your-username
   heroku config:set SALESFORCE_PASSWORD=your-password
   heroku config:set SALESFORCE_SECURITY_TOKEN=your-security-token
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

### **Option 2: Railway**

1. **Connect repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on git push

### **Option 3: DigitalOcean App Platform**

1. **Create new app** in DigitalOcean
2. **Connect repository**
3. **Set environment variables**
4. **Deploy**

### **Option 4: AWS/GCP/Azure**

1. **Create container** or serverless function
2. **Set environment variables**
3. **Deploy application**
4. **Configure load balancer** if needed

## 🔗 **Webhook Configuration**

After deployment, update these URLs in your service configurations:

### **Slack Configuration**
- **Event Subscriptions URL**: `https://your-domain.com/slack/events`
- **Slash Commands URL**: `https://your-domain.com/slack/events`

### **Twilio Configuration**
- **SMS Webhook URL**: `https://your-domain.com/webhook/sms/sms`
- **Status Callback URL**: `https://your-domain.com/webhook/sms/status`

## 📊 **Monitoring & Health Checks**

### **Health Check Endpoint**
```bash
curl https://your-domain.com/webhook/sms/health
```

### **View Conversations**
```bash
curl https://your-domain.com/webhook/sms/conversations
```

### **Test SMS Sending**
```bash
curl -X POST https://your-domain.com/webhook/sms/test-sms \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'
```

### **Twilio Account Info**
```bash
curl https://your-domain.com/webhook/sms/twilio-info
```

## 🔒 **Security Considerations**

### **Environment Variables**
- Never commit `.env` file to version control
- Use secure environment variable management
- Rotate credentials regularly

### **HTTPS**
- Always use HTTPS in production
- Configure SSL certificates
- Use secure headers

### **Rate Limiting**
- Implement rate limiting for webhook endpoints
- Monitor for abuse
- Set up alerts for unusual activity

### **Database Security**
- SQLite database is stored locally
- Consider encryption for sensitive data
- Regular backups recommended

## 📈 **Scaling Considerations**

### **Database**
- SQLite is suitable for small to medium scale
- Consider PostgreSQL for larger deployments
- Implement database connection pooling

### **Memory Management**
- Monitor memory usage
- Implement conversation cleanup
- Consider message archiving

### **Load Balancing**
- Use multiple instances for high availability
- Implement sticky sessions if needed
- Monitor performance metrics

## 🐛 **Troubleshooting**

### **Common Deployment Issues**

1. **App not starting**
   - Check environment variables
   - Verify port configuration
   - Check logs for errors

2. **Slack webhooks failing**
   - Verify signing secret
   - Check webhook URLs
   - Ensure HTTPS is enabled

3. **SMS not working**
   - Verify Twilio credentials
   - Check account balance
   - Verify phone number format

4. **Salesforce integration failing**
   - Check username/password
   - Verify security token
   - Check user permissions

### **Logging**

Enable detailed logging in production:

```bash
NODE_ENV=production npm start
```

### **Debug Mode**

For development debugging:

```bash
NODE_ENV=development npm run dev
```

## 📋 **Pre-Deployment Checklist**

- [ ] All environment variables configured
- [ ] Slack app permissions set correctly
- [ ] Twilio webhook URLs configured
- [ ] Salesforce user has proper permissions
- [ ] HTTPS enabled for production
- [ ] Health check endpoints working
- [ ] Database directory created
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring set up

## 🔄 **Updates & Maintenance**

### **Regular Maintenance**
- Monitor application logs
- Check database size
- Update dependencies
- Review security settings

### **Backup Strategy**
- Regular database backups
- Environment variable backups
- Configuration backups

### **Update Process**
1. Test changes in development
2. Deploy to staging environment
3. Run integration tests
4. Deploy to production
5. Monitor for issues

## 📞 **Support**

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test webhook endpoints
4. Check service status pages
5. Review documentation

---

**Happy Deploying! 🚀**
