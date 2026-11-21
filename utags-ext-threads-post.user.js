// ==UserScript==
// @name                 UTags Ext - Threads Post Tags
// @name:zh-CN           UTags 扩展 - Threads 帖文标签
// @namespace            https://github.com/hanzhsun/utags-extension
// @homepageURL          https://github.com/hanzhsun/utags-extension#readme
// @supportURL           https://github.com/hanzhsun/utags-extension/issues
// @version              0.1
// @description          Add UTags to individual Threads posts from the Save button.
// @description:zh-CN    通过 Threads 帖子的 Save 按钮添加 UTags 标签。
// @author               hanzhsun
// @license              MIT
// @match                https://threads.com/*
// @match                https://www.threads.com/*
// @match                https://threads.net/*
// @match                https://www.threads.net/*
// @noframes
// @run-at               document-idle
// ==/UserScript==
//
// Requires the UTags main script with support for data-utags_link and icon buttons.
;(() => {
  'use strict'

  const POST_LINK_SELECTOR = 'a[href*="/post/"]'
  const POST_CONTAINER_SELECTOR =
    'article, [role="article"], [data-pressable-container="true"]'
  const SAVE_CONTROL_SELECTOR = 'button, [role="button"], [tabindex="0"], [data-testid]'
  const SAVE_LABEL_RE =
    /(save|saved|bookmark|unsave|remove( from saved| bookmark)?|保存|已保存|收藏)/i

  function getPostUrl(href) {
    try {
      const url = new URL(href, location.href)
      const host = url.hostname.replace(/^www\./, '')
      const match = url.pathname.match(/^\/@[^/]+\/post\/([^/]+)/)
      if (!match || !['threads.com', 'threads.net'].includes(host)) return null
      return `https://www.threads.com${url.pathname.split('/').slice(0, 4).join('/')}`
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

  function findSaveButton(container) {
    for (const control of container.querySelectorAll(SAVE_CONTROL_SELECTOR)) {
      if (SAVE_LABEL_RE.test(getControlLabel(control))) {
        return control.matches('button, [role="button"], [tabindex="0"]')
          ? control
          : control.closest('button, [role="button"], [tabindex="0"]') || control
      }
    }
    return null
  }

  function findPostContainer(postLink) {
    let container = postLink.closest(POST_CONTAINER_SELECTOR) || postLink.parentElement
    for (
      let depth = 0;
      container && depth < 4;
      depth++, container = container.parentElement
    ) {
      if (findSaveButton(container)) return container
    }
    return null
  }

  function getPostTitle(container, postUrl) {
    const username = postUrl.match(/\/@([^/]+)\/post\//)?.[1]?.toLowerCase()
    const textNodes = container.querySelectorAll('span[dir="auto"]')
    const candidates = Array.from(
      textNodes.length ? textNodes : container.querySelectorAll('div[dir="auto"]')
    )
      .filter((node) => !node.closest('a, button, [role="button"], time'))
      .map((node) => {
        const copy = node.cloneNode(true)
        copy
          .querySelectorAll('button, [role="button"], [tabindex="0"]')
          .forEach((button) => button.remove())
        return copy.textContent?.replace(/\s+/g, ' ').trim() || ''
      })
      .filter((text) => text && (!username || text.replace(/^@/, '').toLowerCase() !== username))
      .sort((a, b) => b.length - a.length)

    const title = candidates[0]
    if (title) return title.length > 120 ? title.slice(0, 117) + '...' : title
    return `Threads post ${postUrl.match(/\/post\/([^/]+)/)?.[1] || ''}`.trim()
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
    for (const link of document.querySelectorAll(POST_LINK_SELECTOR)) {
      const postUrl = getPostUrl(link.getAttribute('href') || '')
      if (!postUrl) continue

      const container = findPostContainer(link)
      if (!container) continue
      const saveButton = findSaveButton(container)
      if (!saveButton || processed.has(saveButton)) continue

      processed.add(saveButton)
      setPostData(saveButton, container, postUrl)
    }
  }

  function injectStyle() {
    if (document.getElementById('utags-threads-post-style')) return
    const style = document.createElement('style')
    style.id = 'utags-threads-post-style'
    style.textContent = `
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
    attributeFilter: ['href'],
  })
})()
