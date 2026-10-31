// 网页版源码指纹：src/ 下所有脚本 + index.html + style.css + 卡密续签脚本 + assets/ 文件清单（路径和大小）。
// 构建时写进 dist/index.html，测试用它检查 dist/ 是否跟源码一致（不需要安装 esbuild）。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push([path.relative(base, p).split(path.sep).join('/'), fs.statSync(p).size]);
  }
  return out;
}

export function sourceStamp(root) {
  const files = [
    ...fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f),
    'index.html', 'style.css', 'license/license-keeper.js', 'assets/manifest.json',
  ];
  const h = createHash('sha256');
  for (const f of files) h.update(f + '\0').update(fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n')).update('\0');
  for (const [f, size] of walk(path.join(root, 'assets'))) h.update(`${f}:${size}\0`);
  return h.digest('hex').slice(0, 16);
}
