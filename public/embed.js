(function () {
  var scripts = document.querySelectorAll('script[data-globe]');
  scripts.forEach(function (script) {
    if (script.dataset.loaded) return;
    script.dataset.loaded = 'true';
    var globeId = script.dataset.globe;
    if (!globeId || !/^[A-Za-z0-9_-]{4,32}$/.test(globeId)) return;
    var container =
      document.getElementById('globeify-' + globeId) || script.parentElement;
    if (!container) return;
    var origin = script.dataset.origin;
    if (!origin) {
      try {
        origin = new URL(script.src).origin;
      } catch (e) {
        origin = 'https://globeify.web.app';
      }
    }
    var iframe = document.createElement('iframe');
    iframe.src = origin + '/embed/' + globeId;
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Interactive globe');
    var h = script.dataset.height;
    var cssHeight = '600px';
    if (h) {
      cssHeight = isFinite(+h) ? h + 'px' : h;
    }
    iframe.style.cssText =
      'width:100%;height:' + cssHeight + ';border:0;border-radius:8px;display:block;';
    container.appendChild(iframe);
  });
})();
