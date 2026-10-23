// 星舰弹幕战 · 讨伐 BOSS 美术：钢铁虫后 / 晶核巨像 / 深渊之眼（异形母舰在 art.js）
// 和异形母舰同一个画布：viewBox -300 -130 600 290，原点是 BOSS 中心，核心在 (0,10)，机头朝下。

const VB = 'viewBox="-300 -130 600 290"';
const mirror = d => `<path d="${d}"/><path d="${d}" transform="scale(-1,1)"/>`;
const pair = (d, attrs) => `<g ${attrs}>${mirror(d)}</g>`;

// ───────── 钢铁虫后：铁甲虫后，背后巨大的分节腹部，六条机械腿，下方大颚 ─────────
export function queenSvg(pxW, pxH) {
  const seg = (y, rx, ry) => `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#plate)" stroke="#1a0f08" stroke-width="2"/><path d="M${-rx * 0.86},${y + ry * 0.2} Q0,${y + ry * 0.9} ${rx * 0.86},${y + ry * 0.2}" fill="none" stroke="#ff7a2e" stroke-width="2.4" opacity=".75" filter="url(#g1)"/><path d="M${-rx * 0.7},${y - ry * 0.45} Q0,${y - ry * 0.95} ${rx * 0.7},${y - ry * 0.45}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`;
  const leg = (sx, sy, mx, my, ex, ey) => `<path d="M${sx},${sy} L${mx},${my} L${ex},${ey}" fill="none" stroke="#1a0f08" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M${sx},${sy} L${mx},${my} L${ex},${ey}" fill="none" stroke="url(#legG)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${mx}" cy="${my}" r="7" fill="#6a4a30" stroke="#1a0f08" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="2.6" fill="#ff7a2e"/><path d="M${ex},${ey} l${Math.sign(ex) * 10},12" stroke="#d8c0a0" stroke-width="4" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    <linearGradient id="plate" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#b08860"/><stop offset=".45" stop-color="#5a3a24"/><stop offset="1" stop-color="#22140a"/></linearGradient>
    <linearGradient id="legG" x1="-1" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a3424"/><stop offset=".5" stop-color="#a88460"/><stop offset="1" stop-color="#3a2618"/></linearGradient>
    <radialGradient id="thx" cx="-20" cy="-20" r="110" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c8a07a"/><stop offset=".5" stop-color="#6a4428"/><stop offset="1" stop-color="#1e1008"/></radialGradient>
    <radialGradient id="sock" cx="0" cy="10" r="56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#050302"/><stop offset=".65" stop-color="#2a1408"/><stop offset=".85" stop-color="#ff7a2e" stop-opacity=".6"/><stop offset="1" stop-color="#3a2010"/></radialGradient>
    <filter id="g1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="g2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <g opacity=".55" filter="url(#g2)"><ellipse cx="0" cy="-40" rx="150" ry="110" fill="#ff5a1a"/></g>
  ${seg(-112, 70, 22)}${seg(-88, 96, 28)}${seg(-58, 118, 32)}${seg(-26, 128, 34)}
  ${leg(-70, 0, -170, -40, -258, 20)}${leg(70, 0, 170, -40, 258, 20)}
  ${leg(-80, 26, -190, 30, -240, 110)}${leg(80, 26, 190, 30, 240, 110)}
  ${leg(-60, 52, -120, 100, -150, 150)}${leg(60, 52, 120, 100, 150, 150)}
  <path d="M-100,-10 C-104,40 -70,78 0,86 C70,78 104,40 100,-10 C80,-30 -80,-30 -100,-10 Z" fill="url(#thx)" stroke="#1a0f08" stroke-width="3"/>
  ${pair('M-96,0 C-90,30 -66,58 -24,70', 'fill="none" stroke="#ff7a2e" stroke-width="2.4" opacity=".7"')}
  ${pair('M-78,-14 L-40,-6 L-30,30 L-64,40 Z', 'fill="url(#plate)" stroke="#1a0f08" stroke-width="2"')}
  <circle cx="0" cy="10" r="50" fill="url(#sock)" stroke="#1a0f08" stroke-width="3"/>
  ${Array.from({ length: 10 }, (_, i) => `<path transform="translate(0,10) rotate(${i * 36})" d="M-4,-58 L4,-58 L2.5,-48 L-2.5,-48 Z" fill="#ffb070"/>`).join('')}
  <path d="M-40,84 C-34,104 -16,116 0,118 C16,116 34,104 40,84 Z" fill="url(#thx)" stroke="#1a0f08" stroke-width="3"/>
  ${pair('M-30,104 C-48,122 -50,140 -36,156 C-40,138 -30,124 -14,114 Z', 'fill="#d8c0a0" stroke="#1a0f08" stroke-width="2"')}
  ${pair('M-20,96 m-7,0 a7,6 0 1 0 14,0 a7,6 0 1 0 -14,0', 'fill="#ff7a2e"')}
  ${pair('M-20,96 m-3,0 a3,2.6 0 1 0 6,0 a3,2.6 0 1 0 -6,0', 'fill="#fff4dc"')}
  ${pair('M-12,84 C-22,64 -34,52 -52,46', 'fill="none" stroke="#d8c0a0" stroke-width="3"')}
</svg>`;
}

// ───────── 晶核巨像：冰蓝多面晶体构成的巨像，两肩晶簇、头顶晶冠、下方晶锥 ─────────
export function colossusSvg(pxW, pxH) {
  const facet = (pts, fill, op = 1) => `<polygon points="${pts}" fill="${fill}" opacity="${op}" stroke="#0a2a3a" stroke-width="2" stroke-linejoin="round"/>`;
  const cluster = s => `<g transform="scale(${s},1)">
      ${facet('-120,40 -150,-60 -132,-96 -110,-30', 'url(#ice2)')}
      ${facet('-140,48 -196,-40 -186,-70 -150,-10', 'url(#ice1)')}
      ${facet('-150,40 -230,0 -236,-24 -170,-6', 'url(#ice2)')}
      ${facet('-160,60 -230,70 -246,52 -176,36', 'url(#ice1)')}
      <path d="M-132,-96 L-120,40 M-186,-70 L-150,40 M-236,-24 L-160,46" stroke="#e8fdff" stroke-width="1.6" opacity=".7"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    <linearGradient id="ice1" x1="0" y1="-1" x2="1" y2="1"><stop offset="0" stop-color="#f4feff"/><stop offset=".45" stop-color="#7fd8f0"/><stop offset="1" stop-color="#1a4a6a"/></linearGradient>
    <linearGradient id="ice2" x1="1" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#c8f4ff"/><stop offset=".5" stop-color="#3a8ab0"/><stop offset="1" stop-color="#0c2238"/></linearGradient>
    <linearGradient id="dark" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#2a5a78"/><stop offset="1" stop-color="#081624"/></linearGradient>
    <radialGradient id="sock" cx="0" cy="10" r="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#02060a"/><stop offset=".6" stop-color="#0a2234"/><stop offset=".85" stop-color="#5ff0ff" stop-opacity=".7"/><stop offset="1" stop-color="#0a2a3a"/></radialGradient>
    <filter id="g1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="g2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <g opacity=".5" filter="url(#g2)"><ellipse cx="0" cy="-10" rx="230" ry="100" fill="#5ff0ff"/></g>
  ${cluster(1)}${cluster(-1)}
  ${facet('-40,-80 -24,-126 -8,-84', 'url(#ice1)')}${facet('40,-80 24,-126 8,-84', 'url(#ice1)')}${facet('-10,-86 0,-128 10,-86', 'url(#ice2)')}
  ${facet('-70,-60 -12,-84 0,-84 0,10 -100,0', 'url(#ice1)')}
  ${facet('70,-60 12,-84 0,-84 0,10 100,0', 'url(#ice2)')}
  ${facet('-100,0 0,10 -40,90 -96,54', 'url(#ice2)')}
  ${facet('100,0 0,10 40,90 96,54', 'url(#ice1)')}
  ${facet('-40,90 0,10 40,90 0,132', 'url(#dark)')}
  <g filter="url(#g1)" opacity=".9" fill="none" stroke="#5ff0ff" stroke-width="2.4"><path d="M-100,0 L-40,90 L0,132 L40,90 L100,0"/><path d="M-70,-60 L-12,-84 M70,-60 L12,-84"/></g>
  <path d="M-100,0 L-40,90 L0,132 L40,90 L100,0 M-70,-60 L-12,-84 L12,-84 L70,-60" fill="none" stroke="#e8fdff" stroke-width="1.2"/>
  <circle cx="0" cy="10" r="52" fill="url(#sock)" stroke="#0a2a3a" stroke-width="3"/>
  ${Array.from({ length: 6 }, (_, i) => `<polygon transform="translate(0,10) rotate(${i * 60})" points="0,-62 6,-50 0,-44 -6,-50" fill="#e8fdff"/>`).join('')}
</svg>`;
}

// ───────── 深渊之眼：血红虹膜的巨眼，厚眼睑，四条触须垂下来连着眼柄 ─────────
export function eyeSvg(pxW, pxH) {
  const tent = (sx, sy, c1x, c1y, c2x, c2y, ex, ey) => `<path d="M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}" fill="none" stroke="#12020a" stroke-width="22" stroke-linecap="round"/><path d="M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}" fill="none" stroke="url(#flesh)" stroke-width="15" stroke-linecap="round"/><path d="M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}" fill="none" stroke="#ff3b4e" stroke-width="2" stroke-dasharray="3 9" opacity=".8"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    <linearGradient id="flesh" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#5a1a3a"/><stop offset="1" stop-color="#22051a"/></linearGradient>
    <radialGradient id="lid" cx="-30" cy="-40" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7a2a52"/><stop offset=".55" stop-color="#3a0c28"/><stop offset="1" stop-color="#10020a"/></radialGradient>
    <radialGradient id="ball" cx="-24" cy="-14" r="110" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff4f0"/><stop offset=".55" stop-color="#e8c8c8"/><stop offset="1" stop-color="#7a3a4a"/></radialGradient>
    <radialGradient id="iris" cx="0" cy="10" r="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1a0004"/><stop offset=".45" stop-color="#7a0010"/><stop offset=".75" stop-color="#ff3b4e"/><stop offset=".92" stop-color="#ffb070"/><stop offset="1" stop-color="#3a0008"/></radialGradient>
    <filter id="g1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="g2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <g opacity=".55" filter="url(#g2)"><circle cx="0" cy="0" r="150" fill="#ff1a3a"/></g>
  ${tent(-90, 40, -150, 60, -190, 20, -196, 60)}${tent(90, 40, 150, 60, 190, 20, 196, 60)}
  ${tent(-60, 80, -90, 130, -120, 80, -116, 112)}${tent(60, 80, 90, 130, 120, 80, 116, 112)}
  <path d="M-150,-10 C-140,-110 140,-110 150,-10 C140,90 -140,90 -150,-10 Z" fill="url(#lid)" stroke="#10020a" stroke-width="3"/>
  ${pair('M-150,-10 C-180,-40 -200,-90 -170,-120 C-160,-90 -140,-70 -120,-60 Z', 'fill="url(#lid)" stroke="#10020a" stroke-width="2"')}
  <ellipse cx="0" cy="4" rx="122" ry="76" fill="url(#ball)" stroke="#10020a" stroke-width="3"/>
  <g stroke="#c0283a" stroke-width="1.6" fill="none" opacity=".7">
    <path d="M-118,0 C-96,-10 -86,6 -66,0 C-60,-6 -54,-2 -50,4"/><path d="M118,10 C96,0 86,16 66,10 C58,4 54,10 50,14"/>
    <path d="M-90,-50 C-80,-36 -70,-40 -60,-28"/><path d="M90,58 C80,44 70,48 60,36"/><path d="M-80,56 C-70,44 -60,50 -54,38"/>
  </g>
  <circle cx="0" cy="10" r="60" fill="url(#iris)"/>
  ${Array.from({ length: 24 }, (_, i) => `<path transform="translate(0,10) rotate(${i * 15})" d="M0,-56 L0,-38" stroke="#ffb070" stroke-width="1.2" opacity=".55"/>`).join('')}
  <path d="M-150,-10 C-120,-80 120,-80 150,-10 C120,-56 -120,-56 -150,-10 Z" fill="url(#lid)" stroke="#10020a" stroke-width="2"/>
  <path d="M-150,-10 C-120,60 120,60 150,-10 C120,80 -120,80 -150,-10 Z" fill="url(#lid)" opacity=".9" stroke="#10020a" stroke-width="2"/>
  <path d="M-34,-24 C-24,-34 -8,-36 4,-32" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
</svg>`;
}

// ───────── 各 BOSS 的「炮」：虫后卵囊 / 晶核棱晶 / 深渊眼柄 ─────────
export function bossPodSvg(boss, px, dead) {
  const vb = 'viewBox="-32 -32 64 64"';
  if (boss === 'queen') {
    if (dead) return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}><path d="M-18,8 C-20,-14 -6,-22 0,-22 C6,-22 20,-14 18,8 C10,18 -10,18 -18,8 Z" fill="#2a1408" stroke="#5a3a24" stroke-width="2"/><path d="M-10,-6 L-2,4 L-8,12 M6,-14 L2,0 L10,8" stroke="#ff7a2e" stroke-opacity=".5" stroke-width="2" fill="none"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}>
      <defs><radialGradient id="e" cx="-6" cy="-8" r="28" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe0b0"/><stop offset=".5" stop-color="#ff8a3a" stop-opacity=".85"/><stop offset="1" stop-color="#6a2a08"/></radialGradient></defs>
      <path d="M-22,10 C-24,-16 -8,-26 0,-26 C8,-26 24,-16 22,10 C14,24 -14,24 -22,10 Z" fill="url(#e)" stroke="#3a1a08" stroke-width="2"/>
      ${[[-8, -6], [7, -9], [-1, 7], [10, 6]].map(([x, y]) => `<path transform="translate(${x},${y})" d="M0,-5 C3,-5 4,-1 3,3 C2,6 -2,6 -3,3 C-4,-1 -3,-5 0,-5 Z" fill="#5a2008" opacity=".7"/>`).join('')}
      <path d="M-14,-14 C-8,-20 0,-22 6,-20" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M-22,10 C-14,18 14,18 22,10" stroke="#3a1a08" stroke-width="4" fill="none"/>
    </svg>`;
  }
  if (boss === 'colossus') {
    if (dead) return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}><polygon points="-14,10 -6,-12 4,-4 14,12" fill="#0a2234" stroke="#2a5a78" stroke-width="2"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}>
      <defs><linearGradient id="c" x1="0" y1="-1" x2="1" y2="1"><stop offset="0" stop-color="#f4feff"/><stop offset=".5" stop-color="#5fd8f0"/><stop offset="1" stop-color="#0c3050"/></linearGradient><filter id="g"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
      <polygon points="0,-30 12,-6 6,22 -6,22 -12,-6" fill="#5ff0ff" opacity=".5" filter="url(#g)"/>
      <polygon points="0,-28 11,-6 0,20 -11,-6" fill="url(#c)" stroke="#0a2a3a" stroke-width="1.6"/>
      <path d="M0,-28 L0,20 M-11,-6 L11,-6" stroke="#e8fdff" stroke-width="1" opacity=".8"/>
      <circle cy="-6" r="3.4" fill="#fff"/>
    </svg>`;
  }
  // 深渊之眼：眼柄末端的小眼睛
  if (dead) return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}><circle r="16" fill="#22051a" stroke="#5a1a3a" stroke-width="2"/><path d="M-10,0 L10,0" stroke="#5a1a3a" stroke-width="3"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${vb}>
    <defs><radialGradient id="b" cx="-5" cy="-6" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff4f0"/><stop offset=".7" stop-color="#d8a8b0"/><stop offset="1" stop-color="#5a1a3a"/></radialGradient></defs>
    <circle r="20" fill="#3a0c28" stroke="#10020a" stroke-width="2"/>
    <circle r="15" fill="url(#b)"/>
    <circle cy="-4" r="8" fill="#ff3b4e"/><circle cy="-4" r="4" fill="#1a0004"/><circle cx="-2" cy="-6" r="1.6" fill="#fff"/>
    <path d="M-20,-2 C-12,-16 12,-16 20,-2" fill="none" stroke="#3a0c28" stroke-width="5"/>
  </svg>`;
}
