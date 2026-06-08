declare global {
  interface Window {
    _paq?: Array<Array<string | number | boolean>>
  }
}

const MATOMO_BASE_URL = 'https://analytics.losmundosedufis.com/'
const MATOMO_SITE_ID = '7'
const MATOMO_SCRIPT_SELECTOR = 'script[data-edumind-matomo="true"]'

let initialized = false

export function initializeMatomo(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  initialized = true

  const queue = (window._paq = window._paq || [])
  queue.push(['disableCookies'])
  queue.push(['setDoNotTrack', true])
  queue.push(['trackPageView'])
  queue.push(['enableLinkTracking'])
  queue.push(['setTrackerUrl', `${MATOMO_BASE_URL}matomo.php`])
  queue.push(['setSiteId', MATOMO_SITE_ID])

  if (document.querySelector(MATOMO_SCRIPT_SELECTOR)) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `${MATOMO_BASE_URL}matomo.js`
  script.dataset.edumindMatomo = 'true'
  document.head.appendChild(script)
}
