// ==UserScript==
// @name                 UTags Ext - Post Cover
// @name:zh-CN           UTags 扩展 - 帖文封面
// @namespace            https://github.com/hanzhsun/utags-extension
// @homepageURL          https://github.com/hanzhsun/utags-extension#readme
// @supportURL           https://github.com/hanzhsun/utags-extension/issues
// @version              0.1
// @description          Save the post image marked by UTags extensions as the bookmark cover when adding tags.
// @description:zh-CN    打标时把扩展脚本标出的帖文图片写入书签封面。
// @icon                 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23ff6361' class='bi bi-tags-fill' viewBox='0 0 16 16'%3E %3Cpath d='M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'/%3E %3Cpath d='M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z'/%3E %3C/svg%3E
// @author               hanzhsun
// @license              MIT
// @match                https://weibo.com/*
// @match                https://www.weibo.com/*
// @match                https://s.weibo.com/*
// @match                https://m.weibo.cn/*
// @match                https://weibo.cn/*
// @match                https://x.com/*
// @match                https://twitter.com/*
// @noframes
// @run-at               document-idle
// ==/UserScript==
//
// Site scripts set data-utags_cover. This script copies that URL into the
// tag button's data-utags_meta before UTags saves the bookmark, so the main
// script does not need to know about covers.
//
// A cover already stored on the bookmark is left in place.
//
;(() => {
  'use strict'

  const STORE_KEY = 'extension.utags.urlmap'
  const CAPTAIN_SELECTOR = '.utags_captain_tag,.utags_captain_tag2'

  // key -> cover URL. Empty string means the bookmark was seen with no cover.
  const storedCovers = new Map()

  function isHttpUrl(url) {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  function parseStore(value) {
    let current = value
    for (let i = 0; i < 2 && typeof current === 'string'; i++) {
      try {
        current = JSON.parse(current)
      } catch {
        return null
      }
    }
    if (!current || typeof current !== 'object' || !current.data) {
      return null
    }
    return current
  }

  function rememberStore(key, value) {
    if (key !== STORE_KEY) {
      return
    }
    const store = parseStore(value)
    if (!store) {
      return
    }
    for (const [url, entry] of Object.entries(store.data)) {
      const cover = entry && entry.meta && entry.meta.coverImage
      storedCovers.set(url, typeof cover === 'string' ? cover.trim() : '')
    }
  }

  function coverFromElement(el) {
    if (!el) {
      return ''
    }
    const cover = (el.dataset.utags_cover || '').trim()
    return isHttpUrl(cover) ? cover : ''
  }

  function findCover(captain) {
    const ul = captain.closest('.utags_ul, [class*="utags_ul"]')
    const previous = ul && ul.previousElementSibling
    const fromPrevious = coverFromElement(previous)
    if (fromPrevious) {
      return fromPrevious
    }
    const key = captain.getAttribute('data-utags_key')
    if (!key || typeof CSS === 'undefined' || !CSS.escape) {
      return ''
    }
    const match = document.querySelector(
      '[data-utags_cover][data-utags_link="' + CSS.escape(key) + '"]'
    )
    return coverFromElement(match)
  }

  function readMeta(captain) {
    const raw = captain.getAttribute('data-utags_meta')
    if (!raw) {
      return {}
    }
    try {
      const meta = JSON.parse(raw)
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
        return null
      }
      return meta
    } catch {
      return null
    }
  }

  function writeMeta(captain, meta) {
    const next = JSON.stringify(meta)
    if (captain.getAttribute('data-utags_meta') !== next) {
      captain.setAttribute('data-utags_meta', next)
    }
  }

  function syncCaptain(captain) {
    const key = captain.getAttribute('data-utags_key')
    if (!key) {
      return
    }
    const meta = readMeta(captain)
    if (!meta) {
      return
    }
    const stored = storedCovers.has(key) ? storedCovers.get(key) : undefined
    if (stored) {
      if (meta.coverImage && meta.coverImage !== stored) {
        delete meta.coverImage
        writeMeta(captain, meta)
      }
      return
    }
    const isNew = captain.classList.contains('utags_captain_tag')
    if (stored === undefined && !isNew) {
      return
    }
    const cover = findCover(captain)
    if (!cover || meta.coverImage === cover) {
      return
    }
    if (meta.coverImage && meta.coverImage !== cover) {
      return
    }
    meta.coverImage = cover
    writeMeta(captain, meta)
  }

  let scheduled = false
  function schedule() {
    if (scheduled) {
      return
    }
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      for (const captain of document.querySelectorAll(CAPTAIN_SELECTOR)) {
        syncCaptain(captain)
      }
    })
  }

  function start() {
    const root = document.documentElement
    if (!root) {
      document.addEventListener('DOMContentLoaded', start, { once: true })
      return
    }
    if (typeof BroadcastChannel === 'function') {
      const channel = new BroadcastChannel('gm_value_change_channel')
      channel.addEventListener('message', (event) => {
        const data = event.data
        if (!data) {
          return
        }
        rememberStore(data.key, data.newValue)
        schedule()
      })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-utags_cover',
        'data-utags_meta',
        'data-utags_key',
        'data-utags_link',
      ],
    })
    document.addEventListener('pointerdown', schedule, true)
    document.addEventListener('mousedown', schedule, true)
    document.addEventListener('touchstart', schedule, true)
    schedule()
  }

  start()
})()
