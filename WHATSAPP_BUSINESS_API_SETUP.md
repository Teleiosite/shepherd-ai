# Setting Up WhatsApp Business Cloud API

This guide will help you set up the official WhatsApp Business Cloud API with Shepherd AI. This allows you to send and receive WhatsApp messages from **any device** (mobile, tablet, computer) without needing the bridge app.

---

## 🌟 Benefits of WhatsApp Business Cloud API

✅ **Works on Mobile** - Access from phones, tablets, any device  
✅ **No Bridge App Needed** - Everything runs in the cloud  
✅ **Official & Reliable** - Won't get banned, fully supported by Meta  
✅ **Multi-User Access** - Multiple staff can use the same system  
✅ **Professional** - Get verified business badge on WhatsApp  
✅ **Scalable** - Handle unlimited messages  

---

## 💰 Pricing

| Usage | Cost |
|-------|------|
| First 1,000 conversations/month | **FREE** |
| Additional conversations | $0.005 - $0.10 each (varies by country) |

**Note:** A "conversation" = 24-hour messaging window with a contact.

---

## 📋 Prerequisites

Before starting, you'll need:

1. **Facebook Business Account** (free to create)
2. **Business Phone Number** (can be mobile or landline)
3. **Business Website or Email** (for verification)
4. **Valid Business Documents** (business registration, tax ID, etc.)

---

## 🚀 Step 1: Create Facebook Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **"Create Account"**
3. Enter your business name
4. Fill in your details and submit

---

## 📱 Step 2: Set Up WhatsApp Business Platform

### 2.1 Access Meta for Developers

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Click **"Next"**

### 2.2 Configure Your App

1. **App Name:** Enter a name (e.g., "My Church WhatsApp")
2. **Business Account:** Select your business account
3. Click **"Create App"**

### 2.3 Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"** in the products list
2. Click **"Set Up"**
3. Follow the setup wizard

---

## 🔐 Step 3: Get Your API Credentials

### 3.1 Get Phone Number ID

1. In WhatsApp settings, go to **"API Setup"**
2. Under **"From"** section, you'll see your **Phone Number ID**
3. **Copy this number** (looks like: `104523456789012345`)

> **Important:** You'll get a **test number** first. To use your own number, click **"Add phone number"** and verify it.

### 3.2 Generate Access Token

1. In the same **"API Setup"** page
2. Click **"Generate Access Token"**
3. Set permissions: Select **whatsapp_business_messaging** and **whatsapp_business_management**
4. Click **"Generate"**
5. **Copy the token** (starts with `EAAG...`)

> **Security Warning:** Never share your access token publicly! Treat it like a password.

---

## ✅ Step 4: Verify Your Business (Required for Production)

### Why Verify?

- **Test Phase:** Limited to 50 recipients, 250 messages/day
- **After Verification:** Unlimited messages to anyone

### Verification Steps:

1. Go to **"Business Settings"** in Meta Business Suite
2. Click **"Security Center"** → **"Start Verification"**
3. Upload required documents:
   - Business registration certificate
   - Tax ID or business license
   - Proof of address
4. Wait 1-3 business days for approval

---

## 🔗 Step 5: Connect to Shepherd AI

### 5.1 Log into Shepherd AI

1. Go to [shepherd-ai.vercel.app](https://shepherd-ai.vercel.app)
2. Log in to your account
3. Navigate to **Settings**

### 5.2 Configure WhatsApp Settings

1. Scroll to **"WhatsApp Delivery Method"**
2. Click **"Meta Cloud API"** (not "WPPConnect Bridge")
3. Enter your credentials:
   - **Phone Number ID:** Paste the ID from Step 3.1
   - **Permanent Access Token:** Paste the token from Step 3.2
4. Click **"Save Settings"**

---

## 🧪 Step 6: Test Your Setup

### 6.1 Test Message

1. In Shepherd AI, go to **"Live Chats"**
2. Add a test contact (use your personal phone number)
3. Send a test message
4. Check your phone - you should receive the message!

### 6.2 Verify Webhook (Optional)

If you want to receive incoming messages:

1. In Meta Developers, go to **"WhatsApp"** → **"Configuration"**
2. Click **"Edit"** under Webhook
3. Enter webhook URL: `https://shepherd-ai-backend.onrender.com/api/whatsapp/webhook`
4. Enter verify token: `shepherd_verify_token`
5. Subscribe to message fields: `messages`, `message_status`

---

## 📝 Step 7: Message Templates (For Outbound Messages)

WhatsApp Business API requires **pre-approved templates** for starting conversations.

### Create a Template:

1. In Meta Business Manager, go to **"WhatsApp Manager"**
2. Click **"Message Templates"** → **"Create Template"**
3. Fill in template details:
   - **Name:** `welcome_message`
   - **Category:** `MARKETING` or `UTILITY`
   - **Language:** English (or your preferred language)
   - **Message:** 
     ```
     Hello {{1}}, welcome to {{2}}! We're excited to have you.
     ```
4. Submit for approval (usually takes 1-2 hours)

### Using Templates in Shepherd AI:

Templates will be automatically used for first-time messages to contacts.

---

## 🎯 Best Practices

### ✅ DO:

- **Respond within 24 hours** to maintain conversation window
- **Get user consent** before messaging
- **Use approved templates** for outbound messages
- **Monitor your usage** to avoid surprise costs
- **Keep access token secure**

### ❌ DON'T:

- Send spam or promotional content without consent
- Share your access token
- Use vulgar or inappropriate language
- Send messages outside business hours (respect 9am-9pm)

---

## 🆘 Troubleshooting

### Issue: "Invalid Phone Number ID"

**Solution:** 
1. Double-check you copied the correct Phone Number ID
2. Make sure there are no extra spaces
3. Verify your phone number is fully set up in Meta

### Issue: "Access Token Expired"

**Solution:**
1. Generate a new permanent access token
2. In Meta Developers, go to "System Users"
3. Create a system user with permanent token
4. Replace the old token in Shepherd AI settings

### Issue: "Message Not Delivered"

**Possible Causes:**
- Recipient blocked your business number
- Your business is not verified (test phase limits)
- Template not approved yet
- Outside 24-hour conversation window

**Solution:**
- Verify your business to remove limits
- Use approved templates
- Check Meta's "Message Insights" for details

---

## 📊 Monitoring Usage

### Check Message Count:

1. Go to **Meta Business Manager**
2. Click **"WhatsApp Manager"**
3. View **"Analytics"** tab
4. Monitor:
   - Messages sent
   - Delivery rate
   - Costs accrued

### Set Usage Alerts:

1. In **"WhatsApp Manager"** → **"Settings"**
2. Click **"Spending Limits"**
3. Set monthly budget (e.g., $50)
4. Add email for alerts

---

## 🔄 Switching from Bridge to Cloud API

Already using the WPPConnect Bridge? Here's how to switch:

1. **Keep your contacts** - No need to re-import
2. **Change delivery method** in Settings to "Meta Cloud API"
3. **Enter your credentials** from this guide
4. **Stop running the bridge app** - You won't need it anymore!
5. **Test thoroughly** before fully switching

---

## 🌐 Additional Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Pricing Information](https://developers.facebook.com/docs/whatsapp/pricing)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)

---

## 💬 Support

Need help? 

- **Documentation Issues:** Open an issue on [GitHub](https://github.com/Teleiosite/shepherd-ai/issues)
- **Meta API Issues:** Contact [Meta Support](https://business.facebook.com/business/help)
- **Shepherd AI Questions:** Check the main README or create a discussion

---

## 🎉 You're All Set!

Your WhatsApp Business Cloud API is now connected to Shepherd AI. You can now send and receive messages from any device without needing the bridge app!

**Next Steps:**
- Add your contacts
- Create message templates
- Start engaging your community!

---

**Happy Shepherding! 🐑✨**
