// src/assets/js/moments.js

(() => {
  let momentsData = [];
  let cardObserver = null;

  const isDegradedMode = () => document.documentElement.classList.contains('perf-degraded');

  const cleanKey = (str) => {
    if (!str) return '';
    try { str = decodeURIComponent(str); } catch(e) {}
    return str.toLowerCase().trim().replace(/^[#?]/, '').replace(/^moments\//, '').replace(/\.(md|mdx)$/, '').replace(/%20/g, ' ').replace(/[-_\s]+/g, ' ');
  };

  const strictCleanKey = (str) => cleanKey(str).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

  // 辅助加载：安全调用全局函数
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

              // 视口内的卡片优先确保调用加载
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
      }, {
        root: null,
        rootMargin: '0px 0px -20px 0px',
        threshold: 0.01
      });

      visibleCards.forEach(card => {
        if (resetExisting) {
          card.classList.remove('in-view');
          card.style.animationDelay = '0s';
        }
        
        if (!card.classList.contains('in-view')) {
          cardObserver.observe(card);
        }
      });

      setTimeout(() => {
        visibleCards.forEach(card => {
          const rect = card.getBoundingClientRect();
          if (rect.top < window.innerHeight + 100 && !card.classList.contains('in-view')) {
            card.classList.add('in-view');
            card.querySelectorAll('img[data-src]').forEach(ensureLoad);
          }
        });
      }, 250);
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

    if (viewModeBtn) {
      viewModeBtn.onclick = () => {
        if (!isMobile()) return;
        const nextMode = currentMode === 'feed' ? 'list' : 'feed';
        updateViewModeUI(nextMode, true);
      };
    }

    const switchDetail = (id) => {
      const isDegraded = isDegradedMode();

      detailCards.forEach(card => {
        const isTarget = card.getAttribute('data-detail-id') === id;
        if (isTarget) {
          card.classList.add('active');
          card.querySelectorAll('img[data-src]').forEach(ensureLoad);

          const elements = card.querySelectorAll('.animate-el');
          const mediaBoxes = card.querySelectorAll('.media-box');

          if (!isDegraded && window.gsap && !isMobile()) {
            gsap.fromTo(elements, 
              { opacity: 0, y: 25, scale: 0.98 }, 
              { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: "power3.out", overwrite: "auto" }
            );
            if (mediaBoxes.length) {
              gsap.fromTo(mediaBoxes,
                { opacity: 0, scale: 0.8 },
                { opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: "back.out(1.4)", delay: 0.12, overwrite: "auto" }
              );
            }
          }
        } else {
          card.classList.remove('active');
        }
      });
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

      if (firstVisibleId) {
        const activeTimeline = document.querySelector('.timeline-item.active');
        if (!activeTimeline || activeTimeline.style.display === 'none') {
          timelineItems.forEach(i => i.classList.remove('active'));
          const targetEl = document.querySelector(`.timeline-item[data-id="${firstVisibleId}"]`);
          if (targetEl) {
            targetEl.classList.add('active');
            switchDetail(firstVisibleId);
          }
        }
      }

      initCardScrollObserver(shouldResetObserver);
    };

    const setupCustomDropdown = (dropdownEl) => {
      if (!dropdownEl) return;
      const btn = dropdownEl.querySelector('.custom-dropdown-btn');
      const label = dropdownEl.querySelector('.dropdown-label');
      const items = dropdownEl.querySelectorAll('.custom-dropdown-item');

      btn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown.open').forEach(d => {
          if (d !== dropdownEl) d.classList.remove('open');
        });
        dropdownEl.classList.toggle('open');
      };

      items.forEach(item => {
        item.onclick = (e) => {
          e.stopPropagation();
          const val = item.getAttribute('data-value');
          dropdownEl.setAttribute('data-value', val);
          label.textContent = item.textContent;

          items.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');

          dropdownEl.classList.remove('open');
          filterTimeline(true);
        };
      });
    };

    setupCustomDropdown(yearDropdown);
    setupCustomDropdown(monthDropdown);

    timelineItems.forEach(item => {
      item.onclick = () => {
        if (item.style.display === 'none') return;
        timelineItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const id = item.getAttribute('data-id');

        if (isMobile() && currentMode === 'list') {
          updateViewModeUI('feed', true);
        }

        switchDetail(id);

        const targetCard = document.querySelector(`.detail-card[data-detail-id="${id}"]`);
        if (targetCard) {
          setTimeout(() => {
            targetCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }, 80);
        }
      };
    });

    const getScrollTop = () => {
      return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    let lastScrollY = getScrollTop();
    let isTicking = false;
    const minDeltaThreshold = 8;

    const handleSmartScroll = () => {
      const sidebar = document.querySelector('.sidebar-timeline');
      if (!sidebar) { isTicking = false; return; }

      if (!isMobile() || !splitViewport.classList.contains('view-mode-feed')) {
        sidebar.classList.remove('sidebar-hidden');
        isTicking = false;
        return;
      }

      const currentScrollY = getScrollTop();

      if (currentScrollY <= 15) {
        sidebar.classList.remove('sidebar-hidden');
        lastScrollY = currentScrollY;
        isTicking = false;
        return;
      }

      const deltaY = currentScrollY - lastScrollY;

      if (Math.abs(deltaY) > minDeltaThreshold) {
        if (deltaY > 0 && currentScrollY > 50) {
          if (!sidebar.classList.contains('sidebar-hidden')) {
            sidebar.classList.add('sidebar-hidden');
          }
        } else if (deltaY < 0) {
          if (sidebar.classList.contains('sidebar-hidden')) {
            sidebar.classList.remove('sidebar-hidden');
          }
        }
        lastScrollY = currentScrollY;
      }
      isTicking = false;
    };

    document.addEventListener('scroll', () => {
      if (!isTicking) {
        window.requestAnimationFrame(handleSmartScroll);
        isTicking = true;
      }
    }, { passive: true, capture: true });

    const handleGlobalClick = (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
      }

      const box = e.target.closest('.media-box');
      if (box) {
        const momentId = box.getAttribute('data-moment-id');
        const index = parseInt(box.getAttribute('data-index'), 10);
        
        let images = [];
        let moment = momentsData.find(m => String(m.id) === String(momentId));
        if (moment && moment.images && moment.images.length) {
          images = moment.images;
        }

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
            detail: {
              images: images,
              index: index,
              meta: {
                date: dateText,
                location: locText,
                title: titleText
              }
            }
          }));
        }
        return;
      }

      const postLikeBtn = e.target.closest('.post-like-btn');
      if (postLikeBtn) {
        const card = postLikeBtn.closest('.detail-card');
        const avatarsContainer = card.querySelector('.likes-avatars');
        const isLiked = postLikeBtn.classList.contains('liked');
        if (isLiked) {
          postLikeBtn.classList.remove('liked');
          const myTag = avatarsContainer?.querySelector('.avatar-tag.my-like');
          if (myTag) myTag.remove();
        } else if (avatarsContainer) {
          postLikeBtn.classList.add('liked');
          const newTag = document.createElement('span');
          newTag.className = 'avatar-tag my-like';
          newTag.textContent = '我';
          avatarsContainer.prepend(newTag);
          if (!isDegradedMode() && window.gsap) gsap.fromTo(postLikeBtn, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
        }
        return;
      }

      const commentLikeBtn = e.target.closest('.comment-like-btn');
      if (commentLikeBtn) {
        const heart = commentLikeBtn.querySelector('.like-heart');
        const numSpan = commentLikeBtn.querySelector('.like-num');
        let count = parseInt(numSpan?.textContent || '0', 10) || 0;
        const isLiked = commentLikeBtn.classList.contains('liked');
        if (isLiked) {
          commentLikeBtn.classList.remove('liked');
          if (heart) heart.textContent = '♡';
          if (numSpan) numSpan.textContent = Math.max(0, count - 1);
        } else {
          commentLikeBtn.classList.add('liked');
          if (heart) heart.textContent = '♥';
          if (numSpan) numSpan.textContent = count + 1;
          if (!isDegradedMode() && window.gsap) gsap.fromTo(commentLikeBtn, { scale: 0.85 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
        }
      }
    };

    document.removeEventListener('click', handleGlobalClick);
    document.addEventListener('click', handleGlobalClick);

    const performJump = (rawKey) => {
      const key = cleanKey(rawKey);
      const strictKey = strictCleanKey(rawKey);
      if (!key) return false;
      let matchedItem = null;

      for (const item of timelineItems) {
        const itemId = cleanKey(item.dataset.id || '');
        const itemTitle = cleanKey(item.dataset.title || '');
        if (itemId === key || itemTitle === key) { matchedItem = item; break; }
      }
      if (!matchedItem && strictKey) {
        for (const item of timelineItems) {
          const itemId = strictCleanKey(item.dataset.id || '');
          const itemTitle = strictCleanKey(item.dataset.title || '');
          if (itemId === strictKey || itemTitle === strictKey) { matchedItem = item; break; }
        }
      }

      if (matchedItem) {
        if (isMobile()) updateViewModeUI('feed', true);
        matchedItem.click();
        return true;
      }
      return false;
    };

    const triggerJumpProcess = () => {
      const storeKey = sessionStorage.getItem('quasar_jump_key');
      if (storeKey) {
        sessionStorage.removeItem('quasar_jump_key');
        performJump(storeKey);
        return;
      }
      const searchParam = new URLSearchParams(window.location.search).get('id');
      if (searchParam) performJump(searchParam);
      else if (window.location.hash.length > 1) performJump(window.location.hash.slice(1));
    };

    window.onresize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWindowWidth) {
        lastWindowWidth = currentWidth;
        if (!isMobile()) splitViewport.classList.remove('view-mode-feed', 'view-mode-list');
        else updateViewModeUI(currentMode);
      }
    };

    // 触发一次全局懒加载扫描
    if (window.initLazyLoad) window.initLazyLoad();

    updateViewModeUI(currentMode);
    triggerJumpProcess();
  };

  document.addEventListener('DOMContentLoaded', initMomentsEngine);
  document.addEventListener('astro:page-load', initMomentsEngine);
})();