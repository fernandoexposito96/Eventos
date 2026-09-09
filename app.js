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
  }catch{
    return { ...defaults, savings: [], expenses: [], events: [] };
  }
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const euro = value => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0));
const sum = list => list.reduce((acc,item) => acc + Number(item.amount || 0), 0);
const clean = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = () => new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(new Date());

function header(){
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">E</div>
        <div>
          <h1>Eventos</h1>
          <p>Control sencillo de tu dinero</p>
        </div>
      </div>
      <button class="settings-button" id="settingsBtn" aria-label="Ajustes">⚙</button>
    </header>
    <nav class="tabs" aria-label="Secciones">
      <button class="tab ${active==='hucha'?'active':''}" data-tab="hucha">Hucha</button>
      <button class="tab ${active==='inversion'?'active':''}" data-tab="inversion">Inversión</button>
      <button class="tab ${active==='beneficios'?'active':''}" data-tab="beneficios">Beneficios</button>
    </nav>`;
}

function bottomNav(){
  return `<nav class="bottom-nav" aria-label="Navegación inferior">
    <button class="nav-btn ${active==='hucha'?'active':''}" data-tab="hucha"><span>€</span>Hucha</button>
    <button class="nav-btn ${active==='inversion'?'active':''}" data-tab="inversion"><span>−</span>Inversión</button>
    <button class="nav-btn ${active==='beneficios'?'active':''}" data-tab="beneficios"><span>+</span>Beneficios</button>
  </nav>`;
}

function historyRows(list,type){
  if(!list.length) return '';
  const sign = type === 'expenses' ? '−' : '+';
  return `<div class="history-list">${[...list].reverse().map(item => `
    <article class="history-row">
      <div class="history-copy">
        <strong>${clean(item.name || item.category || 'Movimiento')}</strong>
        <small>${clean(item.date || '')}${item.category ? ` · ${clean(item.category)}` : ''}</small>
      </div>
      <div class="history-value ${type}">${sign}${euro(item.amount)}</div>
    </article>`).join('')}</div>`;
}

function emptyState(title,subtitle){
  return `<div class="empty-state"><strong>${title}</strong><p>${subtitle}</p></div>`;
}

function summaryCard(label,value,subtext,action,accent){
  return `<section class="summary-card ${accent}">
    <div class="summary-label">${label}</div>
    <div class="summary-value">${value}</div>
    ${subtext ? `<div class="summary-sub">${subtext}</div>` : ''}
    <button class="primary-button ${accent}" data-action="${action}">Añadir</button>
  </section>`;
}

function huchaView(){
  const total = sum(state.savings);
  const pct = Math.min(100, Math.round((total / state.goal) * 100) || 0);
  return `<section class="screen">
    ${header()}
    <main class="content">
      ${summaryCard('Dinero ahorrado', euro(total), `Objetivo ${new Intl.NumberFormat('es-ES').format(state.goal)} €`, 'add-saving', 'purple')}
      <section class="progress-card">
        <div class="progress-head"><span>Progreso</span><strong>${pct}%</strong></div>
        <div class="progress-track"><span style="width:${pct}%"></span></div>
        <div class="progress-foot"><span>${euro(total)}</span><span>${euro(state.goal)}</span></div>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Últimas aportaciones</h2><button class="text-button" data-clear="savings">Vaciar</button></div>
        ${state.savings.length ? historyRows(state.savings,'savings') : emptyState('Todavía no hay aportaciones','Añade la primera cuando quieras.')}
      </section>
    </main>
    ${bottomNav()}
  </section>`;
}

function inversionView(){
  const total = sum(state.expenses);
  const filtered = expenseFilter === 'Todos' ? state.expenses : state.expenses.filter(item => item.category === expenseFilter);
  return `<section class="screen">
    ${header()}
    <main class="content">
      ${summaryCard('Total invertido', euro(total), 'Gastos de tus eventos', 'add-expense', 'blue')}
      <div class="filter-row">${['Todos','Material','Catering','Local','Otros'].map(filter => `<button class="chip ${expenseFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div>
      <section class="list-section">
        <div class="section-head"><h2>Gastos recientes</h2><button class="text-button" data-clear="expenses">Vaciar</button></div>
        ${filtered.length ? historyRows(filtered,'expenses') : emptyState('No hay gastos','Añade un gasto para empezar a llevar el control.')}
      </section>
    </main>
    ${bottomNav()}
  </section>`;
}

function beneficiosView(){
  const total = sum(state.events);
  const count = state.events.length;
  const average = count ? total / count : 0;
  const max = count ? Math.max(...state.events.map(item => Number(item.amount || 0))) : 0;
  return `<section class="screen">
    ${header()}
    <main class="content">
      ${summaryCard('Total ganado', euro(total), 'Ganancias de tus eventos', 'add-event', 'green')}
      <section class="stats-grid">
        <div class="stat-card"><span>Eventos</span><strong>${count}</strong></div>
        <div class="stat-card"><span>Media</span><strong>${euro(average)}</strong></div>
        <div class="stat-card"><span>Mayor</span><strong>${euro(max)}</strong></div>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Eventos y ganancias</h2><button class="text-button" data-clear="events">Vaciar</button></div>
        ${state.events.length ? historyRows(state.events,'events') : emptyState('Todavía no hay eventos','Añade el primero para empezar a sumar ganancias.')}
      </section>
    </main>
    ${bottomNav()}
  </section>`;
}

function render(){
  app.innerHTML = active === 'hucha' ? huchaView() : active === 'inversion' ? inversionView() : beneficiosView();
  bindUI();
}

function bindUI(){
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    active = button.dataset.tab;
    render();
  }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    expenseFilter = button.dataset.filter;
    render();
  }));
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => openForm(button.dataset.action)));
  document.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', () => clearList(button.dataset.clear)));
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
}

function openSheet(title,eyebrow,html,onSubmit){
  sheetTitle.textContent = title;
  sheetEyebrow.textContent = eyebrow;
  sheetForm.innerHTML = html;
  sheet.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => sheetForm.querySelector('input,select')?.focus());
  sheetForm.onsubmit = event => {
    event.preventDefault();
    onSubmit(new FormData(sheetForm));
  };
}

function closeSheet(){
  sheet.hidden = true;
  backdrop.hidden = true;
  sheetForm.innerHTML = '';
}

closeSheetButton.addEventListener('click', closeSheet);
backdrop.addEventListener('click', closeSheet);

function openForm(kind){
  if(kind === 'add-saving'){
    openSheet('Añadir dinero','Hucha',`
      <div class="field"><label>Concepto</label><input name="name" maxlength="50" value="Aportación" required></div>
      <div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <button class="sheet-submit">Guardar</button>`, fd => {
        state.savings.push({name:fd.get('name'),amount:Number(fd.get('amount')),date:dateLabel()});
        saveState(); closeSheet(); render(); toast('Aportación añadida');
      });
  } else if(kind === 'add-expense'){
    openSheet('Añadir gasto','Inversión',`
      <div class="field"><label>Concepto</label><input name="name" maxlength="50" placeholder="Ej. Decoración" required></div>
      <div class="field"><label>Categoría</label><select name="category"><option>Material</option><option>Catering</option><option>Local</option><option>Otros</option></select></div>
      <div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <button class="sheet-submit">Guardar</button>`, fd => {
        state.expenses.push({name:fd.get('name'),category:fd.get('category'),amount:Number(fd.get('amount')),date:dateLabel()});
        saveState(); closeSheet(); render(); toast('Gasto añadido');
      });
  } else {
    openSheet('Añadir evento','Beneficios',`
      <div class="field"><label>Nombre</label><input name="name" maxlength="60" placeholder="Ej. Fiesta privada" required></div>
      <div class="field"><label>Ganancia (€)</label><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" required></div>
      <button class="sheet-submit">Guardar</button>`, fd => {
        state.events.push({name:fd.get('name'),amount:Number(fd.get('amount')),date:dateLabel()});
        saveState(); closeSheet(); render(); toast('Evento añadido');
      });
  }
}

function openSettings(){
  openSheet('Ajustes','Eventos',`
    <div class="field"><label>Objetivo de la hucha (€)</label><input name="goal" type="number" min="1" step="1" value="${state.goal}" required></div>
    <p class="helper">Los datos se guardan en este dispositivo.</p>
    <button class="sheet-submit">Guardar objetivo</button>
    <button type="button" class="danger-btn" id="resetAll">Borrar todos los datos</button>`, fd => {
      state.goal = Number(fd.get('goal'));
      saveState(); closeSheet(); render(); toast('Objetivo actualizado');
    });
  document.getElementById('resetAll').addEventListener('click', () => {
    if(confirm('¿Borrar todo el historial de la aplicación?')){
      state = { ...defaults, savings: [], expenses: [], events: [] };
      saveState(); closeSheet(); render(); toast('Datos borrados');
    }
  });
}

function clearList(key){
  if(!state[key]?.length){ toast('No hay datos que borrar'); return; }
  if(confirm('¿Vaciar este historial?')){
    state[key] = [];
    saveState();
    render();
    toast('Historial vaciado');
  }
}

function toast(message){
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 1800);
}

render();
