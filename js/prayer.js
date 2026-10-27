// Offline prayer-time calculation (same maths as the well-known PrayTimes.org algorithm).
(function (w) {
  var R = Math.PI / 180;
  function sin(d) { return Math.sin(d * R); }
  function cos(d) { return Math.cos(d * R); }
  function tan(d) { return Math.tan(d * R); }
  function arcsin(x) { return Math.asin(x) / R; }
  function arccos(x) { return Math.acos(x) / R; }
  function arctan2(y, x) { return Math.atan2(y, x) / R; }
  function arccot(x) { return Math.atan(1 / x) / R; }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function fixAngle(a) { return fix(a, 360); }
  function fixHour(a) { return fix(a, 24); }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
  }

  // fajr/isha are twilight angles; maghrib is an angle only for Jafari (otherwise sunset);
  // ishaMin means "N minutes after Maghrib".
  var METHODS = {
    Jafari:    { fajr: 16,   maghrib: 4, isha: 14 },
    UmmAlQura: { fajr: 18.5, ishaMin: 90 },
    MWL:       { fajr: 18,   isha: 17 },
    Egyptian:  { fajr: 19.5, isha: 17.5 },
    Karachi:   { fajr: 18,   isha: 18 },
    ISNA:      { fajr: 15,   isha: 15 }
  };

  // Returns local-clock hours (in the given tz) for one calendar day.
  function calcHours(y, m, d, lat, lng, tz, method, asrFactor) {
    var jd = julian(y, m, d) - lng / (15 * 24);
    function pos(t) { return sunPosition(jd + t); }
    function mid(t) { return fixHour(12 - pos(t).eqt); }
    function angleTime(angle, t, ccw) {
      var decl = pos(t).decl;
      var x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (x > 1 || x < -1) { return NaN; }
      var span = arccos(x) / 15;
      return mid(t) + (ccw ? -span : span);
    }
    function asrTime(f, t) {
      var decl = pos(t).decl;
      var angle = -arccot(f + tan(Math.abs(lat - decl)));
      return angleTime(angle, t, false);
    }

    var t = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24, maghrib: 18 / 24, isha: 18 / 24 };
    var out = {};
    for (var i = 0; i < 2; i++) {
      out.fajr = angleTime(method.fajr, t.fajr, true);
      out.sunrise = angleTime(0.833, t.sunrise, true);
      out.dhuhr = mid(t.dhuhr);
      out.asr = asrTime(asrFactor, t.asr);
      out.sunset = angleTime(0.833, t.sunset, false);
      out.maghrib = method.maghrib != null ? angleTime(method.maghrib, t.maghrib, false) : out.sunset;
      out.isha = method.ishaMin != null ? out.maghrib + method.ishaMin / 60 : angleTime(method.isha, t.isha, false);
      for (var key in t) { t[key] = out[key] / 24; }
    }
    var shift = tz - lng / 15;
    for (var k in out) { out[k] = out[k] + shift; }
    return out;
  }

  // cfg: { lat, lng, tz, shia, shiaMethod, sunniMethod, asr, adj:{fajr,dhuhr,asr,maghrib,isha} }
  // Returns { fajr, sunrise, dhuhr, asr, maghrib, isha } as Date objects.
  function forDay(y, m, d, cfg) {
    var methodName = 'Jafari';
    var maghribExtra = 0;
    if (!cfg.shia) {
      methodName = cfg.sunniMethod;
    } else if (cfg.shiaMethod === 'sunni15') {
      methodName = cfg.sunniMethod;
      maghribExtra = 15;
    }
    var method = METHODS[methodName] || METHODS.UmmAlQura;
    var asrFactor = cfg.shia ? 1 : cfg.asr;
    var h = calcHours(y, m, d, cfg.lat, cfg.lng, cfg.tz, method, asrFactor);
    var base = Date.UTC(y, m - 1, d);
    var adj = cfg.adj || {};
    var out = {};
    var keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var minutes = Math.round(h[key] * 60) + (adj[key] || 0);
      if (key === 'maghrib') { minutes += maghribExtra; }
      if (key === 'isha') { minutes += maghribExtra; }
      out[key] = new Date(base + (minutes - cfg.tz * 60) * 60000);
    }
    return out;
  }

  w.Prayer = {
    methods: METHODS,
    forDay: forDay,
    names: {
      fajr:    { en: 'Fajr',    ar: 'الفجر' },
      dhuhr:   { en: 'Dhuhr',   ar: 'الظهر' },
      asr:     { en: 'Asr',     ar: 'العصر' },
      maghrib: { en: 'Maghrib', ar: 'المغرب' },
      isha:    { en: 'Isha',    ar: 'العشاء' }
    }
  };
})(window);
