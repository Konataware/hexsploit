/* Gera dist/HEXploit-standalone.html (um arquivo só) e confere se o index.html segue o manifesto. */
const fs = require('fs'), path = require('path');
const m = require('./manifest');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = [...m.engine, ...m.ui], styles = m.styles;

let html = read('index.html');
const listed = [...html.matchAll(/<script src="([^"]+)"/g)].map((x) => x[1]);
if (JSON.stringify(listed) !== JSON.stringify(scripts)) {
  console.error('index.html fora de sincronia com scripts/manifest.js\n esperado:', scripts, '\n atual:', listed);
  process.exit(1);
}
html = html.replace(/\s*<link rel="stylesheet"[^>]*>/g, '');
html = html.replace('</head>', '<style>\n' + styles.map(read).join('\n') + '\n</style>\n</head>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>\n' + read(f) + '\n</script>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'HEXploit-standalone.html'), html);
console.log('dist/HEXploit-standalone.html', Math.round(html.length / 1024) + ' KB');
