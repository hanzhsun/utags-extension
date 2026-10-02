# UTags Extension — 单条帖文标签

基于 [UTags](https://github.com/utags/utags) `0.34.2`，为 **X (Twitter) 单条推文**和 **微博单条帖文**补齐打标能力。


| 文件                                                   | 当前版本       | 说明                    |
| ---------------------------------------------------- | ---------- | --------------------- |
| `🏷️ UTags - Add usertags to links-0.34.2.1.user.js` | `0.34.2.1` | 主脚本，相对上游 `0.34.2` 的放行 |
| `utags-ext-x-tweet.user.js`                          | `0.1.2`    | X 推文扩展脚本              |
| `utags-ext-weibo-post.user.js`                       | `0.1.2`    | 微博帖文扩展脚本              |
| `utags-ext-post-cover.user.js`                       | `0.1`      | 打标时把帖文首图写入封面          |
| `utags-ext-custom-rule-template.user.js`             | —          | 官方自定义规则模板（无改动）        |


原版 UTags 在 X / 微博上主要给**用户**打标。按官方自定义属性（`data-utags_link` 等）另写脚本本应可行，但会踩到主脚本限制：

1. 站点 `validate` 过严时（如 X），帖文 URL 会被拒并清理
2. 操作栏按钮常含 `svg` / 图标，默认媒体检查会判定无效

因此需要主脚本做最小放行，扩展脚本负责各站逻辑。下面按版本号记录每次新增的功能。

---



## 主脚本（`🏷️ UTags - Add usertags to links-0.34.2.1.user.js`）

`0.34.2` 是上游原版，本仓库不改它的功能。

### 0.34.2.1

未加入任何站点专用逻辑，原站点规则仍只打用户标。

- 有 `data-utags_link` 时跳过站点 `validate`，自定义规则在 X 等严格站点也能生效
- 有 `data-utags_link` + `data-utags_title` 时允许图标按钮，标签可以挂在含 svg 的按钮上
- 去掉 Greasy Fork 自动更新地址，避免被覆盖回官方版

---



## X 扩展（`utags-ext-x-tweet.user.js`）

须与本仓库主脚本 `0.34.2.1` 同用。官方原版无上述放行，单独装扩展无效。

### 0.1.2

- 写入 `data-utags_cover`：推文内第一张配图；没有配图时用视频封面，再没有则用卡片图。封面脚本据此写入书签



### 0.1.1

- 标签从浏览量按钮改挂到**转帖（retweet / unretweet）**按钮
- 清理曾挂在浏览量上的旧标记



### 0.1

- 扫描 `article[data-testid="tweet"]`，解析 key：`https://x.com/{user}/status/{id}`
- 标签挂在浏览量按钮上
- 写入 `data-utags_title`（推文正文），收藏页可预览
- 清理曾挂在喜欢 / 分享 / 书签上的旧标记
- MutationObserver 适配时间线；注入悬停显示样式

---



## 微博扩展（`utags-ext-weibo-post.user.js`）

须与本仓库主脚本 `0.34.2.1` 同用。官方原版无图标按钮放行，单独装扩展可能无效。

### 0.1.2

- 写入 `data-utags_cover`：帖文内第一张图（跳过头像、表情和底栏图标；本条没有图时用转发内容里的第一张；视频用封面）。封面脚本据此写入书签



### 0.1

- 扫描微博卡片（`article.woo-panel-main` / `Feed_wrap` / 搜索页 `card-wrap` 等），解析 key：`https://weibo.com/{uid}/{bid}`
- 标签挂在评论按钮上，跟在「评论」或评论数之后
- 写入 `data-utags_title`（帖文正文），收藏页可预览；去掉「Translate content」等翻译模块文案
- 忽略时间戳 permalink，避免和评论图标重复出标
- 按版面排除主栏两侧的整列侧栏（含分组栏、个人主页导航、热搜等）
- 清理曾挂在赞 / 转发上的旧标记
- MutationObserver 适配时间线；注入悬停显示样式

---



## 封面扩展（`utags-ext-post-cover.user.js`）

和微博扩展 `0.1.2` 或 X 扩展 `0.1.2` 一起装。页面上要先有 `data-utags_cover`。主脚本不用改。

### 0.1

- 读取链接上的 `data-utags_cover`
- 第一次给这条链接打标时，把该图写入书签 `meta.coverImage`（Advanced 里的 Cover Image URL）
- 书签里已经有封面时，再次保存标签不会覆盖

