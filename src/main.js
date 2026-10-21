(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- Бургер: фокус-ловушка, Esc, закрытие по клику на пункт ----
  const burger = $('#burger');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    menu.classList.toggle('hidden', !open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? burger.dataset.labelClose : burger.dataset.labelOpen);
    if (open) $('a', menu)?.focus();
  };
  burger?.addEventListener('click', () => setMenu(menu.classList.contains('hidden')));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (menu.classList.contains('hidden')) return;
    if (e.key === 'Escape') { setMenu(false); burger.focus(); }
    if (e.key === 'Tab') {
      const items = [burger, ...$$('a', menu)];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items.at(-1).focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });

  // ---- Переключатель языка сохраняет текущий якорь ----
  $$('[data-lang-link]').forEach((a) => a.addEventListener('click', () => {
    if (location.hash) a.href = a.href.split('#')[0] + location.hash;
  }));

  // ---- Подсветка активного пункта меню ----
  const navLinks = $$('[data-nav]');
  const sections = navLinks.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // ---- Плавный скролл (Lenis) + анимации (GSAP ScrollTrigger) ----
  const root = document.documentElement;
  const header = $('#site-header');
  const headerOffset = () => -(header?.offsetHeight || 72) - 8;
  let lenis = null;

  if (root.classList.contains('anim') && window.gsap && window.ScrollTrigger) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    root.classList.add('anim-ready');

    if (window.Lenis) {
      lenis = new window.Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const ease = 'power3.out';
    const markIn = (els) => [].concat(els).forEach((el) => el.classList.add('is-in'));

    // Hero: вступление при загрузке
    gsap.timeline({ defaults: { ease, duration: 0.8 } })
      .fromTo('#hero-media', { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, 0)
      .fromTo('[data-hero]', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, 0.15)
      .fromTo('[data-hero-list] > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.6 }, '-=0.45');

    // Hero: лёгкий параллакс фото
    gsap.to('#hero-media img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true } });

    // Появление блоков снизу (по мере входа в экран, пачками со сдвигом)
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      once: true,
      onEnter: (els) => {
        markIn(els);
        gsap.fromTo(els, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.8, ease, stagger: 0.12, overwrite: true });
      },
    });

    // Каскад элементов внутри списков и сеток
    $$('[data-stagger]').forEach((list) => {
      if (list.id === 'steps') return;
      gsap.fromTo(list.children, { autoAlpha: 0, y: 24 }, {
        autoAlpha: 1, y: 0, duration: 0.6, ease, stagger: 0.08,
        scrollTrigger: { trigger: list, start: 'top 88%', once: true },
      });
    });

    // Процесс: шаги по очереди, линии между ними «прорисовываются»
    const steps = $('#steps');
    if (steps) {
      gsap.timeline({ scrollTrigger: { trigger: steps, start: 'top 82%', once: true } })
        .fromTo(steps.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease, stagger: 0.18 })
        .fromTo($$('.step-line', steps), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut', stagger: 0.18 }, 0.3);
    }

    // Глубина: карточка «О компании» и фото в карточках слегка смещаются при скролле
    if (matchMedia('(min-width: 1024px)').matches) {
      gsap.fromTo('#about-card', { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    $$('#partners img, #quality img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Тень шапки после начала прокрутки
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => header.classList.toggle('is-scrolled', st.scroll() > 8) });

    // Пересчитать позиции после загрузки шрифтов и картинок
    window.addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  } else {
    root.classList.remove('anim');
  }

  // Якорные ссылки: плавно и с отступом под sticky-шапку
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    // Lenis сам учитывает scroll-padding-top из CSS (отступ под sticky-шапку)
    if (lenis) lenis.scrollTo(target, { duration: 1.2 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + scrollY + headerOffset(), behavior: 'smooth' });
    if (a.closest('#lead-form, #contact') === null && a.getAttribute('href') === '#contact') {
      setTimeout(() => $('#f-name')?.focus({ preventScroll: true }), 900);
    }
  });

  // ---- Форма ----
  const form = $('#lead-form');
  if (!form) return;
  const phone = form.phone;

  // маска +7 (___) ___-__-__
  const formatPhone = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ')';
    if (p.length > 3) out += ' ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  };
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7'; });
  phone.addEventListener('input', (e) => {
    let d = phone.value.replace(/\D/g, '');
    // «8» первой цифрой после +7 или вставка полного номера 8…/+7… — убираем лишний префикс
    if (d.length === 2 && d[1] === '8' && e.inputType === 'insertText') d = '7';
    if (d.length > 11 && (d[1] === '8' || d[1] === '7')) d = '7' + d.slice(2);
    phone.value = formatPhone(d);
  });
  phone.addEventListener('blur', () => { if (phone.value === '+7') phone.value = ''; });

  // кнопки с темой подставляют её в сообщение
  $$('[data-topic]').forEach((a) => a.addEventListener('click', () => {
    form.message.value = form.dataset.topicPrefix + a.dataset.topic;
  }));

  const setError = (input, ok) => {
    const err = document.getElementById('e-' + input.name);
    input.setAttribute('aria-invalid', String(!ok));
    if (err) { err.textContent = ok ? '' : input.dataset.error; err.classList.toggle('hidden', ok); }
    return ok;
  };
  const checks = {
    name: (i) => i.value.trim().length >= 2,
    phone: (i) => i.value.replace(/\D/g, '').length === 11,
    email: (i) => !i.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value),
    consent: (i) => i.checked,
  };
  Object.keys(checks).forEach((n) => form[n].addEventListener('change', () => setError(form[n], checks[n](form[n]))));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.website.value) return; // honeypot
    const bad = Object.keys(checks).filter((n) => !setError(form[n], checks[n](form[n])));
    if (bad.length) { form[bad[0]].focus(); return; }

    // Превью без бэкенда: заявка уходит в WhatsApp. На проде — Telegram-бот + e-mail (раздел 4 ТЗ).
    const lines = [form.dataset.intro, form.name.value.trim(), form.org.value.trim(), form.phone.value, form.email.value.trim(), form.message.value.trim()].filter(Boolean);
    $('#form-success').classList.remove('hidden');
    window.open('https://wa.me/' + form.dataset.wa + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  });
})();
