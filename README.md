# UTags Extension — X 单条推文标签

基于 [UTags](https://github.com/utags/utags) `0.34.2`，为 X (Twitter) **单条推文**补齐打标能力。

| 文件 | 版本 | 说明 |
| --- | --- | --- |
| `🏷️ UTags - Add usertags to links-0.34.2.1.user.js` | `0.34.2.1` | 主脚本，相对 `0.34.2` 仅两处通用放行 |
| `utags-ext-x-tweet.user.js` | `0.1` | X 单条推文扩展脚本 |
| `utags-ext-custom-rule-template.user.js` | — | 官方自定义规则模板（参考） |

原版 UTags 在 X 上只支持给用户打标。按官方自定义属性（`data-utags_link` 等）另写脚本本应可行，但在 X 上会失败：

1. 站点 `validate` 只放行用户主页 URL，推文 URL 会被拒并清理
2. 浏览量等按钮含 `svg`，默认媒体检查会判定无效

因此需要主脚本做最小放行，扩展脚本负责 X 逻辑。

---

## 主脚本改动（`0.34.2` → `0.34.2.1`）

未加入任何 X 专用逻辑，站点规则仍只打用户标。

1. **有 `data-utags_link` 时跳过站点 `validate`**  
   自定义规则在 X 等严格站点也能生效。

2. **有 `data-utags_link` + `data-utags_title` 时允许图标按钮**  
   可把标签挂在含 svg 的按钮上。

另：去掉 Greasy Fork 自动更新地址，避免被覆盖回官方版。

---

## 扩展脚本（`utags-ext-x-tweet.user.js`）

- 扫描 `article[data-testid="tweet"]`，解析 key：`https://x.com/{user}/status/{id}`
- 标签挂在**浏览量**入口（`/analytics`、`viewCount`、相关 `aria-label`）
- 写入 `data-utags_title`（推文正文），收藏页可预览
- 清理曾挂在分享/书签上的旧标记
- MutationObserver 适配时间线；注入悬停显示样式

挂载位置取舍：分享/书签易挡点击；时间若不设正文 title，收藏预览会变成「2h」；浏览量相对合适。

须与本仓库主脚本 `0.34.2.1` 同用；官方原版无上述放行，单独装扩展无效。
