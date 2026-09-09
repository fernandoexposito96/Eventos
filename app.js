const STORAGE_KEY = 'eventos-premium-v1';
const defaults = { goal: 7000, savings: [], expenses: [], events: [] };
let state = loadState();
let active = 'hucha';
let expenseFilter = 'Todos';

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('sheetBackdrop');
const sheetTitle = document.getElementById('sheetTitle');
const sheetEyebrow = document.getElementById('sheetEyebrow');
const sheetForm = document.getElementById('sheetForm');
const closeSheetButton = document.getElementById('closeSheet');

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      goal: Number(saved?.goal) > 0 ? Number(saved.goal) : defaults.goal,
      savings: Array.isArray(saved?.savings) ? saved.savings : [],
      expenses: Array.isArray(saved?.expenses) ? saved.expenses : [],
      events: Array.isArray(saved?.events) ? saved.events : []
    };
  }catch{ return { ...defaults, savings:[], expenses:[], events:[] }; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const euro = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
const sum = list => list.reduce((a,x)=>a+Number(x.amount||0),0);
const clean = t => String(t ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = () => new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(new Date());

function pigIllustration(){
  return `<svg class="pig-svg" viewBox="0 0 300 220" role="img" aria-label="Cerdito hucha rosa con moneda de euro">
  <defs>
    <radialGradient id="pigBody" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#ffd9fb"/><stop offset=".38" stop-color="#ff8bea"/><stop offset=".76" stop-color="#e744cd"/><stop offset="1" stop-color="#b72ba9"/></radialGradient>
    <radialGradient id="snout" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#ffc0f2"/><stop offset="1" stop-color="#ee43c3"/></radialGradient>
    <linearGradient id="coin" x1="0" x2="1"><stop stop-color="#fff184"/><stop offset=".45" stop-color="#ffb500"/><stop offset="1" stop-color="#df8100"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#7f1aa9" flood-opacity=".22"/></filter>
  </defs>
  <g filter="url(#shadow)">
    <ellipse cx="155" cy="185" rx="92" ry="17" fill="#9d2fbe" opacity=".18"/>
    <path d="M218 120c22-18 32 11 18 24-9 8-19 2-14-6 4-7 14-3 16 3" fill="none" stroke="#d237bd" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="153" cy="124" rx="88" ry="61" fill="url(#pigBody)"/>
    <path d="M106 75L94 41c18-4 35 8 45 28" fill="#f16bd9"/>
    <path d="M183 67l22-27c15 9 19 27 10 43" fill="#d83bc1"/>
    <ellipse cx="87" cy="130" rx="34" ry="28" fill="url(#snout)"/>
    <ellipse cx="78" cy="130" rx="5" ry="7" fill="#7f176d"/><ellipse cx="96" cy="130" rx="5" ry="7" fill="#7f176d"/>
    <circle cx="112" cy="101" r="7" fill="#1d1535"/><circle cx="114" cy="99" r="2" fill="#fff"/>
    <circle cx="145" cy="95" r="7" fill="#1d1535"/><circle cx="147" cy="93" r="2" fill="#fff"/>
    <ellipse cx="116" cy="177" rx="15" ry="18" fill="#c932b6"/><ellipse cx="182" cy="177" rx="15" ry="18" fill="#c932b6"/>
    <rect x="139" y="61" width="45" height="5" rx="3" fill="#7f1b78" opacity=".65"/>
    <g transform="translate(158 43)"><circle cx="0" cy="0" r="30" fill="url(#coin)" stroke="#f5a000" stroke-width="4"/><circle cx="0" cy="0" r="23" fill="none" stroke="#ffe169" stroke-width="2"/><text x="0" y="9" text-anchor="middle" font-size="31" font-weight="800" fill="#fff5b5">€</text></g>
    <ellipse cx="127" cy="93" rx="32" ry="16" fill="#fff" opacity=".22" transform="rotate(-17 127 93)"/>
  </g></svg>`;
}

function header(theme){
  return `<header class="header"><div class="brand-row"><div class="app-icon"><span class="app-star"></span></div><div class="brand-copy"><h1>Eventos</h1><p>Grandes eventos, mejores momentos</p></div><button class="icon-button" id="settingsBtn" aria-label="Ajustes">⚙</button></div>
  <nav class="tabs" aria-label="Secciones">
    <button class="tab ${active==='hucha'?'active purple':''}" data-tab="hucha"><span class="tab-icon">🐷</span>Hucha</button>
    <button class="tab ${active==='inversion'?'active blue':''}" data-tab="inversion"><span class="tab-icon">▥</span>Inversión</button>
    <button class="tab ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span class="tab-icon">↗</span>Beneficios</button>
  </nav></header>`;
}

function bottomNav(){
  return `<nav class="bottom-nav" aria-label="Navegación inferior">
    <button class="nav-btn ${active==='hucha'?'active purple':''}" data-tab="hucha"><span class="nav-ico">🐷</span>Hucha</button>
    <button class="nav-btn ${active==='inversion'?'active blue':''}" data-tab="inversion"><span class="nav-ico">▥</span>Inversión</button>
    <button class="nav-btn ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span class="nav-ico">↗</span>Beneficios</button>
  </nav>`;
}

function historyRows(list,type){
  if(!list.length) return '';
  const color = type==='savings'?'purple':type==='expenses'?'blue':'green';
  const symbol = type==='savings'?'+':type==='expenses'?'-':'+';
  return `<div class="history-list">${[...list].reverse().slice(0,8).map(item=>`<div class="history-row"><div class="history-dot ${color}">${type==='expenses'?'🧾':type==='events'?'🏆':'€'}</div><div class="history-main"><strong>${clean(item.name||item.category||'Movimiento')}</strong><small>${clean(item.date||'')}</small></div><div class="history-value">${symbol}${euro(item.amount)}</div></div>`).join('')}</div>`;
}

function huchaView(){
  const total = sum(state.savings); const pct = Math.min(100,Math.round((total/state.goal)*100)||0);
  return `<section class="screen"><div>${header()}</div><main class="content"><section class="hero-card">
    <div class="card-title-row"><div class="badge-icon purple">◎</div><div class="title-block"><h2>Objetivo de la hucha</h2></div><div class="goal-amount">${new Intl.NumberFormat('es-ES').format(state.goal)} €</div></div>
    <div class="rule"><span style="width:${pct}%"></span></div>
    <div class="money-row"><div><div class="big-money">${euro(total)}</div><div class="money-sub">de ${new Intl.NumberFormat('es-ES').format(state.goal)} €</div></div><div class="progress-ring" style="--p:${pct}"><strong>${pct}%</strong></div></div>
    <div class="pig-stage">${pigIllustration()}</div><div class="caption-pill">Cada aportación nos acerca a un gran evento</div>
    <button class="action-btn purple" data-action="add-saving"><span class="plus">＋</span>Añadir dinero</button>
  </section>
  <section class="section"><div class="section-head"><h3>Últimas aportaciones</h3><button class="text-link purple" data-clear="savings">Vaciar historial</button></div>${state.savings.length?historyRows(state.savings,'savings'):`<div class="empty-card"><div class="empty-icon">▤</div><div class="empty-copy"><strong>Todavía no hay aportaciones.</strong><p>Añade la primera cuando quieras.</p></div></div>`}</section></main>${bottomNav()}</section>`;
}

function inversionView(){
  const total = sum(state.expenses);
  const filtered = expenseFilter==='Todos'?state.expenses:state.expenses.filter(x=>x.category===expenseFilter);
  return `<section class="screen theme-invest"><div>${header()}</div><main class="content"><section class="hero-card">
    <div class="card-title-row"><div class="badge-icon blue">🛒</div><div class="title-block"><h2>Total invertido</h2><p>Controla todos los gastos de los eventos</p></div></div>
    <div class="money-row"><div><div class="big-money">${euro(total)}</div></div></div>
    <div class="wave-chart"><svg viewBox="0 0 400 90" preserveAspectRatio="none"><defs><linearGradient id="wave" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0b9cff" stop-opacity=".8"/><stop offset="1" stop-color="#0b9cff" stop-opacity=".08"/></linearGradient></defs><path d="M0,83 C45,80 55,72 92,72 C132,72 145,32 179,45 C207,55 226,70 250,58 C278,44 290,16 322,23 C351,30 360,66 400,44 L400,90 L0,90Z" fill="url(#wave)"/></svg></div>
    <button class="action-btn blue" data-action="add-expense"><span class="plus">＋</span>Añadir gasto</button>
    <div class="filter-row">${['Todos','Material','Catering','Local','Otros'].map(f=>`<button class="chip ${expenseFilter===f?'active-blue':''}" data-filter="${f}">${f}</button>`).join('')}</div>
  </section>
  <section class="section"><div class="section-head"><h3>Gastos recientes</h3><button class="text-link blue" data-clear="expenses">Vaciar historial</button></div>${filtered.length?historyRows(filtered,'expenses'):`<div class="empty-card"><div class="empty-icon">▤</div><div class="empty-copy"><strong>No hay gastos en esta vista.</strong><p>Añade un gasto para llevar el control de todas las inversiones.</p></div></div>`}<div class="info-strip blue">💡 Cada detalle cuenta para hacer eventos inolvidables</div></section></main>${bottomNav()}</section>`;
}

function beneficiosView(){
  const total = sum(state.events); const count = state.events.length; const avg = count?total/count:0; const max = count?Math.max(...state.events.map(x=>Number(x.amount||0))):0;
  return `<section class="screen theme-benefit"><div>${header()}</div><main class="content"><section class="hero-card">
    <div class="card-title-row"><div class="badge-icon green">🏆</div><div class="title-block"><h2>Total ganado</h2><p>Suma de todos los eventos</p></div></div>
    <div class="money-row"><div><div class="big-money">${euro(total)}</div></div></div>
    <div class="green-bars"><i style="height:22px"></i><i style="height:36px"></i><i style="height:52px"></i><i style="height:67px"></i><i style="height:82px"></i></div>
    <div class="stats"><div class="stat"><div class="ico">▣</div><div class="label">Eventos</div><strong>${count}</strong></div><div class="stat"><div class="ico">◫</div><div class="label">Ingreso medio</div><strong class="green">${euro(avg)}</strong></div><div class="stat"><div class="ico">☆</div><div class="label">Mayor ganancia</div><strong class="green">${euro(max)}</strong></div></div>
    <button class="action-btn green" data-action="add-event"><span class="plus">＋</span>Añadir evento</button>
  </section>
  <section class="section"><div class="section-head"><h3>Eventos y ganancias</h3><button class="text-link green" data-clear="events">Vaciar historial</button></div>${state.events.length?historyRows(state.events,'events'):`<div class="empty-card"><div class="empty-icon">▣</div><div class="empty-copy"><strong>Todavía no hay eventos.</strong><p>Añade el primero para empezar a sumar ganancias.</p></div></div>`}<div class="info-strip green">🏆 Cada evento deja huella y grandes beneficios</div></section></main>${bottomNav()}</section>`;
}

function render(){
  app.innerHTML = active==='hucha'?huchaView():active==='inversion'?inversionView():beneficiosView();
  bindUI();
}

function bindUI(){
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{ active=btn.dataset.tab; render(); }));
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{ expenseFilter=btn.dataset.filter; render(); }));
  document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>openForm(btn.dataset.action)));
  document.querySelectorAll('[data-clear]').forEach(btn=>btn.addEventListener('click',()=>clearList(btn.dataset.clear)));
  document.getElementById('settingsBtn')?.addEventListener('click',openSettings);
}

function openSheet(title,eyebrow,html,onSubmit){
  sheetTitle.textContent=title; sheetEyebrow.textContent=eyebrow; sheetForm.innerHTML=html; sheet.hidden=false; backdrop.hidden=false;
  requestAnimationFrame(()=>sheetForm.querySelector('input,select')?.focus());
  sheetForm.onsubmit=e=>{e.preventDefault();onSubmit(new FormData(sheetForm));};
}
function closeSheet(){ sheet.hidden=true; backdrop.hidden=true; sheetForm.innerHTML=''; }
closeSheetButton.addEventListener('click',closeSheet); backdrop.addEventListener('click',closeSheet);

function openForm(kind){
  if(kind==='add-saving'){
    openSheet('Añadir dinero','Hucha',`<div class="field"><label>Concepto</label><input name="name" maxlength="50" placeholder="Ej. Aportación semanal" value="Aportación" required></div><div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div><button class="sheet-submit">Guardar aportación</button>`,fd=>{state.savings.push({name:fd.get('name'),amount:Number(fd.get('amount')),date:dateLabel()});saveState();closeSheet();render();toast('Aportación añadida');});
  } else if(kind==='add-expense'){
    openSheet('Añadir gasto','Inversión',`<div class="field"><label>Concepto</label><input name="name" maxlength="50" placeholder="Ej. Decoración" required></div><div class="field"><label>Categoría</label><select name="category"><option>Material</option><option>Catering</option><option>Local</option><option>Otros</option></select></div><div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div><button class="sheet-submit">Guardar gasto</button>`,fd=>{state.expenses.push({name:fd.get('name'),category:fd.get('category'),amount:Number(fd.get('amount')),date:dateLabel()});saveState();closeSheet();render();toast('Gasto añadido');});
  } else {
    openSheet('Añadir evento','Beneficios',`<div class="field"><label>Nombre del evento</label><input name="name" maxlength="60" placeholder="Ej. Fiesta privada" required></div><div class="field"><label>Ganancia (€)</label><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" required></div><button class="sheet-submit">Guardar evento</button>`,fd=>{state.events.push({name:fd.get('name'),amount:Number(fd.get('amount')),date:dateLabel()});saveState();closeSheet();render();toast('Evento añadido');});
  }
}

function openSettings(){
  openSheet('Ajustes','Eventos',`<div class="field"><label>Objetivo de la hucha (€)</label><input name="goal" type="number" min="1" step="1" value="${state.goal}" required></div><p class="helper">Los datos se guardan en este dispositivo.</p><button class="sheet-submit">Guardar objetivo</button><button type="button" class="danger-btn" id="resetAll">Borrar todos los datos</button>`,fd=>{state.goal=Number(fd.get('goal'));saveState();closeSheet();render();toast('Objetivo actualizado');});
  document.getElementById('resetAll').addEventListener('click',()=>{ if(confirm('¿Borrar todo el historial de la aplicación?')){state={...defaults,savings:[],expenses:[],events:[]};saveState();closeSheet();render();toast('Datos borrados');} });
}
function clearList(key){
  if(!state[key]?.length){toast('No hay datos que borrar');return;}
  if(confirm('¿Vaciar este historial?')){state[key]=[];saveState();render();toast('Historial vaciado');}
}
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),1800);}

render();
