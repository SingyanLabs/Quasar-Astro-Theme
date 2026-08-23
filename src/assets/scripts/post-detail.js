// src/assets/scripts/post-detail.js
const initPostDetailEngine = () => {
  // --- 1. 文章目录自动高亮 ---
  const tocLinks = document.querySelectorAll('.toc-item');
  const headings = document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4');

  if (tocLinks.length && headings.length) {
    // 点击平滑滚动
    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href')?.substring(1);
        if (!targetId) return;

        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          const isPerfDegraded = document.documentElement.classList.contains('perf-degraded');
          targetElement.scrollIntoView({ behavior: isPerfDegraded ? 'auto' : 'smooth' });
          history.pushState(null, '', `#${targetId}`);
        }
      });
    });

    // 🌟 将 ID 映射为数组（同时收集桌面端与移动端两套目录节点）
    const idToLinksMap = {};
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const id = href.substring(1);
        if (!idToLinksMap[id]) idToLinksMap[id] = [];
        idToLinksMap[id].push(link);
      }
    });

    // IntersectionObserver 滚动监听
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id && idToLinksMap[id]) {
            // 清除所有目录链接的高亮
            tocLinks.forEach((l) => l.classList.remove('active'));
            // 同时激活桌面端与移动端对应的目录节点
            idToLinksMap[id].forEach((l) => l.classList.add('active'));
          }
        }
      });
    }, { root: null, rootMargin: '-80px 0px -60% 0px', threshold: 0 });

    headings.forEach((heading) => { if (heading.id) observer.observe(heading); });
  }

  // --- 2. 结合全局 Lightbox 懒加载与灯箱放大 ---
  const mdImages = document.querySelectorAll('.markdown-body img');
  if (mdImages.length > 0) {
    const lightboxItems = Array.from(mdImages).map(img => ({
      src: img.src,
      previewSrc: img.src,
      title: img.alt || '文章配图'
    }));
    
    mdImages.forEach((img, index) => {
      img.style.cursor = 'zoom-in';
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
      
      img.onclick = (e) => {
        if (window.openLightbox) window.openLightbox(lightboxItems, index, {}, e.target);
      };
    });
  }

  // --- 3. 📱 移动端目录弹窗抽屉 (Drawer Modal) 控制 ---
  const tocBtn = document.getElementById('mobile-toc-btn');
  const drawer = document.getElementById('mobile-toc-drawer');
  const backdrop = document.getElementById('mobile-drawer-close-area');
  const closeBtn = document.getElementById('mobile-drawer-close-btn');

  const openDrawer = () => { if (drawer) drawer.classList.add('active'); };
  const closeDrawer = () => { if (drawer) drawer.classList.remove('active'); };

  if (tocBtn) tocBtn.onclick = openDrawer;
  if (backdrop) backdrop.onclick = closeDrawer;
  if (closeBtn) closeBtn.onclick = closeDrawer;

  if (drawer) {
    const drawerLinks = drawer.querySelectorAll('.toc-item, .recent-item-link');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
  }
};

document.addEventListener('astro:page-load', initPostDetailEngine);