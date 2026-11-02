const path=require('path');const {chromium}=require('playwright');const srv=require('./server');const {createGemini}=require('./gemini-mock');
(async()=>{const PORT=8990;const {close}=await srv.start(process.argv[2],PORT,createGemini().gemini);const b=await chromium.launch();const p=await b.newPage();
await p.route(/gstatic\.com\/firebasejs\//,r=>r.fulfill({body:'',contentType:'text/javascript'}));
await p.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.js/,r=>r.fulfill({path:path.join(__dirname,'node_modules/katex/dist/katex.min.js'),contentType:'text/javascript'}));
await p.route(/(fonts\.|jsdelivr.*css)/,r=>r.fulfill({body:'',contentType:'text/css'}));
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:'+PORT+'/_selftest.html');await p.waitForTimeout(8000);
const t=await p.locator('body').innerText();console.log(t.split('\n').filter(l=>/FAIL|✗|✘|lỗi|passed|đạt|tổng|Tổng|\d+\s*\/\s*\d+/i.test(l)).slice(0,40).join('\n'));console.log('pageerrors',errs);await b.close();await close();})();
