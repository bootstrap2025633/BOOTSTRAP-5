// app.js — robust loader controller
// Behavior:
//  - If offline: show friendly offline UI with Retry.
//  - If protocol is file:// (local double-click), use local redirect to home.html.
//  - Otherwise (http/https): fetch home.html (same folder or remote) with timeout,
//    show simulated progress, then inject the fetched body into the document.
//  - If fetch fails, fall back to window.location to open home.html.

const TARGET = 'home.html';
const TIMEOUT = 12000; // ms

function el(sel){ return document.querySelector(sel); }
function setProgress(pct){
  const bar = el('#progressBar');
  const pctEl = el('#progressPct');
  if(bar) bar.style.width = Math.min(100, pct) + '%';
  if(pctEl) pctEl.textContent = Math.round(Math.min(100, pct)) + '%';
}

function showOffline(){
  document.body.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0b0b12;color:#fff;padding:22px;text-align:center;'><h1>Please connect to the internet</h1><p style='max-width:560px;margin-top:12px;color:rgba(255,255,255,0.85)'>This demo loads advanced CSS/JS files from the web. Connect and click Retry.</p><div style='margin-top:18px'><button id='retry' style='padding:10px 14px;border-radius:10px;border:none;background:#fff;color:#0b0b12;font-weight:700;cursor:pointer'>Retry</button></div></div>";
  document.getElementById('retry').addEventListener('click', ()=> location.reload());
}

function fetchWithTimeout(url, ms){ 
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(()=> { controller.abort(); reject(new Error('timeout')); }, ms);
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(r => { clearTimeout(id); resolve(r); })
      .catch(err => { clearTimeout(id); reject(err); });
  });
}

async function main(){
  // offline?
  if(!navigator.onLine){
    return showOffline();
  }

  // If running locally via file://, browsers restrict fetch(); just redirect locally
  if(location.protocol === 'file:'){
    // show progress animation then go to local home file for smoothness
    let p = 0;
    const iv = setInterval(()=> { p += 18; setProgress(p); if(p>=100){ clearInterval(iv); location.href = TARGET; } }, 420);
    return;
  }

  // We're on http/https — attempt to fetch
  const statusNote = el('#statusNote');
  if(statusNote) statusNote.textContent = 'Preloading assets…';

  // Start simulated progress driver
  let progress = 6;
  setProgress(progress);
  const increments = [8,12,10,9,7,6,8,10];
  let idx = 0;
  let running = true;
  function tick(){
    if(!running) return;
    if(idx < increments.length){
      progress = Math.min(92, progress + increments[idx++]);
      setProgress(progress);
      setTimeout(tick, 420 + Math.random()*240);
    } else {
      setProgress(92);
      setTimeout(tick, 420);
    }
  }
  tick();

  // fetch with timeout
  try{
    const resp = await fetchWithTimeout(TARGET, TIMEOUT);
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();

    // finalize progress
    running = false;
    let p = progress || 92;
    const finalize = setInterval(()=> {
      p += Math.max(1, (100-p) * 0.22);
      setProgress(p);
      if(p >= 99.5){ clearInterval(finalize); setProgress(100); setTimeout(()=> inject(text, resp.url), 260); }
    }, 90);

  }catch(err){
    console.error('Fetch failed:', err);
    // fallback to direct navigation for maximum compatibility
    setProgress(100);
    const btn = el('#retryBtn');
    if(btn) { btn.classList.remove('hidden'); btn.addEventListener('click', ()=> location.href = TARGET); }
    // also try to navigate after short delay
    setTimeout(()=> { try { location.href = TARGET; } catch(e) { console.error(e); } }, 900);
  }
}

// extract body and inject; run inline/external scripts
function inject(htmlText, sourceUrl){
  try{
    const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const headMatch = htmlText.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlText;
    const headContent = headMatch ? headMatch[1] : '';

    // construct base href so relative assets resolve if fetched from remote
    const baseHref = (sourceUrl && sourceUrl.indexOf('://')>-1) ? sourceUrl.replace(/[^\/]*$/,'') : '';

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

    // execute scripts: find script tags (new DOM) and run/append them
    const scripts = Array.from(document.querySelectorAll('script'));
    scripts.forEach(s => {
      if(s.src){
        const ext = document.createElement('script');
        ext.src = s.src;
        ext.async = false;
        document.head.appendChild(ext);
      } else {
        try { new Function(s.textContent)(); } catch(e){ console.warn('inline script exec failed', e); }
      }
      s.remove();
    });
  }catch(e){
    console.error('inject error', e);
    // last resort: navigate
    try { location.href = TARGET; } catch(ignore){}
  }
}

document.addEventListener('DOMContentLoaded', main);
window.addEventListener('offline', ()=> {
  const t = document.createElement('div');
  t.textContent = 'You are offline — some features may not load';
  t.style.cssText = 'position:fixed;left:12px;bottom:12px;padding:8px 12px;background:#111;color:#fff;border-radius:8px;z-index:9999';
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 4000);
});
