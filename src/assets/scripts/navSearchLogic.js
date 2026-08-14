// src/assets/scripts/navSearchLogic.js

const initNavSearch = () => {
  const navbarMain = document.getElementById('quasar-navbar-element');
  const searchToggleBtn = document.getElementById('search-trigger-btn');
  const centerSearchBar = document.getElementById('nav-center-search-bar');
  const searchInput = document.getElementById('center-search-input');
  const clearBtn = document.getElementById('search-clear-btn');

  const overlay = document.getElementById('search-modal-overlay');
  const backdrop = document.getElementById('search-modal-backdrop');
  const closeChip = document.getElementById('modal-close-chip');
  const resultsList = document.getElementById('modal-results-list');
  const dataStore = document.getElementById('full-search-data-store');
  const queryLabel = document.getElementById('modal-query-label');

  if (!centerSearchBar || !searchInput || !overlay || !dataStore) return;

  // 防重复绑定（防止路由切换时多次绑定事件）
  if (centerSearchBar.dataset.searchInited === 'true') return;
  centerSearchBar.dataset.searchInited = 'true';

  // 确保模态框挂载在最外层防御层叠上下文问题
  if (overlay.parentElement !== document.body) {
    document.body.appendChild(overlay);
  }

  let searchIndex = [];
  try {
    searchIndex = JSON.parse(dataStore.dataset.json || '[]');
    
    // ⚡ 核心 404 修复：在客户端完美还原 Astro 的静态路由 Slug 编码规则
    const formatAstroSlug = (str) => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-') // 1. 空格和下划线转连字符
        .replace(/[^\w\-\u4e00-\u9fa5]/g, '') // 2. 移除中英文数字及连字符以外的特殊符号 (如 ()_#@?)
        .replace(/\-\-+/g, '-') // 3. 多个连字符合并为一个
        .replace(/^-+|-+$/g, ''); // 4. 去除首尾的多余连字符
    };

    // 将解析出的错误 URL 强行扭转为 Astro 规范 URL
    searchIndex = searchIndex.map(item => {
      if (item.url && item.url.startsWith('/posts/')) {
        const urlObj = new URL(item.url, window.location.origin);
        const pathSegments = urlObj.pathname.split('/');
        
        // 抓取最后一段（例如 %E6%96%87%E7%AB%A0%20(Post)... ）进行还原和 Slug 化
        const rawSlug = decodeURIComponent(pathSegments.pop() || '');
        pathSegments.push(formatAstroSlug(rawSlug));
        
        urlObj.pathname = pathSegments.join('/');
        item.url = urlObj.pathname + urlObj.hash;
      }
      return item;
    });

  } catch (e) {
    console.error('搜索索引解析失败:', e);
    searchIndex = [];
  }

  let isSearchActive = false;
  let isModalOpen = false;
  let activeIndex = -1;

  const checkDegraded = () => document.documentElement.classList.contains('perf-degraded');

  const expandCenterSearch = () => {
    isSearchActive = true;
    centerSearchBar.classList.add('active');
    if (searchToggleBtn) searchToggleBtn.classList.add('is-active');
    if (navbarMain) navbarMain.classList.add('search-active');
    setTimeout(() => searchInput.focus(), 60);
  };

  const collapseCenterSearch = () => {
    isSearchActive = false;
    searchInput.value = '';
    centerSearchBar.classList.remove('active');
    if (clearBtn) clearBtn.classList.remove('visible');
    if (searchToggleBtn) searchToggleBtn.classList.remove('is-active');
    if (navbarMain) navbarMain.classList.remove('search-active');
    closeModal();
  };

  // 移动端 Navbar 右侧原生关闭按钮核心逻辑
  if (searchToggleBtn) {
    searchToggleBtn.onclick = (e) => {
      e.stopPropagation();
      if (isSearchActive) {
        if (searchInput.value.trim() !== '') {
          searchInput.value = '';
          renderResults('');
          if (clearBtn) clearBtn.classList.remove('visible');
          searchInput.focus();
        } else {
          collapseCenterSearch();
        }
      } else {
        expandCenterSearch();
      }
    };
  }

  const openModal = () => {
    if (isModalOpen) return;
    isModalOpen = true;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    const dur = checkDegraded() ? 0.05 : 0.22;
    if (window.gsap && !checkDegraded()) {
      gsap.fromTo(overlay.querySelector('.search-modal-container'), 
        { opacity: 0, scale: 0.96, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: dur, ease: 'power3.out', force3D: true }
      );
    }
  };

  const closeModal = () => {
    if (!isModalOpen) return;
    isModalOpen = false;
    const dur = checkDegraded() ? 0.05 : 0.16;

    if (window.gsap && !checkDegraded()) {
      gsap.to(overlay.querySelector('.search-modal-container'), {
        opacity: 0,
        scale: 0.96,
        y: -6,
        duration: dur,
        ease: 'power2.in',
        onComplete: () => {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
        }
      });
    } else {
      overlay.classList.remove('active');
    }
  };

  if (backdrop) backdrop.onclick = collapseCenterSearch;
  if (closeChip) closeChip.onclick = collapseCenterSearch;

  const makeSnippet = (text, keyword) => {
    if (!text) return '';
    const strText = String(text);
    const lowerText = strText.toLowerCase();
    const lowerKey = String(keyword).toLowerCase();
    const matchPos = lowerText.indexOf(lowerKey);

    if (matchPos === -1) return strText.length > 70 ? strText.slice(0, 70) + '...' : strText;

    const start = Math.max(0, matchPos - 25);
    const end = Math.min(strText.length, matchPos + keyword.length + 45);
    let snippet = strText.slice(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < strText.length) snippet = snippet + '...';

    return snippet;
  };

  const renderResults = (query) => {
    resultsList.innerHTML = '';
    activeIndex = -1;

    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      if (clearBtn) clearBtn.classList.remove('visible');
      closeModal();
      return;
    }

    if (clearBtn) clearBtn.classList.add('visible');
    openModal();

    if (queryLabel) queryLabel.innerText = `“${query}” 的检索结果`;

    // ⚡ 罢工修复：加入了防御性代码 String() 和空值判断，防止 Frontmatter 不规范时导致输入字符直接崩溃
    const matches = searchIndex.filter(item => {
      if (!item) return false;
      const titleHit = String(item.title || '').toLowerCase().includes(trimmed);
      const tagHit = Array.isArray(item.tags) && item.tags.some(t => String(t || '').toLowerCase().includes(trimmed));
      const descHit = String(item.description || '').toLowerCase().includes(trimmed);
      const contentHit = String(item.content || '').toLowerCase().includes(trimmed);
      
      return titleHit || tagHit || descHit || contentHit;
    });

    if (matches.length === 0) {
      resultsList.innerHTML = `<li class="modal-empty-state">未找到包含 “${query}” 的相关内容</li>`;
    } else {
      matches.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'modal-result-item';
        li.dataset.index = idx.toString();

        const snippetText = makeSnippet(item.content || item.description, trimmed);

        li.innerHTML = `
          <a href="${item.url}" class="result-card-link">
            <div class="result-card-header">
              <span class="result-card-title">${item.title}</span>
              <span class="result-card-badge badge-${item.type}">${item.type}</span>
            </div>
            ${snippetText ? `<div class="result-card-snippet">${snippetText}</div>` : ''}
          </a>
        `;

        const link = li.querySelector('.result-card-link');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            try {
              const targetUrl = new URL(item.url, window.location.origin);
              const targetPath = targetUrl.pathname.replace(/\/+$/, '') || '/';
              const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
              const hashKey = decodeURIComponent(targetUrl.hash.replace('#', '')) || item.title || item.rawId;

              sessionStorage.setItem('quasar_jump_key', hashKey);
              sessionStorage.setItem('quasar_jump_title', item.title);

              collapseCenterSearch();

              if (targetPath === currentPath) {
                window.location.hash = '#' + encodeURIComponent(hashKey);
                window.dispatchEvent(new CustomEvent('quasar:play-song', { detail: { key: hashKey, title: item.title } }));
                window.dispatchEvent(new CustomEvent('quasar:moment-jump', { detail: { key: hashKey, title: item.title } }));
              } else {
                window.Astro && window.Astro.navigate ? window.Astro.navigate(item.url) : window.location.href = item.url;
              }
            } catch (err) {
              window.location.href = item.url; // 降级处理，保证依然能点过去
            }
          });
        }

        li.addEventListener('mouseenter', () => setActiveIndex(idx));
        resultsList.appendChild(li);
      });

      if (window.gsap && !checkDegraded()) {
        gsap.fromTo(resultsList.querySelectorAll('.modal-result-item'), 
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.2, stagger: 0.025, ease: 'power2.out', force3D: true }
        );
      }
    }
  };

  const setActiveIndex = (index) => {
    const items = resultsList.querySelectorAll('.modal-result-item');
    if (!items.length) return;
    
    items.forEach(item => item.classList.remove('selected'));
    
    if (index >= 0 && index < items.length) {
      activeIndex = index;
      const selected = items[activeIndex];
      selected.classList.add('selected');
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      activeIndex = -1;
    }
  };

  searchInput.oninput = (e) => renderResults(e.target.value);

  // 桌面端框内清空按钮
  if (clearBtn) {
    const handleClear = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      searchInput.value = '';
      renderResults('');
      searchInput.focus();
    };
    clearBtn.addEventListener('click', handleClear);
    clearBtn.addEventListener('touchstart', handleClear, { passive: false });
    clearBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
  }

  window.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isSearchActive ? collapseCenterSearch() : expandCenterSearch();
      return;
    }
    if (e.key === 'Escape' && isSearchActive) {
      e.preventDefault();
      collapseCenterSearch();
      return;
    }
    if (!isModalOpen) return;

    const items = resultsList.querySelectorAll('.modal-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActiveIndex(activeIndex + 1 < items.length ? activeIndex + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActiveIndex(activeIndex - 1 >= 0 ? activeIndex - 1 : items.length - 1);
    } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].querySelector('a')?.click();
    }
  };
};

// ⚡ 终极防死机挂载：同时监听 Astro 过渡和原生 DOM 事件，绝不错过初始化
document.addEventListener('astro:page-load', initNavSearch);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initNavSearch();
} else {
  document.addEventListener('DOMContentLoaded', initNavSearch);
}