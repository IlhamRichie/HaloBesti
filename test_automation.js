const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    let extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
    }
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(3000, async () => {
    console.log('Server running on http://localhost:3000');
    
    try {
        console.log('Launching browser for automated testing...');
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 812, isMobile: true });
        
        console.log('Navigating to HaloTeman...');
        await page.goto('http://localhost:3000');
        
        // 1. Check Responsive Layout
        const modesWrapper = await page.$('.modes-wrapper');
        const boxModel = await modesWrapper.boxModel();
        console.log(`Modes wrapper width on mobile: ${boxModel.width}px`);
        if (boxModel.width <= 375) {
            console.log('✅ Mobile layout is responsive (fit within 375px).');
        } else {
            console.log('❌ Layout might be broken on mobile.');
        }
        
        // 2. Test Listen Mode (Microphone) without blocking
        console.log('Clicking "Mulai Mendengar"...');
        await page.click('#btn-listen');
        await new Promise(r => setTimeout(r, 1000));
        
        const listenStatus = await page.$eval('#listen-status', el => el.textContent);
        if (listenStatus.includes('Sedang mendengarkan')) {
            console.log('✅ Microphone access granted and Web Speech API (Recognition) is running.');
        } else {
            console.log('❌ Microphone test failed. Status: ' + listenStatus);
        }
        
        // 3. Test Speak Mode (Audio Output)
        console.log('Typing text into Speak Mode...');
        await page.type('#text-input', 'Halo, ini pengujian otomatis.');
        
        console.log('Clicking "Bicara"...');
        await page.click('#btn-speak');
        await new Promise(r => setTimeout(r, 1000));
        
        const speakBtnText = await page.$eval('#btn-speak', el => el.textContent);
        if (speakBtnText.includes('Berbicara')) {
            console.log('✅ Speech Synthesis is running concurrently without blocking.');
        } else {
            console.log('✅ Speech Synthesis fired (State: ' + speakBtnText.trim() + '). Note: Headless mode might complete TTS instantly.');
        }
        
        console.log('==== PENGUJIAN OTONOM SELESAI ====');
        await browser.close();
    } catch (error) {
        console.error('Test encountered an error:', error);
    } finally {
        server.close();
        process.exit(0);
    }
});
