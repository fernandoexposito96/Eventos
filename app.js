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

function icon(name, size = 22){
  const paths = {
    piggy: '<path d="M5 11.5c0-3 2.7-5.5 6-5.5h3.5c2.7 0 4.8 1.5 5.8 3.8l1.7.7v4l-2 .8a7 7 0 0 1-2.1 2.5V21h-3v-2h-5v2H7v-2.9a6.6 6.6 0 0 1-2-4.6v-2Z"/><path d="M14.5 6V4.8c0-1.5 1.6-2.4 3-1.7l1.5.8-1.6 2.8"/><path d="M3 10H1.8C.8 10 .4 11.2 1.2 11.8L3 13"/><circle cx="16.5" cy="11" r=".7" fill="currentColor" stroke="none"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20V7"/><path d="M3 20h18"/>',
    trend: '<path d="M4 17 10 11l4 4 6-8"/><path d="M15 7h5v5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6V21h-4v-.1A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.8 13H2v-4h.8a1.8 1.8 0 0 0 1.6-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L6.7 3l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 1.9V2h4v-.1a1.8 1.8 0 0 0 1.1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1L20 5.8l-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21.1 9h.9v4h-.9a1.8 1.8 0 0 0-1.7 2Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17h2M14 17h2"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4M5 14v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>'
  };
  return `<svg class="svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.calendar}</svg>`;
}

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
const initials = text => String(text || 'EV').split(/\s+/).filter(Boolean).slice(0,2).map(v => v[0]).join('').toUpperCase();

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
  const subtitle = active === 'hucha' ? 'Pequeños esfuerzos, grandes eventos' : active === 'inversion' ? 'Planifica hoy, vive grandes momentos' : 'Eventos que dejan huella';
  return `
    <header class="premium-header">
      <div class="header-line">
        <div class="header-side"></div>
        <div class="brand-copy"><h1>Eventos</h1><p>${subtitle}</p></div>
        <button class="settings-button" id="settingsBtn" aria-label="Ajustes">${icon('gear',19)}</button>
      </div>
      <nav class="tabs" aria-label="Secciones">
        <button class="tab ${active==='hucha'?'active purple':''}" data-tab="hucha"><span>${icon('piggy',18)}</span>Ucha</button>
        <button class="tab ${active==='inversion'?'active blue':''}" data-tab="inversion"><span>${icon('chart',18)}</span>Inversión</button>
        <button class="tab ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span>${icon('trend',18)}</span>Beneficios</button>
      </nav>
    </header>`;
}

function bottomNav(){
  return `<nav class="bottom-nav" aria-label="Navegación inferior">
    <button class="nav-btn ${active==='hucha'?'active purple':''}" data-tab="hucha"><span class="nav-symbol">${icon('piggy',21)}</span>Ucha</button>
    <button class="nav-btn ${active==='inversion'?'active blue':''}" data-tab="inversion"><span class="nav-symbol">${icon('chart',21)}</span>Inversión</button>
    <button class="nav-btn ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span class="nav-symbol">${icon('trend',21)}</span>Beneficios</button>
  </nav>`;
}

function emptyState(title,subtitle){
  return `<div class="empty-state"><strong>${title}</strong><p>${subtitle}</p></div>`;
}

function clearButton(key, theme){
  return `<button class="text-button ${theme}" data-clear="${key}" aria-label="Vaciar historial">${icon('trash',14)}<span>Vaciar</span></button>`;
}

function historyRows(list,type){
  if(!list.length) return '';
  const sign = type === 'expenses' ? '−' : '+';
  return `<div class="history-list">${[...list].reverse().slice(0,8).map((item,index) => `
    <article class="history-row ${type}">
      <div class="history-avatar avatar-${index%4}">${initials(item.name || item.category || 'EV')}</div>
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
        <div class="feature-head">
          <div class="feature-icon purple-icon">${icon('piggy',27)}</div>
          <div class="feature-copy"><span class="eyebrow-card">Objetivo de la Ucha</span><p>Juntos hacemos posibles grandes eventos</p></div>
          <button class="mini-button" data-action="edit-goal">Editar</button>
        </div>
        <div class="hero-money">${euro(goal)}</div>
        <div class="goal-line"><span>${euro(total)} ahorrados</span><strong>${progress}%</strong></div>
        <div class="progress-track"><span style="width:${progress}%"></span></div>
        <div class="metric-grid three">
          <div class="metric"><strong>${euro(total)}</strong><span>Total ahorrado</span></div>
          <div class="metric"><strong>${euro(missing)}</strong><span>Falta por ahorrar</span></div>
          <div class="metric"><strong>${euro(goal)}</strong><span>Meta</span></div>
        </div>
        <button class="primary-button purple" data-action="add-saving">${icon('plus',20)}Añadir dinero</button>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Últimas aportaciones</h2>${clearButton('savings','purple')}</div>
        ${state.savings.length ? historyRows(state.savings,'savings') : emptyState('Todavía no hay aportaciones','Añade la primera cuando quieras.')}
      </section>
      <div class="motivation purple-motivation"><div class="motivation-icon">${icon('chart',20)}</div><div><strong>Cada aportación nos acerca al próximo evento.</strong><span>Disciplina hoy, mejores experiencias mañana.</span></div></div>
    </main>
    ${bottomNav()}
  </section>`;
}

function inversionView(){
  const invested = totalExpenses();
  const profit = totalProfit();
  const profitability = invested > 0 ? (profit / invested) * 100 : 0;
  const filtered = expenseFilter === 'Todos' ? state.expenses : state.expenses.filter(item => item.category === expenseFilter);
  const pctLabel = `${profitability >= 0 ? '+' : ''}${profitability.toFixed(1).replace('.',',')}%`;
  return `<section class="screen theme-blue">
    ${header()}
    <main class="content">
      <section class="hero-panel blue-panel">
        <div class="feature-head">
          <div class="feature-icon blue-icon">${icon('chart',27)}</div>
          <div class="feature-copy"><span class="eyebrow-card">Total invertido</span><p>Recursos que crean experiencias</p></div>
          <div class="profit-pill ${moneyClass(profitability)}">${icon('trend',15)}${pctLabel}</div>
        </div>
        <div class="hero-money">${euro(invested)}</div>
        <div class="metric-grid four">
          <div class="metric"><strong>${euro(invested)}</strong><span>Invertido</span></div>
          <div class="metric"><strong>${euro(totalRevenue())}</strong><span>Ingresos</span></div>
          <div class="metric"><strong class="${moneyClass(profit)}">${euro(profit)}</strong><span>Resultado</span></div>
          <div class="metric"><strong>${state.events.length}</strong><span>Eventos</span></div>
        </div>
        <button class="primary-button blue" data-action="add-expense">${icon('plus',20)}Añadir inversión</button>
      </section>
      <section class="list-section compact-top">
        <div class="section-head"><h2>Últimas operaciones</h2>${clearButton('expenses','blue')}</div>
        <div class="filter-row">${['Todos','Material','Catering','Local','Otros'].map(filter => `<button class="chip ${expenseFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div>
        ${filtered.length ? historyRows(filtered,'expenses') : emptyState('No hay inversiones','Añade una inversión y, si quieres, asígnala a un evento.')}
      </section>
      <div class="motivation blue-motivation"><div class="motivation-icon">${icon('chart',20)}</div><div><strong>Invertir en buenos eventos siempre da sus frutos.</strong><span>Experiencias que conectan, personas que recuerdan.</span></div></div>
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
      <span class="event-index event-color-${slot}">${icon('calendar',15)}</span>
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
      <section class="hero-panel green-panel benefits-panel">
        <div class="feature-head">
          <div class="feature-icon green-icon">${icon('trend',27)}</div>
          <div class="feature-copy"><span class="eyebrow-card">Selecciona la posición del evento</span><p>Consulta los resultados de cada evento</p></div>
        </div>
        ${eventSelector()}
        <div class="event-detail-card">
          <div class="event-detail-head"><span class="detail-icon">${icon('calendar',18)}</span><div><strong>${clean(event?.name || `Evento ${selectedEventSlot}`)}</strong><small>${clean(event?.date || 'Sin registrar')}</small></div></div>
          <div class="metric-grid two event-metrics">
            <div class="metric"><strong>${euro(revenue)}</strong><span>Ingresos del evento</span></div>
            <div class="metric"><strong class="negative-if-value">${euro(invested)}</strong><span>Inversión del evento</span></div>
            <div class="metric"><strong class="${moneyClass(profit)}">${euro(profit)}</strong><span>Beneficio del evento</span></div>
            <div class="metric"><strong class="${moneyClass(total)}">${euro(total)}</strong><span>Beneficio total</span></div>
          </div>
        </div>
        <button class="primary-button green" data-action="add-event">${icon('plus',20)}${event ? 'Editar evento' : 'Añadir evento'}</button>
      </section>
      <section class="stats-strip">
        <div><span class="stat-icon">${icon('calendar',18)}</span><strong>${count}</strong><small>Eventos</small></div>
        <div><span class="stat-icon">${icon('coins',18)}</span><strong>${euro(totalRevenue())}</strong><small>Ingreso total</small></div>
        <div><span class="stat-icon">${icon('trend',18)}</span><strong class="${moneyClass(avg)}">${euro(avg)}</strong><small>Beneficio medio</small></div>
      </section>
      <section class="list-section">
        <div class="section-head"><h2>Últimos eventos</h2>${clearButton('events','green')}</div>
        ${eventList()}
      </section>
      <div class="motivation green-motivation"><div class="motivation-icon">${icon('trend',20)}</div><div><strong>Grandes eventos, mejores recuerdos.</strong><span>El esfuerzo de hoy se vive mañana.</span></div></div>
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
    openSheet(current ? 'Editar evento' : 'Añadir evento','Beneficios',`
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