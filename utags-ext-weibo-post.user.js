// ==UserScript==
// @name                 UTags Ext - Weibo Post Tags
// @name:zh-CN           UTags 扩展 - 微博单条帖文标签
// @namespace            https://github.com/hanzhsun/utags-extension
// @homepageURL          https://github.com/hanzhsun/utags-extension#readme
// @supportURL           https://github.com/hanzhsun/utags-extension/issues
// @version              0.1
// @description          Enable UTags on individual Weibo posts via the comment icon.
// @description:zh-CN    通过评论图标为微博单条帖文启用 UTags 标签。
// @icon                 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23ff6361' class='bi bi-tags-fill' viewBox='0 0 16 16'%3E %3Cpath d='M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'/%3E %3Cpath d='M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z'/%3E %3C/svg%3E
// @author               hanzhsun
// @license              MIT
// @match                https://weibo.com/*
// @match                https://www.weibo.com/*
// @match                https://s.weibo.com/*
// @match                https://m.weibo.cn/*
// @match                https://weibo.cn/*
// @noframes
// @run-at               document-idle
// ==/UserScript==
//
// Requires a UTags main script that:
// 1) skips site validate when data-utags_link is set
// 2) allows icon/svg targets when data-utags_link + data-utags_title are set
//
;(() => {
  'use strict'

  const NESTED_POST_SELECTOR =
    '[class*="Feed_retweet"], .retweet, [class*="Comment_"], .card-comment, [class*="commentlist"], [class*="RepostComment"]'

  const SIDEBAR_SELECTORS = [
    '[class*="Frame_side"]',
    '[class*="Frame_right"]',
    '[class*="Home_right"]',
  ]

  const GROUP_NAV_LABELS = ['全部关注', '最新微博', '特别关注', '好友圈']

  const RESERVED_FIRST = new Set([
    'u',
    'n',
    'p',
    'tv',
    'login',
    'signup',
    'signin',
    'ajax',
    'home',
    'explore',
    'news',
    'hot',
    'search',
    'detail',
    'status',
    'profile',
    'settings',
    'messages',
    'favicon',
    'about',
    'help',
    'newlogin',
    'passport',
    'logout',
    'register',
  ])

  const RESERVED_SECOND = new Set([
    'follow',
    'fans',
    'photos',
    'photo',
    'video',
    'weibo',
    'manage',
    'like',
    'info',
    'home',
    'profile',
    'search',
    'tag',
    'tags',
    'album',
    'videos',
    'article',
    'articles',
  ])

  const LABEL_CLASS = 'utags-ext-weibo-label'

  function injectStyle() {
    let style = document.getElementById('utags-ext-weibo-post-style')
    if (!style) {
      style = document.createElement('style')
      style.id = 'utags-ext-weibo-post-style'
      document.documentElement.append(style)
    }
    style.textContent = `
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]+.utags_ul_0,
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]+.utags_ul_1 {
  object-position: 200% 50%;
  --utags-notag-ul-disply: var(--utags-notag-ul-disply-5);
  --utags-notag-ul-height: var(--utags-notag-ul-height-5);
  --utags-notag-ul-position: var(--utags-notag-ul-position-5);
  --utags-notag-ul-top: var(--utags-notag-ul-top-5);
  --utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);
  --utags-notag-captain-tag-left: 4px;
  --utags-captain-tag-background-color: var(--utags-captain-tag-background-color-overlap);
  z-index: 2;
}
:not(#a):not(#b):not(#c) article.woo-panel-main:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) [class*="Feed_wrap"]:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) .card-wrap:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]:hover+.utags_ul .utags_captain_tag {
  opacity: 100%;
  width: calc(var(--utags-captain-tag-size) + 8px) !important;
  height: calc(var(--utags-captain-tag-size) + 8px) !important;
  padding: 5px 4px 4px 5px !important;
  transition: all 0s .1s !important;
  z-index: 2;
}
:not(#a):not(#b):not(#c) [data-utags_exclude] .utags_ul,
:not(#a):not(#b):not(#c) [class*="Frame_side"] .utags_ul,
:not(#a):not(#b):not(#c) [class*="Frame_right"] .utags_ul,
:not(#a):not(#b):not(#c) [class*="Home_right"] .utags_ul {
  display: none !important;
}
.utags-ext-weibo-label {
  display: inline;
}
`
  }

  function isWeiboHost(host) {
    return (
      host === 'weibo.com' ||
      host === 's.weibo.com' ||
      host === 'm.weibo.cn' ||
      host === 'weibo.cn'
    )
  }

  function getCanonicalPostUrl(href) {
    try {
      const url = new URL(href, location.origin)
      const host = url.hostname.replace(/^www\./, '')
      if (!isWeiboHost(host)) {
        return null
      }

      const path = url.pathname.replace(/\/+$/, '')

      let match = path.match(/^\/detail\/(\d+)$/)
      if (match) {
        return 'https://weibo.com/detail/' + match[1]
      }

      match = path.match(/^\/status\/([A-Za-z0-9]+)$/)
      if (match) {
        return /^\d+$/.test(match[1])
          ? 'https://weibo.com/detail/' + match[1]
          : 'https://weibo.com/status/' + match[1]
      }

      match = path.match(/^\/([^/]+)\/([A-Za-z0-9]+)$/)
      if (
        match &&
        !RESERVED_FIRST.has(match[1].toLowerCase()) &&
        !RESERVED_SECOND.has(match[2].toLowerCase()) &&
        match[2].length >= 6
      ) {
        return 'https://weibo.com/' + match[1] + '/' + match[2]
      }

      return null
    } catch {
      return null
    }
  }

  function isInsideNested(el, card) {
    const nested = el.closest(NESTED_POST_SELECTOR)
    return Boolean(nested && card.contains(nested))
  }

  function getStatusLink(card) {
    for (const link of card.querySelectorAll('a[href]')) {
      if (isInsideNested(link, card)) {
        continue
      }
      if (getCanonicalPostUrl(link.getAttribute('href') || '')) {
        return link
      }
    }
    return null
  }

  const TRANSLATE_LABELS = [
    'Translate content',
    '翻译内容',
    '翻译全文',
    '查看翻译',
    '显示翻译',
  ]

  function extractPostText(el) {
    const clone = el.cloneNode(true)
    for (const node of clone.querySelectorAll(
      '[class*="translate"], [class*="Translate"], [class*="Trans_"]'
    )) {
      node.remove()
    }
    for (const node of clone.querySelectorAll('a, button, span, div')) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
      if (TRANSLATE_LABELS.includes(text)) {
        node.remove()
      }
    }
    let title = (clone.textContent || '').replace(/\s+/g, ' ').trim()
    for (const label of TRANSLATE_LABELS) {
      title = title.replace(label, '')
    }
    return title.replace(/\s+/g, ' ').trim()
  }

  function getPostTitle(card, key) {
    const selectors = [
      '[class*="detail_wbtext"]',
      '[class*="wbpro-feed-ogText"]',
      '[node-type="feed_list_content"]',
      '.weibo-text',
    ]
    for (const selector of selectors) {
      for (const el of card.querySelectorAll(selector)) {
        if (isInsideNested(el, card)) {
          continue
        }
        const title = extractPostText(el)
        if (title) {
          return title.length > 120 ? title.slice(0, 117) + '...' : title
        }
      }
    }
    const match = key.match(/\/([^/]+)$/)
    return match ? 'Weibo ' + match[1] : 'Weibo'
  }

  function findAllByExactText(labels) {
    const found = []
    const xpath = labels
      .map((label) => 'normalize-space(text())="' + label + '"')
      .join(' or ')
    const snap = document.evaluate(
      './/*[' + xpath + ']',
      document.body,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    )
    for (let i = 0; i < snap.snapshotLength; i++) {
      found.push(snap.snapshotItem(i))
    }
    return found
  }

  function findHomeGroupNav() {
    let best = null
    let bestLen = Infinity
    for (const start of findAllByExactText(GROUP_NAV_LABELS)) {
      let node = start
      for (let i = 0; i < 8 && node && node !== document.body; i++) {
        const text = node.textContent || ''
        const count = GROUP_NAV_LABELS.filter((label) =>
          text.includes(label)
        ).length
        if (count >= 3 && text.length < 400) {
          if (text.length < bestLen) {
            best = node
            bestLen = text.length
          }
          break
        }
        node = node.parentElement
      }
    }
    return best
  }

  function excludeSidebars() {
    const roots = new Set()
    for (const selector of SIDEBAR_SELECTORS) {
      for (const el of document.querySelectorAll(selector)) {
        roots.add(el)
      }
    }
    const groupNav = findHomeGroupNav()
    if (groupNav) {
      roots.add(groupNav)
    }
    for (const root of roots) {
      if (root.dataset.utags_exclude === undefined) {
        root.dataset.utags_exclude = ''
      }
    }
  }

  function findToolbar(card) {
    const bars = card.querySelectorAll(
      '[class*="toolbar_main"], [class*="toolbar_left"], [class*="toolbar_box"], .card-act, .m-auto-box'
    )
    for (const bar of bars) {
      if (!isInsideNested(bar, card)) {
        return bar
      }
    }
    return null
  }

  // Comment icon is always in the post action bar.
  function findCommentTarget(card) {
    const bar = findToolbar(card)
    const scope = bar || card

    const icon = findFirstVisible(
      scope,
      card,
      '.woo-font--comment, [class*="woo-font--comment"], .m-icon-comment, [class*="icon-comment"]'
    )
    if (icon) {
      return commentControlOf(icon)
    }

    const titled = findFirstVisible(
      scope,
      card,
      'button[title="评论"], [title="评论"], [aria-label="评论"]'
    )
    if (titled) {
      return commentControlOf(titled)
    }

    const legacy = findFirstVisible(
      scope,
      card,
      '[action-type="feed_list_comment"], [action-type="fl_comment"]'
    )
    if (legacy) {
      return commentControlOf(legacy)
    }

    if (bar) {
      for (const item of bar.children) {
        const text = (item.textContent || '').replace(/\s+/g, ' ').trim()
        if (isCommentLabel(text.replace(/\s+/g, ''))) {
          return item
        }
      }
    }

    return null
  }

  function isCommentLabel(text) {
    if (!text) {
      return false
    }
    if (text.includes('评论')) {
      return true
    }
    return /^\d+(\.\d+)?[万w]?$/.test(text)
  }

  function findAdjacentCommentLabel(icon) {
    let sib = icon.nextElementSibling
    while (sib) {
      if (sib.matches('.utags_ul, [class*="utags_ul"], .' + LABEL_CLASS)) {
        if (sib.classList.contains(LABEL_CLASS)) {
          return sib
        }
        sib = sib.nextElementSibling
        continue
      }
      const text = (sib.textContent || '').replace(/\s+/g, '')
      if (isCommentLabel(text)) {
        return sib
      }
      sib = sib.nextElementSibling
    }
    return null
  }

  function wrapTextLabel(icon) {
    const parent = icon.parentElement
    if (!parent) {
      return null
    }
    const existing = parent.querySelector(':scope > .' + LABEL_CLASS)
    if (existing) {
      return existing
    }

    let seenIcon = false
    for (const child of [...parent.childNodes]) {
      if (
        child === icon ||
        (child.nodeType === Node.ELEMENT_NODE && child.contains(icon))
      ) {
        seenIcon = true
        continue
      }
      if (!seenIcon || child.nodeType !== Node.TEXT_NODE) {
        continue
      }
      const text = child.textContent.replace(/\s+/g, '')
      if (!isCommentLabel(text)) {
        continue
      }
      const span = document.createElement('span')
      span.className = LABEL_CLASS
      parent.replaceChild(span, child)
      span.appendChild(child)
      return span
    }
    return null
  }

  // Hang on the “评论” / count text so the tag sits at that text's right
  // edge — not the icon (covers 评) and not the toolbar column (too far).
  function commentControlOf(el) {
    const existing = el.parentElement
      ? el.parentElement.querySelector('.' + LABEL_CLASS)
      : null
    if (existing) {
      return existing
    }
    const label =
      findAdjacentCommentLabel(el) ||
      wrapTextLabel(el) ||
      (el.parentElement && findAdjacentCommentLabel(el.parentElement)) ||
      (el.parentElement && wrapTextLabel(el.parentElement))
    if (label) {
      return label
    }
    return el
  }

  function findFirstVisible(scope, card, selector) {
    for (const el of scope.querySelectorAll(selector)) {
      if (!barOrOwn(scope, card, el)) {
        continue
      }
      return el
    }
    return null
  }

  function barOrOwn(scope, card, el) {
    if (scope !== card) {
      return true
    }
    return !isInsideNested(el, card)
  }

  function collectCards() {
    const cards = []
    const seen = new Set()
    const selectors = [
      'article.woo-panel-main',
      '[class*="Feed_wrap"]',
      '.card-wrap[action-type="feed_list_item"]',
      '.card.m-panel.card9',
      '[class*="Detail_box"]',
    ]

    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (seen.has(el)) {
          continue
        }
        if (el.closest(NESTED_POST_SELECTOR) || el.closest('[data-utags_exclude]')) {
          continue
        }
        let nestedInCard = false
        for (const other of seen) {
          if (other.contains(el)) {
            nestedInCard = true
            break
          }
        }
        if (nestedInCard) {
          continue
        }
        seen.add(el)
        cards.push(el)
      }
    }

    return cards
  }

  function ignoreStatusLink(link, keep) {
    if (!link || link === keep) {
      return
    }
    link.dataset.utags_ignore = ''
  }

  function clearPostMarkers(card, keep) {
    for (const old of card.querySelectorAll(
      [
        '[data-utags_type="post"][data-utags_link]',
        '.woo-font--comment[data-utags_link]',
        '[class*="woo-font--comment"][data-utags_link]',
        'button[title="赞"][data-utags_link]',
        'a[title="赞"][data-utags_link]',
        '.woo-font--retweet[data-utags_link]',
        '[class*="woo-font--like"][data-utags_link]',
        '[action-type="feed_list_forward"][data-utags_link]',
        '[action-type="fl_forward"][data-utags_link]',
        '[action-type="feed_list_like"][data-utags_link]',
      ].join(',')
    )) {
      if (old === keep) {
        continue
      }
      delete old.dataset.utags_link
      delete old.dataset.utags_title
      delete old.dataset.utags_type
    }
  }

  function applyPostMarker(target, key, title) {
    if (target.dataset.utags_link !== key) {
      target.dataset.utags_link = key
    }
    if (target.dataset.utags_title !== title) {
      target.dataset.utags_title = title
    }
    if (target.dataset.utags_type !== 'post') {
      target.dataset.utags_type = 'post'
    }
  }

  function processPosts() {
    let usedLocationKey = false
    const locationKey = getCanonicalPostUrl(location.href)

    for (const card of collectCards()) {
      const statusLink = getStatusLink(card)
      let key = statusLink
        ? getCanonicalPostUrl(statusLink.getAttribute('href') || '')
        : null

      const commentTarget = findCommentTarget(card)
      if (!key && locationKey && !usedLocationKey && commentTarget) {
        key = locationKey
        usedLocationKey = true
      }
      if (!key) {
        continue
      }

      clearPostMarkers(card, commentTarget)
      ignoreStatusLink(statusLink, commentTarget)
      if (!commentTarget) {
        continue
      }

      applyPostMarker(commentTarget, key, getPostTitle(card, key))
    }
  }

  function main() {
    injectStyle()
    excludeSidebars()
    processPosts()
  }

  main()

  let timer = 0
  const observer = new MutationObserver(() => {
    if (timer) {
      return
    }
    timer = window.setTimeout(() => {
      timer = 0
      main()
    }, 300)
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
})()
