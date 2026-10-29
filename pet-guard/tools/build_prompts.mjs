// 从 art/prompts.json 生成提示词清单：art/PROMPTS.md（仓库里留底）和一张带复制按钮的网页
// 用法：node tools/build_prompts.mjs [网页输出路径]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'art/prompts.json'), 'utf8'));
const BATCH = { 1: '第一批', 2: '第二批', 3: '可选' };
const STYLE_NAME = { char: '角色通用风格', item: '道具通用风格', bg: '背景通用风格', fx: '发光特效通用风格' };

export function ratioLine(it) { const m = String(it.ratio).match(/^(\d+:\d+)\s*(.*)$/); return m ? `画面比例 ${m[1]}${m[2] ? '（' + m[2] + '）' : ''}。` : ''; }
export function fullPrompt(it) { return (it.style !== 'none' ? data.styles[it.style] : '') + it.prompt + ratioLine(it); }
// ── Markdown ──
let md = '# 萌宠保卫战 · 生图提示词\n\n由 `tools/build_prompts.mjs` 从 `art/prompts.json` 生成，改提示词请改 JSON。\n\n';
md += '## 通用风格（每条提示词前面加上对应的这一段）\n\n';
for (const [k, v] of Object.entries(data.styles)) md += `- **${STYLE_NAME[k]}**：${v}\n`;
for (const g of data.groups) {
  md += `\n## ${g.name}\n\n${g.note ? g.note + '\n\n' : ''}`;
  for (const it of g.items) {
    md += `### ${it.title}　\`${it.file}\`　${it.ratio} · ${BATCH[it.batch]}\n\n用途：${it.use}\n\n`;
    md += '```\n' + fullPrompt(it) + '\n```\n\n';
  }
}
writeFileSync(join(root, 'art/PROMPTS.md'), md);

// ── 网页 ──
const out = process.argv[2];
if (out) {
  const tpl = readFileSync(join(root, 'tools/prompts_page.html'), 'utf8');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  writeFileSync(out, tpl.replace('/*__DATA__*/null', json));
}
console.log('ok', data.groups.reduce((n, g) => n + g.items.length, 0), '条');
