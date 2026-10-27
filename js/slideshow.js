// Cross-fading slideshow over two stacked .layer elements.
(function (w) {
  function Slideshow(container) {
    this.layers = container.querySelectorAll('.layer');
    this.list = [];
    this.order = [];
    this.pos = -1;
    this.cur = 0;
    this.shuffle = true;
    this.seconds = 30;
    this.timer = null;
    this.token = 0;
    this.onEmpty = null;
  }

  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) { a.push(i); }
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  Slideshow.prototype.configure = function (list, shuffle, seconds) {
    this.list = list || [];
    this.shuffle = shuffle;
    this.seconds = seconds;
    this.order = this.shuffle ? shuffled(this.list.length) : this.list.map(function (_, i) { return i; });
    this.pos = -1;
    this.restart();
  };

  Slideshow.prototype.clear = function () {
    this.stop();
    this.token++;
    for (var i = 0; i < this.layers.length; i++) {
      this.layers[i].className = 'layer';
      this.layers[i].style.backgroundImage = '';
    }
  };

  Slideshow.prototype.stop = function () {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  };

  Slideshow.prototype.restart = function () {
    this.stop();
    if (!this.list.length) {
      this.clear();
      if (this.onEmpty) { this.onEmpty(true); }
      return;
    }
    if (this.onEmpty) { this.onEmpty(false); }
    this.next();
  };

  Slideshow.prototype.next = function () {
    var self = this;
    this.stop();
    if (!this.list.length) { return; }
    this.pos++;
    if (this.pos >= this.order.length) {
      this.order = this.shuffle ? shuffled(this.list.length) : this.order;
      this.pos = 0;
    }
    var url = this.list[this.order[this.pos]];
    var token = ++this.token;
    var img = new Image();
    var advance = function () {
      if (self.list.length > 1) {
        self.timer = setTimeout(function () { self.next(); }, self.seconds * 1000);
      }
    };
    img.onload = function () {
      if (token !== self.token) { return; }
      var incoming = self.layers[1 - self.cur];
      var outgoing = self.layers[self.cur];
      incoming.style.backgroundImage = 'url("' + encodeURI(url) + '")';
      incoming.className = 'layer on';
      outgoing.className = 'layer';
      self.cur = 1 - self.cur;
      advance();
    };
    img.onerror = function () {
      if (token !== self.token) { return; }
      // Skip a broken file quickly, but never spin forever on a list of only broken files.
      self.timer = setTimeout(function () { self.next(); }, self.list.length > 1 ? 500 : 30000);
    };
    img.src = encodeURI(url);
  };

  w.Slideshow = Slideshow;
})(window);
