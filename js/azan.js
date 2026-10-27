// Full-screen prayer-time overlay + azan audio.
(function (w) {
  var audio = null;
  var timer = null;
  var active = false;

  function $(id) { return document.getElementById(id); }

  function pick(key) {
    var list = (w.MEDIA && w.MEDIA.azan) || [];
    var file = key === 'fajr' ? w.Store.get('azanFajr') : '';
    if (!file) { file = w.Store.get('azanFile'); }
    if (file && list.indexOf(file) < 0) { file = ''; }
    return file || list[0] || '';
  }

  function stop() {
    if (!active) { return; }
    active = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try { audio.pause(); } catch (e) {}
      audio.removeAttribute('src');
      audio = null;
    }
    $('azan').className = 'hidden';
  }

  function trigger(key) {
    if (active) { return; }
    active = true;
    var name = w.Prayer.names[key];
    $('azanTitle').textContent = name.en + ' Prayer';
    $('azanAr').textContent = 'صلاة ' + name.ar;
    $('azan').className = 'show';

    var file = pick(key);
    var fallback = function () {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(stop, 30000);
    };

    if (!file) { fallback(); return; }

    audio = new Audio();
    audio.volume = Math.max(0, Math.min(1, w.Store.get('azanVolume') / 100));
    audio.onended = stop;
    audio.onerror = fallback;
    audio.src = encodeURI(file);
    var p = audio.play();
    if (p && p.catch) { p.catch(fallback); }
    // Safety net: never stay up longer than 15 minutes.
    timer = setTimeout(stop, 15 * 60 * 1000);
  }

  w.Azan = {
    trigger: trigger,
    stop: stop,
    isActive: function () { return active; }
  };
})(window);
