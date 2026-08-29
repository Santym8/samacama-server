const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const SAVE_FILE_NAME = 'latest.sav';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://satisfactory-calculator.com',
  'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin',
};

let b2Auth = null; // { downloadUrl, authorizationToken, expiresAt }

function b2AuthorizeAccount() {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
    https
      .get(
        'https://api.backblazeb2.com/b2api/v3/b2_authorize_account',
        { headers: { Authorization: `Basic ${credentials}` } },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`b2_authorize_account failed: ${res.statusCode} ${body}`));
              return;
            }
            const data = JSON.parse(body);
            resolve({
              downloadUrl: data.apiInfo.storageApi.downloadUrl,
              authorizationToken: data.authorizationToken,
              // Account auth tokens are valid ~24h; refresh a bit early.
              expiresAt: Date.now() + 23 * 60 * 60 * 1000,
            });
          });
        }
      )
      .on('error', reject);
  });
}

async function getB2Auth(forceRefresh = false) {
  if (!forceRefresh && b2Auth && Date.now() < b2Auth.expiresAt) {
    return b2Auth;
  }
  b2Auth = await b2AuthorizeAccount();
  return b2Auth;
}

function sendUpstreamError(res, err) {
  console.error('B2 proxy error:', err);
  res.writeHead(502, CORS_HEADERS);
  res.end('Upstream error');
}

function proxyDownload(auth, method, res, allowRetry) {
  const url = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${SAVE_FILE_NAME}`;
  const upstreamReq = https.request(url, { method, headers: { Authorization: auth.authorizationToken } }, (b2Res) => {
    if (b2Res.statusCode === 401 && allowRetry) {
      b2Res.resume();
      getB2Auth(true)
        .then((freshAuth) => proxyDownload(freshAuth, method, res, false))
        .catch((err) => sendUpstreamError(res, err));
      return;
    }

    if (b2Res.statusCode !== 200) {
      b2Res.resume();
      const status = b2Res.statusCode === 404 ? 404 : 502;
      res.writeHead(status, CORS_HEADERS);
      res.end(status === 404 ? 'Not found' : 'Upstream error');
      return;
    }

    res.writeHead(200, {
      ...CORS_HEADERS,
      'Content-Type': 'application/octet-stream',
      'Content-Length': b2Res.headers['content-length'],
    });

    if (method === 'HEAD') {
      b2Res.resume();
      res.end();
      return;
    }

    b2Res.pipe(res);
  });
  upstreamReq.on('error', (err) => sendUpstreamError(res, err));
  upstreamReq.end();
}

const server = http.createServer((req, res) => {
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
    getB2Auth()
      .then((auth) => proxyDownload(auth, req.method, res, true))
      .catch((err) => sendUpstreamError(res, err));
    return;
  }

  res.writeHead(404, CORS_HEADERS);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
