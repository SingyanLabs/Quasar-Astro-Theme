import { copyToClipboard } from '../../utils/clipboard';

export const initFriendsPage = () => {
  // 🌟 0. 客户端每次加载时随机打乱友链卡片（保持申请友链卡片固定在最后）
  const grid = document.querySelector('.friends-grid');
  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.friend-card:not(.exchange-card)'));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    const exchangeCard = grid.querySelector('.exchange-card');
    cards.forEach(card => grid.insertBefore(card, exchangeCard));
  }

  // 1. 温和前往提醒 Modal 交互
  const modal = document.getElementById('gentle-nav-modal');
  const backdrop = document.getElementById('gentle-backdrop');
  const nameEl = document.getElementById('gentle-target-name');
  const urlEl = document.getElementById('gentle-target-url');
  const cancelBtn = document.getElementById('gentle-cancel-btn');
  const goBtn = document.getElementById('gentle-go-btn');
  const toast = document.getElementById('copy-toast');
  
  let currentUrl = '';

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;

  if (goBtn) {
    goBtn.onclick = () => {
      if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
      closeModal();
    };
  }

  document.querySelectorAll('.friend-card-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link;
      const name = target.dataset.friendName || '目标站点';
      const url = target.href;

      currentUrl = url;
      if (nameEl) nameEl.textContent = name;
      if (urlEl) urlEl.textContent = url;
      if (modal) modal.classList.add('active');
    });
  });

  // 2. 本站信息点击复制
  document.querySelectorAll('.info-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const val = item.dataset.copyVal;
      if (val) {
        const success = await copyToClipboard(val);
        if (success && toast) {
          toast.textContent = `已复制: ${val}`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
      }
    });
  });
};