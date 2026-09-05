// ==UserScript==
// @name                 UTags Ext - X Tweet Tags
// @name:zh-CN           UTags 扩展 - X 单条推文标签
// @namespace            https://github.com/hanzhsun/utags-extension
// @homepageURL          https://github.com/hanzhsun/utags-extension#readme
// @supportURL           https://github.com/hanzhsun/utags-extension/issues
// @version              0.1.1
// @description          Enable UTags on individual X (Twitter) tweets via the repost button.
// @description:zh-CN    通过转帖按钮为 X (Twitter) 单条推文启用 UTags 标签。
// @icon                 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23ff6361' class='bi bi-tags-fill' viewBox='0 0 16 16'%3E %3Cpath d='M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'/%3E %3Cpath d='M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z'/%3E %3C/svg%3E
// @author               hanzhsun
// @license              MIT
// @match                https://x.com/*
// @match                https://twitter.com/*
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

  const STATUS_PATH_RE = /^\/([A-Za-z0-9_]+)\/status\/(\d+)/

  function injectStyle() {
    if (document.getElementById('utags-ext-x-tweet-style')) {
      return
    }
    const style = document.createElement('style')
    style.id = 'utags-ext-x-tweet-style'
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
:not(#a):not(#b):not(#c) article[data-testid="tweet"]:hover [data-utags_type="post"][data-utags_link]+.utags_ul .utags_captain_tag,
:not(#a):not(#b):not(#c) [data-utags_type="post"][data-utags_link]:hover+.utags_ul .utags_captain_tag {
  opacity: 100%;
  width: calc(var(--utags-captain-tag-size) + 8px) !important;
  height: calc(var(--utags-captain-tag-size) + 8px) !important;
  padding: 5px 4px 4px 5px !important;
  transition: all 0s .1s !important;
  z-index: 2;
}
`
    document.documentElement.append(style)
  }

  function getCanonicalTweetUrl(href) {
    try {
      const url = new URL(href, location.origin)
      const host = url.hostname.replace(/^www\./, '')
      if (host !== 'x.com' && host !== 'twitter.com') {
        return null
      }
      const match = url.pathname.match(STATUS_PATH_RE)
      if (!match) {
        return null
      }
      return 'https://x.com/' + match[1] + '/status/' + match[2]
    } catch {
      return null
    }
  }

  function getStatusLink(article) {
    for (const link of article.querySelectorAll('a[href*="/status/"]')) {
      if (!link.querySelector('time')) {
        continue
      }
      if (getCanonicalTweetUrl(link.getAttribute('href') || '')) {
        return link
      }
    }
    return null
  }

  function getTweetTitle(article, key) {
    const tweetText = article.querySelector('[data-testid="tweetText"]')
    const title =
      tweetText == null || tweetText.textContent == null
        ? ''
        : tweetText.textContent.trim()
    if (title) {
      return title.length > 120 ? title.slice(0, 117) + '...' : title
    }
    const match = key.match(/\/status\/(\d+)/)
    return match ? 'Tweet ' + match[1] : 'Tweet'
  }

  // Repost button is always in the tweet action bar (reposted or not).
  function findRepostButton(article) {
    return (
      article.querySelector('[data-testid="retweet"]') ||
      article.querySelector('[data-testid="unretweet"]')
    )
  }

  function clearPostMarkers(article, keep) {
    for (const old of article.querySelectorAll(
      [
        '[data-utags_type="post"][data-utags_link]',
        '[data-testid="like"][data-utags_link]',
        '[data-testid="unlike"][data-utags_link]',
        '[data-testid="share"][data-utags_link]',
        '[data-testid="bookmark"][data-utags_link]',
        '[data-testid="removeBookmark"][data-utags_link]',
        'a[href*="/analytics"][data-utags_link]',
        '[data-testid="viewCount"][data-utags_link]',
        '[data-testid="impressions"][data-utags_link]',
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

  function processTweets() {
    for (const article of document.querySelectorAll(
      'article[data-testid="tweet"]'
    )) {
      const statusLink = getStatusLink(article)
      if (!statusLink) {
        continue
      }

      const key = getCanonicalTweetUrl(statusLink.getAttribute('href') || '')
      if (!key) {
        continue
      }

      const repostButton = findRepostButton(article)
      clearPostMarkers(article, repostButton)
      if (!repostButton) {
        continue
      }

      const title = getTweetTitle(article, key)

      if (repostButton.dataset.utags_link !== key) {
        repostButton.dataset.utags_link = key
      }
      if (repostButton.dataset.utags_title !== title) {
        repostButton.dataset.utags_title = title
      }
      if (repostButton.dataset.utags_type !== 'post') {
        repostButton.dataset.utags_type = 'post'
      }
    }
  }

  function main() {
    injectStyle()
    processTweets()
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
