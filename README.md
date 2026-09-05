# UTags Extension — 单条帖文标签

基于 [UTags](https://github.com/utags/utags) `0.34.2`，为 **X (Twitter) 单条推文**和 **微博单条帖文**补齐打标能力。

| 文件 | 版本 | 说明 |
| --- | --- | --- |
| `🏷️ UTags - Add usertags to links-0.34.2.1.user.js` | `0.34.2.1` | 主脚本，相对 `0.34.2` 仅两处通用放行 |
| `utags-ext-x-tweet.user.js` | `0.1.1` | X 单条推文扩展脚本 |
| `utags-ext-weibo-post.user.js` | `0.1` | 微博单条帖文扩展脚本 |
| `utags-ext-custom-rule-template.user.js` | — | 官方自定义规则模板（参考） |

原版 UTags 在 X / 微博上主要给**用户**打标。按官方自定义属性（`data-utags_link` 等）另写脚本本应可行，但会踩到主脚本限制：

1. 站点 `validate` 过严时（如 X），帖文 URL 会被拒并清理
2. 操作栏按钮常含 `svg` / 图标，默认媒体检查会判定无效

因此需要主脚本做最小放行，扩展脚本负责各站逻辑。

---

## 主脚本改动（`0.34.2` → `0.34.2.1`）

未加入任何站点专用逻辑，原站点规则仍只打用户标。

1. **有 `data-utags_link` 时跳过站点 `validate`**  
   自定义规则在 X 等严格站点也能生效。

2. **有 `data-utags_link` + `data-utags_title` 时允许图标按钮**  
   可把标签挂在含 svg 的按钮上。

另：去掉 Greasy Fork 自动更新地址，避免被覆盖回官方版。

---

## 扩展脚本（`utags-ext-x-tweet.user.js`）

- 扫描 `article[data-testid="tweet"]`，解析 key：`https://x.com/{user}/status/{id}`
- 标签挂在**转帖（retweet / unretweet）**按钮上
- 写入 `data-utags_title`（推文正文），收藏页可预览
- 清理曾挂在喜欢 / 分享 / 书签 / 浏览量上的旧标记
- MutationObserver 适配时间线；注入悬停显示样式

转帖键在每条推文底栏都有。

须与本仓库主脚本 `0.34.2.1` 同用；官方原版无上述放行，单独装扩展无效。

---

## 扩展脚本（`utags-ext-weibo-post.user.js`）

- 扫描微博卡片（`article.woo-panel-main` / `Feed_wrap` / 搜索页 `card-wrap` 等），解析 key：`https://weibo.com/{uid}/{bid}`
- 标签挂在整块**评论**按钮上（图标 +「评论」文字之后）
- 写入 `data-utags_title`（帖文正文），收藏页可预览
- 忽略时间戳permalink，避免和评论图标重复出标
- 排除左侧分组栏（全部关注 / 好友圈等）和左右侧栏，不在导航上打标
- 清理曾挂在赞 / 转发上的旧标记
- MutationObserver 适配时间线；注入悬停显示样式

评论图标在每条帖文底栏都有，比时间戳链接更好点。

须与本仓库主脚本 `0.34.2.1` 同用；官方原版无图标按钮放行，单独装扩展可能无效。
