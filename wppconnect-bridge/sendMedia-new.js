// Robust /api/sendMedia endpoint - PASTE THIS TO REPLACE OLD ONE
app.post('/api/sendMedia', async (req, res) => {
    // DEBUG: show incoming keys
    try {
        const incomingKeys = Object.keys(req.body || {});
        console.log('📥 /api/sendMedia received keys:', incomingKeys);
        if (req.body && req.body.mediaData) {
            console.log('📊 mediaData length:', typeof req.body.mediaData === 'string' ? req.body.mediaData.length : 'not-string');
            console.log('📊 mediaData starts:', (req.body.mediaData || '').toString().substring(0, 40));
        } else {
            console.log('📊 mediaData: MISSING or EMPTY');
        }
    } catch (e) {
        console.warn('Error logging incoming body:', e);
    }

    const { phone, whatsappId, mediaType, mediaData, caption, filename } = req.body;

    if (bridgeStatus !== 'connected' || !clientSession) {
        return res.status(503).json({ success: false, error: 'Bridge not connected' });
    }
    if (!mediaData) {
        return res.status(400).json({ success: false, error: 'Media data required' });
    }

    // Normalize chat id
    let chatId;
    if (whatsappId && whatsappId.includes('@')) chatId = whatsappId;
    else {
        let cleanPhone = (phone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
        chatId = `${cleanPhone}@c.us`;
    }

    try {
        // 1) sanitize base64 (strip data url prefix + whitespace/newlines)
        let pureBase64 = String(mediaData || '');
        if (pureBase64.startsWith('data:')) pureBase64 = pureBase64.split(',')[1] || '';
        // Remove whitespace/newlines that may break decoding
        pureBase64 = pureBase64.replace(/\s+/g, '');

        // 2) decode to Buffer and validate
        let buffer;
        try {
            buffer = Buffer.from(pureBase64, 'base64');
        } catch (err) {
            console.error('❌ base64 -> buffer decode failed:', err.message);
            return res.status(400).json({ success: false, error: 'Invalid base64' });
        }

        console.log('📊 Decoded buffer length:', buffer.length);
        if (!buffer || !buffer.length) {
            return res.status(400).json({ success: false, error: 'Empty decoded buffer' });
        }

        // 3) check magic bytes to infer file type (helpful for mismatched filenames)
        const header = buffer.slice(0, 8).toString('hex');
        console.log('📊 Buffer header (hex):', header);
        let inferredExt = '';
        if (header.startsWith('89504e47')) inferredExt = 'png';
        else if (header.startsWith('ffd8ff')) inferredExt = 'jpg';
        else if (header.startsWith('25504446')) inferredExt = 'pdf';
        else if (header.startsWith('00000018') || header.includes('66747970')) inferredExt = 'mp4'; // rough mp4
        else inferredExt = '';

        // Compose a safe filename
        let outFilename = filename || `file.${inferredExt || 'bin'}`;
        // Ensure extension exists
        if (!path.extname(outFilename) && inferredExt) outFilename = `${outFilename}.${inferredExt}`;

        // 4) Try sendFileFromBase64 (preferred)
        try {
            console.log(`📤 Attempting sendFileFromBase64 to ${chatId} as ${outFilename} (${mediaType})`);
            const result = await clientSession.sendFileFromBase64(chatId, pureBase64, outFilename, caption || '');
            console.log('✅ Media sent with sendFileFromBase64:', result?.id || result);
            return res.json({ success: true, messageId: result?.id || null });
        } catch (errSend) {
            console.warn('⚠️ sendFileFromBase64 failed:', errSend && (errSend.message || errSend.toString()));
            // Fall through to fallback
        }

        // 5) FALLBACK: write buffer to tmp file and send file by path / buffer
        try {
            const tmpDir = fs.existsSync(os.tmpdir()) ? os.tmpdir() : '.';
            const tmpPath = path.join(tmpDir, `upload-${Date.now()}.${inferredExt || 'bin'}`);
            fs.writeFileSync(tmpPath, buffer);
            console.log('📂 Wrote temp file to', tmpPath, 'size:', fs.statSync(tmpPath).size);

            // Use clientSession.sendFile (WPPConnect supports sending from file path or buffer)
            const result2 = await clientSession.sendFile(chatId, tmpPath, outFilename, caption || '');
            console.log('✅ Media sent via file fallback:', result2?.id || result2);

            // cleanup temp
            try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }

            return res.json({ success: true, messageId: result2?.id || null, fallback: true });
        } catch (errFallback) {
            console.error('❌ Fallback file send failed:', errFallback && (errFallback.stack || errFallback.message || errFallback.toString()));
            return res.status(500).json({ success: false, error: 'sendFile failed', detail: errFallback.message || String(errFallback) });
        }
    } catch (err) {
        console.error('❌ Unexpected /api/sendMedia error:', err && (err.stack || err.message || err.toString()));
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
});
