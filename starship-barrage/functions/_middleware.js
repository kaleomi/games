// 星舰远征 · Cloudflare Pages 入口：卡密门禁。
// 没有有效卡密时只给卡密页，游戏网页和脚本都不给（license/gate.js，授权站 game-live.xialuoxi.com）。
import { licenseGate } from '../license/gate.js';

export const onRequest = context => licenseGate(context.request, {
  game: 'xj',
  gameName: '星舰远征',
  next: () => context.next(),
});
