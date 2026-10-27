// Main controller: clock, prayer bar, backgrounds, azan scheduling, remote keys.
(function (w) {
  var S = w.Store;
  var MEDIA = w.MEDIA || { backgrounds: [], memories: [], azan: [] };
  var body = document.body;
  function $(id) { return document.getElementById(id); }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var bgShow = new w.Slideshow($('bgLayers'));
  var memShow = new w.Slideshow($('frame'));
  memShow.onEmpty = function (empty) { $('frame').className = empty ? 'empty' : ''; };

  // ---------- helpers ----------
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function clock12(d) {
    var h = d.getHours();
    return { main: ((h % 12) || 12) + ':' + pad(d.getMinutes()), ampm: h < 12 ? 'AM' : 'PM' };
  }
  function clockText(d) {
    if (S.get('timeFormat') === 24) { return { main: pad(d.getHours()) + ':' + pad(d.getMinutes()), ampm: '' }; }
    return clock12(d);
  }

  // ---------- settings -> view ----------
  function applyTheme() {
    body.className = body.className.replace(/theme-\w+/g, '').replace(/\s+/g, ' ') + ' theme-' + S.get('theme');
    toggleClass('no-glass', !S.get('glass'));
    toggleClass('zoom', !!S.get('bgZoom'));
    toggleClass('no-memories', !S.get('memEnabled'));
    toggleClass('no-prayer', !S.get('prayerEnabled'));
    toggleClass('no-apps', !S.get('appsEnabled'));
  }
  function toggleClass(name, on) {
    var has = (' ' + body.className + ' ').indexOf(' ' + name + ' ') >= 0;
    if (on && !has) { body.className += ' ' + name; }
    if (!on && has) { body.className = body.className.replace(new RegExp('(^|\\s)' + name + '(?=\\s|$)', 'g'), ''); }
  }

  function applyBackground() {
    var mode = S.get('bgMode');
    var files = MEDIA.backgrounds || [];
    $('bgShade').style.opacity = S.get('bgDim') / 100;
    var blur = S.get('bgBlur');
    var layers = $('bgLayers');
    layers.style.webkitFilter = layers.style.filter = blur ? 'blur(' + blur + 'px)' : '';
    layers.className = blur ? 'blurred' : '';
    if (mode === 'color') {
      bgShow.configure([], false, 0);
    } else if (mode === 'single') {
      var one = S.get('bgSingle');
      if (files.indexOf(one) < 0) { one = files[0]; }
      bgShow.configure(one ? [one] : [], false, 0);
    } else {
      bgShow.configure(files, S.get('bgShuffle'), S.get('bgInterval'));
    }
  }

  function applyMemories() {
    $('caption').textContent = S.get('memTitle');
    memShow.configure(MEDIA.memories || [], S.get('memShuffle'), S.get('memInterval'));
  }

  // ---------- prayer data ----------
  var cache = { key: '', days: {} };

  function tzAt(date) {
    return S.get('tzMode') === 'manual' ? S.get('tzManual') : -date.getTimezoneOffset() / 60;
  }

  function prayerConfig(date) {
    var city = null, i;
    for (i = 0; i < w.CITIES.length; i++) { if (w.CITIES[i].id === S.get('city')) { city = w.CITIES[i]; } }
    var custom = S.get('city') === 'custom';
    return {
      lat: custom ? S.get('lat') : city.lat,
      lng: custom ? S.get('lng') : city.lng,
      tz: tzAt(date),
      shia: S.get('madhab') === 'shia',
      shiaMethod: S.get('shiaMethod'),
      sunniMethod: S.get('sunniMethod'),
      asr: S.get('asr'),
      adj: {
        fajr: S.get('adjFajr'), dhuhr: S.get('adjDhuhr'), asr: S.get('adjAsr'),
        maghrib: S.get('adjMaghrib'), isha: S.get('adjIsha')
      }
    };
  }

  function activeKeys() {
    return S.get('madhab') === 'shia' ? ['fajr', 'dhuhr', 'maghrib'] : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  }

  // Location calendar day for `now`, shifted by dayOffset days.
  function dayParts(now, dayOffset) {
    var tz = tzAt(now);
    var l = new Date(now.getTime() + tz * 3600000);
    var d = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() + dayOffset));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }

  function dayTimes(now, dayOffset) {
    var p = dayParts(now, dayOffset);
    var sig = JSON.stringify([S.get('madhab'), S.get('shiaMethod'), S.get('sunniMethod'), S.get('asr'), S.get('city'), S.get('lat'), S.get('lng'),
      S.get('tzMode'), S.get('tzManual'), S.get('adjFajr'), S.get('adjDhuhr'), S.get('adjAsr'), S.get('adjMaghrib'), S.get('adjIsha'), tzAt(now)]);
    if (cache.key !== sig) { cache = { key: sig, days: {} }; }
    var dk = p.y + '-' + p.m + '-' + p.d;
    if (!cache.days[dk]) { cache.days[dk] = w.Prayer.forDay(p.y, p.m, p.d, prayerConfig(now)); }
    return cache.days[dk];
  }

  // ---------- prayer bar ----------
  var lastBarKey = '';
  var nextPrayer = null;

  function renderBar(now) {
    if (!S.get('prayerEnabled')) { return; }
    var keys = activeKeys();
    var today = dayTimes(now, 0);
    nextPrayer = null;
    var i, key;
    for (var off = 0; off < 2 && !nextPrayer; off++) {
      var t = dayTimes(now, off);
      for (i = 0; i < keys.length; i++) {
        if (t[keys[i]].getTime() > now.getTime()) { nextPrayer = { key: keys[i], date: t[keys[i]] }; break; }
      }
    }
    var sig = [S.get('madhab'), S.get('timeFormat'), nextPrayer && nextPrayer.key, today.fajr.getTime(), cache.key].join('|');
    if (sig === lastBarKey) { return; }
    lastBarKey = sig;

    var html = '';
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      var d = today[key];
      var ct = clockText(d);
      var cls = 'p' + (nextPrayer && nextPrayer.key === key && nextPrayer.date === d ? ' next' : '') + (d.getTime() <= now.getTime() ? ' past' : '');
      if (nextPrayer && nextPrayer.date !== d && nextPrayer.key === key) { cls = 'p next'; } // tomorrow's Fajr
      html += '<div class="' + cls + '"><div class="pn">' + w.Prayer.names[key].en + '<span class="par">' + w.Prayer.names[key].ar +
        '</span></div><div class="pt">' + ct.main + (ct.ampm ? '<small>' + ct.ampm + '</small>' : '') + '</div></div>';
    }
    $('prayers').innerHTML = html;
    $('nextLabel').textContent = nextPrayer ? 'Next · ' + w.Prayer.names[nextPrayer.key].en : 'Next';
  }

  function renderCountdown(now) {
    if (!nextPrayer || !S.get('prayerEnabled')) { return; }
    var s = Math.max(0, Math.round((nextPrayer.date.getTime() - now.getTime()) / 1000));
    $('nextCount').textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }

  var lastHijriKey = '';
  function renderHijri(now) {
    if (!S.get('prayerEnabled')) { return; }
    var p = dayParts(now, 0);
    var shift = S.get('hijriOffset');
    if (S.get('hijriAtMaghrib') && now.getTime() >= dayTimes(now, 0).maghrib.getTime()) { shift += 1; }
    var key = p.y + '-' + p.m + '-' + p.d + '|' + shift;
    if (key === lastHijriKey) { return; }
    lastHijriKey = key;
    var h = w.Hijri.convert(p.y, p.m, p.d, shift);
    $('hijriAr').textContent = h.ar;
    $('hijriEn').textContent = h.en;
  }

  // ---------- azan trigger ----------
  var fired = {};
  function checkAzan(now) {
    if (!S.get('prayerEnabled') || !S.get('azanOn') || w.Azan.isActive()) { return; }
    var today = dayTimes(now, 0);
    var keys = activeKeys();
    var dk = dayParts(now, 0).d;
    for (var i = 0; i < keys.length; i++) {
      var t = today[keys[i]].getTime();
      var tag = dk + keys[i] + t;
      if (now.getTime() >= t && now.getTime() - t < 90000 && !fired[tag]) {
        fired[tag] = true;
        w.SettingsUI.close();
        w.Azan.trigger(keys[i]);
        return;
      }
    }
  }

  // ---------- clock tick ----------
  var lastMinute = -1;
  function tick() {
    var now = new Date();
    var mk = now.getMinutes() + ':' + now.getHours();
    if (mk !== lastMinute) {
      lastMinute = mk;
      var c = clockText(now);
      $('timeMain').textContent = c.main;
      $('timeAmpm').textContent = c.ampm;
      $('date').textContent = DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
    }
    refreshView(now);
    checkAzan(now);
    setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
  }

  function refreshView(now) {
    renderBar(now);
    renderCountdown(now);
    renderHijri(now);
  }

  function forceRefresh() {
    lastMinute = -1; lastBarKey = ''; lastHijriKey = '';
  }


  // ---------- apps card + remote navigation ----------
  var nav = { zone: null, idx: 0 };
  var navTimer = null;
  var tiles = [];
  var viewW = 0;
  var lastOffset = null;

  // Real TV icon if we can load one (bundled icons/<store-id>.png, or the path the TV reports for the app).
  function attachIcon(box, item, glyph, name) {
    var urls = item.icons || [];
    (function tryNext(i) {
      if (i >= urls.length) { return; }
      var img = new Image();
      img.onload = function () {
        box.style.background = '#1a1c22';
        box.removeChild(glyph); box.removeChild(name);
        box.appendChild(img);
      };
      img.onerror = function () { tryNext(i + 1); };
      img.src = urls[i];
    })(0);
  }

  function renderApps() {
    var row = $('appsRow');
    var items = S.get('appsEnabled') ? w.Launcher.favourites() : [];
    var html = '';
    var old = $('appsEmpty');
    if (old) { old.parentNode.removeChild(old); }
    row.innerHTML = '';
    tiles = [];
    if (!items.length) {
      var e = document.createElement('div');
      e.id = 'appsEmpty';
      e.textContent = 'Add apps in Settings  ›  Apps & inputs card';
      $('apps').appendChild(e);
    }
    for (var i = 0; i < items.length; i++) {
      var t = document.createElement('div');
      t.className = 'tile';
      var box = document.createElement('div');
      box.className = 'tbox';
      box.style.background = items[i].color;
      var glyph = document.createElement('div'); glyph.className = 'tglyph'; glyph.textContent = items[i].glyph;
      var name = document.createElement('div'); name.className = 'tname'; name.textContent = items[i].name;
      box.appendChild(glyph); box.appendChild(name);
      attachIcon(box, items[i], glyph, name);
      var label = document.createElement('div'); label.className = 'tlabel'; label.textContent = items[i].name;
      t.appendChild(box); t.appendChild(label);
      row.appendChild(t);
      tiles.push({ el: t, item: items[i] });
    }
    if (nav.idx >= tiles.length) { nav.idx = Math.max(0, tiles.length - 1); }
    // Measure once here so key presses never force a layout.
    viewW = $('apps').clientWidth - 2 * 26;
    for (var m = 0; m < tiles.length; m++) { tiles[m].right = tiles[m].el.offsetLeft + tiles[m].el.offsetWidth; }
    lastOffset = null;
    paintNav();
  }

  function paintNav() {
    var gear = $('gear');
    gear.className = 'glass' + (nav.zone === 'gear' ? ' focus' : '');
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].el.className = 'tile' + (nav.zone === 'tiles' && i === nav.idx ? ' focus' : '');
    }
    // Keep the focused tile in view.
    var offset = 0;
    if (tiles.length && nav.zone === 'tiles' && tiles[nav.idx].right > viewW) { offset = tiles[nav.idx].right - viewW + 10; }
    if (offset !== lastOffset) {
      lastOffset = offset;
      $('appsRow').style.webkitTransform = $('appsRow').style.transform = 'translateX(' + (-offset) + 'px)';
    }
  }

  function armNavTimer() {
    clearTimeout(navTimer);
    navTimer = setTimeout(function () { nav.zone = null; paintNav(); }, 12000);
  }

  // Returns true when the key was used.
  function navKey(k) {
    var hasTiles = tiles.length > 0;
    if (k === 37 || k === 38 || k === 39 || k === 40) {
      if (!nav.zone) {
        nav.zone = (hasTiles && k !== 38) ? 'tiles' : 'gear';
        if (k === 38 || !hasTiles) { nav.zone = 'gear'; }
      } else if (nav.zone === 'tiles') {
        if (k === 37 && nav.idx > 0) { nav.idx--; }
        else if (k === 39 && nav.idx < tiles.length - 1) { nav.idx++; }
        else if (k === 38) { nav.zone = 'gear'; }
      } else if (nav.zone === 'gear') {
        if (k === 40 && hasTiles) { nav.zone = 'tiles'; }
      }
      paintNav(); armNavTimer();
      return true;
    }
    if (k === 13 && nav.zone === 'tiles' && hasTiles) { w.Launcher.launch(tiles[nav.idx].item); armNavTimer(); return true; }
    if (k === 13 && nav.zone === 'gear') { nav.zone = null; paintNav(); w.SettingsUI.show(); return true; }
    if ((k === 10009 || k === 27) && nav.zone) { nav.zone = null; paintNav(); return true; }
    return false;
  }

  // ---------- settings changes ----------
  S.onChange(function (key) {
    var all = key === '*';
    if (all || key === 'theme' || key === 'glass' || key === 'bgZoom' || key === 'memEnabled') { applyTheme(); }
    if (all || /^bg/.test(key)) { applyBackground(); }
    if (all || /^mem/.test(key)) { applyMemories(); }
    if (all || key === 'favs' || key === 'appsEnabled' || key === 'appsAll') { renderApps(); }
    if (all || key === 'prayerEnabled' || key === 'appsEnabled') { applyTheme(); }
    forceRefresh();
    refreshView(new Date());
  });

  // ---------- keys ----------
  function exitApp() {
    try { w.tizen.application.getCurrentApplication().exit(); } catch (e) {}
  }

  function onKeyDown(e) {
    var k = e.keyCode;
    if (w.Azan.isActive()) {
      if (k === 13 || k === 10009 || k === 27 || k === 8) { w.Azan.stop(); }
      e.preventDefault();
      return;
    }
    if (w.Launcher.sourceActive()) {
      if (k === 10009 || k === 27 || k === 10182) { w.Launcher.stopSource(); e.preventDefault(); }
      return;
    }
    if (w.SettingsUI.isOpen()) { w.SettingsUI.onKey(e); return; }
    if (navKey(k)) { e.preventDefault(); return; }
    if (k === 13 || k === 77) { w.SettingsUI.show(); e.preventDefault(); }
    else if (k === 10009 || k === 27) { exitApp(); }
  }
  document.addEventListener('keydown', onKeyDown);

  // ---------- boot ----------
  function keepScreenOn() {
    try {
      w.webapis.appcommon.setScreenSaver(w.webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF, function () {}, function () {});
    } catch (e) {}
    try { w.tizen.tvinputdevice.registerKey('Info'); } catch (e2) {}
  }

  applyTheme();
  applyBackground();
  applyMemories();
  renderApps();
  w.Launcher.discover(renderApps);
  setInterval(function () { w.Launcher.discover(renderApps); }, 5 * 60 * 1000);
  keepScreenOn();
  tick();

  setTimeout(function () { $('hint').className = 'on'; }, 1500);
  setTimeout(function () { $('hint').className = ''; }, 9000);

  // Debug helper for browser testing: HomeFrame.testAzan('maghrib')
  w.HomeFrame = {
    testAzan: function (k) { w.Azan.trigger(k || 'dhuhr'); },
    sendKey: function (code) { onKeyDown({ keyCode: code, preventDefault: function () {} }); }
  };
})(window);
