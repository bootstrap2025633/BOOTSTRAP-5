/* app.js
   Advanced loader controller:
   - Check offline/online
   - Robust fetch with timeout and graceful fallback
   - Realistic progress UI and preloading
   - Inject fetched HTML body and handle inline/external scripts
   - Add <base> tag to preserve relative paths in injected HTML
*/

/* CONFIG:
   - TARGET: path to the home file you will upload alongside these files.
     You can change this to a CDN URL (jsDelivr raw) or a repo-relative path.
   - TIMEOUT_MS: abort fetch if it takes too long.
*/
const TARGET = 'home.html'; // change if your home file is named differently or hosted elsewhere
const TIMEOUT_MS = 12000;   // 12s fetch timeout (adjust if needed)

/* Helpers */
function el(sel){ return document.querySelector(sel); }
function create(tag, attrs = {}){ const t = document.createElement(tag); for(const k in attrs) t.setAttribute(k, attrs[k]); return t; }
function setProgressPct(pct){
  const bar = el('.progress .bar');
  const pctEl = el('#progressPct');
  if(bar) bar.style.width = Math.min(100, pct) + '%';
  if(pctEl) pctEl.textContent = Math.round(Math.min(100, pct)) + '%';
}

/* Offline handling: friendly screen with retry button */
function showOfflineUI(){
  document.body.innerHTML = '';
  const wrapper = create('div');
  wrapper.style.cssText = 'height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0b;color:#fff;padding:28px;text-align:center';
  wrapper.innerHTML = `
    <div style="max-width:680px;border-radius:12px;padding:24px;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));box-shadow:0 20px 60px rgba(0,0,0,0.6)">
      <h1 style="margin:0 0 8px 0;font-size:22px">Please connect to the internet</h1>
      <p style="margin:0 0 18px;color:rgba(255,255,255,0.78)">This page needs network access to load advanced styles and your site content. Please enable internet and click Retry.</p>
      <div><button id="retryBtn" style="padding:10px 16px;border-radius:10px;border:none;background:#fff;color:#08021a;font-weight:700;cursor:pointer">Retry</button></div>
    </div>
  `;
  document.body.appendChild(wrapper);
  document.getElementById('retryBtn').addEventListener('click', () => {
    if(navigator.onLine) {
      // reload the page (which will re-run app.js)
      location.reload();
    } else {
      alert('Still offline — please check connection.');
    }
  });
}

/* Fetch with AbortController and timeout */
async function fetchWithTimeout(url, timeout = TIMEOUT_MS){
  const controller = new AbortController();
  const id = setTimeout(()=> controller.abort(), timeout);
  try{
    const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(id);
    return resp;
  }catch(e){
    clearTimeout(id);
    throw e;
  }
}

/* Simulated progress driver that speeds up when fetch resolves */
function progressDriver(fetchPromise){
  // We will drive progress from 6% to 92% with random increments,
  // then finalize to 100% when the fetch resolves.
  let progress = 6;
  setProgressPct(progress);
  const increments = [8, 12, 9, 10, 7, 6, 5, 12]; // total > 70
  let i = 0;
  let running = true;

  const tick = () => {
    if(!running) return;
    if(i < increments.length){
      progress = Math.min(92, progress + increments[i++]);
      setProgressPct(progress);
      setTimeout(tick, 450 + Math.random()*300);
    } else {
      // hold at ~92% while fetch in progress
      setProgressPct(92);
      // poll for fetch completion every 300ms
      setTimeout(tick, 300);
    }
  };
  tick();

  // when fetch resolves, finalize progress
  fetchPromise.then(()=> {
    running = false;
    // smooth finalize
    let p = parseFloat((progress||92));
    const finalize = setInterval(()=> {
      p += Math.max(1, (100-p) * 0.25);
      setProgressPct(Math.min(100, p));
      if(p >= 99.5) { clearInterval(finalize); setProgressPct(100); }
    }, 120);
  }).catch(()=> {
    running = false;
  });
}

/* Inject HTML body content into document and execute scripts */
function injectHTMLDocument(htmlText, sourceURL = '') {
  // parse and extract <body> contents
  const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headMatch = htmlText.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : htmlText;
  const headContent = headMatch ? headMatch[1] : '';

  // create a new document body
  // before replacing, create a <base> element to preserve relative links if sourceURL provided
  const baseHref = (sourceURL && !sourceURL.startsWith('data:')) ? sourceURL.replace(/[^\/]*$/, '') : '';
  // replace document
  document.documentElement.innerHTML = `
    <head>
      ${headContent || ''}
      ${baseHref ? `<base href="${baseHref}">` : ''}
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Loaded</title>
    </head>
    <body>
      ${bodyContent}
    </body>
  `;

  // after insertion: run inline scripts and re-append external scripts to avoid CSP blocking
  // collect external scripts from the injected html (we conservatively create them anew)
  const scripts = Array.from(document.querySelectorAll('script'));
  scripts.forEach(s => {
    if(s.src){
      // create a new script tag to force load (and not executed as text)
      const ext = document.createElement('script');
      ext.src = s.src;
      ext.async = false;
      document.head.appendChild(ext);
      s.remove();
    } else {
      // inline script: evaluate safely using Function
      try {
        new Function(s.textContent)();
      } catch(e) {
        console.error('Inline script execution failed:', e);
      }
      s.remove();
    }
  });
}

/* Main flow */
async function mainFlow(){
  // quick guard for offline
  if(!navigator.onLine){
    showOfflineUI();
    return;
  }

  // show existing loader UI elements also expose progress values if present
  // if your HTML loader uses .progress .bar or #progressPct, we can drive them
  const progressBarExists = !!document.querySelector('.progress .bar');

  // start fetching the target
  const fetchPromise = (async ()=>{
    try{
      const resp = await fetchWithTimeout(TARGET, TIMEOUT_MS);
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      return { text, url: resp.url || TARGET };
    }catch(e){
      throw e;
    }
  })();

  // start progress driver
  progressDriver(fetchPromise);

  try{
    const result = await fetchPromise;
    // small UX delay to let users see 100% progress
    await new Promise(res => setTimeout(res, 450));
    // inject HTML into document
    injectHTMLDocument(result.text, result.url);
  }catch(err){
    console.error('Failed to fetch target:', err);
    // show a graceful error UI inside loader frame (if available) or full fallback
    const frame = document.querySelector('.frame');
    if(frame){
      frame.innerHTML = `
        <div style="padding:28px;text-align:center">
          <h2 style="margin:0 0 8px 0;color:#fff">Unable to load content</h2>
          <p style="color:rgba(255,255,255,0.78);max-width:620px;margin:0 auto">We had trouble loading the full page. This can happen when the network blocks external resources or the file is missing. You can retry or check the console for details.</p>
          <div style="margin-top:18px"><button id="retryLoad" style="padding:10px 14px;border-radius:10px;border:none;background:#fff;color:#000;cursor:pointer">Retry</button></div>
        </div>
      `;
      const btn = document.getElementById('retryLoad');
      if(btn) btn.addEventListener('click', ()=> { location.reload(); });
    } else {
      // full fallback
      document.body.innerHTML = `<div style="padding:28px;text-align:center;color:#fff"><h2>Offline or fetch error</h2><p>Check your network or try again later.</p></div>`;
    }
  }
}

/* Entry: wait for DOM ready then run mainFlow */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', mainFlow);
} else {
  mainFlow();
}

/* Optional: listen for online/offline and show a subtle toast (non-blocking) */
window.addEventListener('offline', ()=> {
  console.warn('Went offline');
  const t = document.createElement('div');
  t.textContent = 'You are offline — some features may not load';
  t.style.cssText = 'position:fixed;left:12px;bottom:12px;padding:10px 14px;background:#111;color:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.6);z-index:9999';
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 4500);
});
