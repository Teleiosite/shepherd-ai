# 🚀 Building and Releasing the Shepherd AI Bridge

## 📦 Build the Installer

### Step 1: Navigate to Bridge Directory
```bash
cd shepherd-bridge-app/shepherd-ai-bridge
```

### Step 2: Install Dependencies (if not already done)
```bash
npm install
```

### Step 3: Build the Installer
```bash
npm run build
```

This will create:
- `dist/Shepherd-AI-Bridge-Setup.exe` - Windows installer (recommended)
- `dist/Shepherd-AI-Bridge-Portable.exe` - Portable version (no installation)

---

## 📤 Upload to GitHub Releases

### Step 1: Navigate to GitHub Releases
Go to: https://github.com/Teleiosite/shepherd-ai/releases

### Step 2: Create New Release
1. Click **"Draft a new release"** button
2. Fill in the details:

**Tag version:** `v1.0.0`  
**Release title:** `Shepherd AI Bridge v1.0.0 - Initial Release`

**Description:**
```markdown
# 🐑 Shepherd AI WhatsApp Bridge v1.0.0

## What's New
✨ **First Official Release!**

### Features
- 🔌 WhatsApp Web Integration via WPPConnect
- 📱 QR Code Scanning
- 💬 Real-time Message Sync
- 🔄 Auto-Reconnect
- 📊 System Tray Support
- 🪟 Windows Desktop App

### Installation
1. Download `Shepherd-AI-Bridge-Setup.exe`
2. Run the installer
3. Open the app and scan QR code
4. Connect to Shepherd AI web app

### System Requirements
- Windows 10/11
- Node.js 18+ (bundled in installer)
- Internet connection

### Support
For issues, visit: https://github.com/Teleiosite/shepherd-ai/issues

---
**Built with ❤️ for the Kingdom**
```

### Step 3: Upload Files
- Drag and drop `Shepherd-AI-Bridge-Setup.exe` to the upload area
- (Optional) Also upload the portable version

### Step 4: Publish
- Set as **Latest release** (check the box)
- Click **"Publish release"** button

---

## ✅ Verify the Release

After publishing, test the download:

1. Go to: https://github.com/Teleiosite/shepherd-ai/releases/latest
2. Click on `Shepherd-AI-Bridge-Setup.exe` to test download
3. The direct download link will be:
   ```
   https://github.com/Teleiosite/shepherd-ai/releases/latest/download/Shepherd-AI-Bridge-Setup.exe
   ```

---

## 🔄 Future Updates

When you have a new version:

### Step 1: Update Version
Edit `shepherd-bridge-app/shepherd-ai-bridge/package.json`:
```json
{
  "version": "1.1.0"  // Update this
}
```

### Step 2: Rebuild
```bash
npm run build
```

### Step 3: Create New Release
- Tag: `v1.1.0`
- Title: `Shepherd AI Bridge v1.1.0`
- Upload new `.exe`
- Publish

GitHub automatically marks the latest release, and your Settings page will always download the newest version! 🎉

---

## 📊 Download Stats

After release, you can view download statistics:
- Go to your releases page
- Each release shows download counts
- Track how many users are downloading

---

## 🛡️ Security Note

GitHub automatically scans uploaded files for viruses. Users will see a green checkmark indicating the file is safe to download.

---

## 🎯 Next Steps

After publishing your first release:
1. Test the download from Settings page
2. Install and verify it works
3. Share with your team
4. Celebrate! 🎉
