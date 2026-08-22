// src/assets/scripts/albums.js

(() => {
  let cachePool = [];
  let nextCursor = null;
  let isLoading = false;
  let hasMore = true;
  const cardCache = [];
  let renderedCount = 0;
  let fetchAbortController = null;

  // ==================== 1. IndexedDB 缓存 & 持久化 ====================
  const DB_NAME = 'QuasarAlbums';
  const DB_VERSION = 1;
  const STORE_NAME = 'image';

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getCachedImage(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function setCachedImage(key, base64Data) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(base64Data, key);
    } catch (e) {}
  }

  async function loadResourceAsBase64(url, key) {
    if (!url || !key) return;
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return;
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setCachedImage(key, reader.result);
      };
      reader.readAsDataURL(blob);
    } catch (e) {}
  }

  // ==================== 2. 布局逻辑 ====================
  const isDegradedMode = () => document.documentElement.classList.contains('perf-degraded');

  function getColumnCount() {
    const w = window.innerWidth;
    if (w >= 1024) return 5; 
    if (w >= 640) return 4;  
    return 3; 
  }

  function updateNavbarStatus(text, showSpinner = false) {
    const currentPath = window.location.pathname.replace(/\/$/, '');
    if (currentPath !== '/albums') {
      const albumCacheStatus = document.getElementById('album-cache-status');
      if (albumCacheStatus) {
        albumCacheStatus.classList.remove('active');
        albumCacheStatus.style.setProperty('display', 'none', 'important');
      }
      return;
    }

    const statusTextDisplay = document.getElementById('status-text-display');
    const albumCacheStatus = document.getElementById('album-cache-status');
    const navSpinner = document.getElementById('nav-spinner');

    if (statusTextDisplay) statusTextDisplay.innerText = text;

    if (albumCacheStatus) {
      if (text) {
        albumCacheStatus.classList.add('active');
        albumCacheStatus.style.removeProperty('display');
      } else {
        albumCacheStatus.classList.remove('active');
        albumCacheStatus.style.setProperty('display', 'none', 'important');
      }
    }

    if (navSpinner) {
      if (showSpinner) navSpinner.classList.add('active');
      else navSpinner.classList.remove('active');
    }
  }

  function showSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
  }

  async function fetchNextPage() {
    const currentPath = window.location.pathname.replace(/\/$/, '');
    if (currentPath !== '/albums' || isLoading || !hasMore) return;

    isLoading = true;
    showSpinner(true);

    if (cachePool.length === 0) {
      updateNavbarStatus('正在同步 Google Photos 画廊 ...', true);
    } else {
      updateNavbarStatus(`已呈现 ${cachePool.length} 张照片&视频 (同步中...)`, true);
    }

    try {
      if (fetchAbortController) fetchAbortController.abort();
      fetchAbortController = new AbortController();

      const params = new URLSearchParams({ loadedCount: String(cachePool.length) });
      if (nextCursor) params.set("cursor", nextCursor);

      const res = await fetch(`/api/albums?${params.toString()}`, { signal: fetchAbortController.signal });
      if (!res.ok) throw new Error("画廊同步暂缓！");

      const data = await res.json();

      if (data.photos && data.photos.length > 0) {
        nextCursor = data.nextCursor;
        const existingIds = new Set(cachePool.map(p => p.id));
        
        data.photos.forEach(p => {
          if (!existingIds.has(p.id)) cachePool.push(p);
        });

        renderGrid(false);

        if (!nextCursor) {
          hasMore = false;
          showSpinner(false);
          updateNavbarStatus(`已加载全部，共 ${cachePool.length} 张`, false);
        } else {
          updateNavbarStatus(`已呈现 ${cachePool.length} 张照片&视频`, false);
        }
      } else {
        hasMore = false;
        showSpinner(false);
        updateNavbarStatus(`已加载全部，共 ${cachePool.length} 张`, false);
      }
    } catch (e) {
      if (e.name === 'AbortError' || window.location.pathname.replace(/\/$/, '') !== '/albums') return;
      showSpinner(false);
      updateNavbarStatus('画廊同步暂缓！', false);
    } finally {
      isLoading = false;
    }
  }

  function renderGrid(isFullReset = false) {
    const gridContainer = document.getElementById('masonry-grid');
    if (!gridContainer) return;

    const colCount = getColumnCount();
    let columns = Array.from(gridContainer.children);

    if (isFullReset || columns.length !== colCount) {
      gridContainer.innerHTML = '';
      columns = [];
      for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column-flex';
        gridContainer.appendChild(col);
        columns.push(col);
      }
      renderedCount = 0;
    }

    for (let i = renderedCount; i < cachePool.length; i++) {
      const photo = cachePool[i];
      const targetColumn = columns[i % colCount];
      targetColumn.appendChild(getOrCreateCard(photo, i));
    }

    renderedCount = cachePool.length;

    if (window.initLazyLoad) window.initLazyLoad();
  }

  function getOrCreateCard(photo, index) {
    if (cardCache[index]) return cardCache[index];
    const card = createPhotoCard(photo, index);
    cardCache[index] = card;
    return card;
  }

  function createPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'masonry-item-card group';
    card.dataset.index = index;

    const aspect = photo.width && photo.height ? `${photo.width} / ${photo.height}` : 'auto';

    const img = document.createElement('img');
    img.className = 'photo-img opacity-hidden';
    img.style.aspectRatio = aspect;
    img.dataset.src = photo.thumbUrl;

    const storageKey = `album_thumb_${photo.id}`;

    img.addEventListener('load', () => {
      img.classList.remove('opacity-hidden');
      if (card.dataset.animated === "true") return;
      card.dataset.animated = "true";

      if (window.gsap && !isDegradedMode()) {
        const randomRotate = (Math.random() - 0.5) * 4; 
        gsap.fromTo(card, 
          { y: 30, scale: 0.96, rotation: randomRotate, opacity: 0 }, 
          { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: "power4.out", clearProps: "transform,rotation" }
        );
      } else {
        card.style.opacity = 1;
        card.style.transform = "none";
      }

      if (!img.dataset.dbSaved && photo.thumbUrl && img.src && !img.src.startsWith('data:')) {
        img.dataset.dbSaved = "true";
        loadResourceAsBase64(photo.thumbUrl, storageKey);
      }
    });

    img.addEventListener('error', () => {
      if (photo.fallbackThumbUrl && img.dataset.fallbackApplied !== "true") {
        img.dataset.fallbackApplied = "true";
        img.src = photo.fallbackThumbUrl;
      }
    });

    getCachedImage(storageKey).then(cachedBase64 => {
      if (cachedBase64) {
        delete img.dataset.src;
        img.src = cachedBase64;
      }
    }).catch(() => {});

    card.appendChild(img);

    if (photo.mediaType === 'video') {
      const badge = document.createElement('div');
      badge.className = 'video-badge';
      badge.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/></svg>';
      card.appendChild(badge);
    }

    card.onclick = (e) => {
      // 🌟 修复：遍历每一个 p 时，根据索引 i 获取对应 DOM 节点的 src 属性，不再混淆闭包中的 img
      const lightboxItems = cachePool.map((p, i) => {
        const cachedCard = cardCache[i];
        const cardImg = cachedCard ? cachedCard.querySelector('img') : null;
        const currentPreviewSrc = (cardImg && cardImg.src && !cardImg.classList.contains('opacity-hidden')) 
          ? cardImg.src 
          : (p.thumbUrl || p.previewUrl);

        return {
          previewSrc: currentPreviewSrc,
          src: p.mediaType === 'video' ? (p.previewUrl || p.thumbUrl) : (p.originalLikeUrl || p.displayUrl),
          videoSrc: p.mediaType === 'video' ? (p.videoUrl || p.displayUrl) : null,
          fallbackVideoSrc: p.mediaType === 'video' ? p.fallbackVideoUrl : null,
          type: p.mediaType,
          title: p.mediaType === 'video' ? '视频' : '图片',
          date: p.takenAt ? new Date(p.takenAt).toLocaleString() : '未知拍摄时间'
        };
      });

      if (window.openLightbox) {
        window.openLightbox(lightboxItems, index, {}, card);
      }
    };

    return card;
  }

  const initAlbumsEngine = () => {
    const currentPath = window.location.pathname.replace(/\/$/, '');
    if (currentPath !== '/albums') return;

    cachePool = [];
    nextCursor = null;
    isLoading = false;
    hasMore = true;
    cardCache.length = 0;
    renderedCount = 0;

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => { renderGrid(true); }, 150);
    });

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      const scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      }, { rootMargin: '1000px' });
      scrollObserver.observe(sentinel);
    }

    fetchNextPage();
  };

  document.addEventListener('astro:before-preparation', () => {
    if (fetchAbortController) fetchAbortController.abort();
    const albumCacheStatus = document.getElementById('album-cache-status');
    if (albumCacheStatus) {
      albumCacheStatus.classList.remove('active');
      albumCacheStatus.style.display = 'none';
    }
  });

  document.addEventListener('astro:page-load', initAlbumsEngine);
  document.addEventListener('DOMContentLoaded', initAlbumsEngine);
})();