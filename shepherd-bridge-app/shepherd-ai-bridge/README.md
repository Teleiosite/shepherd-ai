# 🐑 Shepherd AI WhatsApp Bridge - Desktop App

## ✨ What is This?

A **user-friendly desktop application** that runs the WhatsApp bridge for Shepherd AI without any terminal windows. Perfect for non-technical users!

## 🎯 Features

- ✅ **No Terminal Windows** - Everything runs in a clean GUI
- ✅ **System Tray Integration** - Minimize to tray, run in background
- ✅ **QR Code in App** - Scan WhatsApp QR code directly in the app
- ✅ **One-Click Start/Stop** - Simple button controls
- ✅ **Auto-Restart** - Automatically restarts if bridge crashes
- ✅ **Real-time Logs** - View bridge activity
- ✅ **Connection Status** - Visual indicators for WhatsApp connection

## 📦 Installation (For Users)

### Option 1: Pre-built Installer (Coming Soon)
1. Download `Shepherd-AI-Bridge-Setup.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from desktop shortcut

### Option 2: Portable Version (Coming Soon)
1. Download `Shepherd-AI-Bridge-Portable.exe`
2. Run directly (no installation needed)

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ installed
- npm installed

### Install Dependencies
```bash
npm install
```

### Run Development Version
```bash
npm start
```

### Build Installer
```bash
# Build Windows installer
npm run build

# Build portable version
npm run build:portable
```

Output files will be in the `dist/` folder.

## 🚀 How to Use

### First Time Setup

1. **Launch the app**
   - Double-click the desktop icon or
   - Find "Shepherd AI Bridge" in Start Menu

2. **Start the bridge**
   - Click the **"Start Bridge"** button

3. **Scan QR Code**
   - Click **"View QR Code"** button
   - A QR code will appear
   - Open WhatsApp on your phone
   - Go to Menu → Linked Devices → Link a Device
   - Scan the QR code

4. **Done!**
   - Status will change to "Connected"
   - Bridge is now running
   - You can minimize to system tray

### Daily Use

- **Start**: Click "Start Bridge" button
- **Stop**: Click "Stop Bridge" button
- **Minimize**: Click the minimize button (app goes to system tray)
- **View Logs**: Click "Logs" button to see activity
- **Exit**: Right-click tray icon → Exit

## 📊 System Tray

When minimized, the app runs in your system tray (bottom-right of Windows taskbar).

**Right-click the tray icon for:**
- Show Window
- Disconnect/Connect
- Settings
- Exit

## 🔧 Troubleshooting

### "Port already in use" error
- Close any other instances of the bridge
- Click "Stop Bridge" then "Start Bridge" again

### QR Code Won't Load
- Make sure the bridge is running (click "Start Bridge")
- Wait a few seconds for the QR code to generate
- Try clicking "View QR Code" again

### WhatsApp Won't Connect
- Make sure WhatsApp Web works in your browser first
- Try restarting the bridge
- Ensure your phone has internet connection

### Bridge Keeps Crashing
- Check the Logs panel for error messages
- Make sure no other WhatsApp sessions are running
- Try restarting the app

## 📁 Project Structure

```
shepherd-ai-bridge/
├── electron.js              # Main Electron process
├── preload.js               # IPC security layer
├── package.json             # Dependencies
├── src/
│   ├── index.html           # Main window UI
│   ├── css/
│   │   └── main.css         # Styling
│   ├── js/
│   │   └── renderer.js      # UI logic
│   └── assets/
│       ├── icon.png         # App icon
│       └── tray-icon.png    # System tray icon
└── bridge/
    └── bridge.js            # WPPConnect bridge code
```

## 🎨 Screenshots

### Main Window
- Clean, modern interface
- One-click start/stop
- Real-time status indicators

### QR Code Modal
- Large, scannable QR code
- Step-by-step instructions
- Success feedback

### System Tray
- Minimize to background
- Quick actions menu
- Always accessible

## 🚧 Known Limitations

- **Node.js Required**: Must have Node.js installed (for now)
- **Windows Only**: Currently only tested on Windows
- **Single Instance**: Can only run one bridge at a time

## 🔜 Roadmap

- [ ] Auto-update functionality
- [ ] Settings panel (auto-start, notifications)
- [ ] Message statistics dashboard
- [ ] Multi-language support
- [ ] macOS and Linux versions
- [ ] Standalone build (no Node.js required)

## 📝 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

**Abomide Oluwaseye**  
- Email: abosey23@gmail.com
- GitHub: https://github.com/Teleiosite
- LinkedIn: www.linkedin.com/in/abomide-oluwaseye

## 🆘 Support

For issues and questions:
1. Check the Troubleshooting section above
2. View logs in the app for error details
3. Create an issue on GitHub
4. Contact support

---

**Built with ❤️ for the Kingdom**
