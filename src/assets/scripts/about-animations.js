// src/assets/js/about-animations.js
document.addEventListener('astro:page-load', () => {
  const viewport = document.getElementById('about-viewport');
  if (!viewport || !window.gsap) return;

  viewport.classList.remove('opacity-0');

  // 🔑 动态绑定 Draggable 函数：销毁旧实例并创建新实例
  function initCardDraggable() {
    if (!window.Draggable) return;
    gsap.registerPlugin(Draggable);

    // 清理可能残余的拖拽实例
    const existing = Draggable.get(".mosaic-drag-card");
    if (existing) {
      if (Array.isArray(existing)) existing.forEach(d => d.kill());
      else existing.kill();
    }

    // 重新绑定拖拽
    Draggable.create(".mosaic-drag-card", {
      type: "x,y",
      edgeResistance: 0.65,
      zIndexBoost: true,
      onPress() {
        gsap.to(this.target, { scale: 1.08, zIndex: 50, duration: 0.15 });
      },
      onRelease() {
        gsap.to(this.target, { scale: 1, duration: 0.15 });
      }
    });
  }

  let currentStage = 0;
  const stages = [
    document.getElementById('stage-capabilities'),
    document.getElementById('stage-mosaic'),
    document.getElementById('stage-deepdive'),
    document.getElementById('stage-retirement'),
    document.getElementById('stage-techstack'),
    document.getElementById('stage-contact')
  ];
  
  const dockMobileTrigger = document.getElementById('dock-mobile-trigger');
  const dockPopoverMenu = document.getElementById('dock-popover-menu');
  const dockTriggerText = document.getElementById('dock-trigger-text');
  const allDockButtons = document.querySelectorAll('.dock-btn, .dock-popover-item');

  // 📱 移动端：点击胶囊开关上方弹出菜单
  if (dockMobileTrigger && dockPopoverMenu) {
    dockMobileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dockPopoverMenu.classList.toggle('is-open');
      dockMobileTrigger.classList.toggle('is-active');
    });

    document.addEventListener('click', (e) => {
      if (!dockPopoverMenu.contains(e.target) && !dockMobileTrigger.contains(e.target)) {
        dockPopoverMenu.classList.remove('is-open');
        dockMobileTrigger.classList.remove('is-active');
      }
    });
  }

  // 📱 移动端触底切页 (避开拖拽卡片)
  let touchStartY = 0;
  let isLockingStageSwitch = false;

  stages.forEach((stage) => {
    const stageInner = stage?.querySelector('.stage-inner');
    if (!stageInner) return;

    stageInner.addEventListener('touchstart', (e) => {
      if (e.target.closest('.mosaic-drag-card')) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    stageInner.addEventListener('touchend', (e) => {
      if (window.innerWidth > 768 || isLockingStageSwitch) return;
      if (e.target.closest('.mosaic-drag-card')) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      const isAtBottom = stageInner.scrollTop + stageInner.clientHeight >= stageInner.scrollHeight - 12;
      const isAtTop = stageInner.scrollTop <= 4;

      if (deltaY > 45 && isAtBottom && currentStage < stages.length - 1) {
        isLockingStageSwitch = true;
        switchStage(currentStage + 1);
        setTimeout(() => { isLockingStageSwitch = false; }, 700);
      } 
      else if (deltaY < -45 && isAtTop && currentStage > 0) {
        isLockingStageSwitch = true;
        switchStage(currentStage - 1);
        setTimeout(() => { isLockingStageSwitch = false; }, 700);
      }
    }, { passive: true });
  });

  // 倒计时逻辑
  const retirementSection = document.getElementById('stage-retirement');
  const targetDateStr = retirementSection?.dataset.targetDate;
  const startDateStr = retirementSection?.dataset.startDate;
  
  if(targetDateStr && startDateStr) {
    const targetDate = new Date(targetDateStr);
    const startDate = new Date(startDateStr); 
    const totalTimeSpan = targetDate - startDate;

    function setFlapDigitWithAnimation(cardId, newValue) {
      const card = document.getElementById(cardId);
      if (!card) return;
      const topInner = card.querySelector('.top .digit-inner');
      const bottomInner = card.querySelector('.bottom .digit-inner');

      if (topInner.textContent === newValue) return;

      gsap.killTweensOf(card);
      topInner.textContent = newValue;
      bottomInner.textContent = newValue;
      
      gsap.fromTo(card, 
        { rotationX: 45, transformOrigin: "center top" }, 
        { rotationX: 0, duration: 0.28, ease: "back.out(3.5)", clearProps: "transform" }
      );
    }

    function updateCountdown() {
      const now = new Date();
      const diffTime = targetDate - now;
      if (diffTime <= 0) return;

      let years = targetDate.getFullYear() - now.getFullYear();
      let months = targetDate.getMonth() - now.getMonth();
      let days = targetDate.getDate() - now.getDate();

      if (days < 0) {
        months -= 1;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const rHours = String(23 - now.getHours()).padStart(2, '0');
      const rMinutes = String(59 - now.getMinutes()).padStart(2, '0');
      const rSeconds = String(59 - now.getSeconds()).padStart(2, '0');

      const yEl = document.getElementById('val-year');
      const mEl = document.getElementById('val-month');
      const dEl = document.getElementById('val-day');
      if (yEl) yEl.textContent = String(years).padStart(2, '0');
      if (mEl) mEl.textContent = String(months).padStart(2, '0');
      if (dEl) dEl.textContent = String(days).padStart(2, '0');

      setFlapDigitWithAnimation('card-h1', rHours[0]);
      setFlapDigitWithAnimation('card-h2', rHours[1]);
      setFlapDigitWithAnimation('card-m1', rMinutes[0]);
      setFlapDigitWithAnimation('card-m2', rMinutes[1]);
      setFlapDigitWithAnimation('card-s1', rSeconds[0]);
      setFlapDigitWithAnimation('card-s2', rSeconds[1]);
    }

    function renderHighPrecisionProgress() {
      const now = new Date();
      const elapsedTime = now - startDate;
      let currentPercent = (elapsedTime / totalTimeSpan) * 100;
      
      if (currentPercent > 100) currentPercent = 100;
      if (currentPercent < 0) currentPercent = 0;

      const progressText = document.getElementById('progress-text');
      const progressBarFill = document.getElementById('progress-bar-fill');

      if (progressText) progressText.textContent = currentPercent.toFixed(6) + '%';
      if (progressBarFill) progressBarFill.style.width = currentPercent + '%';

      if (document.getElementById('about-viewport')) {
        window._aboutProgressRaf = requestAnimationFrame(renderHighPrecisionProgress);
      }
    }

    if (window._aboutCountdownTimer) clearInterval(window._aboutCountdownTimer);
    if (window._aboutProgressRaf) cancelAnimationFrame(window._aboutProgressRaf);

    window._aboutCountdownTimer = setInterval(updateCountdown, 1000);
    updateCountdown();
    renderHighPrecisionProgress();
  }

  function switchStage(targetIndex) {
    if (targetIndex === currentStage) return;
    const outboundSection = stages[currentStage];
    const inboundSection = stages[targetIndex];

    allDockButtons.forEach(btn => {
      const idx = parseInt(btn.dataset.index, 10);
      const isActive = idx === targetIndex;
      btn.classList.toggle('active', isActive);

      if (isActive && dockTriggerText && btn.dataset.label) {
        dockTriggerText.textContent = `${targetIndex + 1} / 6 · ${btn.dataset.label}`;
      }
    });

    if (dockPopoverMenu) dockPopoverMenu.classList.remove('is-open');
    if (dockMobileTrigger) dockMobileTrigger.classList.remove('is-active');

    if (inboundSection) {
      const inner = inboundSection.querySelector('.stage-inner');
      if (inner) inner.scrollTop = 0;
    }

    const transitionTimeline = gsap.timeline();

    if (currentStage === 0) {
      transitionTimeline.to([".anim-s1-avatar", ".anim-s1-title", ".anim-s1-card", ".anim-s1-claim"], { opacity: 0, y: -25, stagger: 0.02, duration: 0.25, ease: "power3.in" });
    } else if (currentStage === 1) {
      transitionTimeline.to(".mosaic-content-holder", { opacity: 0, y: -15, duration: 0.2 })
                        .to(".mosaic-drag-card", { opacity: 0, scale: 0.8, y: -20, stagger: 0.02, duration: 0.2, ease: "power3.in" }, "-=0.15");
    } else if (currentStage === 2) {
      transitionTimeline.to(".pillar-glass-block", { opacity: 0, y: -20, stagger: 0.02, duration: 0.2, ease: "power3.in" })
                        .to(".deepdive-content-holder, .spotlight-container", { opacity: 0, duration: 0.2 }, "-=0.15");
    } else if (currentStage === 3) {
      transitionTimeline.to([".anim-s4-title-fade", ".anim-s4-card-unit"], { opacity: 0, duration: 0.2, ease: "power2.in" });
    } else if (currentStage === 4) {
      transitionTimeline.to([".anim-s5-title-fade", ".tech-tree-wrapper", ".anim-s5-card-item"], { opacity: 0, duration: 0.2, ease: "power2.in" });
    } else if (currentStage === 5) {
      transitionTimeline.to(".contact-content-holder", { opacity: 0, y: -15, duration: 0.2 })
                        .to([".anim-s6-card", ".anim-s6-reward"], { opacity: 0, duration: 0.2 }, "-=0.15");
    }

    transitionTimeline.add(() => {
      if (outboundSection) outboundSection.classList.remove('active');
      gsap.set(outboundSection, { clearProps: "all" });
      if (inboundSection) inboundSection.classList.add('active');
    });

    if (targetIndex === 0) {
      transitionTimeline.fromTo(".anim-s1-avatar", { opacity: 0, scale: 0.5, y: 25 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" })
                        .fromTo(".anim-s1-title", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, "-=0.3")
                        .fromTo(".anim-s1-card", { opacity: 0, y: 25, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 0.5, ease: "back.out(1.3)" }, "-=0.25")
                        .fromTo(".anim-s1-claim", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, "-=0.2");
    } 
    else if (targetIndex === 1) {
      transitionTimeline.fromTo(".mosaic-content-holder", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" })
                        .fromTo(".mosaic-drag-card", { opacity: 0, scale: 0.85, y: 25, rotation: 0 }, { 
                          opacity: 1, 
                          scale: 1, 
                          y: 0, 
                          rotation: (i, t) => parseFloat(t.getAttribute('data-rot')) || 0, 
                          stagger: 0.03, 
                          duration: 0.55, 
                          ease: "back.out(1.2)",
                          onComplete: initCardDraggable // 🔑 进场动画完成后绑定拖拽！
                        }, "-=0.25");
    } 
    else if (targetIndex === 2) {
      transitionTimeline.fromTo(".spotlight-container", { opacity: 0 }, { opacity: 1, duration: 0.2 })
                        .fromTo("#spotlight-1", { x: 0, scale: 0.7 }, { x: -window.innerWidth * 0.28, scale: 1, duration: 0.6, ease: "power3.out" }, "-=0.2")
                        .fromTo("#spotlight-3", { x: 0, scale: 0.7 }, { x: window.innerWidth * 0.28, scale: 1, duration: 0.6, ease: "power3.out" }, "-=0.6")
                        .fromTo(".spotlight", { opacity: 0 }, { opacity: 0.45, stagger: 0.03, duration: 0.4, ease: "power2.out" }, "-=0.4")
                        .fromTo(".deepdive-content-holder", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, "-=0.3")
                        .fromTo(".pillar-glass-block", { opacity: 0, y: 25, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 0.5, ease: "back.out(1.2)" }, "-=0.2");
    }
    else if (targetIndex === 3) {
      transitionTimeline.fromTo(".anim-s4-title-fade", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" })
                        .fromTo(".anim-s4-card-unit", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", clearProps: "all" }, "-=0.25");
    }
    else if (targetIndex === 4) {
      transitionTimeline.add(() => {
        gsap.set(".tech-tree-wrapper", { opacity: 1 });
        gsap.set(["#tech-path-left", "#tech-path-right"], { strokeDasharray: 260, strokeDashoffset: 260, opacity: 1 });
        gsap.set("#tech-main-dot", { scale: 0, opacity: 0 });
        gsap.set(".anim-s5-card-item", { opacity: 0, y: 10 });
      })
      .fromTo(".anim-s5-title-fade", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" })
      .fromTo("#tech-main-dot", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, "-=0.15")
      .fromTo("#tech-path-left", { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, "-=0.05")
      .fromTo("#tech-path-right", { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, "<")
      .fromTo(".anim-s5-card-item", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", clearProps: "all" }, "-=0.2");
    }
    else if (targetIndex === 5) {
      transitionTimeline.fromTo(".contact-content-holder", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" })
                        .fromTo([".anim-s6-card", ".anim-s6-reward"], { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, "-=0.25");
    }

    currentStage = targetIndex;
  }

  // 绑死菜单点击
  allDockButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchStage(parseInt(e.currentTarget.dataset.target, 10));
    });
  });

  // 🔑 页面首次初始化：若默认在马赛克板块，立即初始化一次拖拽
  if (currentStage === 1) {
    initCardDraggable();
  }
});
