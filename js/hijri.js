// Hijri (Islamic) date: Umm al-Qura via Intl when the TV supports it, tabular algorithm otherwise.
(function (w) {
  var AR_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
                   'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  var EN_MONTHS = ['Muharram', 'Safar', "Rabi' I", "Rabi' II", 'Jumada I', 'Jumada II',
                   'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'];

  function arabicDigits(n) {
    return String(n).replace(/[0-9]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.charAt(+c); });
  }

  function fromIntl(y, m, d) {
    try {
      var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',
        { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
      if (!f.formatToParts || f.resolvedOptions().calendar !== 'islamic-umalqura') { return null; }
      var parts = f.formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
      var r = {};
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'year' || parts[i].type === 'month' || parts[i].type === 'day') {
          r[parts[i].type] = parseInt(parts[i].value, 10);
        }
      }
      if (!r.year || r.year < 1300 || r.year > 1600 || !r.month || !r.day) { return null; }
      return { y: r.year, m: r.month, d: r.day };
    } catch (e) {
      return null;
    }
  }

  // Tabular (civil) Islamic calendar.
  function fromTabular(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    var jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var l = jd - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    var month = Math.floor((24 * l) / 709);
    var day = l - Math.floor((709 * month) / 24);
    var year = 30 * n + j - 30;
    return { y: year, m: month, d: day };
  }

  // y, m (1-12), d = Gregorian calendar day; dayShift moves it by whole days (Maghrib rollover + user fix).
  function convert(y, m, d, dayShift) {
    var base = new Date(Date.UTC(y, m - 1, d + dayShift));
    var yy = base.getUTCFullYear(), mm = base.getUTCMonth() + 1, dd = base.getUTCDate();
    var h = fromIntl(yy, mm, dd) || fromTabular(yy, mm, dd);
    return {
      y: h.y, m: h.m, d: h.d,
      ar: arabicDigits(h.d) + ' ' + AR_MONTHS[h.m - 1] + ' ' + arabicDigits(h.y) + ' هـ',
      en: h.d + ' ' + EN_MONTHS[h.m - 1] + ' ' + h.y + ' AH'
    };
  }

  w.Hijri = { convert: convert };
})(window);
