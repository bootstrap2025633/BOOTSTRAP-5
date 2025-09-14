// app.js — advanced loader orchestration for Aurora starter
// Put this file in your repo: bootstrap2025633/BOOTSTRAP-5/app.js

(function () {
  // quick config (no need to edit)
  const SPLASH_ID = 'splash';
  const MAIN_ID = 'main';
  const CSS_URL = 'https://cdn.jsdelivr.net/gh/bootstrap2025633/BOOTSTRAP-5@main/styles.css';

  function el(id) { return document.getElementById(id); }

  // small helper to prefetch CSS so browsers may cache it pre-competition
  function prefetchCss(href) {
    try {
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'style';
      l.href = href;
      document.head.appendChild(l);
      // also add normal stylesheet so it applies if available
      const s = document.createElement('link');
      s.rel = 'stylesheet';
      s.href = href;
      document.head.appendChild(s);
    } catch (e) {
      console.warn('prefetch failed', e);
    }
  }

  // progress simulation but tied to resource readiness (if any)
  function simulateProgress(onTick) {
    // staged increments with random pauses to feel human-like
    const steps = [12, 10, 18, 8, 20, 22]; // sum > 100
    let i = 0;
    let current = 0;
    function step() {
      if (i < steps.length) {
        current = Math.min(98, current + steps[i++]);
        onTick(current);
        setTimeout(step, 420 + Math.random() * 340);
      } else {
        // hold; finalize will be called externally
        onTick(92);
      }
    }
    step();
    return {
      done() {
        onTick(100);
      }
    };
  }

  // reveal main content (swap state)
  function revealMain() {
    const splash = el(SPLASH_ID);
    const main = el(MAIN_ID);
    if (splash) splash.style.display = 'none';
    if (main) {
      main.classList.add('show');
      main.removeAttribute('aria-hidden');
    }
    // allow remote init if you add advanced scripts later
    if (typeof window.remoteInit === 'function') {
      try { window.remoteInit(); } catch (e) { console.warn(e); }
    }
  }

  // attach small fallback behaviours to keep page interactive offline
  function attachLocalFallbacks() {
    // year
    const yEl = document.getElementById('year');
    if (yEl) yEl.textContent = new Date().getFullYear();

    // clickable logo hint
    const logo = document.querySelector('.logo-small, .logo');
    if (logo) {
      logo.addEventListener('click', function () {
        try { alert('Logo placeholder — replace images/logo.png locally to brand.'); } catch (e) {}
      });
    }
  }

  // main boot
  function boot() {
    prefetchCss(CSS_URL); // try to prime cache
    attachLocalFallbacks();

    // progress control
    const bar = document.querySelector('.splash-bar-fill, .splash-bar, .splash-bar-fill');
    const pctNote = document.querySelector('.splash-text');
    const progressSim = simulateProgress(function (v) {
      // set width on any known fill element
      const fill = document.querySelector('.splash-bar-fill') || document.querySelector('.splash-bar');
      if (fill) fill.style.width = Math.round(v) + '%';
      if (pctNote) pctNote.textContent = 'Preparing — ' + Math.round(v) + '%';
    });

    // finalize after a short, natural delay
    // try to wait for remoteInit promise if present, else finish after 2.6s + buffer
    const finalize = function () {
      progressSim.done();
      setTimeout(() => {
        revealMain();
      }, 420);
    };

    // if there's a global promise-like readiness signal, wait for it
    if (window.__REMOTE_READY__ && typeof window.__REMOTE_READY__.then === 'function') {
      window.__REMOTE_READY__.then(finalize).catch(finalize);
    } else {
      // otherwise finalize after ~2.6-3.4s total (feels natural)
      setTimeout(finalize, 2600 + Math.random() * 1000);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 120); // small delay so UI paints
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
