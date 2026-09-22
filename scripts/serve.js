// scripts/serve.js
// 輕量化行動裝置與平板本地伺服器 (Zero external dependencies)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv; charset=utf-8',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqUrl = decodeURI(req.url.split('?')[0]);
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }

  let filePath = path.join(ROOT, reqUrl);

  // 安全路徑檢查防遍歷
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n==============================================================');
  console.log('🚀 《星墜答問：神話機神》平板 / 手機行動端伺服器已啟動！');
  console.log('==============================================================\n');
  console.log('📱 請確保平板／手機與這台電腦連上【同一個 Wi-Fi 區域網路】：');
  console.log('👉 在手機或平板瀏覽器 (Safari / Chrome) 輸入以下網址即可直接遊玩：\n');
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`   🔗 http://${ip}:${PORT}`);
    });
  } else {
    console.log(`   🔗 http://localhost:${PORT}`);
  }
  console.log(`\n💻 本機瀏覽器網址：http://localhost:${PORT}`);
  console.log('\n✨ 最佳體驗提示：');
  console.log('   1. iOS (iPhone / iPad)：在 Safari 點擊「分享」按鈕 ➔ 選擇「加入主畫面」，即可無邊框全螢幕執行！');
  console.log('   2. Android (手機 / 平板)：在 Chrome 點選「⋮」選單 ➔ 點擊「加到主畫面」或「安裝應用程式」！');
  console.log('   3. 遊戲內右上角已提供「⛶」全螢幕按鈕，點擊可一鍵隱藏網址列。\n');
  console.log('==============================================================');
  console.log('按 Ctrl + C 可隨時停止伺服器。\n');
});
