// 生成网页版成品到 dist/：npm run build（需要 esbuild：第一次先 npm i）
// 游戏脚本打包成一个压缩后的 app.js，样式和卡密续签脚本也压缩，图片音效原样复制；Cloudflare Pages 的输出目录填 dist。
// 改了 src/、style.css、index.html、assets/ 之后都要重新生成并提交 dist/（npm test 会检查是否过期）。
// 卡密续签脚本只加在 dist/ 里：本地双击「启动游戏.bat」跑的是源码，不需要卡密。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { sourceStamp } from './source-stamp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const target = ['chrome100', 'edge100', 'safari16', 'firefox115'];
const common = { minify: true, legalComments: 'none', charset: 'utf8', logLevel: 'warning' };

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// 1) 游戏脚本：src/main.js 和它引用的所有模块打成一个文件（保持 ES 模块格式）
esbuild.buildSync({ ...common, entryPoints: [path.join(root, 'src/main.js')], outfile: path.join(dist, 'app.js'), bundle: true, format: 'esm', platform: 'browser', target });

// 2) 卡密续签脚本、样式
const minify = (from, to, loader) => fs.writeFileSync(path.join(dist, to), esbuild.transformSync(fs.readFileSync(path.join(root, from), 'utf8'), { ...common, loader, target }).code);
minify('license/license-keeper.js', 'license-keeper.js', 'js');
minify('style.css', 'style.css', 'css');

// 3) 图片、音效、序列帧原样复制
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });

// 4) index.html：换成打包后的脚本，加上卡密续签，带上版本号避免浏览器用旧缓存
const stamp = sourceStamp(root);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appTag = '<script type="module" src="src/main.js"></script>';
if (!html.includes(appTag)) throw Error('index.html 里找不到 src/main.js 的脚本标签');
html = html.replace(appTag, `<script src="license-keeper.js?v=${stamp}" data-game="mc" data-name="萌宠保卫战" defer></script>\n  <script type="module" src="app.js?v=${stamp}"></script>`)
  .replace('href="style.css"', `href="style.css?v=${stamp}"`)
  .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="source-stamp" content="${stamp}">`);
fs.writeFileSync(path.join(dist, 'index.html'), html);

// 5) Cloudflare 静态资源头：图片音效缓存一周
fs.writeFileSync(path.join(dist, '_headers'), ['/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: same-origin', '/index.html', '  Cache-Control: no-cache', '/assets/*', '  Cache-Control: public, max-age=604800', ''].join('\n'));

let total = 0, count = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { total += fs.statSync(p).size; count++; if (fs.statSync(p).size > 25 * 1024 * 1024) throw Error('Cloudflare 单文件上限 25MiB：' + p); } } })(dist);
console.log(`网页版已生成 dist/ · ${count} 个文件 · ${(total / 1048576).toFixed(1)} MB · 版本 ${stamp}`);
