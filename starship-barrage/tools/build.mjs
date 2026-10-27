// 生成网页版成品到 dist/：node tools/build.mjs（需要 esbuild：npm i 之后运行）
// 游戏脚本打包成一个压缩后的 app.js，样式和卡密续签脚本也压缩；Cloudflare Pages 的输出目录填 dist。
// 改了 src/、style.css、index.html、license-keeper.js 之后都要重新生成并提交 dist/（测试会检查是否过期）。
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

// 1) 游戏脚本：src/main.js 和它引用的所有模块打成一个文件（main.js 用了顶层 await，保持 ES 模块格式）
esbuild.buildSync({ ...common, entryPoints: [path.join(root, 'src/main.js')], outfile: path.join(dist, 'app.js'), bundle: true, format: 'esm', platform: 'browser', target });

// 2) 卡密续签脚本、样式
const minify = (file, loader) => fs.writeFileSync(path.join(dist, file), esbuild.transformSync(fs.readFileSync(path.join(root, file), 'utf8'), { ...common, loader, target }).code);
minify('license-keeper.js', 'js');
minify('style.css', 'css');

// 3) index.html：换成打包后的脚本，带上版本号避免浏览器用旧缓存
const stamp = sourceStamp(root);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appTag = '<script type="module" src="src/main.js"></script>';
if (!html.includes(appTag)) throw Error('index.html 里找不到 src/main.js 的脚本标签');
html = html.replace(appTag, `<script type="module" src="app.js?v=${stamp}"></script>`)
  .replace('href="style.css"', `href="style.css?v=${stamp}"`)
  .replace('src="license-keeper.js"', `src="license-keeper.js?v=${stamp}"`)
  .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="source-stamp" content="${stamp}">`);
fs.writeFileSync(path.join(dist, 'index.html'), html);

// 4) Cloudflare 静态资源头
fs.writeFileSync(path.join(dist, '_headers'), ['/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: same-origin', '/index.html', '  Cache-Control: no-cache', ''].join('\n'));

let total = 0;
for (const f of fs.readdirSync(dist)) total += fs.statSync(path.join(dist, f)).size;
console.log(`网页版已生成 dist/ · ${(total / 1024).toFixed(0)} KB · 版本 ${stamp}`);
