from pathlib import Path
import re

app_path = Path('app.js')
css_path = Path('styles.css')
index_path = Path('index.html')
app = app_path.read_text()

# 1) Icons used by edit/search controls.
old_icons = "    trash: '<path d=\"M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6\"/>'"
new_icons = "    trash: '<path d=\"M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6\"/>',\n    edit: '<path d=\"M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z\"/><path d=\"m13.5 6.5 4 4\"/>',\n    search: '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/>'"
if old_icons in app:
    app = app.replace(old_icons, new_icons, 1)

# 2) Replace limited history renderer with reusable full-history renderer + charts.
new_history = r'''function historyRows(list,type,limit=8){
  if(!list.length) return '';
  const sign = type === 'expenses' ? '−' : '+';
  const reversed = [...list].reverse();
  const visible = limit > 0 ? reversed.slice(0,limit) : reversed;
  return `<div class="history-list">${visible.map((item,index) => `
    <article class="history-row ${type}">
      <div class="history-avatar avatar-${index%4}">${initials(item.name || item.category || 'EV')}</div>
      <div class="history-copy">
        <strong>${clean(item.name || item.category || 'Movimiento')}</strong>
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
'''
pattern = r"function historyRows\(list,type\)\{.*?\n\}\n\nfunction huchaView\(\)\{"
if not re.search(pattern, app, flags=re.S):
    raise SystemExit('historyRows anchor not found')
app = re.sub(pattern, new_history + "\nfunction huchaView(){", app, count=1, flags=re.S)

# 3) Insert chart cards and history links into the existing views.
old = '      <section class="list-section">\n        <div class="section-head"><h2>Últimas aportaciones</h2></div>'
new = '      ${savingsEvolutionChart()}\n      <section class="list-section">\n        <div class="section-head"><h2>Últimas aportaciones</h2>${historyButton(\'savings\')}</div>'
if old not in app:
    raise SystemExit('hucha history anchor not found')
app = app.replace(old,new,1)

old = '        <div class="section-head"><h2>Últimas operaciones</h2></div>'
new = '        <div class="section-head"><h2>Últimas operaciones</h2>${historyButton(\'expenses\')}</div>'
if old not in app:
    raise SystemExit('investment history anchor not found')
app = app.replace(old,new,1)

old = '      <section class="summary-section">'
new = '      ${profitComparisonChart()}\n      <section class="summary-section">'
if old not in app:
    raise SystemExit('benefits summary anchor not found')
app = app.replace(old,new,1)

# 4) Wire edit/history actions in render().
anchor = "  app.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', event => {"
if anchor not in app:
    raise SystemExit('render anchor not found')
insert = """  app.querySelectorAll('[data-edit-id]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openEditMovement(button.dataset.editType,button.dataset.editId);
  }));
  app.querySelectorAll('[data-open-history]').forEach(button => button.addEventListener('click', () => openHistory(button.dataset.openHistory)));
"""
app = app.replace(anchor,insert+anchor,1)

# 5) Full searchable history + edit forms.
feature_functions = r'''function openHistory(type){
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
  const categories = ['Material','Catering','Local','Otros'].map(value => `<option ${item.category===value?'selected':''}>${value}</option>`).join('');
  const maxSlot = Math.max(5,...state.events.map(event => number(event.slot)));
  const eventOptions = `<option value="0" ${!number(item.eventSlot)?'selected':''}>Sin asignar</option>${Array.from({length:maxSlot},(_,index)=>index+1).map(slot => `<option value="${slot}" ${number(item.eventSlot)===slot?'selected':''}>${clean(eventForSlot(slot)?.name || slotLabels[slot-1] || `Evento ${slot}`)}</option>`).join('')}`;
  openSheet('Inversión','Editar inversión',`
    <div class="field"><label>Categoría</label><select name="category">${categories}</select></div>
    ${field('Cantidad','amount','number',item.amount,'min="0.01" step="0.01"')}
    ${field('Fecha','date','date',item.date || new Date().toISOString().slice(0,10))}
    <div class="field"><label>Evento</label><select name="eventSlot">${eventOptions}</select></div>
    <button class="sheet-submit blue">Guardar cambios</button>`, data => {
      item.category = String(data.get('category'));
      item.amount = number(data.get('amount'));
      item.date = String(data.get('date') || item.date || dateLabel());
      item.eventSlot = Number(data.get('eventSlot')) || 0;
      saveState(); closeSheet(); render(); toast('Inversión actualizada');
    });
}

'''
anchor = 'function openSettings(){'
if anchor not in app:
    raise SystemExit('settings anchor not found')
app = app.replace(anchor,feature_functions+anchor,1)
app_path.write_text(app)

# 6) Style the new features in the existing global stylesheet only.
css = css_path.read_text()
marker = '/* Eventos insights/history v1 */'
if marker not in css:
    css += r'''

/* Eventos insights/history v1 */
.section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.section-link{border:0;background:transparent;padding:4px 0;font:inherit;font-size:12px;font-weight:800;color:#684cff;cursor:pointer}
.theme-blue .section-link{color:#356df3}
.history-value{gap:7px;flex-wrap:nowrap}
.history-actions{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
.single-edit-btn,.single-delete-btn{width:29px;height:29px;border:0;border-radius:10px;display:inline-grid;place-items:center;padding:0;cursor:pointer}
.single-edit-btn{background:#f1f4fb;color:#60708e}
.single-delete-btn{background:#f5f5f8;color:#e34b58}
.insight-card{margin-top:18px;padding:15px 16px;border:1px solid #e9edf5;border-radius:20px;background:rgba(255,255,255,.98);box-shadow:0 10px 28px rgba(19,31,54,.07)}
.insight-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
.insight-head>div{display:flex;flex-direction:column;gap:1px;min-width:0}
.insight-head span{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8b95aa}
.insight-head h3{margin:0;font-size:15px;line-height:1.2;color:#17233a}
.insight-head>strong{font-size:14px;color:#17233a;white-space:nowrap}
.savings-chart{display:block;width:100%;height:92px;overflow:visible}
.chart-axis{stroke:#e9edf6;stroke-width:1}
.chart-line{fill:none;stroke:#7452ff;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.chart-dot{fill:#7452ff;stroke:#fff;stroke-width:3}
.chart-foot{display:flex;justify-content:space-between;gap:12px;margin-top:2px;color:#8a95aa;font-size:9.5px}
.chart-empty{padding:17px 4px 8px;color:#8792a8;font-size:11px;text-align:center}
.profit-bars{display:grid;gap:10px;margin-top:12px}
.profit-bar-row{display:grid;gap:5px}
.profit-bar-copy{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10.5px;color:#56627a}
.profit-bar-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.profit-bar-copy b{font-size:10.5px;white-space:nowrap}
.profit-track{height:7px;border-radius:999px;background:#eef2f6;overflow:hidden}
.profit-track>span{display:block;height:100%;border-radius:inherit;background:#20b574}
.profit-track>span.negative{background:#e45a66}
.history-search-wrap{display:flex;align-items:center;gap:8px;border:1px solid #e3e7ef;background:#f8faff;border-radius:14px;padding:0 11px;margin-bottom:10px;color:#7d899f}
.history-search-wrap input{width:100%;height:44px;border:0;outline:0;background:transparent;font:inherit;font-size:12px;color:#17233a}
.history-sheet-meta{display:flex;justify-content:space-between;align-items:center;margin:4px 2px 12px;color:#7b879c;font-size:10px}
.history-sheet-meta strong{color:#17233a;font-size:12px}
#historySheetList{max-height:52vh;overflow:auto;padding-right:2px}
#historySheetList .history-row{margin-bottom:7px}
@media(max-width:390px){.insight-card{padding:13px 14px;border-radius:18px}.single-edit-btn,.single-delete-btn{width:27px;height:27px}}
'''
css_path.write_text(css)

# 7) Cache bust only the files changed by this feature release.
index = index_path.read_text()
index = index.replace('./styles.css?v=20260910-stable-v2','./styles.css?v=20260910-features-v1')
index = index.replace('./app.js?v=20260910-stable-v2','./app.js?v=20260910-features-v1')
index_path.write_text(index)
