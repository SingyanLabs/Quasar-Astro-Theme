// src/utils/visibilityGuard.js

(function () {
  if (typeof window === 'undefined') return;

  const isFirefox = typeof InstallTrigger !== 'undefined' || /firefox/i.test(navigator.userAgent);
  if (isFirefox) {
    document.documentElement.classList.add('is-firefox');
  }

  if (window.gsap) {
    window.gsap.config({ force3D: "auto" });
    if (window.gsap.ticker) {
      window.gsap.ticker.lagSmoothing(1000, 16);
    }
  }

  if (!('IntersectionObserver' in window)) return;

  if (!document.getElementById('quasar-visibility-guard-style')) {
    const style = document.createElement('style');
    style.id = 'quasar-visibility-guard-style';
    style.textContent = `
      .is-offscreen {
        animation-play-state: paused !important;
      }
    `;
    document.head.appendChild(style);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.classList.remove('is-offscreen');
          el.dispatchEvent(new CustomEvent('quasar:resume', { bubbles: true }));
        } else {
          el.classList.add('is-offscreen');
          el.dispatchEvent(new CustomEvent('quasar:pause', { bubbles: true }));
        }
      });
    },
    { rootMargin: '180px 0px 180px 0px', threshold: 0 }
  );

  const scanAndObserve = () => {
    const selectors = ['canvas', 'video', '.animate-entrance', '[data-pause-offscreen]'];
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      observer.observe(el);
    });
  };

  let scanRfq = null;
  const debouncedScan = () => {
    if (scanRfq) return;
    scanRfq = requestAnimationFrame(() => {
      scanAndObserve();
      scanRfq = null;
    });
  };

  const domObserver = new MutationObserver(debouncedScan);
  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // 🌟 保留页面后台标记，但不再休眠 GSAP Ticker，确保音频与歌词在后台正常更新
  const handleVisibilityChange = () => {
    if (document.hidden) {
      document.documentElement.classList.add('is-tab-hidden');
    } else {
      document.documentElement.classList.remove('is-tab-hidden');
    }
  };

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  scanAndObserve();
  document.addEventListener('astro:page-load', scanAndObserve);
})();