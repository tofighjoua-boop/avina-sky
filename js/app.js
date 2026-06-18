/* =============================================
   AVINA SKY — app.js
   Lenis smooth scroll + GSAP animations
   ============================================= */

(function () {
  'use strict';

  /* ---- GSAP plugin registration ---- */
  gsap.registerPlugin(ScrollTrigger);

  /* Mobile: skip heavy canvas animation + horizontal GSAP tweens */
  const IS_MOBILE = window.innerWidth <= 640;

  /* =============================================
     0. LOGO BACKGROUND REMOVAL
     Scans each logo pixel; removes near-white /
     light-gray background so logo floats cleanly
     on the dark video and navy navbar.
     ============================================= */
  function removeLogoBg(imgEl) {
    const process = (img) => {
      const c   = document.createElement('canvas');
      c.width   = img.naturalWidth;
      c.height  = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const px = imgData.data;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const lum = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        /* Remove near-white / light blue-gray background (#EEF3FA range) */
        if (lum > 220 && sat < 30) {
          const t = Math.min(1, (lum - 220) / 35);
          px[i + 3] = Math.round((1 - t) * px[i + 3]);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      imgEl.src = c.toDataURL('image/png');
      imgEl.classList.add('logo-ready');
    };

    if (imgEl.complete && imgEl.naturalWidth) {
      process(imgEl);
    } else {
      imgEl.addEventListener('load', () => process(imgEl), { once: true });
    }
  }

  /* Remove background from about/footer logos (canvas pixel removal) */
  document.querySelectorAll('.about-logo-frame img, .footer-brand img').forEach(removeLogoBg);
  /* Navbar logo shown as-is */
  document.querySelectorAll('.nav-logo img').forEach((img) => img.classList.add('logo-ready'));

  /* =============================================
     1. LENIS SMOOTH SCROLL — desktop only
     Native scroll on mobile is smoother
     ============================================= */
  if (!IS_MOBILE) {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* =============================================
     2. NAVBAR: transparent → solid on scroll
     ============================================= */
  const navbar = document.getElementById('navbar');

  ScrollTrigger.create({
    start: 'top -80',
    end: 99999,
    toggleClass: { targets: navbar, className: 'scrolled' },
  });

  /* =============================================
     3. HAMBURGER MENU (mobile)
     ============================================= */
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  /* close nav when a link is clicked */
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  /* =============================================
     4. HERO — CANVAS FRAME-BASED SCROLL ANIMATION
     96 WebP frames preloaded as Image objects.
     Scroll position maps directly to frame index —
     zero lag, instant response per scroll tick.
     ============================================= */
  const heroContent  = document.querySelector('.hero-heading');
  const canvas       = document.getElementById('heroCanvas');
  const ctx          = canvas ? canvas.getContext('2d') : null;
  const FRAME_COUNT  = 96;
  const frames       = new Array(FRAME_COUNT).fill(null);
  let   currentFrame = 0;
  let   rAF          = null;

  /* Resize canvas to fill viewport at device pixel ratio */
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);   /* reset on each resize — canvas clears state */
    drawFrame(currentFrame);
  }

  /* Cover-mode: portrait frame fills landscape viewport */
  function drawFrame(index) {
    if (!ctx) return;
    const img = frames[Math.min(index, FRAME_COUNT - 1)];
    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* Preload all frames and wire scroll animation — desktop only */
  if (canvas && !IS_MOBILE) {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `frames/frame_${String(i + 1).padStart(4, '0')}.webp`;
      frames[i] = img;
      if (i === 0) {
        img.onload = () => { resizeCanvas(); };
      }
    }
    window.addEventListener('resize', resizeCanvas);

    /* Scroll → frame index (scrub:true = zero lag) */
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const idx = Math.min(
          Math.floor(self.progress * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (idx !== currentFrame) {
          currentFrame = idx;
          if (rAF) cancelAnimationFrame(rAF);
          rAF = requestAnimationFrame(() => drawFrame(currentFrame));
        }
      },
    });
  }

  /* Hero text and button fade out — desktop only */
  const heroCta = document.querySelector('.hero-content');
  if (heroContent && !IS_MOBILE) {
    gsap.to(heroContent, {
      y: '-50px',
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '33% top',
        scrub: 1.0,
      },
    });
  }
  if (heroCta && !IS_MOBILE) {
    gsap.to(heroCta, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '33% top',
        scrub: 1.0,
      },
    });
  }

  /* =============================================
     VIDEO BACKGROUND PARALLAX
     Works on all devices — mobile shows video,
     desktop shows video under canvas frames
     ============================================= */
  const heroBgVideo = document.querySelector('.hero-video-bg');
  if (heroBgVideo) {
    gsap.to(heroBgVideo, {
      yPercent: IS_MOBILE ? -12 : -20,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: IS_MOBILE ? 'bottom top' : 'bottom bottom',
        scrub: true,
      },
    });
  }

  /* =============================================
     FAQ ACCORDION
     ============================================= */
  document.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((el) => {
        el.classList.remove('open');
        el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* =============================================
     QUOTE FORM — POST to server → saved to Excel
     ============================================= */
  const quoteForm   = document.getElementById('quoteForm');
  const formSuccess = document.getElementById('formSuccess');
  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = quoteForm.querySelector('.btn-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ارسال...';

      const data = Object.fromEntries(new FormData(quoteForm).entries());
      const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      /* Replace FORMSPREE_ID with your Formspree form ID from formspree.io */
      const FORMSPREE_ENDPOINT = 'https://formspree.io/f/FORMSPREE_ID';

      try {
        let res;
        if (isLocal) {
          /* Development: save to Excel file via Node.js server */
          res = await fetch('/api/quote', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
          });
        } else {
          /* Production (GitHub Pages): submit to Formspree */
          res = await fetch(FORMSPREE_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body:    JSON.stringify(data),
          });
        }
        if (!res.ok) throw new Error('server error');
        quoteForm.reset();
        btn.style.display = 'none';
        formSuccess.hidden = false;
      } catch {
        btn.disabled = false;
        btn.innerHTML = 'ارسال استعلام';
        alert('خطا در ارسال اطلاعات. لطفاً دوباره امتحان کنید.');
      }
    });
  }

  /* =============================================
     5. WHY US — cards stagger + content slide
     ============================================= */
  const whyCards = document.querySelectorAll('.why-card');
  const whyContent = document.querySelector('.why-content');

  if (whyCards.length) {
    gsap.from(whyCards, {
      y: 40,
      opacity: 0,
      duration: 0.65,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.why-cards',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  if (whyContent) {
    gsap.from(whyContent, {
      x: IS_MOBILE ? 0 : -50,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.why-wrap',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  /* =============================================
     5. PROCESS STEPS — staggered fade-up
     ============================================= */
  const processSteps = document.querySelectorAll('.process-step');
  if (processSteps.length) {
    gsap.from(processSteps, {
      y: 44,
      opacity: 0,
      duration: 0.7,
      stagger: 0.13,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.process-grid',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  /* =============================================
     5. SERVICES CARDS — staggered fade-up
     ============================================= */
  const serviceCards = document.querySelectorAll('.service-card');
  if (serviceCards.length) {
    gsap.from(serviceCards, {
      y: 48,
      opacity: 0,
      duration: 0.75,
      stagger: 0.11,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.services-grid',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  /* =============================================
     6. STATS — counter animation
     ============================================= */
  const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

  function toPersian(n) {
    return String(Math.round(n)).replace(/\d/g, (d) => persianDigits[d]);
  }

  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    const proxy  = { val: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      onEnter: () => {
        gsap.to(proxy, {
          val: target,
          duration: 2.2,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = toPersian(proxy.val); },
          onComplete: () => { el.textContent = toPersian(target); },
        });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(proxy);
        proxy.val = 0;
        el.textContent = '۰';
      },
    });
  });

  /* =============================================
     7. ABOUT — slide-in animations
     ============================================= */
  const aboutVisual  = document.querySelector('.about-visual');
  const aboutContent = document.querySelector('.about-content');

  if (aboutVisual && aboutContent) {
    const aboutTL = gsap.timeline({
      scrollTrigger: {
        trigger: '.about-wrap',
        start: 'top 76%',
        toggleActions: 'play none none reverse',
      },
    });

    aboutTL
      .from(aboutVisual, {
        x: IS_MOBILE ? 0 : 60,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      })
      .from(
        aboutContent,
        {
          x: IS_MOBILE ? 0 : -60,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
        },
        '<0.15'
      );
  }

  /* =============================================
     TESTIMONIALS — stagger fade-up
     ============================================= */
  gsap.from('.testimonial-card', {
    y: 44, opacity: 0, duration: 0.7, stagger: 0.13, ease: 'power3.out',
    scrollTrigger: { trigger: '.testimonials-grid', start: 'top 82%', toggleActions: 'play none none reverse' },
  });

  /* GUIDE — stagger */
  gsap.from('.guide-card', {
    y: 44, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.guide-grid', start: 'top 82%', toggleActions: 'play none none reverse' },
  });

  /* FAQ — stagger */
  gsap.from('.faq-item', {
    y: 28, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.faq-list', start: 'top 82%', toggleActions: 'play none none reverse' },
  });

  /* QUOTE — slide in (horizontal only on desktop) */
  gsap.from('.quote-info', {
    x: IS_MOBILE ? 0 : 50, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.quote-wrap', start: 'top 80%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.quote-form', {
    x: IS_MOBILE ? 0 : -50, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.quote-wrap', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  /* =============================================
     8. BLOG CARDS — stagger fade-up
     ============================================= */
  const blogCards = document.querySelectorAll('.blog-card');
  if (blogCards.length) {
    gsap.from(blogCards, {
      y: 48,
      opacity: 0,
      duration: 0.72,
      stagger: 0.13,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.blog-grid',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  /* =============================================
     8. CONTACT CARDS — stagger fade-up
     ============================================= */
  const contactCards = document.querySelectorAll('.contact-card');
  if (contactCards.length) {
    gsap.from(contactCards, {
      y: 40,
      opacity: 0,
      duration: 0.72,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact-grid',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  /* =============================================
     9. SECTION HEADERS — fade-up
     ============================================= */
  document.querySelectorAll('.section-header').forEach((el) => {
    gsap.from(el, {
      y: 32,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 84%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  /* =============================================
     10. STATS SECTION — subtle scale-in
     ============================================= */
  document.querySelectorAll('.stat-item').forEach((el, i) => {
    gsap.from(el, {
      y: 36,
      opacity: 0,
      duration: 0.7,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#stats',
        start: 'top 78%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  /* WhatsApp float — always visible, no scroll dependency */

})();
