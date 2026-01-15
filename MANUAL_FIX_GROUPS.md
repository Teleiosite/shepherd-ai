# 🔧 **MANUAL FIX - Add Group Manager to Bridge**

## **File to Edit:**
`shepherd-bridge-app/bridge-core.js`

## **Line Number:** 69

## **Current Code (lines 67-70):**
```javascript
    // Initialize polling with client session
    polling.initPolling(client, () => bridgeStatus);
    console.log('✅ Polling initialized with client session');

    // Incoming messages
```

## **Change To:**
```javascript
    // Initialize polling with client session
    polling.initPolling(client, () => bridgeStatus);
    console.log('✅ Polling initialized with client session');
    
    // Start polling for messages and groups
    polling.startPolling('1DCFEA1A');

    // Incoming messages
```

## **What This Does:**
- Calls `startPolling()` with your bridge connection code
- This triggers the group manager initialization
- Groups will start syncing automatically

## **After Making This Change:**

1. **Save the file**
2. **Restart the bridge:**
   ```powershell
   # Stop current bridge (Ctrl+C in terminal)
   npm start
   ```

3. **You should see NEW logs:**
   ```
   👥 Initializing Group Manager...
   🔄 Syncing WhatsApp groups...
   ```

## **That's It!**

This single 1-line addition will fix the Groups syncing issue! ✅

---

**Then test:** Go to Groups page → Click "Sync Groups" → Your WhatsApp groups should appear!
