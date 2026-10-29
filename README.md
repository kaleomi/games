# games

所有网页小游戏项目的统一仓库。每个游戏一个子目录，彼此独立，互不依赖。

## 目录约定

```
games/
├── <game-name>/      # 一个游戏一个目录，目录名用小写英文 + 连字符
│   ├── index.html    # 入口文件
│   ├── ...           # 该游戏的脚本、样式、素材
│   └── README.md     # 游戏说明（中文名、玩法、来源）
└── README.md
```

## 部署到 Cloudflare Pages

每个游戏单独建一个 Pages 项目：

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 选择本仓库 `kaleomi/games`
3. **Root directory（根目录）** 填该游戏的子目录名，例如 `alien-vacuum`
4. Build command 留空，Build output directory 填 `/`（纯静态项目）
5. 保存并部署，再按需绑定自定义域名

之后该子目录有新提交时，对应的 Pages 项目会自动重新部署，其他游戏的提交不会触发它。

## 游戏列表

| 目录 | 游戏 | 说明 |
|------|------|------|
| `starship-barrage` | 星舰弹幕战 | 抖音直播弹幕互动竖版射击，观众当飞行员，接熙梦 |
| `dragon-raid` | 屠龙战纪 | 抖音直播弹幕互动魔幻屠龙：四职业、屠龙巨弩、巨龙升空、神殿祝福投票，接熙梦 |
| `pet-guard` | 萌宠保卫战 | 抖音直播弹幕互动养成守护：领养八种萌宠守护心愿树，净化坏心情，天赋觉醒、闪光、装扮，接熙梦 |
