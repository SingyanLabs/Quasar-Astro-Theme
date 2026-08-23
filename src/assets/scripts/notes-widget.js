// src/assets/scripts/notes-widget.js

export class NotesWidget extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('#notes-container');
    if (!this.container) return;

    this.items = Array.from(this.querySelectorAll('.note-item'));
    this.filterBtns = this.querySelectorAll('.filter-btn');

    this.bindEvents();
  }

  // 退出专注模式
  exitFocus = () => {
    if (!this.container) return;
    this.container.classList.remove('is-focus-mode');
    this.items.forEach((item) => {
      item.classList.remove('is-focused', 'hide-up', 'hide-down');
    });
  };

  // 进入专注模式
  enterFocus = (targetItem) => {
    if (!this.container) return;
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

    setTimeout(() => {
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // 绑定交互监听
  bindEvents() {
    // 1. 卡片展开与收起
    this.items.forEach((item) => {
      const trigger = item.querySelector('.item-trigger');
      const closeBtns = item.querySelectorAll('.js-close');

      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.classList.contains('is-focused')) {
          this.exitFocus();
        } else {
          this.enterFocus(item);
        }
      });

      closeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.exitFocus();
        });
      });
    });

    // 2. 分类按钮筛选
    this.filterBtns?.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitFocus();

        this.filterBtns?.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        this.items.forEach((item) => {
          const cat = item.dataset.category;
          if (filter === '全部' || cat === filter) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });

    // 3. 全局 ESC 键退出
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.exitFocus();
    });
  }
}

// 防御性注册 Web Component
if (!customElements.get('notes-widget')) {
  customElements.define('notes-widget', NotesWidget);
}