/*! PWA bootstrap: loader, SW, install prompt, simple IDB helpers */
(function(){
  // Loader overlay with app icon
  const loader = document.createElement('div');
  loader.id = 'pwa-loader';
  loader.innerHTML = `
    <style>
      #pwa-loader{position:fixed;inset:0;background:#f0fbff;display:flex;align-items:center;justify-content:center;z-index:99999;transition:opacity .3s}
      #pwa-loader.hide{opacity:0;pointer-events:none}
      #pwa-loader .box{display:flex;flex-direction:column;align-items:center;gap:12px}
      #pwa-loader img{width:96px;height:96px;border-radius:24px}
      #pwa-loader .txt{font-family:"Vazirmatn",system-ui;font-weight:700;color:#1f2a44}
    </style>
    <div class="box">
      <img src="icon-192.png" alt="App icon">
      <div class="txt">در حال بارگذاری...</div>
    </div>`;
  document.documentElement.appendChild(loader);
  window.addEventListener('load', ()=> setTimeout(()=> loader.classList.add('hide'), 300));

  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
  }

  // Install prompt handling + inject a floating "نصب برنامه" button
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    showInstall();
  });
  function showInstall(){
    if (document.getElementById('installBtnFab')) return;
    const btn = document.createElement('button');
    btn.id='installBtnFab';
    btn.textContent='نصب برنامه';
    Object.assign(btn.style, {position:'fixed',bottom:'88px',right:'16px',padding:'10px 14px',border:'none',borderRadius:'12px',boxShadow:'0 6px 20px rgba(0,0,0,.2)',background:'#0ea5e9',color:'#fff',fontFamily:'Vazirmatn,system-ui',zIndex:99998});
    btn.addEventListener('click', async ()=>{
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if(outcome==='accepted') btn.remove();
      deferredPrompt = null;
    });
    document.body.appendChild(btn);
  }

  // Simple IndexedDB wrapper (window.AppDB) for offline data storage
  const DB_NAME='club-volleyball-db', STORE='kv';
  function openDB(){
    return new Promise((res,rej)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ req.result.createObjectStore(STORE); };
      req.onsuccess=()=>res(req.result);
      req.onerror=()=>rej(req.error);
    });
  }
  async function idbSet(key, val){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete=()=>res(true);
      tx.onerror=()=>rej(tx.error);
    });
  }
  async function idbGet(key){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readonly');
      const r=tx.objectStore(STORE).get(key);
      r.onsuccess=()=>res(r.result);
      r.onerror=()=>rej(r.error);
    });
  }
  window.AppDB = { set:idbSet, get:idbGet };

  // Optional: attempt to persist existing localStorage state into IDB on unload
  window.addEventListener('beforeunload', ()=>{
    try {
      const snapshot = {};
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        snapshot[k]=localStorage.getItem(k);
      }
      idbSet('localStorageBackup', snapshot);
    } catch(e){}
  });
})();
