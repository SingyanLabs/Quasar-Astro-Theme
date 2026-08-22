// src/assets/js/moments.js

(() => {
  let momentsData = [];
  let cardObserver = null;

  // 🔑 IndexedDB + LocalStorage 双轨持久化配置
  const DB_NAME = 'QuasarMoments';
  const DB_VERSION = 2;
  const LS_LIKES_KEY = 'quasar_moments_likes_store';
  let dbInstance = null;

  const getLocalLikes = () => {
    try { return JSON.parse(localStorage.getItem(LS_LIKES_KEY) || '{}'); } 
    catch (e) { return {}; }
  };

  const setLocalLike = (momentId, isLiked) => {
    try {
      const store = getLocalLikes();
      store[momentId] = isLiked;
      localStorage.setItem(LS_LIKES_KEY, JSON.stringify(store));
    } catch (e) { console.error('LocalStorage 写入失败:', e); }
  };

  const getDB = () => {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('likes')) db.createObjectStore('likes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'url' });
        if (!db.objectStoreNames.contains('moments')) db.createObjectStore('moments', { keyPath: 'id' });
      };
      request.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
      request.onerror = (e) => reject(e.target.error);
    });
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getImageDimensions = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = base64Str;
    });
  };

  // 全量存入文本、评论、点赞人
  const saveMomentsTextData = async () => {
    const jsonEl = document.getElementById('moments-json');
    if (!jsonEl) return;
    try {
      const momentsList = JSON.parse(jsonEl.textContent || '[]');
      const db = await getDB();
      const tx = db.transaction('moments', 'readwrite');
      const store = tx.objectStore('moments');
      momentsList.forEach((item) => {
        store.put({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          time: item.time,
          location: item.location,
          body: item.body,
          images: item.images,
          likes: item.likes,
          comments: item.comments,
          updatedAt: Date.now()
        });
      });
    } catch (err) {}
  };

  // 图片 Base64 + 元数据缓存
  const initImageCache = async () => {
    const lazyImgs = document.querySelectorAll('img[data-src]');
    if (!lazyImgs.length) return;
    try {
      const db = await getDB();
      lazyImgs.forEach((img) => {
        const rawUrl = img.getAttribute('data-src');
        if (!rawUrl || img.getAttribute('data-idb-loaded') === 'true') return;

        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const req = store.get(rawUrl);

        req.onsuccess = async () => {
          if (req.result && req.result.base64) {
            img.src = req.result.base64;
            img.setAttribute('data-idb-loaded', 'true');
            if (req.result.width) img.setAttribute('data-width', req.result.width);
            if (req.result.height) img.setAttribute('data-height', req.result.height);
          } else {
            try {
              const res = await fetch(rawUrl);
              if (res.ok) {
                const blob = await res.blob();
                const base64Str = await blobToBase64(blob);
                const dimensions = await getImageDimensions(base64Str);

                const writeTx = db.transaction('images', 'readwrite');
                writeTx.objectStore('images').put({
                  url: rawUrl,
                  base64: base64Str,
                  width: dimensions.width,
                  height: dimensions.height,
                  type: blob.type,
                  size: blob.size,
                  cachedAt: Date.now()
                });

                img.src = base64Str;
                img.setAttribute('data-idb-loaded', 'true');
              } else { img.src = rawUrl; }
            } catch (fetchErr) { img.src = rawUrl; }
          }
        };
        req.onerror = () => { img.src = rawUrl; };
      });
    } catch (err) {}
  };

  const updateMomentLikeUI = (cardEl, isLiked) => {
    if (!cardEl) return;
    const btn = cardEl.querySelector('.post-like-btn');
    const likesSection = cardEl.querySelector('.likes-section');
    const myLikeTag = cardEl.querySelector('.my-like-tag');

    if (btn) btn.classList.toggle('liked', isLiked);

    if (myLikeTag) {
      if (isLiked) myLikeTag.classList.add('active');
      else myLikeTag.classList.remove('active');
    }

    if (likesSection) {
      const otherTags = cardEl.querySelectorAll('.likes-avatars .avatar-tag:not(.my-like-tag)');
      if (isLiked || otherTags.length > 0) likesSection.style.display = 'flex';
      else likesSection.style.display = 'none';
    }
  };

  // 0ms 双轨还原点赞 UI
  const restoreLikesUI = async () => {
    const localStore = getLocalLikes();
    const cards = document.querySelectorAll('article.detail-card');
    cards.forEach(card => {
      const momentId = card.getAttribute('data-detail-id');
      if (momentId && typeof localStore[momentId] === 'boolean') {
        updateMomentLikeUI(card, localStore[momentId]);
      }
    });

    try {
      const db = await getDB();
      const tx = db.transaction('likes', 'readonly');
      const store = tx.objectStore('likes');
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        records.forEach(record => {
          if (record.id.startsWith('post_')) {
            const momentId = record.id.replace('post_', '');
            const card = document.querySelector(`article[data-detail-id="${momentId}"]`);
            if (card && typeof record.liked === 'boolean') {
              updateMomentLikeUI(card, record.liked);
              setLocalLike(momentId, record.liked);
            }
          }
        });
      };
    } catch (e) {}
  };

  // 72px 黄金比例爆裂动画
  const playCardCenterHeartAnimation = (cardEl) => {
    if (!cardEl) return;
    const oldAnimation = cardEl.querySelector('.qm-heart-anim-overlay');
    if (oldAnimation) oldAnimation.remove();

    const overlay = document.createElement('div');
    overlay.className = 'qm-heart-anim-overlay';
    overlay.innerHTML = `
      <div class="qm-anim-glow"></div>
      <div class="qm-anim-ring"></div>
      <div class="qm-anim-dots">
        <span class="dot d1"></span><span class="dot d2"></span>
        <span class="dot d3"></span><span class="dot d4"></span>
        <span class="dot d5"></span><span class="dot d6"></span>
        <span class="dot d7"></span><span class="dot d8"></span>
      </div>
      <svg viewBox="0 0 24 24" class="qm-anim-heart">
        <defs>
          <linearGradient id="qmGradGolden" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff6b81" />
            <stop offset="100%" stop-color="#ff4757" />
          </linearGradient>
        </defs>
        <path fill="url(#qmGradGolden)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    `;
    cardEl.appendChild(overlay);
    setTimeout(() => { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 850);
  };

  const isDegradedMode = () => document.documentElement.classList.contains('perf-degraded');

  const cleanKey = (str) => {
    if (!str) return '';
    try { str = decodeURIComponent(str); } catch(e) {}
    return str.toLowerCase().trim().replace(/^[#?]/, '').replace(/^moments\//, '').replace(/\.(md|mdx)$/, '').replace(/%20/g, ' ').replace(/[-_\s]+/g, ' ');
  };

  const strictCleanKey = (str) => cleanKey(str).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

  const ensureLoad = (img) => {
    if (window.triggerImageLoad) window.triggerImageLoad(img);
  };

  const initMomentsEngine = () => {
    try {
      const jsonEl = document.getElementById('moments-json');
      if (jsonEl && jsonEl.textContent) {
        momentsData = JSON.parse(jsonEl.textContent);
      }
    } catch (e) {}

    const splitViewport = document.querySelector('.split-viewport');
    const timelineItems = document.querySelectorAll('.timeline-item');
    const detailCards = document.querySelectorAll('.detail-card');
    const yearDropdown = document.getElementById('year-dropdown');
    const monthDropdown = document.getElementById('month-dropdown');
    const viewModeBtn = document.getElementById('view-mode-btn');

    if (!splitViewport || !timelineItems.length) return;

    const isMobile = () => window.innerWidth <= 992;
    let currentMode = localStorage.getItem('moments_mobile_view_mode') || 'feed';
    let lastWindowWidth = window.innerWidth;

    const initCardScrollObserver = (resetExisting = false) => {
      if (cardObserver) cardObserver.disconnect();
      const visibleCards = document.querySelectorAll('.view-mode-feed .detail-card.feed-visible');

      if (isDegradedMode() || !isMobile() || !splitViewport.classList.contains('view-mode-feed')) {
        detailCards.forEach(card => card.classList.add('in-view'));
        return;
      }

      let cascadeIndex = 0;
      let cascadeTimer = null;

      cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target;
            if (!card.classList.contains('in-view')) {
              card.style.animationDelay = `${cascadeIndex * 0.08}s`;
              cascadeIndex++;
              card.classList.add('in-view');
              card.querySelectorAll('img[data-src]').forEach(ensureLoad);

              clearTimeout(cascadeTimer);
              cascadeTimer = setTimeout(() => { cascadeIndex = 0; }, 200);

              if (window.gsap && !isDegradedMode()) {
                const mediaBoxes = card.querySelectorAll('.media-box');
                if (mediaBoxes.length) {
                  gsap.fromTo(mediaBoxes,
                    { opacity: 0, scale: 0.82, y: 12 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "back.out(1.3)", overwrite: "auto", delay: cascadeIndex * 0.08 + 0.1 }
                  );
                }
              }
            }
            cardObserver.unobserve(card);
          }
        });
      }, { root: null, rootMargin: '0px 0px -20px 0px', threshold: 0.01 });

      visibleCards.forEach(card => {
        if (resetExisting) {
          card.classList.remove('in-view');
          card.style.animationDelay = '0s';
        }
        if (!card.classList.contains('in-view')) cardObserver.observe(card);
      });
    };

    const updateViewModeUI = (mode, isModeSwitch = false) => {
      if (!isMobile()) {
        splitViewport.classList.remove('view-mode-feed', 'view-mode-list');
        filterTimeline(isModeSwitch);
        return;
      }
      currentMode = mode;
      localStorage.setItem('moments_mobile_view_mode', mode);

      if (mode === 'feed') {
        splitViewport.classList.add('view-mode-feed');
        splitViewport.classList.remove('view-mode-list');
      } else {
        splitViewport.classList.add('view-mode-list');
        splitViewport.classList.remove('view-mode-feed');
      }

      if (viewModeBtn) {
        const iconList = viewModeBtn.querySelector('.icon-list');
        const iconFeed = viewModeBtn.querySelector('.icon-feed');
        if (iconList && iconFeed) {
          iconList.style.display = mode === 'feed' ? 'none' : 'block';
          iconFeed.style.display = mode === 'feed' ? 'block' : 'none';
        }
      }
      filterTimeline(isModeSwitch);
    };

    const filterTimeline = (shouldResetObserver = false) => {
      const selectedYear = String(yearDropdown ? yearDropdown.getAttribute('data-value') : 'all').replace(/年$/, '').trim();
      const selectedMonth = String(monthDropdown ? monthDropdown.getAttribute('data-value') : 'all').trim();
      let firstVisibleId = null;

      timelineItems.forEach(item => {
        const itemYear = String(item.getAttribute('data-year') || '').replace(/年$/, '').trim();
        const itemMonth = String(item.getAttribute('data-month') || '').trim();
        const matchYear = (selectedYear === 'all' || itemYear === selectedYear);
        const matchMonth = (selectedMonth === 'all' || itemMonth === selectedMonth);

        const card = document.querySelector(`.detail-card[data-detail-id="${item.getAttribute('data-id')}"]`);

        if (matchYear && matchMonth) {
          item.style.display = 'flex';
          item.querySelectorAll('img[data-src]').forEach(ensureLoad);
          if (card) card.classList.add('feed-visible');
          if (!firstVisibleId) firstVisibleId = item.getAttribute('data-id');
        } else {
          item.style.display = 'none';
          if (card) card.classList.remove('feed-visible');
        }
      });

      initCardScrollObserver(shouldResetObserver);
    };

    const handleGlobalClick = async (e) => {
      const box = e.target.closest('.media-box');
      if (box) {
        const momentId = box.getAttribute('data-moment-id');
        const index = parseInt(box.getAttribute('data-index'), 10);
        let images = [];
        let moment = momentsData.find(m => String(m.id) === String(momentId));
        if (moment && moment.images && moment.images.length) images = moment.images;

        if (!images.length) {
          const grid = box.closest('.detail-media-grid');
          if (grid) {
            images = Array.from(grid.querySelectorAll('.media-box img')).map(img => img.dataset.src || img.src).filter(Boolean);
          }
        }

        const card = box.closest('.detail-card');
        const dateText = card?.querySelector('.time-location-group span')?.textContent?.trim() || moment?.time || '';
        const locText = card?.querySelector('.location-tag')?.textContent?.trim() || moment?.location || '';
        const titleText = card?.querySelector('.detail-title-text')?.textContent?.trim() || moment?.title || '';

        if (images.length && !isNaN(index)) {
          window.dispatchEvent(new CustomEvent('quasar:open-lightbox', {
            detail: { images, index, meta: { date: dateText, location: locText, title: titleText } }
          }));
        }
        return;
      }

      // 🔑 点击点赞群岛触发器
      const postLikeBtn = e.target.closest('.post-like-btn');
      if (postLikeBtn) {
        e.preventDefault();
        e.stopPropagation();

        const card = postLikeBtn.closest('article.detail-card');
        const momentId = postLikeBtn.getAttribute('data-moment-id') || (card ? card.getAttribute('data-detail-id') : null);
        if (!momentId) return;

        const isCurrentlyLiked = postLikeBtn.classList.contains('liked');
        const newLikedState = !isCurrentlyLiked;

        updateMomentLikeUI(card, newLikedState);

        if (newLikedState && card) {
          playCardCenterHeartAnimation(card);
        }

        setLocalLike(momentId, newLikedState);

        try {
          const db = await getDB();
          const tx = db.transaction('likes', 'readwrite');
          tx.objectStore('likes').put({ id: `post_${momentId}`, liked: newLikedState, updatedAt: Date.now() });
        } catch (dbErr) {}
        return;
      }
    };

    document.removeEventListener('click', handleGlobalClick);
    document.addEventListener('click', handleGlobalClick);

    // 状态初始化与挂载
    restoreLikesUI();
    saveMomentsTextData();
    initImageCache();
    updateViewModeUI(currentMode);
  };

  document.addEventListener('DOMContentLoaded', initMomentsEngine);
  document.addEventListener('astro:page-load', initMomentsEngine);
  window.addEventListener('pageshow', () => { restoreLikesUI(); });
})();