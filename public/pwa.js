(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (error) {
      console.error('[pwa] Không thể đăng ký service worker:', error);
    });
  });
})();
