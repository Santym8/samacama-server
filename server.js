const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SAVE_FILE = path.join(__dirname, 'latest.sav');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://satisfactory-calculator.com',
  'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin',
};

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/latest.sav') {
    fs.stat(SAVE_FILE, (err, stats) => {
      if (err) {
        res.writeHead(404, CORS_HEADERS);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size,
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(SAVE_FILE).pipe(res);
    });
    return;
  }

  res.writeHead(404, CORS_HEADERS);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
