// src/assets/scripts/music-engine.js

(() => {
  const DEFAULT_VINYL_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="%23121212"/><circle cx="250" cy="250" r="220" fill="%231a1a1a"/><circle cx="250" cy="250" r="190" fill="none" stroke="%23262626" stroke-width="2"/><circle cx="250" cy="250" r="160" fill="none" stroke="%23262626" stroke-width="2"/><circle cx="250" cy="250" r="130" fill="none" stroke="%23262626" stroke-width="2"/><circle cx="250" cy="250" r="100" fill="none" stroke="%23262626" stroke-width="2"/><circle cx="250" cy="250" r="75" fill="%23d62828"/><circle cx="250" cy="250" r="25" fill="%23ffffff"/><circle cx="250" cy="250" r="8" fill="%23000000"/></svg>`;
  const LYRIC_OFFSET = 0.18;

  const CACHE_DB_NAME = 'QuasarMusicDB';
  const DB_VERSION = 2;
  const STORES = {
    META: 'metaStore',
    COVER: 'coverStore',
    LYRIC: 'lyricStore',
    SPEC: 'specStore',
    MESH: 'meshStore'
  };

  const idbReady = new Promise((resolve) => {
    const req = indexedDB.open(CACHE_DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => resolve(null);
  });

  async function idbGet(storeName, key) {
    const db = await idbReady;
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch(e) { resolve(null); }
    });
  }

  async function idbSet(storeName, key, value) {
    const db = await idbReady;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch(e) { resolve(); }
    });
  }

  function runJsMediaTags(url, callbacks) {
    if (window.jsmediatags) {
      window.jsmediatags.read(url, callbacks);
      return;
    }
    let retries = 0;
    const timer = setInterval(() => {
      retries++;
      if (window.jsmediatags) {
        clearInterval(timer);
        window.jsmediatags.read(url, callbacks);
      } else if (retries > 30) {
        clearInterval(timer);
        if (callbacks.onError) callbacks.onError('jsmediatags timeout');
      }
    }, 100);
  }

  const checkDegraded = () => document.documentElement.classList.contains('perf-degraded') || sessionStorage.getItem('quasar-perf') === 'degraded';

  function parseFilename(url) {
    if (!url) return {};
    const filename = url.split('/').pop().split('?')[0].replace(/\.[^/.]+$/, "");
    const parts = filename.split('-');
    if (parts.length >= 2) {
      return { title: parts[0].trim(), artist: parts[1].trim() };
    }
    return { title: filename.trim(), artist: '' };
  }

  async function updateFluidMeshBackground(imgSrc) {
    if (!imgSrc) return;
    const applyColors = (colors) => {
      document.documentElement.style.setProperty('--degraded-dominant', colors.c4);
      if (checkDegraded()) return;
      const b1 = document.getElementById('blob-1');
      const b2 = document.getElementById('blob-2');
      const b3 = document.getElementById('blob-3');
      const b4 = document.getElementById('blob-4');
      if (b1) b1.style.backgroundColor = colors.c1;
      if (b2) b2.style.backgroundColor = colors.c2;
      if (b3) b3.style.backgroundColor = colors.c3;
      if (b4) b4.style.backgroundColor = colors.c4;
    };
    const cachedColors = await idbGet(STORES.MESH, imgSrc);
    if (cachedColors) { applyColors(cachedColors); return; }
    const img = new Image();
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) img.crossOrigin = 'Anonymous';
    img.onload = async () => {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      cvs.width = 12; cvs.height = 12;
      ctx.drawImage(img, 0, 0, 12, 12);
      const data = ctx.getImageData(0, 0, 12, 12).data;
      const getRgb = (idx) => `rgb(${data[idx * 4]}, ${data[idx * 4 + 1]}, ${data[idx * 4 + 2]})`;
      const colors = { c1: getRgb(14), c2: getRgb(22), c3: getRgb(118), c4: getRgb(130) };
      await idbSet(STORES.MESH, imgSrc, colors);
      applyColors(colors);
    };
    img.src = imgSrc;
  }

  function initFluidAnimation() {
    if (window.__QUASAR_FLUID_TWEENS__) window.__QUASAR_FLUID_TWEENS__.forEach(t => t && t.kill());
    if (checkDegraded() || !window.gsap) return;
    window.__QUASAR_FLUID_TWEENS__ = [
      gsap.to('#blob-1', { x: '18vw', y: '12vh', duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true }),
      gsap.to('#blob-2', { x: '-22vw', y: '18vh', duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true }),
      gsap.to('#blob-3', { x: '14vw', y: '-16vh', duration: 14, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true }),
      gsap.to('#blob-4', { x: '-18vw', y: '-12vh', duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true })
    ];
  }

  function pauseFluidAnimation() {
    if (window.__QUASAR_FLUID_TWEENS__) window.__QUASAR_FLUID_TWEENS__.forEach(t => t && t.pause());
  }

  function resumeFluidAnimation() {
    if (!checkDegraded() && window.__QUASAR_FLUID_TWEENS__) window.__QUASAR_FLUID_TWEENS__.forEach(t => t && t.resume());
  }

  function playPageEntranceAnimation() {
    if (!window.gsap) return;
    gsap.killTweensOf('.music-stage, #cover-box, #progress-container, .music-meta, .music-controls, .music-right-viewport');
    
    if (checkDegraded()) {
      gsap.set('.music-stage, #cover-box, #progress-container, .music-meta, .music-controls, .music-right-viewport', { opacity: 1, y: 0, x: 0, scale: 1 });
      return;
    }

    gsap.fromTo('.music-stage', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', force3D: true });
    gsap.fromTo(['#cover-box', '.music-meta', '#progress-container', '.music-controls'],
      { opacity: 0, y: 18, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', force3D: true }
    );
    gsap.fromTo('.music-right-viewport', { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out', delay: 0.08, force3D: true });
  }

  const initEngine = () => {
    const dataStore = document.getElementById('playlist-data-store');
    if (!dataStore) return;

    if (window.__QUASAR_MUSIC_CLEANUP__) window.__QUASAR_MUSIC_CLEANUP__();
    const cleanupFns = [];

    if (!window.__QUASAR_AUDIO_PLAYER__) {
      window.__QUASAR_AUDIO_PLAYER__ = new Audio();
    }
    const audio = window.__QUASAR_AUDIO_PLAYER__;

    function addAudioListener(event, fn) {
      audio.addEventListener(event, fn);
      cleanupFns.push(() => audio.removeEventListener(event, fn));
    }
    function addWindowListener(event, fn) {
      window.addEventListener(event, fn);
      cleanupFns.push(() => window.removeEventListener(event, fn));
    }

    let currentSessionId = 0, audioCtx = null, analyser = null, freqData = null, beatScaleLerp = 1.0, loudnessLerp = 0.0, rAFBeatId = null;

    window.__QUASAR_MUSIC_CLEANUP__ = () => {
      if (rAFBeatId) cancelAnimationFrame(rAFBeatId);
      cleanupFns.forEach(fn => fn());
      const elLyricsWrapper = document.getElementById('lyrics-wrapper');
      if (window.gsap && elLyricsWrapper) {
        gsap.killTweensOf(elLyricsWrapper);
        const lines = elLyricsWrapper.querySelectorAll('.music-lyric-row');
        if (lines.length) gsap.killTweensOf(lines);
      }
      window.__QUASAR_MUSIC_CLEANUP__ = null;
    };

    function initBeatAnalyser() {
      if (audio._beatAnalyserInited || checkDegraded()) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = audio._audioCtx || new AudioContext();
        audio._audioCtx = audioCtx;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.70;
        if (!audio._sourceNode) {
          audio._sourceNode = audioCtx.createMediaElementSource(audio);
          audio._sourceNode.connect(analyser);
          analyser.connect(audioCtx.destination);
        }
        audio._beatAnalyserInited = true;
      } catch (e) { console.warn('Web Audio API Beat Analyser init warning:', e); }
    }

    function loopBeatAnimation() {
      if (!audio.paused) {
        runGSAPLyricsEngine();
        if (!checkDegraded() && analyser && freqData) {
          analyser.getByteFrequencyData(freqData);
          let totalSum = 0, bassSum = 0;
          for (let i = 0; i < freqData.length; i++) totalSum += freqData[i];
          const currentLoudness = totalSum / (freqData.length * 255);
          loudnessLerp += (currentLoudness - loudnessLerp) * (currentLoudness > loudnessLerp ? 0.12 : 0.04);
          for (let i = 0; i < 4; i++) bassSum += freqData[i];
          const targetScale = (1.0 + (loudnessLerp * 0.08)) + ((bassSum / (4 * 255)) * (loudnessLerp * 0.22));
          beatScaleLerp += (targetScale - beatScaleLerp) * (targetScale > beatScaleLerp ? 0.35 : 0.12);
          const bgFluid = document.getElementById('music-bg');
          if (bgFluid) bgFluid.style.transform = `scale3d(${(1.1 * beatScaleLerp).toFixed(4)}, ${(1.1 * beatScaleLerp).toFixed(4)}, 1)`;
        }
      } else if (!checkDegraded()) {
        loudnessLerp += (0 - loudnessLerp) * 0.08;
        beatScaleLerp += (1.0 - beatScaleLerp) * 0.12;
        const bgFluid = document.getElementById('music-bg');
        if (bgFluid) bgFluid.style.transform = `scale3d(${(1.1 * beatScaleLerp).toFixed(4)}, ${(1.1 * beatScaleLerp).toFixed(4)}, 1)`;
      }
      rAFBeatId = requestAnimationFrame(loopBeatAnimation);
    }

    initFluidAnimation();
    if (rAFBeatId) cancelAnimationFrame(rAFBeatId);
    loopBeatAnimation();
    if (checkDegraded()) pauseFluidAnimation();

    addWindowListener('quasar-perf-status', (e) => {
      if (e.detail && e.detail.status === 'degraded') pauseFluidAnimation();
      else if (e.detail && e.detail.status === 'high') resumeFluidAnimation();
    });

    const playlist = JSON.parse(dataStore.dataset.json || '[]');
    if (playlist.length === 0) return;

    let currentIndex = 0, isPlaying = !audio.paused && !!audio.src, lyricsData = audio.lyricsData || [], lastActiveIndex = -999;
    let playMode = 'normal';
    let mobileViewMode = 'cover';
    let isAnimatingView = false;
    let currentIconState = 'play';

    const musicStage = document.querySelector('.music-stage');
    const elCover = document.getElementById('music-cover'), elCoverBox = document.getElementById('cover-box'), elTitle = document.getElementById('music-title'), elArtistAlbum = document.getElementById('music-artist-album');
    const elLyricsWrapper = document.getElementById('lyrics-wrapper'), elLyricsContainer = document.getElementById('lyrics-container');
    const elProgressContainer = document.getElementById('progress-container'), elProgressFill = document.getElementById('progress-fill'), elTimeCurrent = document.getElementById('time-current'), elTimeRemaining = document.getElementById('time-remaining'), elQualityBadge = document.getElementById('quality-badge');
    
    const btnPlay = document.getElementById('player-btn-play'), 
          btnPrev = document.getElementById('player-btn-prev'), 
          btnNext = document.getElementById('player-btn-next'), 
          btnMode = document.getElementById('player-btn-mode'), 
          btnLyric = document.getElementById('player-btn-lyric'), 
          btnToggleView = document.getElementById('player-btn-toggle-view');
          
    const panelLyrics = document.getElementById('panel-lyrics'), panelQueue = document.getElementById('panel-queue'), queueList = document.getElementById('queue-items-list'), searchInput = document.getElementById('queue-search-input');

    function updatePlayModeUI() {
      if (!btnMode) return;
      const iconOrder = btnMode.querySelector('.icon-order');
      const iconShuffle = btnMode.querySelector('.icon-shuffle');
      const iconRepeatOne = btnMode.querySelector('.icon-repeat-one');

      if (playMode === 'normal') {
        btnMode.title = '列表循环';
        btnMode.classList.remove('active');
        if (iconOrder) iconOrder.style.display = 'block';
        if (iconShuffle) iconShuffle.style.display = 'none';
        if (iconRepeatOne) iconRepeatOne.style.display = 'none';
      } else if (playMode === 'shuffle') {
        btnMode.title = '随机播放';
        btnMode.classList.add('active');
        if (iconOrder) iconOrder.style.display = 'none';
        if (iconShuffle) iconShuffle.style.display = 'block';
        if (iconRepeatOne) iconRepeatOne.style.display = 'none';
      } else if (playMode === 'repeat') {
        btnMode.title = '单曲循环';
        btnMode.classList.add('active');
        if (iconOrder) iconOrder.style.display = 'none';
        if (iconShuffle) iconShuffle.style.display = 'none';
        if (iconRepeatOne) iconRepeatOne.style.display = 'block';
      }
    }

    if (btnMode) {
      btnMode.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (playMode === 'normal') playMode = 'shuffle';
        else if (playMode === 'shuffle') playMode = 'repeat';
        else playMode = 'normal';
        updatePlayModeUI();
      });
    }

    function switchViewPanel(fromPanel, toPanel) {
      if (!fromPanel || !toPanel || fromPanel === toPanel) return;
      
      if (checkDegraded() || !window.gsap) {
        fromPanel.classList.remove('active');
        toPanel.classList.add('active');
        if (toPanel === panelLyrics) runGSAPLyricsEngine(true);
        return;
      }

      gsap.killTweensOf([fromPanel, toPanel]);
      gsap.to(fromPanel, {
        opacity: 0,
        y: -12,
        scale: 0.97,
        duration: 0.2,
        ease: 'power2.in',
        force3D: true,
        onComplete: () => {
          fromPanel.classList.remove('active');
          toPanel.classList.add('active');
          gsap.fromTo(toPanel,
            { opacity: 0, y: 16, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out', force3D: true }
          );
          if (toPanel === panelLyrics) runGSAPLyricsEngine(true);
        }
      });
    }

    // 🔑 物理级精准度测量 & 吞吐 CD 重构
    function setViewMode(targetMode) {
      const isMobile = window.innerWidth <= 992;

      if (isMobile) {
        if (isAnimatingView) return;
        const newMode = (mobileViewMode === targetMode) ? 'cover' : targetMode;
        const trackEl = document.querySelector('.music-progress-track');

        if (mobileViewMode === 'cover' && newMode !== 'cover') {
          // 📱 [吞入 CD]
          isAnimatingView = true;

          if (!checkDegraded() && window.gsap && elCoverBox && trackEl) {
            // 归位测量精准的坐标布局
            gsap.set(elCoverBox, { y: 0, clipPath: 'none' });
            const coverRect = elCoverBox.getBoundingClientRect();
            const trackRect = trackEl.getBoundingClientRect();

            const H = coverRect.height;
            const slotY = trackRect.top + (trackRect.height / 2); // 缝隙中心线
            const gap = slotY - coverRect.bottom; // 封面底边距离缝隙的间距
            const targetY = gap + H; // 完整吞入（顶边到达缝隙）的总位移

            const applyPreciseClip = (curY) => {
              if (curY <= gap) {
                // 尚未触及缝隙中线：保持完整不切割
                elCoverBox.style.clipPath = 'none';
              } else {
                // 越过缝隙中线：精准切割超出部分
                const overlap = curY - gap;
                const clipPct = Math.min(100, Math.max(0, (overlap / H) * 100));
                elCoverBox.style.clipPath = `inset(0% 0% ${clipPct.toFixed(2)}% 0%)`;
              }
            };

            gsap.to(elCoverBox, {
              y: targetY,
              duration: 0.48,
              ease: 'power2.in',
              force3D: true,
              onUpdate: function() {
                const curY = gsap.getProperty(elCoverBox, "y");
                applyPreciseClip(curY);
              },
              onComplete: () => {
                mobileViewMode = newMode;
                musicStage.classList.add('mobile-view-active');

                if (newMode === 'lyrics') {
                  panelQueue.classList.remove('active');
                  panelLyrics.classList.add('active');
                  if (btnLyric) btnLyric.classList.add('active');
                  if (btnToggleView) btnToggleView.classList.remove('active');
                } else {
                  panelLyrics.classList.remove('active');
                  panelQueue.classList.add('active');
                  if (btnLyric) btnLyric.classList.remove('active');
                  if (btnToggleView) btnToggleView.classList.add('active');
                }

                gsap.set(elCoverBox, { y: 0, clipPath: 'none', opacity: 1 });

                const targetPanel = newMode === 'lyrics' ? panelLyrics : panelQueue;
                gsap.fromTo(targetPanel, 
                  { opacity: 0, y: 18 }, 
                  { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', force3D: true }
                );

                if (newMode === 'lyrics') {
                  runGSAPLyricsEngine(true);
                  const rows = elLyricsWrapper.querySelectorAll('.music-lyric-row');
                  if (rows.length) {
                    gsap.fromTo(rows, 
                      { opacity: 0, y: 16 },
                      { opacity: (i, el) => el.classList.contains('active') ? 1 : 0.32, y: 0, duration: 0.35, stagger: 0.02, ease: 'power2.out', force3D: true, onComplete: () => { isAnimatingView = false; } }
                    );
                  } else { isAnimatingView = false; }
                } else { isAnimatingView = false; }
              }
            });
          } else {
            mobileViewMode = newMode;
            musicStage.classList.add('mobile-view-active');
            if (newMode === 'lyrics') {
              panelQueue.classList.remove('active');
              panelLyrics.classList.add('active');
              if (btnLyric) btnLyric.classList.add('active');
              if (btnToggleView) btnToggleView.classList.remove('active');
            } else {
              panelLyrics.classList.remove('active');
              panelQueue.classList.add('active');
              if (btnLyric) btnLyric.classList.remove('active');
              if (btnToggleView) btnToggleView.classList.add('active');
            }
            if (newMode === 'lyrics') runGSAPLyricsEngine(true);
            isAnimatingView = false;
          }

        } else if (mobileViewMode !== 'cover' && newMode === 'cover') {
          // 📱 [吐出 CD]：绝对物理镜像倒放（从 targetY 拔出回放）
          isAnimatingView = true;
          const currentPanel = mobileViewMode === 'lyrics' ? panelLyrics : panelQueue;
          if (btnLyric) btnLyric.classList.remove('active');
          if (btnToggleView) btnToggleView.classList.remove('active');

          if (!checkDegraded() && window.gsap && elCoverBox && trackEl) {
            gsap.to(currentPanel, {
              opacity: 0,
              y: 16,
              duration: 0.2,
              ease: 'power2.in',
              force3D: true,
              onComplete: () => {
                mobileViewMode = 'cover';
                musicStage.classList.remove('mobile-view-active');

                // 移除 mobile-view-active 后重新精准测算
                gsap.set(elCoverBox, { y: 0, clipPath: 'none' });
                const coverRect = elCoverBox.getBoundingClientRect();
                const trackRect = trackEl.getBoundingClientRect();

                const H = coverRect.height;
                const slotY = trackRect.top + (trackRect.height / 2);
                const gap = slotY - coverRect.bottom;
                const targetY = gap + H;

                const applyPreciseClip = (curY) => {
                  if (curY <= gap) {
                    elCoverBox.style.clipPath = 'none';
                  } else {
                    const overlap = curY - gap;
                    const clipPct = Math.min(100, Math.max(0, (overlap / H) * 100));
                    elCoverBox.style.clipPath = `inset(0% 0% ${clipPct.toFixed(2)}% 0%)`;
                  }
                };

                // 瞬间将封面藏置于缝隙内部 (100% 被裁剪状态)
                gsap.set(elCoverBox, { y: targetY, clipPath: 'inset(0% 0% 100% 0%)', opacity: 1 });

                // 镜像倒放：以 power2.out 减速曲线向上平滑拔回原位
                gsap.to(elCoverBox, {
                  y: 0,
                  duration: 0.48,
                  ease: 'power2.out',
                  force3D: true,
                  onUpdate: function() {
                    const curY = gsap.getProperty(elCoverBox, "y");
                    applyPreciseClip(curY);
                  },
                  onComplete: () => {
                    gsap.set(elCoverBox, { clipPath: 'none' });
                    isAnimatingView = false;
                  }
                });
              }
            });
          } else {
            mobileViewMode = 'cover';
            musicStage.classList.remove('mobile-view-active');
            isAnimatingView = false;
          }

        } else {
          // 歌词 ↔ 列表 切换
          mobileViewMode = newMode;
          if (newMode === 'lyrics') {
            if (btnLyric) btnLyric.classList.add('active');
            if (btnToggleView) btnToggleView.classList.remove('active');
            switchViewPanel(panelQueue, panelLyrics);
          } else {
            if (btnLyric) btnLyric.classList.remove('active');
            if (btnToggleView) btnToggleView.classList.add('active');
            switchViewPanel(panelLyrics, panelQueue);
          }
        }

      } else {
        // 💻 桌面端逻辑
        let nextMode = targetMode;
        if (panelQueue.classList.contains('active') && targetMode === 'queue') {
          nextMode = 'lyrics';
        }

        if (nextMode === 'lyrics') {
          if (btnLyric) btnLyric.classList.add('active');
          if (btnToggleView) btnToggleView.classList.remove('active');
          if (panelQueue.classList.contains('active')) {
            switchViewPanel(panelQueue, panelLyrics);
          } else {
            panelQueue.classList.remove('active');
            panelLyrics.classList.add('active');
            if (window.gsap) gsap.set(panelLyrics, { opacity: 1, y: 0, scale: 1 });
            runGSAPLyricsEngine(true);
          }
        } else if (nextMode === 'queue') {
          if (btnLyric) btnLyric.classList.remove('active');
          if (btnToggleView) btnToggleView.classList.add('active');
          if (panelLyrics.classList.contains('active')) {
            switchViewPanel(panelLyrics, panelQueue);
          } else {
            panelLyrics.classList.remove('active');
            panelQueue.classList.add('active');
            if (window.gsap) gsap.set(panelQueue, { opacity: 1, y: 0, scale: 1 });
          }
        }
      }
    }

    function setPlayButtonState(targetState) {
      if (!btnPlay || currentIconState === targetState) return;
      currentIconState = targetState;
      const icons = { play: btnPlay.querySelector('.icon-play'), pause: btnPlay.querySelector('.icon-pause'), loading: btnPlay.querySelector('.icon-loading') };
      Object.keys(icons).forEach(key => {
        const el = icons[key];
        if (!el) return;
        gsap.killTweensOf(el);
        if (checkDegraded()) {
          el.style.opacity = key === targetState ? '1' : '0';
          el.style.transform = key === targetState ? 'scale(1)' : 'scale(0.7)';
        } else {
          if (key === targetState) gsap.fromTo(el, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto', force3D: true });
          else gsap.to(el, { opacity: 0, scale: 0.7, duration: 0.18, ease: 'power2.in', overwrite: 'auto', force3D: true });
        }
      });
    }

    addAudioListener('loadstart', () => setPlayButtonState('loading'));
    addAudioListener('waiting', () => setPlayButtonState('loading'));
    addAudioListener('canplay', () => { if (audio.paused) setPlayButtonState('play'); });
    addAudioListener('playing', () => {
      isPlaying = true; setPlayButtonState('pause');
      if (elCoverBox && mobileViewMode === 'cover') {
        if (!checkDegraded() && window.gsap) gsap.to(elCoverBox, { scale: 1, duration: 0.6, ease: 'power3.out', force3D: true });
        else elCoverBox.style.transform = 'scale(1)';
      }
    });
    addAudioListener('pause', () => {
      isPlaying = false; setPlayButtonState('play'); runGSAPLyricsEngine(true);
      if (elCoverBox && mobileViewMode === 'cover') {
        if (!checkDegraded() && window.gsap) gsap.to(elCoverBox, { scale: 0.85, duration: 0.6, ease: 'power2.out', force3D: true });
        else elCoverBox.style.transform = 'scale(0.85)';
      }
    });
    
    addAudioListener('ended', () => {
      isPlaying = false; setPlayButtonState('play');
      if (playMode === 'repeat') safePlayAudio(); 
      else loadSong(getNextIndex(), true, true, true, 'next');
    });
    addAudioListener('error', () => setPlayButtonState('play'));

    if (btnLyric) btnLyric.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setViewMode('lyrics'); });
    if (btnToggleView) btnToggleView.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setViewMode('queue'); });

    const renderQueueList = (query = '') => {
      if (!queueList) return;
      queueList.innerHTML = '';
      let matchCount = 0;
      playlist.forEach((song, idx) => {
        const displayTitle = song.displayTitle || song.title || parseFilename(song.audioUrl).title || '未知曲目';
        const displayArtist = song.displayArtist || song.artist || parseFilename(song.audioUrl).artist || '未知歌手';
        const displayCover = song.displayCover || song.coverUrl || DEFAULT_VINYL_COVER;
        if (query) {
          const q = query.toLowerCase();
          if (!displayTitle.toLowerCase().includes(q) && !displayArtist.toLowerCase().includes(q) && !(song.album || '').toLowerCase().includes(q)) return;
        }
        matchCount++;
        const li = document.createElement('li');
        li.className = `music-song-item ${idx === currentIndex ? 'active' : ''}`;
        li.innerHTML = `<div class="music-s-thumb" style="background-image: url('${displayCover.replace(/'/g, "%27")}');"></div><div class="music-s-info"><span class="music-s-title">${displayTitle}</span><span class="music-s-sub">${displayArtist}</span></div>`;
        li.addEventListener('click', () => { 
          if (idx !== currentIndex) {
            const dir = idx > currentIndex ? 'next' : 'prev';
            loadSong(idx, true, true, true, dir); 
          }
        });
        queueList.appendChild(li);
      });
      if (matchCount === 0) queueList.innerHTML = '<li class="music-song-item-empty">未找到搜索匹配的歌曲</li>';
    };
    if (searchInput) searchInput.addEventListener('input', (e) => renderQueueList(e.target.value.trim()));

    async function fetchLyrics(url, sessionId) {
      if (sessionId !== currentSessionId) return;
      if (!url) { renderNoLyrics('純音樂'); return; }
      const cachedLrc = await idbGet(STORES.LYRIC, url);
      if (sessionId !== currentSessionId) return;
      if (cachedLrc) { parseLrc(cachedLrc, sessionId); return; }
      try {
        const res = await fetch(url);
        if (sessionId !== currentSessionId) return;
        if (!res.ok) throw new Error('Error');
        const text = await res.text();
        if (sessionId !== currentSessionId) return;
        await idbSet(STORES.LYRIC, url, text);
        parseLrc(text, sessionId);
      } catch (e) {
        if (sessionId !== currentSessionId) return;
        renderNoLyrics('暫無歌詞');
      }
    }

    function parseLrc(lrcText, sessionId) {
      if (sessionId !== currentSessionId) return;
      const lines = lrcText.split('\n');
      const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
      lyricsData = [];
      lines.forEach(line => {
        const match = timeReg.exec(line);
        if (match) {
          const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3].padEnd(3, '0')) / 1000;
          const text = line.replace(timeReg, '').trim();
          if (text) lyricsData.push({ time, text });
        }
      });
      lyricsData.sort((a, b) => a.time - b.time);
      audio.lyricsData = lyricsData;
      if (lyricsData.length === 0) renderNoLyrics('暂无歌詞');
      else renderLyricsDOM();
    }

    function renderNoLyrics(msg) {
      if (window.gsap && elLyricsWrapper) gsap.killTweensOf(elLyricsWrapper);
      if (elLyricsWrapper) elLyricsWrapper.innerHTML = `<p class="music-lyric-row music-no-lyric">${msg}</p>`;
      audio.currentLyric = msg; audio.currentLyricIndex = -1;
      window.dispatchEvent(new CustomEvent('quasar:lyric-change', { detail: { lyric: msg, index: -1 } }));
      window.dispatchEvent(new CustomEvent('nav-update-music-ui'));
      if (elLyricsWrapper && elLyricsContainer) {
        const noLyricEl = elLyricsWrapper.querySelector('.music-no-lyric');
        if (noLyricEl) {
          const targetY = Math.max(20, (elLyricsContainer.clientHeight / 2) - (noLyricEl.offsetHeight / 2));
          if (window.gsap) gsap.set(elLyricsWrapper, { y: targetY });
          if (checkDegraded()) { noLyricEl.style.opacity = '1'; noLyricEl.style.color = '#ffffff'; }
          else if (window.gsap) gsap.to(noLyricEl, { opacity: 1, color: '#ffffff', duration: 0.6, ease: 'power3.out', force3D: true });
        }
      }
    }

    function renderLyricsDOM() {
      if (!elLyricsWrapper) return;
      if (window.gsap) gsap.killTweensOf(elLyricsWrapper);
      elLyricsWrapper.innerHTML = `<div class="music-countdown-dots" id="lyrics-countdown"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
      lyricsData.forEach((item) => {
        const p = document.createElement('p'); p.className = 'music-lyric-row'; p.innerText = item.text;
        if (window.gsap) gsap.set(p, { opacity: 0.32, scale: 0.95, y: 0 });
        p.addEventListener('click', () => { audio.currentTime = item.time; safePlayAudio(); });
        elLyricsWrapper.appendChild(p);
      });
      lastActiveIndex = -999;
      requestAnimationFrame(() => runGSAPLyricsEngine(true));
    }

    async function detectRealAudioSpecs(url, sessionId) {
      if (sessionId !== currentSessionId || !elQualityBadge) return;
      const cachedSpec = await idbGet(STORES.SPEC, url);
      if (sessionId !== currentSessionId) return;
      if (cachedSpec) { elQualityBadge.innerText = cachedSpec.text; elQualityBadge.className = cachedSpec.className; return; }
      elQualityBadge.innerText = '识别中...';
      if (!url) { elQualityBadge.innerText = '标准音质'; elQualityBadge.className = 'music-quality-badge standard'; return; }
      const ext = url.split('.').pop().split('?')[0].toUpperCase();
      const isLossless = ['FLAC', 'WAV', 'ALAC', 'APE'].includes(ext);
      const calculateSpec = async () => {
        if (sessionId !== currentSessionId) return;
        let fileSize = 0, kbps = 0;
        try {
          const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
          if (head && head.ok && head.headers.get('content-length')) fileSize = parseInt(head.headers.get('content-length'), 10);
        } catch (e) {}
        if (sessionId !== currentSessionId) return;
        if (fileSize > 0 && audio.duration > 0 && !isNaN(audio.duration)) kbps = Math.round((fileSize * 8) / (audio.duration * 1000));
        let parts = [ext || 'AUDIO'];
        if (isLossless) parts.push(kbps > 2000 ? '24bit / Hi-Res' : '16bit / 44.1kHz');
        if (kbps > 0) parts.push(`• ${kbps}kbps`); else if (isLossless) parts.push('• 无损');
        const specResult = { text: parts.join(' '), className: `music-quality-badge ${isLossless ? 'lossless' : 'standard'}` };
        await idbSet(STORES.SPEC, url, specResult);
        if (sessionId !== currentSessionId) return;
        elQualityBadge.innerText = specResult.text; elQualityBadge.className = specResult.className;
      };
      if (audio.duration && !isNaN(audio.duration)) calculateSpec();
      else addAudioListener('loadedmetadata', calculateSpec);
    }

    function updateUI(t, a, alb, c) {
      if (elTitle) elTitle.innerText = t;
      if (elArtistAlbum) elArtistAlbum.innerText = `${a} — ${alb}`;
      if (c && elCover) { elCover.style.backgroundImage = `url('${c.replace(/'/g, "%27")}')`; updateFluidMeshBackground(c); }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t, artist: a, album: alb, artwork: c ? [{ src: c }] : [] });
      }
    }

    function loadSong(index, animated = false, autoPlay = false, forceReload = false, direction = 'next') {
      currentSessionId++; const thisSession = currentSessionId;
      currentIndex = index; const song = playlist[currentIndex];
      if (!song) return;
      const isSameSong = audio.currentSong && (audio.currentSong.audioUrl === song.audioUrl || (audio.src && audio.src === new URL(song.audioUrl, window.location.href).href));
      const isReenteringPage = isSameSong && !forceReload;

      lyricsData = []; audio.lyricsData = []; audio.currentLyric = ''; audio.currentLyricIndex = -1; lastActiveIndex = -999;
      if (elLyricsWrapper) {
        if (window.gsap) { gsap.killTweensOf(elLyricsWrapper); const oldRows = elLyricsWrapper.querySelectorAll('.music-lyric-row'); if (oldRows.length) gsap.killTweensOf(oldRows); }
        elLyricsWrapper.innerHTML = '';
      }
      window.dispatchEvent(new CustomEvent('quasar:lyric-change', { detail: { lyric: '', index: -1 } }));

      if (forceReload || !isSameSong) {
        audio.pause(); isPlaying = false; audio.src = song.audioUrl; audio.load();
      } else { isPlaying = !audio.paused; }

      const nextCover = song.displayCover || song.coverUrl || DEFAULT_VINYL_COVER;
      audio.currentSong = { ...song, displayTitle: song.displayTitle || song.title || parseFilename(song.audioUrl).title || '未知曲目', displayArtist: song.artist || parseFilename(song.audioUrl).artist || '未知歌手', displayCover: nextCover, index: currentIndex };

      applySongData(index, thisSession, isReenteringPage);

      const dirXOut = direction === 'next' ? -150 : 150;
      const dirXIn = direction === 'next' ? 150 : -150;

      if (animated && !isReenteringPage && !checkDegraded() && window.gsap && elCoverBox && elTitle && elArtistAlbum && mobileViewMode === 'cover') {
        
        gsap.to(elCoverBox, { x: dirXOut, opacity: 0, scale: 0.8, duration: 0.22, ease: 'power2.in', force3D: true, onComplete: () => {
          if (thisSession !== currentSessionId) return;
          if (elCover) elCover.style.backgroundImage = `url('${nextCover.replace(/'/g, "%27")}')`;
          updateFluidMeshBackground(nextCover);
          gsap.fromTo(elCoverBox, { x: dirXIn, opacity: 0, scale: 0.8 }, { x: 0, opacity: 1, scale: isPlaying ? 1 : 0.85, duration: 0.35, ease: 'power3.out', force3D: true });
        }});

        gsap.to([elTitle, elArtistAlbum], { x: dirXOut * 0.2, opacity: 0, duration: 0.18, stagger: 0.04, ease: 'power2.in', force3D: true, onComplete: () => {
          if (thisSession !== currentSessionId) return;
          if (elTitle) elTitle.innerText = audio.currentSong.displayTitle;
          if (elArtistAlbum) elArtistAlbum.innerText = `${audio.currentSong.displayArtist} — ${song.album || '未知專輯'}`;
          gsap.fromTo([elTitle, elArtistAlbum], { x: dirXIn * 0.2, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', force3D: true });
        }});
        
      } else {
        updateUI(audio.currentSong.displayTitle, audio.currentSong.displayArtist, song.album || '未知專輯', nextCover);
        if (window.gsap && elCoverBox && elTitle && elArtistAlbum) {
          gsap.killTweensOf([elCoverBox, elTitle, elArtistAlbum]);
          if (mobileViewMode === 'cover') gsap.set(elCoverBox, { scale: audio.paused ? 0.85 : 1, x: 0, opacity: 1 });
          gsap.set([elTitle, elArtistAlbum], { x: 0, y: 0, opacity: 1 });
        }
      }

      if (autoPlay && forceReload) safePlayAudio(); else setPlayButtonState(audio.paused ? 'play' : 'pause');

      if (audio.duration && !isNaN(audio.duration)) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (elProgressFill) elProgressFill.style.width = `${pct}%`;
        if (elTimeCurrent) elTimeCurrent.innerText = formatTime(audio.currentTime);
        if (elTimeRemaining) elTimeRemaining.innerText = `-${formatTime(audio.duration - audio.currentTime)}`;
      }
      window.dispatchEvent(new CustomEvent('nav-update-music-ui'));
    }

    async function applySongData(index, sessionId, isReenteringPage = false) {
      if (sessionId !== currentSessionId) return;
      const song = playlist[index]; const fileParsed = parseFilename(song.audioUrl);
      let title = song.title || fileParsed.title || '未知曲目', artist = song.artist || fileParsed.artist || '未知歌手', album = song.album || '未知專輯', cover = song.coverUrl || DEFAULT_VINYL_COVER;

      const cachedMeta = await idbGet(STORES.META, song.audioUrl);
      const cachedCover = await idbGet(STORES.COVER, song.audioUrl);
      if (sessionId !== currentSessionId) return;

      if (cachedMeta) {
        song.displayTitle = cachedMeta.title; song.displayArtist = cachedMeta.artist; song.displayCover = cachedCover || cover; 
        updateUI(cachedMeta.title, cachedMeta.artist, cachedMeta.album, song.displayCover);
        if (audio.currentSong) { audio.currentSong.displayTitle = cachedMeta.title; audio.currentSong.displayCover = song.displayCover; window.dispatchEvent(new CustomEvent('nav-update-music-ui')); }
        renderQueueList(searchInput ? searchInput.value.trim() : '');
      } else {
        song.displayTitle = title; song.displayArtist = artist; song.displayCover = cover;
        updateUI(title, artist, album, cover); renderQueueList(searchInput ? searchInput.value.trim() : '');
        await idbSet(STORES.META, song.audioUrl, { title, artist, album });
        if (cover && cover !== DEFAULT_VINYL_COVER) await idbSet(STORES.COVER, song.audioUrl, cover);

        const needParseMeta = !song.title || !song.artist || !song.album;
        const needParseCover = !song.coverUrl;
        
        if ((needParseMeta || needParseCover) && song.audioUrl) {
          runJsMediaTags(song.audioUrl, {
            onSuccess: async function(tag) {
              if (sessionId !== currentSessionId) return;
              const tags = tag.tags;
              if (needParseMeta) { title = song.title || tags.title || title; artist = song.artist || tags.artist || artist; album = song.album || tags.album || album; }
              if (needParseCover && tags.picture) {
                const pic = tags.picture; let base64String = "";
                for (let i = 0; i < pic.data.length; i++) base64String += String.fromCharCode(pic.data[i]);
                cover = `data:${pic.format};base64,${window.btoa(base64String)}`;
              }
              song.displayTitle = title; song.displayArtist = artist; song.displayCover = cover;
              await idbSet(STORES.META, song.audioUrl, { title, artist, album });
              if (cover !== DEFAULT_VINYL_COVER) await idbSet(STORES.COVER, song.audioUrl, cover);
              if (sessionId !== currentSessionId) return;
              updateUI(title, artist, album, cover);
              if (audio.currentSong) { audio.currentSong.displayTitle = title; audio.currentSong.displayCover = cover; window.dispatchEvent(new CustomEvent('nav-update-music-ui')); }
              renderQueueList(searchInput ? searchInput.value.trim() : '');
            },
            onError: (err) => console.log('jsmediatags read error:', err)
          });
        }
      }
      detectRealAudioSpecs(song.audioUrl, sessionId);
      if (isReenteringPage && audio.lyricsData && audio.lyricsData.length > 0) { lyricsData = audio.lyricsData; renderLyricsDOM(); }
      else { fetchLyrics(song.lyricUrl, sessionId); }
    }

    function safePlayAudio() {
      if (!audio.src) {
        if (playlist.length > 0) loadSong(currentIndex, false, true, true);
        return;
      }
      const thisSession = currentSessionId; setPlayButtonState('loading');
      
      try {
        initBeatAnalyser();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext active bypass:', e);
      }

      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          if (thisSession !== currentSessionId) audio.pause(); else { isPlaying = true; setPlayButtonState('pause'); }
        }).catch(e => { console.warn('Play prevented:', e); if (thisSession === currentSessionId) { isPlaying = false; setPlayButtonState('play'); }});
      }
    }
    
    function togglePlayPause(e) { 
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!audio.src) {
        if (playlist.length > 0) loadSong(currentIndex, false, true, true);
        return;
      } 
      if (audio.paused) safePlayAudio(); else audio.pause(); 
    }
    
    function getNextIndex() {
      if (playMode === 'shuffle' && playlist.length > 1) {
        let nextIdx = Math.floor(Math.random() * playlist.length);
        while (nextIdx === currentIndex) nextIdx = Math.floor(Math.random() * playlist.length);
        return nextIdx;
      }
      return (currentIndex + 1) % playlist.length;
    }
    
    function getPrevIndex() {
      if (playMode === 'shuffle' && playlist.length > 1) {
        let prevIdx = Math.floor(Math.random() * playlist.length);
        while (prevIdx === currentIndex) prevIdx = Math.floor(Math.random() * playlist.length);
        return prevIdx;
      }
      return (currentIndex - 1 + playlist.length) % playlist.length;
    }

    if (btnPlay) btnPlay.addEventListener('click', togglePlayPause);
    if (btnPrev) btnPrev.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); loadSong(getPrevIndex(), true, true, true, 'prev'); });
    if (btnNext) btnNext.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); loadSong(getNextIndex(), true, true, true, 'next'); });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => safePlayAudio());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => loadSong(getPrevIndex(), true, true, true, 'prev'));
      navigator.mediaSession.setActionHandler('nexttrack', () => loadSong(getNextIndex(), true, true, true, 'next'));
    }

    addAudioListener('timeupdate', () => {
      if (!audio.duration || isNaN(audio.duration)) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (elProgressFill) elProgressFill.style.width = `${pct}%`;
      if (elTimeCurrent) elTimeCurrent.innerText = formatTime(audio.currentTime);
      if (elTimeRemaining) elTimeRemaining.innerText = `-${formatTime(audio.duration - audio.currentTime)}`;
      const navProgressCircle = document.getElementById('nav-music-progress-bar'), navTitle = document.getElementById('nav-music-title'), navInfo = document.getElementById('nav-music-info');
      if (navInfo && audio.currentSong) { navInfo.classList.add('active'); if (navTitle) navTitle.innerText = audio.currentSong.displayTitle || audio.currentSong.title || ''; }
      if (navProgressCircle && audio.duration) navProgressCircle.style.strokeDashoffset = `${100 - (audio.currentTime / audio.duration) * 100}`;
      runGSAPLyricsEngine();
    });

    let isSeeking = false;
    if (elProgressContainer) {
      elProgressContainer.addEventListener('mousedown', (e) => { isSeeking = true; seek(e); });
      window.addEventListener('mousemove', (e) => { if (isSeeking) seek(e); });
      window.addEventListener('mouseup', () => { isSeeking = false; });
      elProgressContainer.addEventListener('touchstart', (e) => { isSeeking = true; seek(e.touches[0]); }, { passive: true });
      window.addEventListener('touchmove', (e) => { if (isSeeking) seek(e.touches[0]); }, { passive: true });
      window.addEventListener('touchend', () => { isSeeking = false; });
    }
    
    function seek(e) {
      if (!elProgressContainer) return;
      const rect = elProgressContainer.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      if (audio.duration && !isNaN(audio.duration)) {
        audio.currentTime = pct * audio.duration;
        if (elProgressFill) elProgressFill.style.width = `${pct * 100}%`;
        runGSAPLyricsEngine(true);
      }
    }

    function runGSAPLyricsEngine(forceUpdate = false) {
      if (!lyricsData || !lyricsData.length) return;
      const currentTime = audio.currentTime + LYRIC_OFFSET;
      let activeIndex = -1;
      for (let i = 0; i < lyricsData.length; i++) { if (currentTime >= lyricsData[i].time) activeIndex = i; else break; }

      const firstTime = lyricsData[0] ? lyricsData[0].time : 0;
      const countdownEl = document.getElementById('lyrics-countdown');
      if (countdownEl && firstTime > 0) {
        const remainingPreTime = firstTime - currentTime;
        if (remainingPreTime > 0 && remainingPreTime <= 5) {
          countdownEl.classList.add('visible'); countdownEl.classList.remove('fading-out');
          const litCount = Math.min(5, Math.max(1, Math.ceil(6 - remainingPreTime)));
          countdownEl.querySelectorAll('.dot').forEach((dot, dIdx) => { dot.classList.toggle('active', dIdx < litCount); });
        } else {
          if (countdownEl.classList.contains('visible')) { countdownEl.classList.remove('visible'); countdownEl.classList.add('fading-out'); }
        }
      }

      if (activeIndex !== lastActiveIndex || forceUpdate) {
        lastActiveIndex = activeIndex;
        const currentText = (activeIndex >= 0 && lyricsData[activeIndex]) ? lyricsData[activeIndex].text : '';
        audio.currentLyric = currentText; audio.currentLyricIndex = activeIndex;
        window.dispatchEvent(new CustomEvent('quasar:lyric-change', { detail: { lyric: currentText, index: activeIndex } }));
        window.dispatchEvent(new CustomEvent('nav-update-music-ui'));

        if (!elLyricsWrapper) return;
        const lines = elLyricsWrapper.querySelectorAll('.music-lyric-row');
        if (!lines.length) return;
        
        const degraded = checkDegraded();
        lines.forEach((line, idx) => {
          const isCurrent = (idx === activeIndex);
          if (degraded) {
            line.style.filter = 'none';
            line.classList.toggle('active', isCurrent);
            if (window.gsap) gsap.set(line, { opacity: isCurrent ? 1 : 0.35, y: 0, filter: 'none' }); 
          } else {
            if (!window.gsap) return;
            const distFar = idx - activeIndex;
            const isFarOffscreen = (distFar < -5 || distFar > 8);
            if (isFarOffscreen) {
              line.classList.remove('active');
              gsap.set(line, { scale: 0.95, opacity: distFar < 0 ? 0.08 : 0.05, color: 'rgba(255, 255, 255, 0.32)', y: distFar > 0 ? 32 : 0, filter: 'none' });
              return;
            }
            if (isCurrent) {
              line.classList.add('active');
              gsap.to(line, { scale: 1.1, opacity: 1, color: '#ffffff', y: 0, filter: 'none', duration: 0.55, ease: 'power3.out', transformOrigin: '0% 50%', overwrite: 'auto', force3D: true });
            } else if (idx < activeIndex) {
              line.classList.remove('active');
              const dist = Math.abs(idx - activeIndex);
              const blurVal = dist >= 1 ? Math.min(9, 2 + dist * 0.5) : 0;
              gsap.to(line, { scale: 0.95, opacity: Math.max(0.12, 0.35 - dist * 0.08), color: 'rgba(255, 255, 255, 0.32)', y: 0, filter: blurVal > 0 ? `blur(${blurVal.toFixed(1)}px)` : 'none', duration: 0.5, ease: 'power2.out', transformOrigin: '0% 50%', overwrite: 'auto', force3D: true });
            } else {
              line.classList.remove('active');
              const dist = idx - (activeIndex >= 0 ? activeIndex : 0);
              const blurVal = dist >= 1 ? Math.min(1, 10 + dist * 5) : 0;
              gsap.to(line, { scale: 0.95, opacity: Math.max(0.08, 0.35 - dist * 0.08), color: 'rgba(255, 255, 255, 0.32)', y: Math.min(dist * 8, 32), filter: blurVal > 0 ? `blur(${blurVal.toFixed(1)}px)` : 'none', duration: 0.6, delay: Math.min(dist * 0.06, 0.3), ease: 'power3.out', transformOrigin: '0% 50%', overwrite: 'auto', force3D: true });
            }
          }
        });
        const targetLine = lines[activeIndex >= 0 ? activeIndex : 0];
        if (targetLine && window.gsap && elLyricsContainer) {
          gsap.to(elLyricsWrapper, { y: (elLyricsContainer.clientHeight / 2) - (targetLine.offsetTop + (targetLine.offsetHeight / 2)), duration: degraded ? 0.35 : 0.7, ease: "power3.out", overwrite: 'auto', force3D: true });
        }
      }
    }

    function formatTime(secs) {
      if (isNaN(secs)) return '0:00';
      return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    }

    function findSongIndex(searchKey) {
      if (!searchKey) return -1;
      const key = decodeURIComponent(searchKey).toLowerCase().trim().replace(/^music\//, '');
      let idx = playlist.findIndex(s => s.id && s.id.toLowerCase() === key); if (idx !== -1) return idx;
      idx = playlist.findIndex(s => s.title && s.title.toLowerCase() === key); if (idx !== -1) return idx;
      idx = playlist.findIndex(s => (s.title || '').toLowerCase().includes(key) || key.includes((s.title || '').toLowerCase())); if (idx !== -1) return idx;
      idx = playlist.findIndex(s => (s.audioUrl || '').split('/').pop().toLowerCase().includes(key)); return idx;
    }

    const handleSongJumpAndPlay = (key) => {
      const matchedIdx = findSongIndex(key);
      if (matchedIdx !== -1) { loadSong(matchedIdx, true, true, true, 'next'); return true; }
      return false;
    };

    let hasMatchedJump = false;
    const pendingKey = sessionStorage.getItem('quasar_jump_key');
    if (pendingKey) { sessionStorage.removeItem('quasar_jump_key'); hasMatchedJump = handleSongJumpAndPlay(pendingKey); }
    addWindowListener('quasar:play-song', (e) => { if (e.detail && e.detail.key) handleSongJumpAndPlay(e.detail.key); });
    if (!hasMatchedJump) { const hashKey = window.location.hash.replace('#', ''); if (hashKey) hasMatchedJump = handleSongJumpAndPlay(hashKey); }
    
    if (!hasMatchedJump) {
      if (audio.src && audio.currentSong) { const matchedIdx = playlist.findIndex(s => s.audioUrl === audio.currentSong.audioUrl); loadSong(matchedIdx !== -1 ? matchedIdx : 0, false, false, false, 'next'); } 
      else loadSong(0, false, false, false, 'next');
    }

    playPageEntranceAnimation();
  };

  const startEngine = () => {
    if (document.getElementById('playlist-data-store')) initEngine();
    else if (window.__QUASAR_MUSIC_CLEANUP__) window.__QUASAR_MUSIC_CLEANUP__();
  };

  document.addEventListener('astro:page-load', startEngine);
  document.addEventListener('astro:before-swap', () => { if (window.__QUASAR_MUSIC_CLEANUP__) window.__QUASAR_MUSIC_CLEANUP__(); });
})();