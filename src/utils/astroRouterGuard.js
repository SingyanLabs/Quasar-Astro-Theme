// src/utils/astroRouterGuard.js

if (typeof window !== 'undefined') {
  document.addEventListener('astro:before-preparation', (ev) => {
    // 1. 保存 Astro 原生的加载器
    const originalLoader = ev.loader;

    // 2. 正确劫持 loader 属性（不覆盖函数，保证路由生命周期不崩溃、地球不消失）
    ev.loader = async function () {
      // 先让 Astro 去后台抓取新页面的 HTML DOM 树
      await originalLoader();

      if (!ev.newDocument) return;

      // 3. 提前注入新页面中的组件级 <style> 样式
      const newStyles = Array.from(ev.newDocument.querySelectorAll('style'));
      newStyles.forEach((style) => {
        const exists = Array.from(document.head.querySelectorAll('style')).some(
          (s) => s.textContent === style.textContent
        );
        if (!exists) {
          document.head.appendChild(style.cloneNode(true));
        }
      });

      // 4. 针对未内联的外部 CSS 文件，使用 preload 阻塞等待
      const newLinks = Array.from(
        ev.newDocument.querySelectorAll('link[rel="stylesheet"]')
      );
      const linkPromises = newLinks.map((link) => {
        const href = link.getAttribute('href');
        if (!href || document.head.querySelector(`link[href="${href}"]`)) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const preloader = document.createElement('link');
          preloader.rel = 'preload';
          preloader.as = 'style';
          preloader.href = href;
          preloader.onload = resolve;
          preloader.onerror = resolve; // 容错放行
          document.head.appendChild(preloader);
        });
      });

      // 阻塞路由，直到所有的 CSS 网络请求就绪
      await Promise.all(linkPromises);

      // 5. 强制触发浏览器 CSSOM 计算重绘，消除 FOUC 黑色丑框
      window.getComputedStyle(document.body).color;
    };
  });
}

