// ==UserScript==
// @name                 UTags Ext - Tumblr Post Tags
// @name:zh-CN           UTags 扩展 - Tumblr 帖文标签
// @namespace            https://github.com/hanzhsun/utags-extension
// @homepageURL          https://github.com/hanzhsun/utags-extension#readme
// @supportURL           https://github.com/hanzhsun/utags-extension/issues
// @version              0.1
// @description          Add UTags to individual Tumblr posts from the reblog button.
// @description:zh-CN    通过 Tumblr 帖文的 reblog 按钮添加 UTags 标签。
// @author               hanzhsun
// @license              MIT
// @match                https://tumblr.com/*
// @match                https://www.tumblr.com/*
// @match                https://*.tumblr.com/*
// @noframes
// @run-at               document-idle
// ==/UserScript==
//
// Requires the UTags main script with support for data-utags_link and icon buttons.
;(() => {
  'use strict'

  const POST_CARD_SELECTOR =
    'article, [data-testid="post"], [data-testid*="post"], [role="article"]'
  const REBLOG_ICON_SELECTOR = [
    'svg use[href="#managed-icon__ds-reblog-24"]',
    'svg use[xlink\\:href="#managed-icon__ds-reblog-24"]',
    'svg use[href*="reblog"]',
    'svg use[xlink\\:href*="reblog"]',
  ].join(', ')
  const CONTROL_SELECTOR = 'button, [role="button"], [tabindex="0"]'
  const REBLOG_LABEL_RE = /(reblog|unreblog|转发|轉發|轉貼|转贴)/i
  const RESERVED_BLOGS = new Set([
    'explore',
    'search',
    'dashboard',
    'settings',
    'login',
    'register',
    'signup',
    'tagged',
    'likes',
    'following',
    'followers',
    'inbox',
    'activity',
    'messaging',
    'new',
    'blog',
    'blogs',
    'communities',
    'about',
    'apps',
    'help',
    'policy',
    'privacy',
    'jobs',
    'support',
  ])
  const POST_TEXT_SELECTORS = [
    '[data-testid="post-content"]',
    '[data-testid="post_body"]',
    '[data-testid*="post-body"]',
    '[class*="postContent"]',
    '[class*="PostContent"]',
  ]

  function truncateTitle(text) {
    const title = text.replace(/\s+/g, ' ').trim()
    if (!title) return ''
    return title.length > 120 ? title.slice(0, 117) + '...' : title
  }

  function getCanonicalPostUrl(href) {
    try {
      const url = new URL(href, location.href)
      const host = url.hostname.toLowerCase().replace(/^www\./, '')
      if (host !== 'tumblr.com' && !host.endsWith('.tumblr.com')) return null

      const parts = url.pathname.split('/').filter(Boolean)
      let blog
      let id

      if (host !== 'tumblr.com' && host.endsWith('.tumblr.com')) {
        blog = host.slice(0, -'.tumblr.com'.length).split('.')[0]
        const match = url.pathname.match(/^\/post\/(\d+)(?:\/|$)/)
        if (!match) return null
        id = match[1]
      } else if (parts.length >= 3 && parts[1] === 'post') {
        blog = parts[0]
        id = parts[2]
      } else if (parts.length >= 2) {
        blog = parts[0]
        id = parts[1]
      }

      if (!blog || RESERVED_BLOGS.has(blog.toLowerCase())) return null
      if (!/^\d+$/.test(id || '')) return null
      return `https://www.tumblr.com/${blog}/${id}`
    } catch {
      return null
    }
  }

  function getControlLabel(control) {
    const labels = [
      control.getAttribute('aria-label'),
      control.getAttribute('title'),
      control.getAttribute('data-testid'),
      ...Array.from(control.querySelectorAll('[aria-label], [title]')).map(
        (node) => node.getAttribute('aria-label') || node.getAttribute('title')
      ),
      control.textContent,
    ]
    return labels.filter(Boolean).join(' ').trim()
  }

  function asControl(node) {
    if (!node) return null
    // Never hang on svg/use — main script excludes svg.
    return node.closest(CONTROL_SELECTOR)
  }

  function findReblogButton(container) {
    const use = container.querySelector(REBLOG_ICON_SELECTOR)
    const fromIcon = asControl(use)
    if (fromIcon) return fromIcon

    for (const control of container.querySelectorAll(CONTROL_SELECTOR)) {
      if (REBLOG_LABEL_RE.test(getControlLabel(control))) return control
    }
    return null
  }

  function findPostContainer(link) {
    const card = link.closest(POST_CARD_SELECTOR)
    if (card && findReblogButton(card)) return card

    let container = link.parentElement
    for (
      let depth = 0;
      container && depth < 8;
      depth++, container = container.parentElement
    ) {
      if (findReblogButton(container)) return container
    }
    return null
  }

  function getPostTitle(container, postUrl) {
    for (const selector of POST_TEXT_SELECTORS) {
      const content = container.querySelector(selector)
      const title = truncateTitle(content?.textContent || '')
      if (title) return title
    }

    const candidates = Array.from(container.querySelectorAll('p, blockquote'))
      .filter((node) => !node.closest('button, [role="button"], a, time'))
      .map((node) => truncateTitle(node.textContent || ''))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
    if (candidates[0]) return candidates[0]

    const id = postUrl.match(/\/(\d+)$/)?.[1]
    return `Tumblr post ${id || ''}`.trim()
  }

  function clearPostMarkers(container, keep) {
    for (const old of container.querySelectorAll(
      '[data-utags_type="post"][data-utags_link]'
    )) {
      if (old === keep) continue
      delete old.dataset.utags_link
      delete old.dataset.utags_title
      delete old.dataset.utags_type
      delete old.dataset.utags_cover
    }
  }

  function setPostData(button, container, postUrl) {
    delete button.dataset.utags_cover
    const values = {
      utags_link: postUrl,
      utags_title: getPostTitle(container, postUrl),
      utags_type: 'post',
    }
    for (const [name, value] of Object.entries(values)) {
      if (value) {
        if (button.dataset[name] !== value) button.dataset[name] = value
      } else {
        delete button.dataset[name]
      }
    }
  }

  function processPosts() {
    const processed = new Set()
    for (const link of document.querySelectorAll('a[href]')) {
      const postUrl = getCanonicalPostUrl(link.getAttribute('href') || '')
      if (!postUrl) continue

      const container = findPostContainer(link)
      if (!container) continue
      const reblogButton = findReblogButton(container)
      clearPostMarkers(container, reblogButton)
      if (!reblogButton || processed.has(reblogButton)) continue

      processed.add(reblogButton)
      setPostData(reblogButton, container, postUrl)
    }
  }

  function injectStyle() {
    if (document.getElementById('utags-tumblr-post-style')) return
    const style = document.createElement('style')
    style.id = 'utags-tumblr-post-style'
    style.textContent = `
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]+.utags_ul_0,
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]+.utags_ul_1 {
  object-position: 200% 50%;
  --utags-notag-ul-disply: var(--utags-notag-ul-disply-5);
  --utags-notag-ul-height: var(--utags-notag-ul-height-5);
  --utags-notag-ul-position: var(--utags-notag-ul-position-5);
  --utags-notag-ul-top: var(--utags-notag-ul-top-5);
  --utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);
  --utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);
  --utags-captain-tag-background-color: var(--utags-captain-tag-background-color-overlap);
  z-index: 2;
}
:not(#a):not(#b):not(#c) article:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) [role="article"]:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]:hover+.utags_ul .utags_captain_tag {
  opacity: 1;
  width: calc(var(--utags-captain-tag-size) + 8px) !important;
  height: calc(var(--utags-captain-tag-size) + 8px) !important;
  padding: 5px 4px 4px 5px !important;
  transition: all 0s .1s !important;
  z-index: 2;
}`
    document.documentElement.append(style)
  }

  injectStyle()
  processPosts()

  let timer = 0
  const observer = new MutationObserver(() => {
    if (timer) return
    timer = window.setTimeout(() => {
      timer = 0
      processPosts()
    }, 300)
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href', 'xlink:href'],
  })
})()
