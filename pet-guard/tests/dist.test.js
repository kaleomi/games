// dist/（Cloudflare Pages 实际发布的成品）必须是用当前源码生成的：改了源码或素材忘记 npm run build 就会失败
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceStamp } from '../tools/source-stamp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('dist/ 与源码一致（改了源码或素材要运行 npm run build 再提交）', () => {
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const built = html.match(/<meta name="source-stamp" content="([0-9a-f]+)">/)?.[1];
  assert.equal(built, sourceStamp(root));
  for (const f of ['app.js', 'style.css', 'license-keeper.js', 'assets/manifest.json']) assert.ok(fs.statSync(path.join(root, 'dist', f)).size > 0, f);
  assert.ok(!html.includes('src/main.js'), '成品应加载打包后的 app.js');
  assert.match(html, /license-keeper\.js\?v=[0-9a-f]+" data-game="mc"/, '成品要带卡密续签');
});
