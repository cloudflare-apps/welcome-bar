import deepEqual from 'deep-equal'
import stringToHash from './string-to-hash'

(function () {
  'use strict'

  if (!window.addEventListener) return // Check for IE9+

  let hash
  let options = INSTALL_OPTIONS
  let product = INSTALL_PRODUCT
  const localStorage = window.localStorage || {}
  let previewMessageIndex = 0
  const LOCAL_STORAGE_PREFIX = 'cf-welcome-bar-hashes-seen-'
  const VISIBILITY_ATTRIBUTE = 'data-cf-welcome-bar-visibility'
  const DAY_DURATION = 172800000
  const documentElementOriginallyPositionStatic = window.getComputedStyle(document.documentElement).position === 'static'

  const element = document.createElement('cloudflare-app')
  element.setAttribute('app', 'welcome-bar')

  const htmlStyle = document.createElement('style')
  document.head.appendChild(htmlStyle)

  const elementStyle = document.createElement('style')
  document.head.appendChild(elementStyle)

  function getMaxZIndex () {
    var max = 0
    var elements = document.getElementsByTagName('*')

    Array.prototype.slice.call(elements).forEach(element => {
      var zIndex = parseInt(document.defaultView.getComputedStyle(element).zIndex, 10)

      max = zIndex ? Math.max(max, zIndex) : max
    })

    return max
  }

  function setPageStyles () {
    setHTMLStyle()
    setFixedElementStyles()
  }

  function setHTMLStyle () {
    if (!document.body) return

    let style = ''

    if (documentElementOriginallyPositionStatic && isShown()) {
      style = `
        html {
          position: relative;
          top: ${element.clientHeight}px;
        }
      `
    }

    htmlStyle.innerHTML = style
  }

  function setFixedElementStyles () {
    function removeTopStyle (node) {
      const currentStyle = node.getAttribute('style')
      if (!currentStyle) return

      node.setAttribute('style', currentStyle.replace(/top[^]+?/g, ''))
    }

    // Cache this to minimize potential repaints.
    const elementHeight = element.clientHeight

    // Find fixed position nodes to adjust.
    const allNodes = document.querySelectorAll('*:not([app="welcome-bar"]):not([data-cfapps-welcome-bar-adjusted-fixed-element-original-top])')

    Array.prototype.forEach.call(allNodes, node => {
      const computedStyle = window.getComputedStyle(node)
      const boundingClientRect = node.getBoundingClientRect()

      const isSticky = computedStyle.position === 'sticky'
      const isFixed = computedStyle.position === 'fixed'
      const isBottomFixed = computedStyle.bottom === '0px' && boundingClientRect.bottom === window.innerHeight && boundingClientRect.top >= elementHeight

      if (INSTALL_ID === 'preview' && node.nodeName === 'IFRAME' && node.src.indexOf('https://embedded.cloudflareapps.com') !== -1) {
        // HACK: Improves mobile experience by omitting preview notice.
        return
      }

      if ((isFixed || isSticky) && !isBottomFixed) {
        const {top} = boundingClientRect
        const styleTop = parseInt(computedStyle.top, 10)

        if (isSticky || (top === styleTop && top <= elementHeight)) {
          node.setAttribute('data-cfapps-welcome-bar-adjusted-fixed-element-original-top', top)
        }
      }
    })

    // Adjust them.
    const adjustedNodes = document.querySelectorAll('[data-cfapps-welcome-bar-adjusted-fixed-element-original-top]')

    Array.prototype.forEach.call(adjustedNodes, node => {
      removeTopStyle(node)

      const computedStyle = window.getComputedStyle(node)
      const isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky'

      if (isFixedOrSticky && isShown() && elementHeight > 0) {
        const newTop = (parseInt(computedStyle.top, 10) || 0) + elementHeight
        node.style.top = newTop + 'px'
      }
    })
  }

  function isShown () {
    return document.documentElement.getAttribute(VISIBILITY_ATTRIBUTE) === 'visible'
  }

  function cleanUpExpiredHashes () {
    const weekAgo = Date.now() - (DAY_DURATION * 7)

    Object.keys(localStorage)
      .filter(key => key.startsWith(LOCAL_STORAGE_PREFIX))
      .filter(key => weekAgo > localStorage[key])
      .forEach(key => delete localStorage[key])
  }

  function getLocalStorageKey () {
    return LOCAL_STORAGE_PREFIX + hash
  }

  function hideWelcomeBar ({persist} = {persist: false}) {
    document.documentElement.setAttribute(VISIBILITY_ATTRIBUTE, 'hidden')
    element.removeAttribute('data-slide-animation')

    if (persist) {
      try {
        localStorage[getLocalStorageKey()] = Date.now()
      } catch (e) {}
    }

    setPageStyles()
  }

  const hideWelcomeBarPersist = hideWelcomeBar.bind(null, {persist: true})

  function cancelAnimation () {
    element.removeEventListener('transitionend', hideWelcomeBar)
    element.removeAttribute('data-slide-animation')
  }

  function updateAnimation () {
    if (!options.behavior.automaticallyHide) {
      cancelAnimation()
      return
    }

    element.addEventListener('transitionend', hideWelcomeBar)
    element.addEventListener('mouseover', cancelAnimation)
    element.addEventListener('click', cancelAnimation)

    // Note: This ensures that all browsers trigger the transition on load.
    window.requestAnimationFrame(() => {
      element.setAttribute('data-slide-animation', '')

      window.requestAnimationFrame(() => {
        element.setAttribute('data-slide-animation', 'complete')
      })
    })
  }

  function updateElementStyle () {
    elementStyle.innerHTML = `
      cloudflare-app[app="welcome-bar"] {
        background-color: ${options.theme.backgroundColor};
        color: ${options.theme.textColor};
      }

      @media (max-width: 768px) {
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button,
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button:hover,
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button:active {
          color: ${options.theme.textColor};
        }
      }

      @media (min-width: 768px) {
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button,
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button:hover,
        cloudflare-app[app="welcome-bar"][data-style="prominent"] .alert-cta-button:active {
          background-color: ${options.theme.buttonBackgroundColor} !important;
          color: ${options.theme.buttonTextColorStrategy === 'auto' ? options.theme.backgroundColor : options.theme.buttonTextColor} !important;
        }
      }
    `

    element.setAttribute('data-style', options.theme.style)
  }

  // todo check if seen specific entry
  function hasSeenHash () {
    let foundHash = false

    try {
      foundHash = !!localStorage[getLocalStorageKey()]
    } catch (e) {}

    return foundHash
  }

  function updateElement () {
    const isPro = product && product.id === 'pro'

    let message, cta
    let shouldShow = true

    // Fix for legacy customers.
    if (!options.messagePlan || options.messagePlan === 'single') {
      ({message, cta} = options)
    } else if (!options.messages.length) {
      shouldShow = false
    } else {
      let messageIndex

      if (INSTALL_ID === 'preview') {
        // Show the message last edited.
        messageIndex = previewMessageIndex
      } else {
        messageIndex = Math.floor(Math.random() * options.messages.length)
      }

      if (!options.messages.length) return

      const entry = options.messages[messageIndex]
      ;({message, cta} = entry)

      if (isPro && entry.useEndDate) {
        const endDate = new Date(entry.endDate)
        const now = new Date()

        shouldShow = endDate < now
      }
    }

    hash = stringToHash(message)

    if (INSTALL_ID !== 'preview' && (!shouldShow || hasSeenHash())) {
      hideWelcomeBar()
      return
    }

    updateElementStyle()
    element.innerHTML = ''
    element.style.zIndex = getMaxZIndex() + 1

    const messageContainer = document.createElement('alert-message')
    const messageContent = document.createElement('alert-message-content')

    // NOTE: this fixes an oddity in the App Bundler that omits blank strings.
    messageContent.textContent = (message || '').trim() || 'We just launched an amazing new product!'
    messageContent.innerHTML = messageContent.innerHTML.replace(/\n/g, '<br />')
    messageContainer.appendChild(messageContent)

    if (cta.show) {
      const ctaButton = document.createElement('a')
      ctaButton.className = 'alert-cta-button'
      ctaButton.textContent = (cta.label || '').trim() || 'More info'

      if (cta.newWindow) ctaButton.target = '_blank'

      if (cta.url) ctaButton.href = cta.url

      messageContent.appendChild(ctaButton)
    }

    element.appendChild(messageContainer)

    if (options.behavior.showCloseButton) {
      const dismissButton = document.createElement('alert-dismiss')

      dismissButton.setAttribute('role', 'button')
      dismissButton.textContent = '×'

      dismissButton.addEventListener('click', hideWelcomeBarPersist)

      element.appendChild(dismissButton)
    }

    document.documentElement.setAttribute(VISIBILITY_ATTRIBUTE, 'visible')

    updateAnimation()
  }

  function bootstrap () {
    cleanUpExpiredHashes()
    document.body.appendChild(element)

    updateElement()

    window.requestAnimationFrame(setPageStyles)
    window.addEventListener('resize', setPageStyles)
  }

  // INSTALL_SCOPE is an object that is used to handle option changes without refreshing the page.
  window.INSTALL_SCOPE = {
    updateOptions (nextOptions) {
      if (nextOptions.messages.length !== options.messages.length) {
        // Customer changed number of entries.
        previewMessageIndex = nextOptions.messages.length - 1
      } else {
        for (let i = 0; i < nextOptions.messages.length; i++) {
          const oldEntry = options.messages[i]
          const nextEntry = nextOptions.messages[i]

          if (!deepEqual(nextEntry, oldEntry)) {
            previewMessageIndex = i
            break
          }
        }
      }

      options = nextOptions

      updateElement()
      setPageStyles()
    },
    updateProduct (nextProduct) {
      product = nextProduct

      updateElement()
      setPageStyles()
    },
    updateTheme (nextOptions) {
      const themeStyleChanged = nextOptions.theme.style !== options.theme.style
      options = nextOptions

      updateElementStyle()

      if (themeStyleChanged) setPageStyles()

      if (!isShown()) {
        // Checking before setting prevents sluggish DOM repaints.
        document.documentElement.setAttribute(VISIBILITY_ATTRIBUTE, 'visible')
      }
    }
  }

  // This code ensures that the app doesn't run before the page is loaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap)
  } else {
    bootstrap()
  }
}())
