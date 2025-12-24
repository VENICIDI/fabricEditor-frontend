const http = require('http');
const fs = require('fs');
const path = require('path');

// 简易静态文件服务器：用于本地预览 editor.html 及其静态资源
const server = http.createServer((req, res) => {
  // 默认根路径指向编辑器页面
  const requestPath = req.url === '/' ? '/editor.html' : req.url;
  // 规范化路径并去掉开头的 / 或 \，避免路径穿越
  const safePath = path.normalize(requestPath).replace(/^([/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // 二次校验：禁止访问项目目录之外的文件
  if (!filePath.startsWith(__dirname + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // 根据文件扩展名决定 Content-Type
  const ext = path.extname(filePath);

  const typeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };

  // 读取文件元信息：不存在或不是文件则返回 404
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // 命中静态文件：返回对应 mime
    res.writeHead(200, {
      'Content-Type': typeMap[ext] || 'application/octet-stream'
    });

    // 使用流提升大文件传输效率
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      // 流读取异常：若响应头尚未发送则补 500
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  });
});

// 监听本地 8080 端口
server.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});
