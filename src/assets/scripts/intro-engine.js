// src/assets/scripts/intro-engine.js

export function initIntroEngine() {
  if (typeof window === 'undefined') return;

  // 1. 播放状态防御
  if (window._introHasPlayed) {
    const container = document.getElementById('intro-container');
    if (container) container.style.display = 'none';
    return;
  }

  const container = document.getElementById('intro-container');
  if (!container) return;

  if (container.dataset.engineInited === 'true') return;
  container.dataset.engineInited = 'true';

  // 2. 性能模式判断（保留原本的降级逻辑）
  const isPerfDegraded = document.documentElement.classList.contains('perf-degraded');
  if (isPerfDegraded) {
    container.style.display = 'none';
    window._introHasPlayed = true;
    window.dispatchEvent(new Event('intro-complete'));
    return;
  }

  if (!window.gsap) {
    container.style.display = 'none';
    window._introHasPlayed = true;
    window.dispatchEvent(new Event('intro-complete'));
    return;
  }

  const gsap = window.gsap;

  const dot = document.getElementById('blue-dot');
  const stem = document.getElementById('i-stem');
  const n1 = document.getElementById('letter-n1');
  const n2 = document.getElementById('letter-n2');

  if (!dot || !stem || !n1 || !n2) {
    container.style.display = 'none';
    window._introHasPlayed = true;
    return;
  }

  // 3. 坐标准确计算
  const calculateCoordinates = () => {
    const dotWidth = dot.offsetWidth || 24;
    const offsetCorrection = dotWidth / 2;

    const stemX = stem.offsetLeft + stem.offsetWidth / 2 - offsetCorrection;
    const n1X = n1.offsetLeft + n1.offsetWidth / 2 - offsetCorrection;
    const n2X = n2.offsetLeft + n2.offsetWidth / 2 - offsetCorrection;

    const fontScale = parseFloat(window.getComputedStyle(n1).fontSize) / 128;
    const nY = n1.offsetTop + (20 * fontScale);
    const stemY = stem.offsetTop + (16 * fontScale);

    return { stemX, n1X, n2X, nY, stemY, fontScale };
  };

  let coords = calculateCoordinates();

  const handleResize = () => {
    coords = calculateCoordinates();
  };
  window.addEventListener('resize', handleResize, { passive: true });

  gsap.set([stem, n1, n2], { transformOrigin: "50% 100%" });
  gsap.set(dot, { transformOrigin: "50% 50%" });

  window._dotRot = 0;

  const tlInitial = gsap.timeline();

  // 阶段一：抛物线物理引擎
  tlInitial.set(dot, { x: coords.n1X, y: -400, opacity: 1 })
    .to(dot, { y: coords.nY, duration: 0.6, ease: "power2.in" });

  tlInitial.add("hit1")
    .to(n1, { scaleY: 0.55, scaleX: 1.2, duration: 0.1, ease: "power2.out" }, "hit1")
    .to(dot, { scaleY: 0.6, scaleX: 1.4, duration: 0.1, ease: "power2.out" }, "hit1")
    .add("launch1")
    .to(n1, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1.2, 0.3)" }, "launch1")
    .to(dot, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "power2.out" }, "launch1");

  let p1 = { p: 0 };
  tlInitial.to(p1, {
    p: 1, duration: 0.9, ease: "none",
    onUpdate: () => {
      const p = p1.p;
      const x = coords.n1X + (coords.n2X - coords.n1X) * p;
      const y = coords.nY - 180 * coords.fontScale * 4 * p * (1 - p);
      gsap.set(dot, { x: x, y: y, rotation: window._dotRot + 180 * p });
    },
    onComplete: () => { window._dotRot += 180; }
  }, "launch1");

  tlInitial.add("hit2", "launch1+=0.9")
    .to(n2, { scaleY: 0.55, scaleX: 1.2, duration: 0.1, ease: "power2.out" }, "hit2")
    .to(dot, { scaleY: 0.6, scaleX: 1.4, duration: 0.1, ease: "power2.out" }, "hit2")
    .add("launch2")
    .to(n2, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1.2, 0.3)" }, "launch2")
    .to(dot, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "power2.out" }, "launch2");

  let p2 = { p: 0 };
  tlInitial.to(p2, {
    p: 1, duration: 0.8, ease: "none",
    onUpdate: () => {
      const p = p2.p;
      const x = coords.n2X + (coords.stemX - coords.n2X) * p;
      const baseY = coords.nY + (coords.stemY - coords.nY) * p;
      const y = baseY - 150 * coords.fontScale * 4 * p * (1 - p);
      gsap.set(dot, { x: x, y: y, rotation: window._dotRot + 180 * p });
    },
    onComplete: () => { window._dotRot += 180; }
  }, "launch2");

  tlInitial.add("hit3", "launch2+=0.8")
    .to(stem, { scaleY: 0.65, scaleX: 1.15, duration: 0.1, ease: "power2.out" }, "hit3")
    .to(dot, { scaleY: 0.6, scaleX: 1.4, duration: 0.1, ease: "power2.out" }, "hit3")
    .add("launch3")
    .to(stem, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1.2, 0.3)" }, "launch3")
    .to(dot, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "power2.out" }, "launch3")
    .add(checkLoadStateLoop, "launch3");

  // 阶段二：等待加载重力微跳
  function checkLoadStateLoop() {
    if (window._isPageFullyLoaded && window._isEarthTexturesLoaded) {
      triggerExpand();
      return;
    }
    const loopTl = gsap.timeline();
    let pObj = { p: 0 };
    loopTl.to(pObj, {
      p: 1, duration: 0.45, ease: "none",
      onUpdate: () => {
        const p = pObj.p;
        const y = coords.stemY - 14 * coords.fontScale * 4 * p * (1 - p);
        gsap.set(dot, { y: y, rotation: window._dotRot + 90 * p });
      },
      onComplete: () => { window._dotRot += 90; }
    });
    loopTl.add("hit")
      .to(stem, { scaleY: 0.75, scaleX: 1.1, duration: 0.1, ease: "power2.out" }, "hit")
      .to(dot, { scaleY: 0.7, scaleX: 1.3, duration: 0.1, ease: "power2.out" }, "hit")
      .add("launch")
      .to(stem, { scaleY: 1, scaleX: 1, duration: 0.4, ease: "elastic.out(1.5, 0.4)" }, "launch")
      .to(dot, { scaleY: 1, scaleX: 1, duration: 0.25, ease: "power2.out" }, "launch")
      .add(checkLoadStateLoop, "launch");
  }

  // 阶段三：全屏非线性爆发吞噬
  function triggerExpand() {
    window.removeEventListener('resize', handleResize);
    const tlOut = gsap.timeline();
    const targetRot = Math.ceil(window._dotRot / 90) * 90;

    tlOut.to(dot, { rotation: targetRot, duration: 0.1, ease: "power2.out" })
      .to(dot, {
        scale: 450,
        borderRadius: "50%",
        duration: 1.6,
        ease: "expo.inOut"
      }, 0)
      .to(container, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          container.style.display = 'none';
          window._introHasPlayed = true;
          window.dispatchEvent(new Event('intro-complete'));
        }
      }, 0.8);
  }
}

if (typeof window !== 'undefined') {
  window._isPageFullyLoaded = window._isPageFullyLoaded || false;
  
  if (!window._introLoadTracked) {
    window._introLoadTracked = true;
    window.addEventListener('load', () => { window._isPageFullyLoaded = true; });

    setTimeout(() => {
      window._isPageFullyLoaded = true;
      window._isEarthTexturesLoaded = true;
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntroEngine);
  } else {
    initIntroEngine();
  }
  document.addEventListener('astro:page-load', initIntroEngine);
}