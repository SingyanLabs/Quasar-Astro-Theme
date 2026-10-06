// src/assets/scripts/navbar-engine.js

// ⚡ 全局 ClientRouter 路由切换转圈状态控制
if (typeof window !== 'undefined' && !window.__QUASAR_ROUTE_PROGRESS_BOUND__) {
  window.__QUASAR_ROUTE_PROGRESS_BOUND__ = true;

  document.addEventListener('astro:before-preparation', () => {
    const navbar = document.getElementById('quasar-navbar-element');
    if (navbar) navbar.classList.add('is-routing');
  });

  document.addEventListener('astro:page-load', () => {
    const navbar = document.getElementById('quasar-navbar-element');
    
    // 🌟 1. 先同步恢复 perf-degraded 状态，确保图标预准备好
    const savedPerf = localStorage.getItem('quasar-perf');
    const isDegraded = savedPerf === 'degraded';
    document.documentElement.classList.toggle('perf-degraded', isDegraded);
    if (navbar) navbar.classList.toggle('perf-degraded', isDegraded);

    // 🌟 2. 状态同步完毕后，再移除转圈 class，直接平滑变为对应状态图标
    if (navbar) navbar.classList.remove('is-routing');
  });
}

export function initNavbarEngine() {
  if (typeof document === 'undefined') return;

  const navbarMain = document.getElementById('quasar-navbar-element');

  // ⚡ 1. 修复：页面加载后自动同步恢复低性能模式状态
  const savedPerf = localStorage.getItem('quasar-perf');
  const isDegraded = savedPerf === 'degraded';
  document.documentElement.classList.toggle('perf-degraded', isDegraded);
  if (navbarMain) navbarMain.classList.toggle('perf-degraded', isDegraded);

  if (!window.gsap) {
    setTimeout(initNavbarEngine, 50);
    return;
  }

  if (window.__QUASAR_NAVBAR_ABORTER) {
    window.__QUASAR_NAVBAR_ABORTER.abort();
  }
  window.__QUASAR_NAVBAR_ABORTER = new AbortController();
  const { signal } = window.__QUASAR_NAVBAR_ABORTER;

  if (!window.__QUASAR_AUDIO_PLAYER__) {
    window.__QUASAR_AUDIO_PLAYER__ = new Audio();
  }
  const audio = window.__QUASAR_AUDIO_PLAYER__;

  if (!audio._persistentEventsBound) {
    audio._persistentEventsBound = true;
    audio.addEventListener('timeupdate', () => {
      window.dispatchEvent(new CustomEvent('nav-update-music-progress'));
    });
    audio.addEventListener('play', () => {
      audio._pausedAt = null;
      if (audio._hideTimer) {
        clearTimeout(audio._hideTimer);
        audio._hideTimer = null;
      }
      window.dispatchEvent(new CustomEvent('nav-update-music-ui'));
    });
    audio.addEventListener('pause', () => {
      if (!audio.ended && !audio._pausedAt) {
        audio._pausedAt = Date.now();
      }
      window.dispatchEvent(new CustomEvent('nav-update-music-ui'));
    });
    audio.addEventListener('ended', () => {
      audio._pausedAt = null;
      if (audio._hideTimer) {
        clearTimeout(audio._hideTimer);
        audio._hideTimer = null;
      }
      hideNavbarMusicControls();
      window.dispatchEvent(new CustomEvent('nav-update-music-ui'));
    });
  }

  if (!audio._fallbackTickerStarted) {
    audio._fallbackTickerStarted = true;
    setInterval(() => {
      if (audio && !audio.paused && (audio.src || audio.currentSong)) {
        window.dispatchEvent(new CustomEvent('nav-update-music-progress'));
      }
    }, 100);
  }

  const qs = (selector) => document.querySelector(selector);
  const qId = (id) => document.getElementById(id);

  const navLeftContainer = qId('nav-left-container');
  const navCenter = qId('nav-center');
  const themeBtn = qId('theme-toggle-btn');
  const mobileThemeBtn = qId('mobile-theme-btn');
  const perfBtn = qId('perf-toggle-btn');
  const mobilePerfBtn = qId('mobile-perf-btn');
  const perfAlert = qId('nav-perf-alert');
  const perfAlertText = qId('perf-alert-text');
  const countdownBar = qId('countdown-circle-bar');

  const backToTopBtn = qId('back-to-top-btn');
  const articleReadingInfo = qId('article-reading-info');
  const progressBar = qId('reading-progress-bar');
  const chapterText = qId('current-chapter-text');

  const navMusicInfo = qId('nav-music-info');
  const navMusicTitle = qId('nav-music-title');
  const navMusicProgressBar = qId('nav-music-progress-bar');
  const navPlayBtn = qId('nav-play-btn');
  const navLyricBtn = qId('nav-lyric-btn');
  const navVolumeWrapper = qId('nav-volume-wrapper');
  const navVolumeBtn = qId('nav-volume-btn');
  const navVolumeSlider = qId('nav-volume-slider');
  const pauseCountdownBar = qId('nav-pause-countdown-bar');

  const navLyricsDisplay = qId('nav-lyrics-display');
  const mobileMenuToggle = qId('mobile-menu-toggle');
  const mobileDrawerClose = qId('mobile-drawer-close');
  const mobileDrawerOverlay = qId('mobile-drawer-overlay');

  const iconVolHigh = navVolumeWrapper?.querySelector('.icon-vol-high');
  const iconVolMute = navVolumeWrapper?.querySelector('.icon-vol-mute');
  
  const LYRIC_OFFSET = 0.05;
  let alertTimer = null;
  let lastActiveChapter = '';
  let isNavLyricsOpen = !!audio._isNavLyricsOpen;
  let currentNavLyricText = '';

  const checkDegraded = () => document.documentElement.classList.contains('perf-degraded');
  const isMobile = () => window.innerWidth <= 768;

  const syncNavLeftWidths = () => {
    if (!navLeftContainer) return;
    const hasArticle = articleReadingInfo?.classList.contains('active');
    const hasMusic = navMusicInfo?.classList.contains('active');
    const hasAlbum = qId('album-cache-status')?.classList.contains('active');

    if (hasArticle || hasMusic || hasAlbum) {
      navLeftContainer.classList.add('has-active-info');
    } else {
      navLeftContainer.classList.remove('has-active-info');
    }

    if (hasArticle && hasMusic) navLeftContainer.classList.add('has-both-info');
    else navLeftContainer.classList.remove('has-both-info');
  };

  const syncNavCenterVisibility = (immediate = false) => {
    if (isMobile()) return;
    const degraded = checkDegraded();
    const duration = (immediate || degraded) ? 0.05 : 0.25;

    if (navbarMain?.classList.contains('search-active')) return;
    if (!navCenter || !navLyricsDisplay) return;

    window.gsap.killTweensOf([navCenter, navLyricsDisplay]);

    if (alertTimer) {
      window.gsap.to(navCenter, { opacity: 0, scale: 0.98, pointerEvents: 'none', duration, ease: 'power2.out', onComplete: () => { navCenter.style.visibility = 'hidden'; } });
      window.gsap.to(navLyricsDisplay, { opacity: 0, scale: 0.98, pointerEvents: 'none', duration, ease: 'power2.out', onComplete: () => { navLyricsDisplay.style.visibility = 'hidden'; } });
      return;
    }

    if (isNavLyricsOpen && audio._controlsVisible) {
      navCenter.style.visibility = 'hidden';
      window.gsap.to(navCenter, { opacity: 0, scale: 0.95, pointerEvents: 'none', duration, ease: 'power2.out' });
      navLyricsDisplay.style.visibility = 'visible';
      window.gsap.to(navLyricsDisplay, { opacity: 1, scale: 1, pointerEvents: 'auto', duration, ease: 'power2.out', force3D: true });
      updateNavLyricLine();
      return;
    }

    navLyricsDisplay.style.visibility = 'hidden';
    window.gsap.to(navLyricsDisplay, { opacity: 0, scale: 0.95, pointerEvents: 'none', duration, ease: 'power2.in' });
    navCenter.style.visibility = 'visible';
    window.gsap.to(navCenter, { opacity: 1, scale: 1, pointerEvents: 'auto', duration, ease: 'power2.out', force3D: true });
  };

  const showNavbarMusicControls = (immediate = false) => {
    audio._controlsVisible = true;
    if (navMusicInfo) navMusicInfo.classList.add('active');
    syncNavLeftWidths();

    const els = [navMusicInfo, navPlayBtn, navLyricBtn, navVolumeWrapper].filter(Boolean);
    const degraded = checkDegraded();

    els.forEach(el => {
      window.gsap.killTweensOf(el);
      el.style.display = 'flex';
      el.style.pointerEvents = 'auto';
      if (immediate || degraded) {
        window.gsap.set(el, { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' });
      } else {
        window.gsap.fromTo(el, 
          { opacity: 0, scale: 0.88, y: -2 },
          { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "power2.out", pointerEvents: 'auto', force3D: true }
        );
      }
    });
    syncNavCenterVisibility(immediate);
  };

  const hideNavbarMusicControls = () => {
    audio._controlsVisible = false;
    if (navMusicInfo) navMusicInfo.classList.remove('active');
    syncNavLeftWidths();

    if (audio._hideTimer) {
      clearTimeout(audio._hideTimer);
      audio._hideTimer = null;
    }

    const pauseCountdownSvg = navPlayBtn?.querySelector('.pause-countdown-svg');
    if (pauseCountdownSvg) {
      window.gsap.killTweensOf(pauseCountdownSvg);
      window.gsap.set(pauseCountdownSvg, { opacity: 0 });
    }

    if (pauseCountdownBar) {
      window.gsap.killTweensOf(pauseCountdownBar);
      window.gsap.set(pauseCountdownBar, { opacity: 0, strokeDashoffset: 0 });
    }

    const els = [navMusicInfo, navPlayBtn, navLyricBtn, navVolumeWrapper].filter(Boolean);
    const degraded = checkDegraded();

    els.forEach(el => {
      window.gsap.killTweensOf(el);
      if (degraded) {
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.88)';
      } else {
        window.gsap.to(el, {
          opacity: 0, scale: 0.88, y: -2, duration: 0.2, ease: "power2.inOut", pointerEvents: 'none', force3D: true,
          onComplete: () => { el.style.display = 'none'; }
        });
      }
    });

    if (isNavLyricsOpen) toggleNavLyrics(false);
    else syncNavCenterVisibility();
  };

  const toggleNavLyrics = (forceState, immediate = false) => {
    isNavLyricsOpen = forceState !== undefined ? forceState : !isNavLyricsOpen;
    audio._isNavLyricsOpen = isNavLyricsOpen;
    if (navLyricBtn) navLyricBtn.classList.toggle('active', isNavLyricsOpen);
    syncNavCenterVisibility(immediate);
  };

  let lastLyricChangeTime = 0;

  const setNavLyricText = (text) => {
    const matchText = text || '';
    if (matchText === currentNavLyricText) return;

    const now = Date.now();
    if (now - lastLyricChangeTime < 300 && matchText !== '') return;
    lastLyricChangeTime = now;

    currentNavLyricText = matchText;

    const lyricTextEl = document.getElementById('nav-lyric-text');
    if (lyricTextEl && !isMobile()) {
      window.gsap.killTweensOf(lyricTextEl);
      if (checkDegraded()) {
        lyricTextEl.innerText = currentNavLyricText;
      } else {
        window.gsap.to(lyricTextEl, {
          opacity: 0,
          duration: 0.12,
          ease: "power1.in",
          onComplete: () => {
            if (currentNavLyricText === matchText) {
              lyricTextEl.innerText = currentNavLyricText;
              window.gsap.fromTo(lyricTextEl, 
                { opacity: 0 },
                { opacity: 1, duration: 0.18, ease: "power1.out", force3D: true }
              );
            }
          }
        });
      }
    }

    window.dispatchEvent(new CustomEvent('quasar:lyric-change', { detail: { lyric: currentNavLyricText } }));
  };

  const updateNavLyricLine = () => {
    if ((!audio.lyricsData || !audio.lyricsData.length) && audio.currentSong && audio.currentSong.lyrics) {
      audio.lyricsData = audio.currentSong.lyrics;
    }

    if (!audio.lyricsData || !audio.lyricsData.length) {
      if (audio.currentLyric !== undefined && audio.currentLyric !== '') {
        setNavLyricText(audio.currentLyric);
      }
      return;
    }
    
    const ct = audio.currentTime + LYRIC_OFFSET;
    let matchText = '';
    for (let i = 0; i < audio.lyricsData.length; i++) {
      if (ct >= audio.lyricsData[i].time) matchText = audio.lyricsData[i].text;
      else break;
    }
    setNavLyricText(matchText);
  };

  const updateNavbarMusicUI = () => {
    const currentSong = audio.currentSong;
    const hasSource = !!(audio.src || (currentSong && currentSong.audioUrl));
    const pauseCountdownSvg = navPlayBtn?.querySelector('.pause-countdown-svg');

    if (navMusicTitle && currentSong) navMusicTitle.innerText = currentSong.displayTitle || currentSong.title || '未知曲目';
    if (navPlayBtn) navPlayBtn.classList.toggle('is-playing', !audio.paused);
    if (navVolumeSlider) navVolumeSlider.value = audio.volume;

    if (iconVolHigh && iconVolMute) {
      const isMuted = audio.volume === 0 || audio.muted;
      iconVolHigh.style.display = isMuted ? 'none' : 'block';
      iconVolMute.style.display = isMuted ? 'block' : 'none';
    }

    if (!hasSource || audio.ended) {
      if (pauseCountdownSvg) window.gsap.set(pauseCountdownSvg, { opacity: 0 });
      hideNavbarMusicControls();
      return;
    }

    if (!audio.paused) {
      audio._pausedAt = null;
      if (audio._hideTimer) { clearTimeout(audio._hideTimer); audio._hideTimer = null; }
      if (pauseCountdownSvg) { window.gsap.killTweensOf(pauseCountdownSvg); window.gsap.set(pauseCountdownSvg, { opacity: 0 }); }
      if (pauseCountdownBar) { window.gsap.killTweensOf(pauseCountdownBar); window.gsap.set(pauseCountdownBar, { opacity: 0, strokeDashoffset: 0 }); }
      showNavbarMusicControls(true);
    } else {
      if (!audio._pausedAt) {
        audio._pausedAt = Date.now();
      }
      const pausedDuration = Date.now() - audio._pausedAt;
      if (pausedDuration < 10000) {
        showNavbarMusicControls(true);
        if (pauseCountdownSvg && pauseCountdownBar && !checkDegraded()) {
          window.gsap.killTweensOf([pauseCountdownSvg, pauseCountdownBar]);
          const initialOffset = Math.min(100.53, (pausedDuration / 10000) * 100.53);
          const remainingSecs = Math.max(0, (10000 - pausedDuration) / 1000);
          window.gsap.set(pauseCountdownSvg, { opacity: 1, force3D: true });
          window.gsap.set(pauseCountdownBar, { strokeDashoffset: initialOffset, opacity: 1, force3D: true });
          
          window.gsap.to(pauseCountdownBar, { 
            strokeDashoffset: 100.53, 
            duration: remainingSecs, 
            ease: "none", 
            force3D: true,
            onComplete: () => {
              if (audio.paused) {
                hideNavbarMusicControls();
              }
            }
          });
        } else if (pauseCountdownSvg) {
          window.gsap.set(pauseCountdownSvg, { opacity: 0 });
        }

        if (!audio._hideTimer) {
          audio._hideTimer = setTimeout(() => {
            audio._hideTimer = null;
            if (audio.paused) {
              hideNavbarMusicControls();
            }
          }, 10000 - pausedDuration);
        }
      } else {
        if (pauseCountdownSvg) window.gsap.set(pauseCountdownSvg, { opacity: 0 });
        hideNavbarMusicControls();
      }
    }
    if (isNavLyricsOpen) toggleNavLyrics(true, true);
  };

  const updateMusicProgress = () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (navMusicProgressBar) navMusicProgressBar.style.strokeDashoffset = (100 - Math.min(100, Math.max(0, pct))).toString();
    updateNavLyricLine();
  };

  function triggerNavbarNotice(msg, duration = 4000, isRedAlert = false) {
    if (alertTimer) { clearTimeout(alertTimer); alertTimer = null; }
    if (perfAlertText) perfAlertText.innerText = msg || (isRedAlert ? '性能模式已切换' : '模式已切换');
    if (perfAlert) perfAlert.classList.toggle('is-red-warning', isRedAlert);
    
    if (countdownBar) {
      window.gsap.killTweensOf(countdownBar);
      window.gsap.set(countdownBar, { strokeDashoffset: 0, force3D: true });
      window.gsap.to(countdownBar, { strokeDashoffset: 50.26, duration: duration / 1000, ease: "none", force3D: true });
    }

    if (perfAlert) {
      window.gsap.killTweensOf(perfAlert);
      perfAlert.style.visibility = 'visible';

      if (isMobile()) {
        window.gsap.fromTo(perfAlert, 
          { yPercent: -100, opacity: 1 }, 
          { yPercent: 0, opacity: 1, duration: 0.35, ease: "power3.out", force3D: true }
        );
      } else {
        const dur = checkDegraded() ? 0.05 : 0.25;
        window.gsap.fromTo(perfAlert, 
          { opacity: 0, scale: 0.98 },
          { opacity: 1, scale: 1, pointerEvents: 'auto', duration: dur, ease: "power2.out", force3D: true }
        );
      }
    }

    alertTimer = setTimeout(() => {
      alertTimer = null;
      if (perfAlert) {
        if (isMobile()) {
          window.gsap.to(perfAlert, {
            yPercent: -100, duration: 0.3, ease: "power2.in", force3D: true,
            onComplete: () => { perfAlert.style.visibility = 'hidden'; }
          });
        } else {
          const dur = checkDegraded() ? 0.05 : 0.25;
          window.gsap.to(perfAlert, { 
            opacity: 0, scale: 0.98, pointerEvents: 'none', duration: dur, ease: "power2.in", force3D: true,
            onComplete: () => { perfAlert.style.visibility = 'hidden'; syncNavCenterVisibility(); }
          });
        }
      }
    }, duration);

    if (!isMobile()) syncNavCenterVisibility();
  }

  const updateArticleScrollState = () => {
    const scrollY = window.scrollY;
    if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 120);

    const markdownContainer = qs('.markdown-body') || qs('.main-article-content');
    if (!markdownContainer) {
      if (articleReadingInfo) articleReadingInfo.classList.remove('active');
      syncNavLeftWidths();
      return;
    }

    if (articleReadingInfo) articleReadingInfo.classList.add('active');
    syncNavLeftWidths();

    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progressPercent = totalHeight > 0 ? Math.min(100, Math.max(0, (scrollY / totalHeight) * 100)) : 0;
    if (progressBar) progressBar.style.strokeDashoffset = (100 - progressPercent).toString();

    const headings = Array.from(markdownContainer.querySelectorAll('h1, h2, h3, h4'));
    if (headings.length > 0 && chapterText) {
      let currentSection = '';
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 140) currentSection = heading.innerText || heading.textContent || '';
        else break;
      }
      if (!currentSection && headings[0] && headings[0].getBoundingClientRect().top > 140) currentSection = '正文概述';

      if (currentSection && currentSection !== lastActiveChapter) {
        lastActiveChapter = currentSection;
        if (window.gsap && !checkDegraded()) {
          window.gsap.killTweensOf(chapterText);
          if (!chapterText.innerText.trim()) {
            chapterText.innerText = currentSection;
            window.gsap.fromTo(chapterText, { opacity: 0, y: 8, filter: 'blur(3px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.35, ease: "power2.out", force3D: true });
          } else {
            window.gsap.to(chapterText, {
              opacity: 0, y: -6, filter: 'blur(3px)', duration: 0.18, ease: "power2.in", force3D: true,
              onComplete: () => {
                chapterText.innerText = currentSection;
                window.gsap.fromTo(chapterText, { opacity: 0, y: 6, filter: 'blur(3px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: "power2.out", force3D: true });
              }
            });
          }
        } else {
          chapterText.innerText = currentSection;
        }
      }
    }
  };

  const handleThemeToggle = () => {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    document.dispatchEvent(new CustomEvent('theme-change'));
    triggerNavbarNotice(isLight ? navbarMain?.dataset.light : navbarMain?.dataset.dark, 3500, false);
  };

  const handlePerfToggle = () => {
    const isDegraded = document.documentElement.classList.contains('perf-degraded');
    if (isDegraded) {
      window.dispatchEvent(new CustomEvent('quasar-perf-force'));
    } else {
      window.dispatchEvent(new CustomEvent('quasar-perf-status', { detail: { status: 'degraded', text: navbarMain?.dataset.manualDegraded } }));
    }
  };

  const toggleMobileDrawer = (open) => {
    const shouldOpen = open !== undefined ? open : !document.documentElement.classList.contains('mobile-drawer-open');
    document.documentElement.classList.toggle('mobile-drawer-open', shouldOpen);
  };

  window.addEventListener('scroll', updateArticleScrollState, { passive: true, signal });
  window.addEventListener('nav-update-music-ui', updateNavbarMusicUI, { signal });
  window.addEventListener('nav-update-music-progress', updateMusicProgress, { signal });
  
  window.addEventListener('quasar:lyric-change', (e) => {
    if (e.detail && e.detail.lyric !== undefined) setNavLyricText(e.detail.lyric);
    else updateNavLyricLine();
  }, { signal });

  window.addEventListener('quasar-perf-status', (e) => {
    const { status, text } = e.detail || {};
    localStorage.setItem('quasar-perf', status);
    const isDegraded = status === 'degraded';
    
    document.documentElement.classList.toggle('perf-degraded', isDegraded);
    if (navbarMain) navbarMain.classList.toggle('perf-degraded', isDegraded);
    
    window.dispatchEvent(new CustomEvent('earth-quality-engine', { detail: { mode: isDegraded ? 'low' : 'high' } }));
    triggerNavbarNotice(text || (isDegraded ? navbarMain?.dataset.manualDegraded : navbarMain?.dataset.restored), isDegraded ? 7000 : 4000, isDegraded);
  }, { signal });

  if (navLyricBtn) navLyricBtn.addEventListener('click', () => toggleNavLyrics());
  if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  if (navPlayBtn) {
    navPlayBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!audio.src && audio.currentSong?.audioUrl) audio.src = audio.currentSong.audioUrl;
      if (!audio.src) return;
      if (audio.paused) {
        navPlayBtn.classList.add('is-playing');
        audio.play().catch(err => navPlayBtn.classList.remove('is-playing'));
      } else {
        navPlayBtn.classList.remove('is-playing');
        audio.pause();
      }
    });
  }

  if (navVolumeSlider) {
    navVolumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      audio.volume = val;
      audio.muted = val === 0;
    });
  }

  if (navVolumeBtn) {
    navVolumeBtn.addEventListener('click', (e) => {
      if (e.target.classList.contains('volume-slider')) return;
      if (audio.volume > 0) { audio._lastVolume = audio.volume; audio.volume = 0; }
      else audio.volume = audio._lastVolume || 0.8;
    });
  }

  if (themeBtn) themeBtn.addEventListener('click', handleThemeToggle);
  if (mobileThemeBtn) mobileThemeBtn.addEventListener('click', handleThemeToggle);

  if (perfBtn) perfBtn.addEventListener('click', handlePerfToggle);
  if (mobilePerfBtn) mobilePerfBtn.addEventListener('click', handlePerfToggle);

  if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => toggleMobileDrawer(true));
  if (mobileDrawerClose) mobileDrawerClose.addEventListener('click', () => toggleMobileDrawer(false));
  if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener('click', () => toggleMobileDrawer(false));

  updateArticleScrollState();
  updateNavbarMusicUI();
  updateMusicProgress();
  updateNavLyricLine();
}
