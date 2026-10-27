// Remote-friendly settings panel: Up/Down = move, Left/Right = change, OK = change/run, Back = close.
(function (w) {
  var S = w.Store;
  var panel = document.getElementById('settings');
  var rows = [];
  var focus = 0;
  var open = false;
  var list = null;

  var STRUCTURAL = { prayerEnabled: 1, madhab: 1, shiaMethod: 1, city: 1, bgMode: 1, tzMode: 1, '*': 1 };

  function base(path) {
    var n = decodeURIComponent(path.split('/').pop());
    return n.replace(/\.[^.]+$/, '');
  }
  function fileOptions(files, first) {
    var o = [['', first]];
    for (var i = 0; i < files.length; i++) { o.push([files[i], base(files[i])]); }
    return o;
  }
  function range(from, to, step, fmt) {
    var o = [];
    for (var v = from; v <= to; v += step) { o.push([v, fmt ? fmt(v) : String(v)]); }
    return o;
  }

  function build() {
    var r = [];
    var media = w.MEDIA || {};
    var shia = S.get('madhab') === 'shia';
    function H(t) { r.push({ type: 'header', label: t }); }
    function C(key, label, options) { r.push({ type: 'choice', key: key, label: label, options: options }); }
    function N(key, label, min, max, step, unit, dec) {
      r.push({ type: 'number', key: key, label: label, min: min, max: max, step: step, unit: unit || '', dec: dec || 0 });
    }
    function T(key, label) { r.push({ type: 'choice', key: key, label: label, options: [[true, 'On'], [false, 'Off']] }); }
    function A(label, fn) { r.push({ type: 'action', label: label, run: fn }); }
    function F(item) { r.push({ type: 'fav', favKey: item.key, label: item.name + (item.type === 'source' ? '  (input)' : '') }); }
    function I(label, value) { r.push({ type: 'info', label: label, value: value }); }

    H('Display');
    C('theme', 'Theme', [['dark', 'Dark'], ['light', 'Light']]);
    C('timeFormat', 'Time format', [[12, '12-hour'], [24, '24-hour']]);
    T('glass', 'Glass blur effect');

    H('Background');
    C('bgMode', 'Mode', [['slideshow', 'Slideshow'], ['single', 'Single image'], ['color', 'Solid colour']]);
    if (S.get('bgMode') === 'single') { C('bgSingle', 'Image', fileOptions(media.backgrounds || [], 'First image')); }
    if (S.get('bgMode') === 'slideshow') {
      C('bgInterval', 'Change every', [[10, '10 sec'], [15, '15 sec'], [30, '30 sec'], [60, '1 min'], [120, '2 min'], [300, '5 min'], [900, '15 min']]);
      T('bgShuffle', 'Shuffle');
    }
    N('bgDim', 'Dim / lighten', 0, 80, 5, '%');
    N('bgBlur', 'Blur', 0, 20, 2, ' px');
    T('bgZoom', 'Slow zoom (needs strong TV)');

    H('Family memories frame');
    T('memEnabled', 'Show frame');
    C('memTitle', 'Caption', [['Lovely Moments', 'Lovely Moments'], ['Family Memories', 'Family Memories'], ['Our Memories', 'Our Memories'],
      ['Cherished Moments', 'Cherished Moments'], ['Together', 'Together'], ['', 'No caption']]);
    C('memInterval', 'Change every', [[6, '6 sec'], [8, '8 sec'], [12, '12 sec'], [20, '20 sec'], [30, '30 sec'], [60, '1 min']]);
    T('memShuffle', 'Shuffle');

    H('Apps & inputs card');
    T('appsEnabled', 'Show apps & inputs card');
    if (S.get('appsEnabled')) {
      T('appsAll', 'Also list other installed apps');
      A('Rescan apps & inputs', function () { w.Launcher.discover(function () { rows = build(); render(true); }); });
      var items = w.Launcher.choices();
      for (var n = 0; n < items.length; n++) { F(items[n]); }
    }

    H('Prayer');
    T('prayerEnabled', 'Show prayer times, Hijri date & azan');
    if (!S.get('prayerEnabled')) { shia = null; }
    if (shia !== null) {
    C('madhab', 'School', [['shia', "Shia Ja'fari (3 prayers)"], ['sunni', 'Sunni (5 prayers)']]);
    if (shia) {
      C('shiaMethod', 'Shia times', [['jafari', "Ja'fari calculation"], ['sunni15', 'Sunni times, Maghrib +15 min']]);
    }
    if (!shia || S.get('shiaMethod') === 'sunni15') {
      C('sunniMethod', 'Sunni calculation', [['UmmAlQura', 'Umm al-Qura'], ['MWL', 'Muslim World League'], ['Egyptian', 'Egyptian'],
        ['Karachi', 'Karachi'], ['ISNA', 'ISNA']]);
    }
    if (!shia) { C('asr', 'Asr juristic', [[1, 'Standard (Shafi / Jafari)'], [2, 'Hanafi']]); }
    var cities = w.CITIES.map(function (c) { return [c.id, c.name]; });
    C('city', 'Location', cities);
    if (S.get('city') === 'custom') {
      N('lat', 'Latitude', -66, 66, 0.05, '°', 2);
      N('lng', 'Longitude', -180, 180, 0.05, '°', 2);
    }
    C('tzMode', 'Timezone', [['auto', 'Use TV clock'], ['manual', 'Set manually']]);
    if (S.get('tzMode') === 'manual') { N('tzManual', 'UTC offset', -12, 14, 0.5, ' h', 1); }
    N('adjFajr', 'Fajr fine-tune', -15, 15, 1, ' min');
    N('adjDhuhr', 'Dhuhr fine-tune', -15, 15, 1, ' min');
    if (!shia) { N('adjAsr', 'Asr fine-tune', -15, 15, 1, ' min'); }
    N('adjMaghrib', 'Maghrib fine-tune', -15, 15, 1, ' min');
    if (!shia) { N('adjIsha', 'Isha fine-tune', -15, 15, 1, ' min'); }
    N('hijriOffset', 'Hijri date correction', -2, 2, 1, ' day');
    T('hijriAtMaghrib', 'Hijri day starts at Maghrib');
    }

    if (S.get('prayerEnabled')) {
    H('Azan');
    T('azanOn', 'Play azan & show overlay');
    C('azanFile', 'Azan sound', fileOptions(media.azan || [], (media.azan || []).length ? 'First file' : 'No files found'));
    C('azanFajr', 'Fajr azan sound', fileOptions(media.azan || [], 'Same as above'));
    N('azanVolume', 'Azan volume', 10, 100, 5, '%');
    A('Test azan now', function () { close(); w.Azan.trigger('dhuhr'); });
    }

    H('About');
    I('Version', w.APP_INFO.version);
    I('Last update', w.APP_INFO.lastUpdate);
    I('Background images', String((media.backgrounds || []).length));
    I('Memory images', String((media.memories || []).length));
    I('Azan files', String((media.azan || []).length));
    A('Reset all settings', function () { S.reset(); });
    A('Close', function () { close(); });
    return r;
  }

  function valueText(row) {
    if (row.type === 'info') { return row.value; }
    if (row.type === 'fav') { return (S.get('favs') || []).indexOf(row.favKey) >= 0 ? 'On' : 'Off'; }
    if (row.type === 'number') {
      var v = S.get(row.key);
      return (row.dec ? v.toFixed(row.dec) : String(v)) + row.unit;
    }
    if (row.type === 'choice') {
      var cur = S.get(row.key);
      for (var i = 0; i < row.options.length; i++) {
        if (row.options[i][0] === cur) { return row.options[i][1]; }
      }
      return String(cur);
    }
    return '';
  }

  function rowEl(row, i) {
    var d = document.createElement('div');
    if (row.type === 'header') { d.className = 'shead'; d.textContent = row.label; return d; }
    d.className = 'srow ' + (row.type === 'action' ? 'act' : row.type === 'info' ? 'info' : '') + (i === focus ? ' focus' : '');
    var lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = row.label;
    d.appendChild(lab);
    if (row.type !== 'action') {
      var val = document.createElement('span'); val.className = 'val';
      val.textContent = (row.type === 'info' ? '' : '‹  ') + valueText(row) + (row.type === 'info' ? '' : '  ›');
      d.appendChild(val);
      row.valEl = val;
    }
    row.el = d;
    return d;
  }

  function focusable(i) { return rows[i] && rows[i].type !== 'header' && rows[i].type !== 'info'; }

  function render(keepScroll) {
    var top = list ? list.scrollTop : 0;
    panel.innerHTML = '';
    var title = document.createElement('div'); title.id = 'setTitle'; title.textContent = 'Settings';
    var help = document.createElement('div'); help.id = 'setHelp'; help.textContent = '▲▼ select   ◀▶ change   OK change   Back close';
    list = document.createElement('div'); list.id = 'setList';
    panel.appendChild(title); panel.appendChild(help); panel.appendChild(list);
    for (var i = 0; i < rows.length; i++) { list.appendChild(rowEl(rows[i], i)); }
    list.scrollTop = keepScroll ? top : 0;
    ensureVisible();
  }

  function ensureVisible() {
    var row = rows[focus];
    if (!row || !row.el || !list) { return; }
    var t = row.el.offsetTop, b = t + row.el.offsetHeight;
    if (t < list.scrollTop + 60) { list.scrollTop = Math.max(0, t - 80); }
    else if (b > list.scrollTop + list.clientHeight - 20) { list.scrollTop = b - list.clientHeight + 40; }
  }

  // Cheap updates: no DOM rebuild on every key press (this is what made the remote feel laggy).
  function paintFocus(prev) {
    if (rows[prev] && rows[prev].el) { rows[prev].el.className = rows[prev].el.className.replace(' focus', ''); }
    if (rows[focus] && rows[focus].el) { rows[focus].el.className += ' focus'; }
    ensureVisible();
  }
  function updateRow(i) {
    var row = rows[i];
    if (row && row.valEl) { row.valEl.textContent = (row.type === 'info' ? '' : '‹  ') + valueText(row) + (row.type === 'info' ? '' : '  ›'); }
  }

  function move(dir) {
    var i = focus;
    do { i += dir; } while (i >= 0 && i < rows.length && !focusable(i));
    if (i >= 0 && i < rows.length) { var prev = focus; focus = i; paintFocus(prev); }
  }

  function change(dir) {
    var row = rows[focus];
    if (!row) { return; }
    if (row.type === 'choice') {
      var idx = 0, cur = S.get(row.key);
      for (var i = 0; i < row.options.length; i++) { if (row.options[i][0] === cur) { idx = i; } }
      idx = (idx + dir + row.options.length) % row.options.length;
      S.set(row.key, row.options[idx][0]);
    } else if (row.type === 'number') {
      var v = S.get(row.key) + dir * row.step;
      v = Math.min(row.max, Math.max(row.min, v));
      S.set(row.key, Math.round(v * 100) / 100);
    } else if (row.type === 'fav') {
      var favs = (S.get('favs') || []).slice();
      var at = favs.indexOf(row.favKey);
      if (at >= 0) { favs.splice(at, 1); } else { favs.push(row.favKey); }
      S.set('favs', favs);
    } else if (row.type === 'action' && dir > 0) {
      row.run();
    }
  }

  function refresh(structural) {
    if (!open) { return; }
    if (structural) {
      var label = rows[focus] && rows[focus].label;
      rows = build();
      for (var i = 0; i < rows.length; i++) { if (rows[i].label === label && focusable(i)) { focus = i; } }
    }
    if (structural) { render(true); } else { updateRow(focus); }
  }

  function show() {
    rows = build();
    w.Launcher.discover(function () { if (open) { var f = rows[focus] && rows[focus].label; rows = build(); for (var i = 0; i < rows.length; i++) { if (rows[i].label === f && focusable(i)) { focus = i; } } render(true); } });
    focus = 0;
    while (focus < rows.length && !focusable(focus)) { focus++; }
    open = true;
    panel.className = 'glass';
    list = null;
    render(false);
  }

  function close() {
    open = false;
    panel.className = 'glass hidden';
  }

  function onKey(e) {
    var k = e.keyCode;
    if (k === 38) { move(-1); }
    else if (k === 40) { move(1); }
    else if (k === 37) { change(-1); }
    else if (k === 39 || k === 13) { change(1); }
    else if (k === 10009 || k === 27 || k === 8) { close(); }
    else { return false; }
    e.preventDefault();
    return true;
  }

  S.onChange(function (key) { refresh(!!STRUCTURAL[key]); });

  w.SettingsUI = { show: show, close: close, onKey: onKey, isOpen: function () { return open; } };
})(window);
