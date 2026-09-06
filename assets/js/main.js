/* ============================================================
   VINTAGE — скролл-сценарий и анимации
   Без библиотек. Всё на requestAnimationFrame + IntersectionObserver.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------- 1. Прелоадер ---------- */
  /* Уходит по window.load ИЛИ по таймауту — сайт не должен зависать,
     если шрифты/картинки с внешнего CDN не ответили. */
  document.body.classList.add('is-locked');
  var revealed = false;
  function revealSite() {
    if (revealed) return;
    revealed = true;
    var l = document.querySelector('.loader');
    if (l) l.classList.add('is-done');
    document.body.classList.remove('is-locked');
    document.documentElement.classList.add('is-ready');
    document.querySelectorAll('.hero .rv-mask, .hero .rv').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, 120 + i * 90);
    });
  }
  var minWait = reduced ? 0 : 1400;
  var t0 = Date.now();
  function finishLoader() {
    setTimeout(revealSite, Math.max(0, minWait - (Date.now() - t0)));
  }
  if (document.readyState === 'complete') finishLoader();
  else window.addEventListener('load', finishLoader);
  setTimeout(revealSite, reduced ? 0 : 2600);   // страховка

  /* ---------- 2. Плавный скролл (в духе apple.com) ---------- */
  /* Меняем именно нативную позицию окна, поэтому position:sticky работает как надо */
  var smooth = !reduced && !isTouch;
  if (smooth) {
    var target = window.scrollY, cur = window.scrollY, lastSet = window.scrollY, running = false;
    var maxScroll = function () {
      return document.documentElement.scrollHeight - window.innerHeight;
    };
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;                       // пинч-зум не трогаем
      if (e.target.closest('[data-native-scroll]')) return;
      e.preventDefault();
      var d = e.deltaY * (e.deltaMode === 1 ? 22 : e.deltaMode === 2 ? window.innerHeight : 1);
      target = Math.max(0, Math.min(maxScroll(), target + d));
      if (!running) { running = true; raf(tick); }
    }, { passive: false });

    window.addEventListener('scroll', function () {
      // скролл не от нас (клавиатура, якорь, тачпад-жест) — синхронизируемся
      if (Math.abs(window.scrollY - lastSet) > 3) { target = cur = window.scrollY; }
    }, { passive: true });

    function tick() {
      cur += (target - cur) * 0.105;
      if (Math.abs(target - cur) < 0.35) { cur = target; running = false; }
      lastSet = cur;
      window.scrollTo(0, cur);
      if (running) raf(tick); 
    }
  }

  /* ---------- 3. Появление блоков ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv,.rv-mask,.rv-img').forEach(function (el) {
    if (el.closest('.hero')) return;
    io.observe(el);
  });

  /* ---------- 4. Счётчики ---------- */
  var ioNum = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      ioNum.unobserve(en.target);
      var el = en.target, to = parseFloat(el.dataset.count), dec = (el.dataset.dec | 0), t0 = null;
      raf(function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / 1500), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (to * e).toFixed(dec).replace('.', ',');
        if (p < 1) raf(step);
      });
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(function (el) { ioNum.observe(el); });

  /* ---------- 5. Текст, проявляющийся по словам ---------- */
  var wordBlocks = [];
  document.querySelectorAll('.words').forEach(function (block) {
    var words = block.textContent.trim().split(/\s+/);
    block.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w + (i < words.length - 1 ? ' ' : '');
      block.appendChild(s);
    });
    wordBlocks.push({ el: block, spans: block.querySelectorAll('span') });
  });

  /* ---------- 6. Горизонтальная секция с закреплением ---------- */
  var pin = document.querySelector('.pin');
  var pinTrack = pin && pin.querySelector('.pin__track');
  var pinHint = pin && pin.querySelector('.pin__hint i');
  var pinMax = 0;
  function layoutPin() {
    if (!pin || !pinTrack) return;
    pinTrack.style.transform = 'none';
    pinMax = Math.max(0, pinTrack.scrollWidth - window.innerWidth + 24);
    pin.style.height = (window.innerHeight + pinMax) + 'px';
  }

  /* ---------- 7. Общий цикл по скроллу ---------- */
  var heroMedia = document.querySelector('.hero__media');
  var bandBg = document.querySelector('.band__bg');
  var nav = document.querySelector('.nav');
  var progress = document.querySelector('.progress');
  var pars = [].slice.call(document.querySelectorAll('.par'));

  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;

    if (progress) {
      var h = document.documentElement.scrollHeight - vh;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
    if (nav) nav.classList.toggle('is-solid', y > vh * 0.85);

    // герой: медленный уход фона + мягкое затемнение
    if (heroMedia && y < vh * 1.2) {
      var p = Math.min(1, y / vh);
      heroMedia.style.transform = 'translate3d(0,' + (y * 0.32) + 'px,0) scale(' + (1 + p * 0.12) + ')';
    }

    // параллакс отдельных картинок
    for (var i = 0; i < pars.length; i++) {
      var el = pars[i], r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (c * (parseFloat(el.dataset.speed) || 40) * -1) + 'px,0)';
    }

    // тёмная полоса
    if (bandBg) {
      var rb = bandBg.parentNode.getBoundingClientRect();
      if (rb.bottom > -200 && rb.top < vh + 200) {
        var cb = (rb.top + rb.height / 2 - vh / 2) / vh;
        bandBg.style.transform = 'translate3d(0,' + (cb * -70) + 'px,0)';
      }
    }

    // горизонтальный трек
    if (pin && pinTrack && pinMax > 0) {
      var pt = pin.getBoundingClientRect().top;
      var pp = Math.max(0, Math.min(1, -pt / (pin.offsetHeight - vh)));
      pinTrack.style.transform = 'translate3d(' + (-pinMax * pp) + 'px,0,0)';
      if (pinHint) pinHint.style.setProperty('--p', pp);
    }

    // подсветка слов
    for (var k = 0; k < wordBlocks.length; k++) {
      var wb = wordBlocks[k], rw = wb.el.getBoundingClientRect();
      if (rw.bottom < 0 || rw.top > vh) continue;
      var prog = (vh * 0.86 - rw.top) / (rw.height + vh * 0.34);
      var lit = Math.round(Math.max(0, Math.min(1, prog)) * wb.spans.length);
      for (var s = 0; s < wb.spans.length; s++) wb.spans[s].classList.toggle('lit', s < lit);
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    raf(function () { onScroll(); ticking = false; });
  }, { passive: true });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layoutPin(); onScroll(); }, 150);
  });

  layoutPin();
  onScroll();
  window.addEventListener('load', function () { layoutPin(); onScroll(); });

  /* ---------- 8. Мобильное меню ---------- */
  var burger = document.querySelector('.burger'), mob = document.querySelector('.mobmenu');
  if (burger && mob) {
    burger.addEventListener('click', function () {
      var open = mob.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    });
    mob.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mob.classList.remove('is-open');
        burger.classList.remove('is-open');
        document.body.classList.remove('is-locked');
      });
    });
  }

  /* ---------- 9. Якоря ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 10, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- 10. Год в подвале ---------- */
  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
