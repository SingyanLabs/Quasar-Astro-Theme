// src/assets/scripts/notes-widget.js

export class NotesWidget extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('#notes-container');
    if (!this.container) return;

    this.items = Array.from(this.querySelectorAll('.note-item'));
    this.filterBtns = this.querySelectorAll('.filter-btn');

    this.bindEvents();
    this.checkJumpTarget();
  }

  resetFilterToAll = () => {
    this.filterBtns?.forEach((b) => b.classList.remove('active'));
    const allBtn = Array.from(this.filterBtns || []).find(b => b.dataset.filter === '全部');
    if (allBtn) allBtn.classList.add('active');

    this.items.forEach((item) => { item.style.display = 'block'; });
  };

  // 退出专注模式
  exitFocus = (updateHistory = true) => {
    if (!this.container) return;
    this.container.classList.remove('is-focus-mode');
    this.items.forEach((item) => {
      item.classList.remove('is-focused', 'hide-up', 'hide-down');
    });

    // 🌟 URL 恢复为干净的 /notes 路径，不触发刷新
    if (updateHistory && window.location.pathname !== '/notes') {
      history.pushState(null, '', '/notes');
    }
  };

  // 进入专注模式
  enterFocus = (targetItem, updateHistory = true) => {
    if (!this.container || !targetItem) return;

    if (targetItem.style.display === 'none') {
      this.resetFilterToAll();
    }

    this.container.classList.add('is-focus-mode');

    let isBelowTarget = false;
    const visibleItems = this.items.filter((item) => item.style.display !== 'none');

    visibleItems.forEach((item) => {
      item.classList.remove('is-focused', 'hide-up', 'hide-down');

      if (item === targetItem) {
        item.classList.add('is-focused');
        isBelowTarget = true;
      } else if (!isBelowTarget) {
        item.classList.add('hide-up');
      } else {
        item.classList.add('hide-down');
      }
    });

    // 🌟 核心：使用 HTML5 pushState 无感平滑更新 URL 为独立路径 /notes/xxx
    const noteId = targetItem.dataset.id || targetItem.dataset.title;
    if (updateHistory && noteId) {
      const targetPath = `/notes/${encodeURIComponent(noteId)}`;
      if (window.location.pathname !== targetPath) {
        history.pushState(null, '', targetPath);
      }
    }

    setTimeout(() => {
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  handleJump = (targetKey) => {
    if (!targetKey) return;
    const cleanKey = decodeURIComponent(targetKey).replace(/^\/notes\/?/, '').replace('#', '').trim();
    if (!cleanKey) return;

    let targetItem = this.items.find(item => {
      const id = item.dataset.id || '';
      const title = item.dataset.title || '';
      return id === cleanKey || title === cleanKey;
    });

    if (!targetItem) {
      targetItem = this.items.find(item => {
        const id = item.dataset.id || '';
        const title = item.dataset.title || '';
        return id.includes(cleanKey) || cleanKey.includes(id) || title.includes(cleanKey);
      });
    }

    if (targetItem) {
      this.enterFocus(targetItem, false);
    }
  };

  checkJumpTarget = () => {
    // 1. 优先检查 DOM 传入的 SSR 激活 Slug 或 SessionStorage
    const datasetSlug = this.getAttribute('data-active-slug');
    const pendingJumpKey = sessionStorage.getItem('quasar_jump_key') || datasetSlug;

    if (pendingJumpKey) {
      sessionStorage.removeItem('quasar_jump_key');
      setTimeout(() => this.handleJump(pendingJumpKey), 120);
      return;
    }

    // 2. 检查当前 URL Path (如 /notes/my-note)
    const pathname = window.location.pathname;
    if (pathname.startsWith('/notes/')) {
      const pathSlug = pathname.replace(/^\/notes\/?/, '');
      if (pathSlug) this.handleJump(pathSlug);
    }
  };

  bindEvents() {
    this.items.forEach((item) => {
      const trigger = item.querySelector('.item-trigger');
      const closeBtns = item.querySelectorAll('.js-close');

      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.classList.contains('is-focused')) {
          this.exitFocus(true);
        } else {
          this.enterFocus(item, true);
        }
      });

      closeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.exitFocus(true);
        });
      });
    });

    this.filterBtns?.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitFocus(true);

        this.filterBtns?.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        this.items.forEach((item) => {
          const cat = item.dataset.category;
          item.style.display = (filter === '全部' || cat === filter) ? 'block' : 'none';
        });
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.exitFocus(true);
    });

    // 🌟 监听浏览器后退/前进按钮，实现流畅的无缝展开/收起
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path.startsWith('/notes/')) {
        this.handleJump(path.replace(/^\/notes\/?/, ''));
      } else {
        this.exitFocus(false);
      }
    });

    window.removeEventListener('quasar:moment-jump', this.onSearchJump);
    window.addEventListener('quasar:moment-jump', this.onSearchJump);
  }

  onSearchJump = (e) => {
    const key = e.detail?.key || e.detail?.title;
    if (key) this.handleJump(key);
  };
}

if (!customElements.get('notes-widget')) {
  customElements.define('notes-widget', NotesWidget);
}
