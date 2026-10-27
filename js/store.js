// Settings storage (localStorage, safe if unavailable).
(function (w) {
  var KEY = 'homeframe.settings.v1';

  var DEFAULTS = {
    theme: 'dark',
    timeFormat: 12,
    glass: true,

    bgMode: 'slideshow',       // slideshow | single | color
    bgSingle: '',
    bgInterval: 30,
    bgShuffle: true,
    bgDim: 30,
    bgBlur: 0,
    bgZoom: false,

    memEnabled: true,
    memTitle: 'Lovely Moments',
    memInterval: 12,
    memShuffle: true,

    madhab: 'sunni',           // shia (3 prayers) | sunni (5 prayers)
    shiaMethod: 'jafari',      // jafari | sunni15 (Sunni times, Maghrib +15 min)
    sunniMethod: 'UmmAlQura',
    asr: 1,                    // 1 = standard, 2 = Hanafi
    city: 'makkah',
    lat: 21.4225,
    lng: 39.8262,
    tzMode: 'auto',            // auto = TV clock | manual
    tzManual: 3,
    adjFajr: 0, adjDhuhr: 0, adjAsr: 0, adjMaghrib: 0, adjIsha: 0,
    hijriOffset: 0,
    hijriAtMaghrib: true,

    prayerEnabled: true,       // false hides the prayer card, Hijri date and azan
    appsEnabled: true,
    favs: ['app:3201907018807', 'app:3201910019365', 'app:111299001912', 'app:3201807016597', 'app:3202010022079', 'app:3201710015037'],
    appsAll: false,             // also offer other installed apps in Settings

    azanOn: true,
    azanFile: '',
    azanFajr: '',
    azanVolume: 80
  };

  // data/settings.js can pre-set defaults (window.USER_DEFAULTS), e.g. prayerEnabled: false.
  var preset = w.USER_DEFAULTS || {};
  var state = {};
  var listeners = [];
  var k;
  for (k in preset) { if (k in DEFAULTS) { DEFAULTS[k] = preset[k]; } }
  for (k in DEFAULTS) { state[k] = DEFAULTS[k]; }

  try {
    var saved = JSON.parse(w.localStorage.getItem(KEY) || '{}');
    for (k in saved) { if (k in DEFAULTS) { state[k] = saved[k]; } }
  } catch (e) {}

  function save() {
    try { w.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function emit(key) {
    for (var i = 0; i < listeners.length; i++) { listeners[i](key); }
  }

  w.Store = {
    defaults: DEFAULTS,
    get: function (key) { return state[key]; },
    set: function (key, value) {
      if (state[key] === value) { return; }
      state[key] = value;
      save();
      emit(key);
    },
    reset: function () {
      for (var key in DEFAULTS) { state[key] = DEFAULTS[key]; }
      save();
      emit('*');
    },
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
