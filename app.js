const STORAGE_KEY = 'eventos-premium-v2';
const LEGACY_KEY = 'eventos-premium-v1';
const defaults = { goal: 7000, savings: [], expenses: [], events: [] };
let state = loadState();
let active = 'hucha';
let expenseFilter = 'Todos';
let selectedEventSlot = 1;

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('sheetBackdrop');
const sheetTitle = document.getElementById('sheetTitle');
const sheetEyebrow = document.getElementById('sheetEyebrow');
const sheetForm = document.getElementById('sheetForm');
const closeSheetButton = document.getElementById('closeSheet');

const slotLabels = ['Primer evento','Segundo evento','Tercer evento','Cuarto evento','Quinto evento'];
const slotShort = ['Primero','Segundo','Tercero','Cuarto','Quinto'];

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const expenses = Array.isArray(saved?.expenses) ? saved.expenses.map(item => ({...item,eventSlot:Number(item.eventSlot)||0})) : [];
    const events = Array.isArray(saved?.events) ? saved.events.map((item,index) => ({...item,slot:Number(item.slot)||Math.min(index+1,5)})) : [];
    return {
      goal: Number(saved?.goal) > 0 ? Number(saved.goal) : defaults.goal,
      savings: Array.isArray(saved?.savings) ? saved.savings : [],
      expenses,
      events
    };
  }catch{
    return { ...defaults, savings: [], expenses: [], events: [] };
  }
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const euro = value => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0));
const number = value => Number(value || 0);
const sum = list => list.reduce((acc,item) => acc + number(item.amount), 0);
const clean = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = () => new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(new Date());
const pct = (value,total) => total > 0 ? (value / total) * 100 : 0;

function eventForSlot(slot){ return state.events.find(item => Number(item.slot) === Number(slot)); }
function expensesForSlot(slot){ return state.expenses.filter(item => Number(item.eventSlot) === Number(slot)); }
function expenseTotalForSlot(slot){ return sum(expensesForSlot(slot)); }
function eventRevenue(slot){ return number(eventForSlot(slot)?.amount); }
function eventProfit(slot){ return eventRevenue(slot) - expenseTotalForSlot(slot); }
function totalRevenue(){ return sum(state.events); }
function totalExpenses(){ return sum(state.expenses); }
function totalProfit(){ return totalRevenue() - totalExpenses(); }
function moneyClass(value){ return number(value) < 0 ? 'negative' : number(value) > 0 ? 'positive' : ''; }

function header(){
  const subtitle = active === 'hucha' ? 'Tus metas, más cerca cada día' : active === 'inversion' ? 'Invierte con control y claridad' : 'Cada evento cuenta en tus resultados';
  return `
    <header class="premium-header">
      <div class="header-line">
        <div class="brand-copy">
          <div class="brand-title"><h1>Eventos</h1><span class="premium-badge">PREMIUM</span></div>
          <p>${subtitle}</p>
        </div>
        <button class="settings-button" id="settingsBtn" aria-label="Ajustes">⚙</button>
      </div>
      <nav class="tabs" aria-label="Secciones">
        <button class="tab ${active==='hucha'?'active purple':''}" data-tab="hucha">Ucha</button>
        <button class="tab ${active==='inversion'?'active blue':''}" data-tab="inversion">Inversión</button>
        <button class="tab ${active==='beneficios'?'active green':''}" data-tab="beneficios">Beneficios por eventos</button>
      </nav>
    </header>`;
}

function bottomNav(){
  return `<nav class="bottom-nav" aria-label="Navegación inferior">
    <button class="nav-btn ${active==='hucha'?'active purple':''}" data-tab="hucha"><span class="nav-symbol">€</span>Ucha</button>
    <button class="nav-btn ${active==='inversion'?'active blue':''}" data-tab="inversion"><span class="nav-symbol">▥</span>Inversión</button>
    <button class="nav-btn ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span class="nav-symbol">↗</span>Beneficios</button>
  </nav>`;
}

function emptyState(title,subtitle){
  return `<div class="empty-state"><strong>${title}</strong><p>${subtitle}</p></div>`;
}

function historyRows(list,type){
  if(!list.length) return '';
  const sign = type === 'expenses' ? '−' : '+';
  return `<div class="history-list">${[...list].reverse().slice(0,8).map(item => `
    <article class="history-row">
      <div class="history-copy">
        <strong>${clean(item.name || item.category || 'Movimiento')}</strong>
        <small>${clean(item.date || '')}${item.category ? ` · ${clean(item.category)}` : ''}${item.eventSlot ? ` · ${slotLabels[item.eventSlot-1]}` : ''}</small>
      </div>
      <div class="history-value ${type}">${sign}${euro(item.amount)}</div>
    </article>`).join('')}</div>`;
}

function huchaView(){
  const total = sum(state.savings);
  const goal = number(state.goal);
  const progress = Math.min(100, Math.max(0, Math.round(pct(total, goal))));
  const missing = Math.max(0, goal - total);
  return `<section class="screen theme-purple">
    ${header()}
    <main class="content">
      <section class="hero-panel purple-panel">
        <div class="hero-head"><div><span class="eyebrow-card">Objetivo de la Ucha</span><h2>${euro(goal)}</h2></div><button class="mini-button" data-action="edit-goal">Editar</button></div>
        <div class="goal-line"><span>${euro(total)} de ${euro(goal)}</span><strong>${progress}%</strong></div>
        <div class="progress-track"><span style="width:${progress}%"></span></div>
        <div class="metric-grid three">
          <div class="metric"><span>Total ahorrado</span><strong>${euro(total)}</strong></div>
          <div class="metric"><span>Falta por ahorrar</span><strong>${euro(missing)}</strong></div>
          <div class="metric"><span>Meta</span><strong>${progress}%</strong></div>
        </div>
        <button class="primary-button purple" data-action="add-saving"><span>＋</span>Añadir dinero</button>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Últimas aportaciones</h2><button class="text-button purple" data-clear="savings">Vaciar historial</button></div>
        ${state.savings.length ? historyRows(state.savings,'savings') : emptyState('Todavía no hay aportaciones','Añade la primera cuando quieras.')}
      </section>
      <div class="motivation purple-motivation"><strong>Tu objetivo, bajo control.</strong><span>Cada aportación actualiza automáticamente el progreso.</span></div>
    </main>
    ${bottomNav()}
  </section>`;
}

function inversionView(){
  const invested = totalExpenses();
  const profit = totalProfit();
  const profitability = invested > 0 ? (profit / invested) * 100 : 0;
  const filtered = expenseFilter === 'Todos' ? state.expenses : state.expenses.filter(item => item.category === expenseFilter);
  return `<section class="screen theme-blue">
    ${header()}
    <main class="content">
      <section class="hero-panel white-panel">
        <div class="hero-head"><div><span class="eyebrow-card">Total invertido</span><h2>${euro(invested)}</h2></div><div class="profit-box"><span>Rentabilidad</span><strong class="${moneyClass(profitability)}">${profitability.toFixed(2).replace('.',',')} %</strong></div></div>
        <div class="metric-grid four">
          <div class="metric"><span>Invertido</span><strong>${euro(invested)}</strong></div>
          <div class="metric"><span>Ingresos</span><strong class="positive">${euro(totalRevenue())}</strong></div>
          <div class="metric"><span>Resultado</span><strong class="${moneyClass(profit)}">${euro(profit)}</strong></div>
          <div class="metric"><span>Eventos</span><strong>${state.events.length}</strong></div>
        </div>
        <button class="primary-button blue" data-action="add-expense"><span>＋</span>Añadir inversión</button>
      </section>
      <div class="filter-row">${['Todos','Material','Catering','Local','Otros'].map(filter => `<button class="chip ${expenseFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div>
      <section class="list-section">
        <div class="section-head"><h2>Operaciones recientes</h2><button class="text-button blue" data-clear="expenses">Vaciar historial</button></div>
        ${filtered.length ? historyRows(filtered,'expenses') : emptyState('No hay inversiones','Añade una inversión y, si quieres, asígnala a un evento.')}
      </section>
      <div class="motivation blue-motivation"><strong>Invierte con orden.</strong><span>Las inversiones asignadas a un evento se descuentan de su beneficio.</span></div>
    </main>
    ${bottomNav()}
  </section>`;
}

function eventSelector(){
  return `<div class="event-selector" role="tablist" aria-label="Selecciona el evento">
    ${slotShort.map((label,index) => `<button class="event-slot ${selectedEventSlot===index+1?'active':''}" data-event-slot="${index+1}">${label}</button>`).join('')}
  </div>`;
}

function eventList(){
  return `<div class="event-list">${slotLabels.map((label,index) => {
    const slot = index + 1;
    const event = eventForSlot(slot);
    const profit = eventProfit(slot);
    return `<button class="event-row ${selectedEventSlot===slot?'selected':''}" data-event-slot="${slot}">
      <span class="event-index">${slot}</span>
      <span class="event-name"><strong>${clean(event?.name || label)}</strong><small>${event ? clean(event.date || '') : 'Sin registrar'}</small></span>
      <span class="event-profit ${moneyClass(profit)}">${event ? euro(profit) : '—'}</span>
    </button>`;
  }).join('')}</div>`;
}

function beneficiosView(){
  const event = eventForSlot(selectedEventSlot);
  const revenue = eventRevenue(selectedEventSlot);
  const invested = expenseTotalForSlot(selectedEventSlot);
  const profit = eventProfit(selectedEventSlot);
  const total = totalProfit();
  const count = state.events.length;
  const avg = count ? total / count : 0;
  return `<section class="screen theme-green">
    ${header()}
    <main class="content">
      <section class="hero-panel white-panel benefits-panel">
        <div class="section-kicker">Selecciona la posición del evento</div>
        <p class="section-helper">Elige primero, segundo, tercero, cuarto o quinto. Los cálculos se actualizan solos.</p>
        ${eventSelector()}
        <div class="selected-event-card">
          <span>Evento seleccionado</span>
          <strong>${clean(event?.name || slotLabels[selectedEventSlot-1])}</strong>
        </div>
        <div class="metric-grid two">
          <div class="metric large"><span>Ingresos del evento</span><strong>${euro(revenue)}</strong></div>
          <div class="metric large"><span>Inversión del evento</span><strong>${euro(invested)}</strong></div>
          <div class="metric large"><span>Beneficio del evento</span><strong class="${moneyClass(profit)}">${euro(profit)}</strong></div>
          <div class="metric large"><span>Beneficio total</span><strong class="${moneyClass(total)}">${euro(total)}</strong></div>
        </div>
        <button class="primary-button green" data-action="add-event"><span>＋</span>${event ? 'Editar evento' : 'Añadir evento'}</button>
      </section>
      <section class="stats-strip">
        <div><span>Eventos</span><strong>${count}</strong></div>
        <div><span>Ingreso total</span><strong>${euro(totalRevenue())}</strong></div>
        <div><span>Beneficio medio</span><strong class="${moneyClass(avg)}">${euro(avg)}</strong></div>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Lista de eventos</h2><button class="text-button green" data-clear="events">Vaciar eventos</button></div>
        ${eventList()}
      </section>
      <div class="motivation green-motivation"><strong>Beneficio neto real.</strong><span>Ingresos del evento menos las inversiones asignadas a ese evento.</span></div>
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
  document.querySelectorAll('[data-event-slot]').forEach(button => button.addEventListener('click', () => {
    selectedEventSlot = Number(button.dataset.eventSlot);
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
  if(kind === 'edit-goal'){
    openSettings();
    return;
  }
  if(kind === 'add-saving'){
    openSheet('Añadir dinero','Ucha',`
      <div class="field"><label>Concepto</label><input name="name" maxlength="50" value="Aportación" required></div>
      <div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <button class="sheet-submit purple-submit">Guardar aportación</button>`, fd => {
        state.savings.push({name:fd.get('name'),amount:number(fd.get('amount')),date:dateLabel()});
        saveState(); closeSheet(); render(); toast('Aportación añadida');
      });
  } else if(kind === 'add-expense'){
    openSheet('Añadir inversión','Inversión',`
      <div class="field"><label>Concepto</label><input name="name" maxlength="50" placeholder="Ej. Catering" required></div>
      <div class="field"><label>Categoría</label><select name="category"><option>Material</option><option>Catering</option><option>Local</option><option>Otros</option></select></div>
      <div class="field"><label>Asignar a evento</label><select name="eventSlot"><option value="0">General / sin asignar</option>${slotLabels.map((label,index)=>`<option value="${index+1}">${label}</option>`).join('')}</select></div>
      <div class="field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <button class="sheet-submit blue-submit">Guardar inversión</button>`, fd => {
        state.expenses.push({name:fd.get('name'),category:fd.get('category'),eventSlot:number(fd.get('eventSlot')),amount:number(fd.get('amount')),date:dateLabel()});
        saveState(); closeSheet(); render(); toast('Inversión añadida');
      });
  } else if(kind === 'add-event'){
    const current = eventForSlot(selectedEventSlot);
    openSheet(current ? 'Editar evento' : 'Añadir evento','Beneficios por eventos',`
      <div class="field"><label>Posición</label><select name="slot">${slotLabels.map((label,index)=>`<option value="${index+1}" ${selectedEventSlot===index+1?'selected':''}>${label}</option>`).join('')}</select></div>
      <div class="field"><label>Nombre del evento</label><input name="name" maxlength="60" value="${clean(current?.name || slotLabels[selectedEventSlot-1])}" required></div>
      <div class="field"><label>Ingresos del evento (€)</label><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" value="${number(current?.amount)}" required></div>
      <p class="helper">El beneficio neto será: ingresos − inversiones asignadas a esta posición.</p>
      <button class="sheet-submit green-submit">Guardar evento</button>`, fd => {
        const slot = number(fd.get('slot'));
        state.events = state.events.filter(item => number(item.slot) !== slot);
        state.events.push({slot,name:fd.get('name'),amount:number(fd.get('amount')),date:dateLabel()});
        state.events.sort((a,b)=>number(a.slot)-number(b.slot));
        selectedEventSlot = slot;
        saveState(); closeSheet(); render(); toast('Evento guardado');
      });
  }
}

function openSettings(){
  openSheet('Ajustes','Eventos',`
    <div class="field"><label>Objetivo de la Ucha (€)</label><input name="goal" type="number" min="1" step="1" value="${state.goal}" required></div>
    <p class="helper">Los datos se guardan en este dispositivo.</p>
    <button class="sheet-submit">Guardar objetivo</button>
    <button type="button" class="danger-btn" id="resetAll">Borrar todos los datos</button>`, fd => {
      state.goal = number(fd.get('goal'));
      saveState(); closeSheet(); render(); toast('Objetivo actualizado');
    });
  document.getElementById('resetAll').addEventListener('click', () => {
    if(confirm('¿Borrar todo el historial de la aplicación?')){
      state = { ...defaults, savings: [], expenses: [], events: [] };
      selectedEventSlot = 1;
      saveState(); closeSheet(); render(); toast('Datos borrados');
    }
  });
}

function clearList(key){
  if(!state[key]?.length){ toast('No hay datos que borrar'); return; }
  const label = key === 'events' ? 'eventos' : key === 'expenses' ? 'inversiones' : 'aportaciones';
  if(confirm(`¿Vaciar ${label}?`)){
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
