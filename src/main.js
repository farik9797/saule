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
  // блок «Аптеки + заявка» относится к пункту «Контакты» (футер слишком низкий, чтобы попасть в зону)
  const alias = { branches: 'contacts', quality: 'process', pricing: 'process', promo: 'process' };
  ['branches', 'quality', 'pricing', 'promo'].forEach((id) => { const el = document.getElementById(id); if (el) sections.push(el); });
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = alias[en.target.id] || en.target.id;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === id));
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
    gsap.fromTo('#hero-media img', { yPercent: -7 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true } });

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

  // ---- Попапы (<dialog>) ----
  let lastFocus = null;
  const openModal = (name) => {
    const d = document.getElementById(name + '-modal');
    if (!d || d.open) return null;
    $$('dialog[open]').forEach((o) => o.close());
    lastFocus = lastFocus || document.activeElement;
    if (!menu.classList.contains('hidden')) setMenu(false);
    d.showModal();
    lenis?.stop();
    root.classList.add('modal-open');
    // на десктопе сразу ставим курсор в первое поле, на телефоне не открываем клавиатуру
    const first = $('input:not([type=hidden]):not([tabindex="-1"])', d);
    if (first && matchMedia('(pointer: fine)').matches) first.focus();
    return d;
  };
  $$('dialog.modal').forEach((d) => {
    d.addEventListener('close', () => {
      if ($$('dialog[open]').length) return;
      lenis?.start();
      root.classList.remove('modal-open');
      lastFocus?.focus({ preventScroll: true });
      lastFocus = null;
    });
    // клик по затемнению вокруг окна
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
  });

  // Клики: открыть попап / тема заявки / якорь с плавным скроллом
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-modal]');
    const topicEl = e.target.closest('[data-topic]');
    if (topicEl) $$('[data-lead-form]').forEach((f) => { f.message.value = f.dataset.topicPrefix + topicEl.dataset.topic; });
    if (trigger) {
      e.preventDefault();
      lastFocus = trigger;
      openModal(trigger.dataset.modal);
      return;
    }
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    // считаем позицию сами: Lenis с элементом-целью ошибается, если страница уже прокручена
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || -headerOffset();
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - pad);
    if (lenis) lenis.scrollTo(top, { duration: 1.2 });
    else window.scrollTo({ top, behavior: 'smooth' });
  });

  // ---- Формы заявки (блок на странице и попап) ----
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
  const checks = {
    name: (i) => i.value.trim().length >= 2,
    phone: (i) => i.value.replace(/\D/g, '').length === 11,
    email: (i) => !i.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value),
    consent: (i) => i.checked,
  };
  const setError = (input, ok) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', String(!ok));
    if (err) { err.textContent = ok ? '' : input.dataset.error; err.classList.toggle('hidden', ok); }
    return ok;
  };

  $$('[data-lead-form]').forEach((form) => {
    const phone = form.phone;
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7'; });
    phone.addEventListener('input', (e) => {
      let d = phone.value.replace(/\D/g, '');
      // «8» первой цифрой после +7 или вставка полного номера 8…/+7… — убираем лишний префикс
      if (d.length === 2 && d[1] === '8' && e.inputType === 'insertText') d = '7';
      if (d.length > 11 && (d[1] === '8' || d[1] === '7')) d = '7' + d.slice(2);
      phone.value = formatPhone(d);
    });
    phone.addEventListener('blur', () => { if (phone.value === '+7') phone.value = ''; });

    const fields = Object.keys(checks).filter((n) => form[n]);
    fields.forEach((n) => form[n].addEventListener('change', () => setError(form[n], checks[n](form[n]))));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.website.value) return; // honeypot
      const bad = fields.filter((n) => !setError(form[n], checks[n](form[n])));
      if (bad.length) { form[bad[0]].focus(); return; }

      // Превью без бэкенда: заявка уходит в WhatsApp. На проде — Telegram-бот + e-mail (раздел 4 ТЗ).
      const val = (n) => (form[n] ? form[n].value.trim() : '');
      const text = [form.dataset.intro, val('name'), val('org'), val('phone'), val('email'), val('message')].filter(Boolean).join('\n');
      const url = 'https://wa.me/' + form.dataset.wa + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');
      const ok = $('#success-modal');
      $('[data-success-wa]', ok).href = url;
      form.reset();
      lastFocus = lastFocus || form.querySelector('[type=submit]');
      openModal('success');
    });
  });
})();
