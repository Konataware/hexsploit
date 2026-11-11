/* Servidor estático mínimo (sem dependências): node scripts/serve.js [porta] */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.argv[2] || 8080;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith(path.sep) || p === '.') p = path.join(p, 'index.html');
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => e ? (res.writeHead(404), res.end('404')) : (res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }), res.end(d)));
}).listen(port, () => console.log(`HEXploit em http://localhost:${port}`));
