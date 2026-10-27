// URL switches used to take the README screenshots on a computer, e.g. index.html?theme=light&nav=tiles
// Supported: theme=light|dark, prayer=off, madhab=sunni|shia, memories=off, nav=tiles|gear, settings=1, scroll=<rows>, azan=<fajr|dhuhr|asr|maghrib|isha>
(function (w) {
  if (!w.location.search) { return; }
  var q = {};
  w.location.search.slice(1).split('&').forEach(function (p) { var kv = p.split('='); q[kv[0]] = decodeURIComponent(kv[1] || ''); });
  // Screenshots: no fades or animations, so the capture is never caught half-way.
  var st = document.createElement('style');
  st.textContent = '*{-webkit-transition:none !important;transition:none !important;-webkit-animation:none !important;animation:none !important}';
  document.head.appendChild(st);
  function key(code) { w.HomeFrame.sendKey(code); }
  if (!q.azan) { w.Store.set('azanOn', false); w.Azan.stop(); } // a real azan must not cover the screenshot
  w.Store.set('bgShuffle', false); w.Store.set('memShuffle', false); // same photos every time
  if (q.theme) { w.Store.set('theme', q.theme); }
  if (q.prayer === 'off') { w.Store.set('prayerEnabled', false); }
  if (q.madhab) { w.Store.set('madhab', q.madhab); }
  if (q.memories === 'off') { w.Store.set('memEnabled', false); }
  (function () {
    if (q.settings) {
      key(13);
      for (var i = 0; i < (+q.scroll || 0); i++) { key(40); }
    } else if (q.nav === 'tiles') { key(39); key(39); }
    else if (q.nav === 'gear') { key(38); }
    if (q.azan) { w.Azan.trigger(q.azan); }
  })();
})(window);
