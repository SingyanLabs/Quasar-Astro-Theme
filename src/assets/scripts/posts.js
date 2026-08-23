// src/assets/scripts/posts.js
const initPostsEngine = () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const postCards = document.querySelectorAll('.post-card');
  const isPerfDegraded = document.documentElement.classList.contains('perf-degraded');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedCategory = btn.dataset.category;
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      postCards.forEach((card) => {
        const cardCat = card.dataset.category;
        const shouldShow = (selectedCategory === 'All' || cardCat === selectedCategory);

        if (isPerfDegraded) {
          card.style.display = shouldShow ? 'block' : 'none';
          card.style.opacity = shouldShow ? '1' : '0';
        } else {
          if (shouldShow) {
            card.style.display = 'block';
            if (window.gsap) gsap.to(card, { opacity: 1, duration: 0.25 });
            else card.style.opacity = '1';
          } else {
            if (window.gsap) gsap.to(card, { opacity: 0, duration: 0.2, onComplete: () => card.style.display = 'none' });
            else card.style.display = 'none';
          }
        }
      });
    });
  });
};

document.addEventListener('astro:page-load', initPostsEngine);