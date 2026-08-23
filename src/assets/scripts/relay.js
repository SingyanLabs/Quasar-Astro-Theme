export const initFastRelay = () => {
  const scriptEl = document.querySelector('script[data-type]');
  const type = scriptEl?.dataset.type;
  const jsUrl = scriptEl?.dataset.js;
  const targetUrl = scriptEl?.dataset.target || 'https://www.travellings.cn/go.html';

  // 1. HTML 模式直接快速跳转
  if (type === 'html' || !jsUrl) {
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 800);
    return;
  }

  // 2. JS 模式非阻塞异步加载
  const tag = document.createElement('script');
  tag.src = jsUrl;
  tag.async = true;
  document.body.appendChild(tag);

  // 3. 兜底保护，防止 JS 加载失败死锁
  setTimeout(() => {
    if (window.location.pathname === '/relay') {
      window.location.replace(targetUrl);
    }
  }, 1000);
};