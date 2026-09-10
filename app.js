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
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'
  };
  return `<svg class="svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.calendar}</svg>`;
}

function makeId(prefix,index){
  return crypto.randomUUID?.() || `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function canonicalPerson(name){
  return String(name || '') === 'Jose' ? 'José' : String(name || '');
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const savings = Array.isArray(saved?.savings) ? saved.savings.map((item,index) => ({...item,id:item.id || makeId('saving',index),name:canonicalPerson(item.name)})) : [];
    const expenses = Array.isArray(saved?.expenses) ? saved.expenses.map((item,index) => ({...item,id:item.id || makeId('expense',index),category:item.category==='Catering'?'Alcohol':item.category,eventSlot:Number(item.eventSlot)||0})) : [];
    const events = Array.isArray(saved?.events) ? saved.events.map((item,index) => ({...item,id:item.id || makeId('event',index),slot:Number(item.slot)||Math.min(index+1,5)})) : [];
    return {
      goal: Number(saved?.goal) > 0 ? Number(saved.goal) : defaults.goal,
      savings,
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
function eventBenefit(slot){ return number(eventForSlot(slot)?.amount); }
function eventProfit(slot){ return eventForSlot(slot) ? eventBenefit(slot) : 0; }
function totalBenefits(){ return sum(state.events); }
function totalExpenses(){ return sum(state.expenses); }
function registeredEventExpenses(){ return state.expenses.filter(item => Number(item.eventSlot) > 0 && Boolean(eventForSlot(item.eventSlot))); }
function pendingExpenses(){ return state.expenses.filter(item => !(Number(item.eventSlot) > 0 && Boolean(eventForSlot(item.eventSlot)))); }
function registeredExpenseTotal(){ return sum(registeredEventExpenses()); }
function pendingExpenseTotal(){ return sum(pendingExpenses()); }
function totalProfit(){ return totalBenefits(); }
function savingsTotalForPerson(name){
  const wanted = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return sum(state.savings.filter(item => String(item.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() === wanted));
}
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
        <button class="tab ${active==='hucha'?'active purple':''}" data-tab="hucha"><span>${icon('piggy',18)}</span>Hucha</button>
        <button class="tab ${active==='inversion'?'active blue':''}" data-tab="inversion"><span>${icon('chart',18)}</span>Inversión</button>
        <button class="tab ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span>${icon('trend',18)}</span>Beneficios</button>
      </nav>
    </header>`;
}

function bottomNav(){
  return `<nav class="bottom-nav" aria-label="Navegación inferior">
    <button class="nav-btn ${active==='hucha'?'active purple':''}" data-tab="hucha"><span class="nav-symbol">${icon('piggy',21)}</span>Hucha</button>
    <button class="nav-btn ${active==='inversion'?'active blue':''}" data-tab="inversion"><span class="nav-symbol">${icon('chart',21)}</span>Inversión</button>
    <button class="nav-btn ${active==='beneficios'?'active green':''}" data-tab="beneficios"><span class="nav-symbol">${icon('trend',21)}</span>Beneficios</button>
  </nav>`;
}

function emptyState(title,subtitle){
  return `<div class="empty-state"><strong>${title}</strong><p>${subtitle}</p></div>`;
}

function historyRows(list,type,limit=8){
  if(!list.length) return '';
  const sign = type === 'expenses' ? '−' : '+';
  const reversed = [...list].reverse();
  const visible = limit > 0 ? reversed.slice(0,limit) : reversed;
  return `<div class="history-list">${visible.map((item,index) => `
    <article class="history-row ${type}">
      <div class="history-avatar avatar-${index%4}">${initials(item.name || item.category || 'EV')}</div>
      <div class="history-copy">
        <strong>${clean(item.detail || item.name || item.category || 'Movimiento')}</strong>
        <small>${clean(item.date || '')}${item.category ? ` · ${clean(item.category)}` : ''}${item.eventSlot ? ` · ${clean(eventForSlot(item.eventSlot)?.name || slotLabels[item.eventSlot-1] || `Evento ${item.eventSlot}`)}` : ''}</small>
      </div>
      <div class="history-value ${type}">
        <span>${sign}${euro(item.amount)}</span>
        <span class="history-actions">
          <button type="button" class="single-edit-btn" data-edit-type="${type}" data-edit-id="${clean(item.id)}" aria-label="Editar movimiento">${icon('edit',14)}</button>
          <button type="button" class="single-delete-btn" data-delete-type="${type}" data-delete-id="${clean(item.id)}" aria-label="Borrar solo este movimiento">${icon('trash',14)}</button>
        </span>
      </div>
    </article>`).join('')}</div>`;
}

function savingsEvolutionChart(){
  const items = [...state.savings].sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
  if(!items.length) return `<section class="insight-card savings-insight"><div class="insight-head"><div><span>Evolución</span><h3>Ahorro en el tiempo</h3></div>${icon('trend',19)}</div><div class="chart-empty">La gráfica aparecerá con la primera aportación.</div></section>`;
  let running = 0;
  const values = [0,...items.map(item => (running += number(item.amount)))];
  const max = Math.max(1,...values);
  const last = values.length - 1;
  const coords = values.map((value,index) => {
    const x = last ? 8 + (index / last) * 284 : 150;
    const y = 82 - (value / max) * 62;
    return [x.toFixed(1),y.toFixed(1)];
  });
  const points = coords.map(point => point.join(',')).join(' ');
  const finalPoint = coords[coords.length-1];
  return `<section class="insight-card savings-insight">
    <div class="insight-head"><div><span>Evolución</span><h3>Ahorro en el tiempo</h3></div><strong>${euro(values[values.length-1])}</strong></div>
    <svg class="savings-chart" viewBox="0 0 300 92" role="img" aria-label="Evolución del ahorro">
      <line x1="8" y1="82" x2="292" y2="82" class="chart-axis"></line>
      <polyline points="${points}" class="chart-line"></polyline>
      <circle cx="${finalPoint[0]}" cy="${finalPoint[1]}" r="4" class="chart-dot"></circle>
    </svg>
    <div class="chart-foot"><span>${items.length} ${items.length===1?'aportación':'aportaciones'}</span><span>Meta ${euro(state.goal)}</span></div>
  </section>`;
}

function profitComparisonChart(){
  const items = [...state.events].sort((a,b) => number(a.slot)-number(b.slot));
  if(!items.length) return `<section class="insight-card profit-insight"><div class="insight-head"><div><span>Comparativa</span><h3>Beneficio por evento</h3></div>${icon('chart',19)}</div><div class="chart-empty">Registra un evento para ver la comparativa.</div></section>`;
  const rows = items.map(item => ({...item,profit:eventProfit(item.slot)}));
  const max = Math.max(1,...rows.map(item => Math.abs(item.profit)));
  return `<section class="insight-card profit-insight">
    <div class="insight-head"><div><span>Comparativa</span><h3>Beneficio por evento</h3></div><strong class="${moneyClass(totalProfit())}">${euro(totalProfit())}</strong></div>
    <div class="profit-bars">${rows.map(item => {
      const width = Math.max(4,Math.round(Math.abs(item.profit)/max*100));
      return `<div class="profit-bar-row"><div class="profit-bar-copy"><span>${clean(item.name || `Evento ${item.slot}`)}</span><b class="${moneyClass(item.profit)}">${euro(item.profit)}</b></div><div class="profit-track"><span class="${moneyClass(item.profit)}" style="width:${width}%"></span></div></div>`;
    }).join('')}</div>
  </section>`;
}

function historyButton(type){
  return `<button type="button" class="section-link" data-open-history="${type}">Ver todo</button>`;
}

function huchaView(){
  const total = sum(state.savings);
  const goal = number(state.goal);
  const progress = Math.min(100, Math.max(0, Math.round(pct(total, goal))));
  const missing = Math.max(0, goal - total);
  const fernandoSaved = savingsTotalForPerson('Fernando');
  const joseSaved = savingsTotalForPerson('José');
  return `<section class="screen theme-purple">
    ${header()}
    <main class="content">
      <section class="hero-panel purple-panel">
        <div class="feature-head">
          <div class="feature-icon purple-icon">${icon('piggy',27)}</div>
          <div class="feature-copy"><span class="eyebrow-card">Objetivo de la Hucha</span><p>Juntos hacemos posibles grandes eventos</p></div>
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
        ${savingsEvolutionChart()}
        <div class="section-head"><h2>Últimas aportaciones</h2>${historyButton('savings')}</div>
        ${state.savings.length ? historyRows(state.savings,'savings') : emptyState('Todavía no hay aportaciones','Añade la primera cuando quieras.')}
      </section>
      <section class="person-contribution-section" aria-label="Contribuyentes">
        <div class="person-contribution-head">
          <div>
            <h2>Contribuyentes</h2>
            <p>Se actualiza automáticamente con cada aportación</p>
          </div>
          <button class="extract-link" type="button" data-view-extract>Ver extracto</button>
        </div>
        <div class="person-contribution-grid">
          <article class="person-contribution-card fernando-card">
            <div class="person-contribution-icon fernando-icon" aria-hidden="true">F</div>
            <div class="person-contribution-copy">
              <strong>Fernando</strong>
              <span>Total aportado</span>
              <b>${euro(fernandoSaved)}</b>
            </div>
          </article>
          <article class="person-contribution-card jose-card">
            <div class="person-contribution-icon jose-icon" aria-hidden="true">J</div>
            <div class="person-contribution-copy">
              <strong>José</strong>
              <span>Total aportado</span>
              <b>${euro(joseSaved)}</b>
            </div>
          </article>
        </div>
      </section>
      <div class="motivation purple-motivation"><div class="motivation-icon">${icon('chart',20)}</div><div><strong>Cada aportación nos acerca al próximo evento.</strong><span>Disciplina hoy, mejores experiencias mañana.</span></div></div>
    </main>
    ${bottomNav()}
  </section>`;
}

function investmentInsights(){
  const items = [...state.expenses].sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
  const invested = totalExpenses();
  const benefits = totalBenefits();
  const available = benefits;
  const managedTotal = benefits + invested;
  const categories = ['Material','Alcohol','Local','Otros'];
  const categoryTotals = categories.map(category => ({category,total:sum(state.expenses.filter(item => item.category === category))}));
  const categoryMax = Math.max(1,...categoryTotals.map(item => item.total));

  let running = 0;
  const values = [0,...items.map(item => (running += number(item.amount)))];
  const max = Math.max(1,...values);
  const last = values.length - 1;
  const coords = values.map((value,index) => {
    const x = last ? 8 + (index / last) * 284 : 150;
    const y = 82 - (value / max) * 62;
    return [x.toFixed(1),y.toFixed(1)];
  });
  const points = coords.map(point => point.join(',')).join(' ');
  const finalPoint = coords[coords.length-1] || ['8','82'];

  return `<section class="investment-insights" aria-label="Resumen visual de inversión">
    <section class="insight-card investment-evolution">
      <div class="insight-head"><div><span>Evolución</span><h3>Inversión en el tiempo</h3></div><strong>${euro(invested)}</strong></div>
      ${items.length ? `<svg class="investment-chart" viewBox="0 0 300 92" role="img" aria-label="Evolución de la inversión"><line x1="8" y1="82" x2="292" y2="82" class="investment-axis"></line><polyline points="${points}" class="investment-line"></polyline><circle cx="${finalPoint[0]}" cy="${finalPoint[1]}" r="4" class="investment-dot"></circle></svg><div class="investment-chart-foot"><span>${items.length} ${items.length===1?'operación':'operaciones'}</span><span>Total ${euro(invested)}</span></div>` : `<div class="investment-chart-empty">La evolución aparecerá con la primera inversión.</div>`}
    </section>

    <section class="investment-budget-card">
      <div><span class="investment-kicker">Beneficio acumulado</span><strong class="${moneyClass(available)}">${euro(available)}</strong><small>Beneficios ${euro(totalBenefits())} · Invertido ${euro(invested)}</small></div>
      <div class="investment-budget-ring" style="--budget-progress:${Math.min(100, managedTotal>0 ? invested/managedTotal*100 : 0).toFixed(1)}%"><span>${managedTotal>0 ? Math.round(invested/managedTotal*100) : 0}%</span></div>
    </section>

    <section class="insight-card investment-category-card">
      <div class="insight-head"><div><span>Distribución</span><h3>Inversión por categoría</h3></div>${icon('chart',19)}</div>
      <div class="investment-category-bars">${categoryTotals.map(item => `<div class="investment-category-row"><div class="investment-category-copy"><span>${item.category}</span><strong>${euro(item.total)}</strong></div><div class="investment-category-track"><span style="width:${item.total>0 ? Math.max(5,Math.round(item.total/categoryMax*100)) : 0}%"></span></div></div>`).join('')}</div>
    </section>
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
          <div class="metric"><strong>${euro(totalBenefits())}</strong><span>Beneficios</span></div>
          <div class="metric"><strong class="${moneyClass(profit)}">${euro(profit)}</strong><span>Resultado</span></div>
          <div class="metric"><strong>${state.events.length}</strong><span>Eventos</span></div>
        </div>
        <button class="primary-button blue" data-action="add-expense">${icon('plus',20)}Añadir inversión</button>
      </section>
      ${investmentInsights()}
      <section class="list-section compact-top">
        <div class="section-head"><h2>Últimas operaciones</h2>${historyButton('expenses')}</div>
        <div class="filter-row">${['Todos','Material','Alcohol','Local','Otros'].map(filter => `<button class="chip ${expenseFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div>
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
      ${event ? `<span class="single-event-delete" role="button" tabindex="0" data-delete-event-slot="${slot}" aria-label="Borrar solo este evento">${icon('trash',14)}</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function beneficiosView(){
  const event = eventForSlot(selectedEventSlot);
  const declaredBenefit = event ? eventBenefit(selectedEventSlot) : 0;
  const invested = event ? expenseTotalForSlot(selectedEventSlot) : 0;
  const profit = event ? eventProfit(selectedEventSlot) : 0;
  const total = totalProfit();
  const count = state.events.length;
  const avg = count ? total / count : 0;
  const pending = pendingExpenseTotal();
  const roi = event && invested > 0 ? (profit / invested) * 100 : null;
  const categories = ['Material','Alcohol','Local','Otros'];
  const categoryRows = categories.map(category => ({
    category,
    total: event ? sum(expensesForSlot(selectedEventSlot).filter(item => (item.category==='Catering'?'Alcohol':item.category) === category)) : 0
  }));
  const categoryMax = Math.max(1,...categoryRows.map(item => item.total));
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
            <div class="metric"><strong class="${moneyClass(declaredBenefit)}">${euro(declaredBenefit)}</strong><span>Beneficio neto</span></div>
            <div class="metric"><strong class="${event && invested>0?'negative':''}">${euro(invested)}</strong><span>Inversión del evento</span></div>
            <div class="metric"><strong>${euro(declaredBenefit + invested)}</strong><span>Total gestionado</span></div>
            <div class="metric"><strong class="${moneyClass(total)}">${euro(total)}</strong><span>Beneficio total</span></div>
          </div>
          <div class="benefits-roi-row">
            <div><span>Rentabilidad (ROI)</span><strong class="${roi===null?'':moneyClass(roi)}">${roi===null ? (event ? 'Sin inversión' : 'Sin calcular') : `${roi>=0?'+':''}${roi.toFixed(1).replace('.',',')}%`}</strong></div>
            <small>${event ? (invested>0 ? 'Beneficio ÷ inversión' : 'Añade inversión para calcularla') : 'Registra este evento para activar sus resultados'}</small>
          </div>
          <div class="event-actions">
            <button class="secondary-button green" data-action="edit-event">${event ? 'Editar evento' : 'Añadir evento'}</button>
            <button class="primary-button green" data-action="add-event">${icon('plus',20)}${event ? 'Actualizar beneficio' : 'Registrar evento'}</button>
          </div>
        </div>
      </section>

      ${pending>0 ? `<section class="pending-investment-card">
        <div class="pending-investment-icon">${icon('chart',20)}</div>
        <div class="pending-investment-copy"><span>Inversión pendiente de asignar</span><strong>${euro(pending)}</strong><small>No cuenta como pérdida en Beneficios hasta estar vinculada a un evento registrado.</small></div>
      </section>` : ''}

      ${event && invested>0 ? `<section class="insight-card benefits-breakdown-card">
        <div class="insight-head"><div><span>Desglose</span><h3>Inversión de este evento</h3></div><strong>${euro(invested)}</strong></div>
        <div class="benefits-category-bars">${categoryRows.map(item => `<div class="benefits-category-row"><div class="benefits-category-copy"><span>${item.category}</span><strong>${euro(item.total)}</strong></div><div class="benefits-category-track"><span style="width:${item.total>0?Math.max(5,Math.round(item.total/categoryMax*100)):0}%"></span></div></div>`).join('')}</div>
      </section>` : ''}

      <section class="list-section compact-top">
        <div class="section-head"><h2>Últimos eventos</h2></div>
        ${eventList()}
      </section>
      ${profitComparisonChart()}
      <section class="summary-section">
        <div class="summary-card"><span>Beneficio total</span><strong class="${moneyClass(total)}">${euro(total)}</strong></div>
        <div class="summary-card"><span>Media por evento</span><strong class="${count?moneyClass(avg):'summary-empty-value'}">${count ? euro(avg) : 'Sin media todavía'}</strong></div>
      </section>
      <div class="motivation green-motivation"><div class="motivation-icon">${icon('trend',20)}</div><div><strong>Lo importante no es solo ganar, sino crear algo que la gente recuerde.</strong><span>Cada evento es una nueva oportunidad para crecer.</span></div></div>
    </main>
    ${bottomNav()}
  </section>`;
}

function removeItem(type,id){
  if(!['savings','expenses'].includes(type)) return;
  const list = state[type] || [];
  const index = list.findIndex(item => String(item.id || '') === String(id || ''));
  if(index < 0){ toast('No se encontró ese movimiento'); return; }
  if(!confirm('¿Borrar solo este movimiento?')) return;
  list.splice(index,1);
  saveState();
  render();
  toast('Movimiento eliminado');
}

function removeEvent(slot){
  const item = eventForSlot(slot);
  if(!item) return;
  if(!confirm('¿Borrar solo este evento?')) return;
  state.events = state.events.filter(row => Number(row.slot) !== Number(slot));
  saveState();
  render();
  toast('Evento eliminado');
}

function render(){
  app.innerHTML = active === 'hucha' ? huchaView() : active === 'inversion' ? inversionView() : beneficiosView();
  app.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { active = button.dataset.tab; render(); }));
  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => openAction(button.dataset.action)));
  app.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { expenseFilter = button.dataset.filter; render(); }));
  app.querySelectorAll('[data-event-slot]').forEach(button => button.addEventListener('click', () => { selectedEventSlot = Number(button.dataset.eventSlot); render(); }));
  app.querySelectorAll('[data-edit-id]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openEditMovement(button.dataset.editType,button.dataset.editId);
  }));
  app.querySelectorAll('[data-open-history]').forEach(button => button.addEventListener('click', () => openHistory(button.dataset.openHistory)));
  app.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    removeItem(button.dataset.deleteType,button.dataset.deleteId);
  }));
  app.querySelectorAll('[data-delete-event-slot]').forEach(button => {
    const run = event => {
      event.preventDefault();
      event.stopPropagation();
      removeEvent(Number(button.dataset.deleteEventSlot));
    };
    button.addEventListener('click',run);
    button.addEventListener('keydown',event => { if(event.key === 'Enter' || event.key === ' ') run(event); });
  });
  app.querySelector('[data-view-extract]')?.addEventListener('click', () => {
    app.querySelector('.theme-purple .list-section')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
}

function openAction(action){
  if(action === 'edit-goal') return openGoal();
  if(action === 'add-saving') return openSaving();
  if(action === 'add-expense') return openExpense();
  if(action === 'add-event' || action === 'edit-event') return openEvent();
}

function field(label,name,type='text',value='',extra=''){
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${clean(value)}" ${extra} required></div>`;
}

function openSheet(eyebrow,title,html,onSubmit){
  sheetEyebrow.textContent = eyebrow;
  sheetTitle.textContent = title;
  sheetForm.innerHTML = html;
  const categorySelect = sheetForm.querySelector('#expenseCategory');
  const otherField = sheetForm.querySelector('#expenseOtherField');
  const syncOtherField = () => {
    if(!categorySelect || !otherField) return;
    const isOther = categorySelect.value === 'Otros';
    otherField.hidden = !isOther;
    const input = otherField.querySelector('input[name="detail"]');
    if(input) input.required = isOther;
  };
  categorySelect?.addEventListener('change', syncOtherField);
  syncOtherField();
  sheetForm.onsubmit = event => { event.preventDefault(); onSubmit(new FormData(sheetForm)); };
  backdrop.hidden = false;
  sheet.hidden = false;
  requestAnimationFrame(() => { backdrop.classList.add('show'); sheet.classList.add('show'); });
}

function closeSheet(){
  backdrop.classList.remove('show'); sheet.classList.remove('show');
  setTimeout(() => { backdrop.hidden = true; sheet.hidden = true; sheetForm.innerHTML = ''; }, 180);
}

function openGoal(){
  openSheet('Hucha','Editar objetivo',`${field('Objetivo de ahorro','goal','number',state.goal,'min="1" step="1"')}<button class="sheet-submit purple">Guardar objetivo</button>`, data => {
    state.goal = number(data.get('goal')) || state.goal;
    saveState(); closeSheet(); render(); toast('Objetivo actualizado');
  });
}

function openSaving(){
  openSheet('Hucha','Añadir dinero',`
      <div class="field"><label>Persona</label><select name="name" required><option value="Fernando">Fernando</option><option value="José">José</option></select></div>
      ${field('Cantidad','amount','number','','min="0.01" step="0.01"')}
      ${field('Fecha','date','date',new Date().toISOString().slice(0,10))}
      <button class="sheet-submit purple">Añadir aportación</button>`, data => {
        state.savings.push({id:crypto.randomUUID?.() || String(Date.now()), name:canonicalPerson(data.get('name')), amount:number(data.get('amount')), date:String(data.get('date') || dateLabel())});
        saveState(); closeSheet(); render(); toast('Aportación añadida');
      });
}

function openExpense(){
  const options = ['Material','Alcohol','Local','Otros'].map(item => `<option>${item}</option>`).join('');
  const eventOptions = `<option value="0">Sin asignar</option>${slotLabels.map((label,index)=>`<option value="${index+1}">${clean(eventForSlot(index+1)?.name || label)}</option>`).join('')}`;
  openSheet('Inversión','Añadir inversión',`
      <div class="field"><label>Categoría</label><select name="category" id="expenseCategory">${options}</select></div>
      <div class="field" id="expenseOtherField" hidden><label>¿Qué quieres añadir?</label><input name="detail" id="expenseDetail" type="text" placeholder="Ej. decoración, taxi, seguridad"></div>
      ${field('Cantidad','amount','number','','min="0.01" step="0.01"')}
      ${field('Fecha','date','date',new Date().toISOString().slice(0,10))}
      <div class="field"><label>Evento</label><select name="eventSlot">${eventOptions}</select></div>
      <button class="sheet-submit blue">Guardar inversión</button>`, data => {
        state.expenses.push({id:crypto.randomUUID?.() || String(Date.now()), category:String(data.get('category')), detail:String(data.get('category')) === 'Otros' ? String(data.get('detail') || '').trim() : '', amount:number(data.get('amount')), date:String(data.get('date') || dateLabel()), eventSlot:Number(data.get('eventSlot')) || 0});
        saveState(); closeSheet(); render(); toast('Inversión añadida');
      });
}

function openEvent(){
  const current = eventForSlot(selectedEventSlot);
  const pending = state.expenses.filter(item => {
    const assigned = Number(item.eventSlot) || 0;
    return assigned === 0 || assigned === selectedEventSlot;
  });
  const pendingHtml = pending.length ? `<div class="field pending-select-field"><label>Inversiones pendientes</label><div class="pending-expense-options">${pending.map(item => {
    const checked = Number(item.eventSlot) === selectedEventSlot ? 'checked' : '';
    const title = clean(item.detail || item.category || 'Inversión');
    return `<label class="pending-expense-option"><input type="checkbox" name="expenseIds" value="${clean(item.id)}" ${checked}><span><strong>${title}</strong><small>${clean(item.category || '')} · ${euro(item.amount)}</small></span></label>`;
  }).join('')}</div><small class="field-help">Marca las inversiones que pertenecen a este evento. Se usarán para el ROI y el desglose.</small></div>` : `<div class="field pending-select-field"><label>Inversiones pendientes</label><div class="pending-expense-empty">No hay inversiones pendientes para asignar.</div></div>`;
  openSheet('Beneficios', current ? 'Editar evento' : 'Registrar evento',`
      ${field('Nombre del evento','name','text',current?.name || '')}
      ${field('Beneficio','amount','number',current?.amount || '','min="0" step="0.01"')}
      ${field('Fecha','date','date',current?.date || new Date().toISOString().slice(0,10))}
      ${pendingHtml}
      <button class="sheet-submit green">${current ? 'Guardar cambios' : 'Registrar evento'}</button>`, data => {
        const selectedIds = new Set(data.getAll('expenseIds').map(String));
        state.expenses.forEach(item => {
          if(Number(item.eventSlot) === selectedEventSlot && !selectedIds.has(String(item.id))) item.eventSlot = 0;
          if(selectedIds.has(String(item.id))) item.eventSlot = selectedEventSlot;
        });
        const payload = {id:current?.id || crypto.randomUUID?.() || String(Date.now()), slot:selectedEventSlot, name:String(data.get('name')), amount:number(data.get('amount')), date:String(data.get('date') || dateLabel())};
        const index = state.events.findIndex(item => Number(item.slot) === selectedEventSlot);
        if(index >= 0) state.events[index] = payload; else state.events.push(payload);
        saveState(); closeSheet(); render(); toast(current ? 'Evento y asignaciones actualizados' : 'Evento registrado y asignado');
      });
}

function openHistory(type){
  if(!['savings','expenses'].includes(type)) return;
  const title = type === 'savings' ? 'Historial de aportaciones' : 'Historial de inversiones';
  const list = state[type] || [];
  openSheet('Historial',title,`
    <div class="history-search-wrap">${icon('search',17)}<input id="historySearch" type="search" placeholder="Buscar por nombre, fecha o categoría" aria-label="Buscar movimientos"></div>
    <div class="history-sheet-meta"><span>${list.length} ${list.length===1?'movimiento':'movimientos'}</span><strong>${euro(sum(list))}</strong></div>
    <div id="historySheetList">${list.length ? historyRows(list,type,0) : emptyState('Sin movimientos','Aquí aparecerá todo el histórico.')}</div>`, () => {});
  const search = document.getElementById('historySearch');
  search?.addEventListener('input', () => {
    const q = search.value.trim().toLocaleLowerCase('es');
    document.querySelectorAll('#historySheetList .history-row').forEach(row => {
      row.hidden = Boolean(q) && !row.textContent.toLocaleLowerCase('es').includes(q);
    });
  });
  sheetForm.querySelectorAll('[data-edit-id]').forEach(button => button.addEventListener('click', () => openEditMovement(button.dataset.editType,button.dataset.editId)));
  sheetForm.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.deleteId;
    const rowIndex = state[type].findIndex(item => String(item.id) === String(id));
    if(rowIndex < 0) return;
    if(!confirm('¿Borrar solo este movimiento?')) return;
    state[type].splice(rowIndex,1);
    saveState();
    render();
    openHistory(type);
    toast('Movimiento eliminado');
  }));
}

function openEditMovement(type,id){
  if(!['savings','expenses'].includes(type)) return;
  const item = state[type].find(row => String(row.id) === String(id));
  if(!item){ toast('No se encontró ese movimiento'); return; }
  if(type === 'savings'){
    openSheet('Hucha','Editar aportación',`
      <div class="field"><label>Persona</label><select name="name" required><option value="Fernando" ${canonicalPerson(item.name)==='Fernando'?'selected':''}>Fernando</option><option value="José" ${canonicalPerson(item.name)==='José'?'selected':''}>José</option></select></div>
      ${field('Cantidad','amount','number',item.amount,'min="0.01" step="0.01"')}
      ${field('Fecha','date','date',item.date || new Date().toISOString().slice(0,10))}
      <button class="sheet-submit purple">Guardar cambios</button>`, data => {
        item.name = canonicalPerson(data.get('name'));
        item.amount = number(data.get('amount'));
        item.date = String(data.get('date') || item.date || dateLabel());
        saveState(); closeSheet(); render(); toast('Aportación actualizada');
      });
    return;
  }
  const categories = ['Material','Alcohol','Local','Otros'].map(value => `<option ${item.category===value?'selected':''}>${value}</option>`).join('');
  const maxSlot = Math.max(5,...state.events.map(event => number(event.slot)));
  const eventOptions = `<option value="0" ${!number(item.eventSlot)?'selected':''}>Sin asignar</option>${Array.from({length:maxSlot},(_,index)=>index+1).map(slot => `<option value="${slot}" ${number(item.eventSlot)===slot?'selected':''}>${clean(eventForSlot(slot)?.name || slotLabels[slot-1] || `Evento ${slot}`)}</option>`).join('')}`;
  openSheet('Inversión','Editar inversión',`
    <div class="field"><label>Categoría</label><select name="category" id="expenseCategory">${categories}</select></div>
    <div class="field" id="expenseOtherField" ${item.category==='Otros'?'':'hidden'}><label>¿Qué quieres añadir?</label><input name="detail" id="expenseDetail" type="text" value="${clean(item.detail || '')}" placeholder="Ej. decoración, taxi, seguridad"></div>
    ${field('Cantidad','amount','number',item.amount,'min="0.01" step="0.01"')}
    ${field('Fecha','date','date',item.date || new Date().toISOString().slice(0,10))}
    <div class="field"><label>Evento</label><select name="eventSlot">${eventOptions}</select></div>
    <button class="sheet-submit blue">Guardar cambios</button>`, data => {
      item.category = String(data.get('category'));
      item.detail = item.category === 'Otros' ? String(data.get('detail') || '').trim() : '';
      item.amount = number(data.get('amount'));
      item.date = String(data.get('date') || item.date || dateLabel());
      item.eventSlot = Number(data.get('eventSlot')) || 0;
      saveState(); closeSheet(); render(); toast('Inversión actualizada');
    });
}

function openSettings(){
  openSheet('Eventos','Ajustes',`
    <div class="settings-copy"><strong>Panel privado</strong><p>Gestiona la Hucha, inversiones y beneficios de vuestros eventos desde un único lugar.</p></div>
    <button type="button" class="secondary-button neutral" id="resetApp">Restablecer datos</button>`, () => {});
  document.getElementById('resetApp')?.addEventListener('click', () => {
    if(!confirm('¿Restablecer todos los datos?')) return;
    state = { ...defaults, savings: [], expenses: [], events: [] };
    saveState(); closeSheet(); render(); toast('Datos restablecidos');
  });
}

function toast(message){
  const node = document.getElementById('toast');
  if(!node) return;
  node.textContent = message;
  node.hidden = false;
  requestAnimationFrame(() => node.classList.add('show'));
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.hidden = true, 180); }, 2200);
}

closeSheetButton?.addEventListener('click', closeSheet);
backdrop?.addEventListener('click', closeSheet);
document.addEventListener('keydown', event => { if(event.key === 'Escape' && !sheet.hidden) closeSheet(); });

render();