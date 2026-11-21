# UTags 单条帖文标签扩展

本仓库包含 UTags 主脚本及 X、Threads、微博的单条帖文扩展。扩展脚本把帖子链接和标题写到帖子操作按钮上，让 UTags 可以把单条帖子作为书签保存。

## 文件

| 文件 | 版本 | 说明 |
| --- | --- | --- |
| `🏷️ UTags - Add usertags to links-0.34.2.1.user.js` | 0.34.2.1 | UTags 主脚本，允许扩展通过 `data-utags_link` 为单条帖子启用标签 |
| `utags-ext-x-tweet.user.js` | 0.1.2 | 将 X 帖文标签挂到转帖按钮 |
| `utags-ext-threads-post.user.js` | 0.1 | 将 Threads 帖文标签挂到 Save 按钮 |
| `utags-ext-weibo-post.user.js` | 0.1.2 | 将微博帖文标签挂到评论按钮 |
| `utags-ext-post-cover.user.js` | 0.1 | 把支持站点标记的首图保存为书签封面 |
| `utags-ext-custom-rule-template.user.js` | 0.1.0 | UTags 自定义规则模板 |

## 安装

1. 在 Tampermonkey、Violentmonkey 等用户脚本管理器中安装本仓库的 UTags 主脚本。
2. 安装对应站点的扩展脚本。
3. 刷新目标网站。

单条帖文扩展依赖本仓库主脚本中的 `data-utags_link` 放行和图标按钮支持。只安装站点扩展脚本无法启用标签。

## Threads 扩展 0.1

- 支持 `threads.com`、`www.threads.com` 及旧域名 `threads.net`、`www.threads.net`。
- 在帖子容器中识别 Save 按钮，并将 UTags 标签挂到该按钮。
- 使用帖子 permalink 作为书签链接，使用帖子正文作为标题。
- 提取标题时排除按钮、链接和时间等交互文本，因此 Translate 按钮不会写进标题。
- 通过 MutationObserver 处理动态加载和更新的帖子。

Threads 页面结构由网站控制，按钮标签或帖子容器变化时可能需要更新选择逻辑。

## 封面

`utags-ext-post-cover.user.js` 与 X、微博扩展配合使用。它会把站点脚本写入 `data-utags_cover` 的图片地址保存到书签封面；Threads 当前不在该脚本的匹配范围内。

## 许可

MIT
