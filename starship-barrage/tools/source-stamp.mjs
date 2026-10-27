// 网页版源码指纹：src/ 下所有脚本 + index.html + style.css + license-keeper.js。
// 构建时写进 dist/index.html，测试用它检查 dist/ 是否跟源码一致（不需要安装 esbuild）。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function sourceStamp(root) {
  const files = [
    ...fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f),
    'index.html', 'style.css', 'license-keeper.js',
  ];
  const h = createHash('sha256');
  for (const f of files) h.update(f + '\0').update(fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n')).update('\0');
  return h.digest('hex').slice(0, 16);
}
