// src/assets/scripts/relay.js

export const initFastRelay = () => {
  const configEl = document.getElementById('relay-config');
  const jsUrl = configEl?.dataset.js;
  const targetUrl = configEl?.dataset.target || 'https://www.travellings.cn/go.html';

  // 纯粹通过引用的外部 JS 文件来进行跳转和处理
  if (jsUrl) {
    const tag = document.createElement('script');
    tag.src = jsUrl;
    tag.async = true;
    document.body.appendChild(tag);
  } else {
    // 如果配置文件里没有写 jsUrl，则直接用 targetUrl 兜底跳转
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 800);
  }
};