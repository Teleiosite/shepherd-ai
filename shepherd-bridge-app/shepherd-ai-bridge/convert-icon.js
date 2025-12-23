const sharp = require('sharp');

async function convertLogo() {
    try {
        console.log('Creating PNG icons...');

        // Create 512x512 PNG for build (electron-builder will convert to .ico automatically)
        await sharp('build/shepherd-logo.jpg')
            .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile('build/icon.png');

        // Create 256x256 for app icon
        await sharp('build/shepherd-logo.jpg')
            .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile('src/assets/icon.png');

        // Create tray icon
        await sharp('build/shepherd-logo.jpg')
            .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile('src/assets/tray-icon.png');

        console.log('✅ All icons created successfully!');
        console.log('  - build/icon.png (512x512 - for installer)');
        console.log('  - src/assets/icon.png (256x256 - app icon)');
        console.log('  - src/assets/tray-icon.png (64x64 - system tray)');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

convertLogo();
