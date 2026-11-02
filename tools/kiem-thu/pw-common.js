// Tiện ích chung cho Playwright: Firebase giả lập, font thật (offline), KaTeX, ảnh đề.
'use strict';
const path = require('path');
const fs = require('fs');
const NM = path.join(__dirname, 'node_modules');
const IMG_DIR = path.join(__dirname, '..', '..', 'data', 'exercises', 'img', 'g8a');

function fontCss(url) {
  const parts = [];
  const add = (pkg, file) => {
    const p = path.join(NM, pkg, file);
    if (fs.existsSync(p)) parts.push(fs.readFileSync(p, 'utf8').replace(/url\((["']?)\.\//g, 'url($1https://fonts.gstatic.com/local/' + pkg + '/'));
  };
  if (/Material/.test(url)) add('material-symbols', 'outlined.css');
  else {
    const fams = [...decodeURIComponent(url).matchAll(/family=([^:&]+)(?::wght@([\d;]+))?/g)];
    for (const [, fam, w] of fams) {
      const pkg = '@fontsource/' + fam.replace(/\+/g, ' ').toLowerCase().replace(/ /g, '-');
      for (const wt of (w || '400').split(';')) add(pkg, wt + '.css');
    }
  }
  return parts.join('\n');
}

async function setup(ctx, db, opts) {
  if (db) await ctx.exposeBinding('__fb', (_s, op, args) => db.handle(op, args));
  await ctx.route(/gstatic\.com\/firebasejs\//, (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, (r) => r.fulfill({ path: path.join(__dirname, 'mock-firebase.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.js/, (r) => r.fulfill({ path: path.join(NM, 'katex/dist/katex.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.css/, (r) => {
    const css = fs.readFileSync(path.join(NM, 'katex/dist/katex.min.css'), 'utf8').replace(/url\(fonts\//g, 'url(https://fonts.gstatic.com/local/katex/dist/fonts/');
    r.fulfill({ body: css, contentType: 'text/css' });
  });
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ body: fontCss(r.request().url()), contentType: 'text/css' }));
  await ctx.route(/fonts\.gstatic\.com\/local\//, (r) => {
    const rel = r.request().url().split('/local/')[1].split('?')[0];
    const p = path.join(NM, decodeURIComponent(rel));
    if (fs.existsSync(p)) r.fulfill({ path: p });
    else r.fulfill({ status: 404, body: '' });
  });
  // Ảnh đề: thay bằng vài ảnh thật đã lấy từ máy (đủ để xem bố cục)
  const imgs = fs.existsSync(IMG_DIR) ? fs.readdirSync(IMG_DIR).map((f) => path.join(IMG_DIR, f)) : [];
  let k = 0;
  if (opts && opts.realImages) return;
  await ctx.route(/\/data\/exercises\/img\//, (r) => {
    if (!imgs.length) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ path: imgs[k++ % imgs.length], contentType: 'image/webp' });
  });
}

module.exports = { setup };
