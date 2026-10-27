// Apps & input sources: discovery, favourites, launching.
// Everything is wrapped defensively: on a PC (no Tizen API) or if the TV refuses, we show a toast instead of failing.
//
// The app list mirrors the Samsung home row. tools/fetch-home-apps.sh copies it (and its icons) from the TV
// into data/homeapps.js and icons/<store-id>.png.
(function (w) {
  var S = w.Store;

  // Samsung store id -> app ids to try when launching (the first one that the TV accepts wins).
  var LAUNCH = {
    '3201907018807': ['org.tizen.netflix-app', '3201907018807'],
    '3201910019365': ['org.tizen.primevideo', '3201910019365'],
    '111299001912':  ['9Ur5IzDKqV.TizenYouTube', '111299001912', 'com.samsung.tv.cobalt-yt'],
    '3201807016597': ['com.samsung.tv.aria-video', '3201807016597'],
    '111477000821':  ['111477000821', 'Ggl33q588H.MBC'],
    '3201910019482': ['2hsfIe2yYd.Viu', '3201910019482'],
    '3202010022079': ['com.samsung.tv.knox-browser', '3202010022079'],
    '3201710015037': ['com.samsung.tv.gallery', '3201710015037']
  };

  var palette = ['#5a6ee0', '#d6567a', '#2fa88d', '#d98a2b', '#8a5ad6', '#3f9bd6'];
  var discovered = { apps: null, all: null, sources: null }; // null = not (yet) available

  function hasTizen() { return !!(w.tizen && w.tizen.application); }

  function colorFor(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) % 997; }
    return palette[h % palette.length];
  }

  function homeApps() { return w.HOMEAPPS || []; }

  function homeItem(a) {
    return {
      key: 'app:' + a.id, type: 'app', id: a.id, name: a.name,
      color: colorFor(a.name), glyph: a.name.charAt(0).toUpperCase(),
      icons: ['icons/' + a.id + '.png'], launchIds: (LAUNCH[a.id] || [a.id]).slice()
    };
  }

  // Extra installed apps (optional): store-style app ids with a real icon on the TV.
  var HIDE = { 'HomeFrame1.HomeFrame': 1, 'yL49PNFmjW.PromotionApp': 1, 'com.samsung.tv.store': 1 };
  function looksUserFacing(a) {
    if (!a.name || !a.name.replace(/\s/g, '') || HIDE[a.id]) { return false; }
    return /^[A-Za-z0-9]{10}\./.test(a.id) && !!a.icon && a.icon.indexOf('/opt/usr/apps/') === 0;
  }
  function extraItem(a) {
    return {
      key: 'app:' + a.id, type: 'app', id: a.id, name: a.name,
      color: colorFor(a.name), glyph: a.name.charAt(0).toUpperCase(),
      icons: [a.icon, 'file://' + a.icon], launchIds: [a.id]
    };
  }

  function installedIdByName(name) {
    var apps = discovered.all || [];
    for (var i = 0; i < apps.length; i++) {
      if ((apps[i].name || '').toLowerCase() === name.toLowerCase()) { return apps[i].id; }
    }
    return null;
  }

  function sourceLabel(s) {
    var t = s.type || 'Source';
    if (t === 'TV') { return 'Live TV'; }
    return t + (s.number ? ' ' + s.number : '');
  }
  function sourceKey(s) { return 'src:' + (s.type || '') + (s.number != null ? s.number : ''); }
  function sourceItem(s) {
    return { key: sourceKey(s), type: 'source', source: s, name: sourceLabel(s), color: '#2b3a4f', glyph: s.type === 'HDMI' ? 'HDMI' : (s.type === 'TV' ? 'TV' : 'IN'), icons: [] };
  }

  function discover(done) {
    var pending = 2;
    function finished() { pending--; if (!pending && done) { done(); } }

    try {
      if (hasTizen() && w.tizen.application.getAppsInfo) {
        w.tizen.application.getAppsInfo(function (list) {
          var all = [];
          for (var i = 0; i < list.length; i++) {
            if (list[i].show === false) { continue; }
            all.push({ id: list[i].id, name: list[i].name, icon: list[i].iconPath });
          }
          discovered.all = all;
          discovered.apps = all.filter(looksUserFacing);
          finished();
        }, function () { discovered.apps = null; finished(); });
      } else { finished(); }
    } catch (e) { finished(); }

    try {
      if (w.tizen && w.tizen.systeminfo && w.tizen.systeminfo.getPropertyValue) {
        w.tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (data) {
          var list = data && (data.connected || data.available) || [];
          var out = [];
          for (var i = 0; i < list.length; i++) { out.push(list[i]); }
          discovered.sources = out;
          finished();
        }, function () { discovered.sources = null; finished(); });
      } else { finished(); }
    } catch (e2) { finished(); }
  }

  // Everything the user can choose from in Settings.
  function choices() {
    var out = [], seen = {}, i, it;
    var home = homeApps();
    for (i = 0; i < home.length; i++) { it = homeItem(home[i]); out.push(it); seen[it.key] = 1; }
    if (S.get('appsAll') && discovered.apps) {
      var rest = discovered.apps.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      for (i = 0; i < rest.length; i++) {
        it = extraItem(rest[i]);
        if (!seen[it.key]) { out.push(it); seen[it.key] = 1; }
      }
    }
    var srcs = discovered.sources || [];
    for (i = 0; i < srcs.length; i++) { out.push(sourceItem(srcs[i])); }
    return out;
  }

  // The tiles shown on the card, in the order the user enabled them.
  function favourites() {
    var favs = S.get('favs') || [];
    var byKey = {}, i, all = choices();
    for (i = 0; i < all.length; i++) { byKey[all[i].key] = all[i]; }
    var out = [];
    for (i = 0; i < favs.length; i++) {
      if (byKey[favs[i]]) { out.push(byKey[favs[i]]); continue; }
      // A chosen extra app stays on the card even when the "other apps" list is switched off.
      var id = favs[i].indexOf('app:') === 0 ? favs[i].slice(4) : null;
      var apps = discovered.apps || [];
      for (var j = 0; id && j < apps.length; j++) { if (apps[j].id === id) { out.push(extraItem(apps[j])); } }
    }
    return out;
  }

  function toast(text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.className = 'on';
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.className = ''; }, 3500);
  }

  var sourceActive = false;

  function stopSource() {
    if (!sourceActive) { return; }
    sourceActive = false;
    document.body.className = document.body.className.replace(/\s*source-mode/g, '');
    document.getElementById('sourceHint').className = 'hidden';
    document.documentElement.style.background = '';
    try { w.tizen.tvwindow.hide(function () {}, function () {}); } catch (e) {}
  }

  function startSource(item) {
    try {
      var tv = w.tizen.tvwindow;
      tv.setSource(item.source, function () {
        tv.show(function () {
          sourceActive = true;
          document.body.className += ' source-mode';
          document.documentElement.style.background = 'transparent';
          var hint = document.getElementById('sourceHint');
          hint.className = '';
          setTimeout(function () { if (sourceActive) { hint.className = 'hidden'; } }, 5000);
        }, function (e) { toast('Could not show ' + item.name + (e && e.message ? ': ' + e.message : '')); },
        ['0px', '0px', '100%', '100%'], 'MAIN', 'BEHIND');
      }, function (e) { toast('Could not switch to ' + item.name + (e && e.message ? ': ' + e.message : '')); });
    } catch (e2) {
      toast(item.name + ' is not available here');
    }
  }

  function launch(item) {
    if (item.type === 'source') { startSource(item); return; }
    var ids = item.launchIds.slice();
    var byName = installedIdByName(item.name);
    if (byName && ids.indexOf(byName) < 0) { ids.push(byName); }
    (function tryNext(i, lastError) {
      if (i >= ids.length) { toast('Could not open ' + item.name + (lastError ? ': ' + lastError : '')); return; }
      try {
        w.tizen.application.launch(ids[i], function () {}, function (e) { tryNext(i + 1, e && e.message); });
      } catch (e3) {
        toast(item.name + ' can only be opened on the TV');
      }
    })(0, '');
  }

  w.Launcher = {
    discover: discover,
    choices: choices,
    favourites: favourites,
    launch: launch,
    toast: toast,
    stopSource: stopSource,
    sourceActive: function () { return sourceActive; }
  };
})(window);
