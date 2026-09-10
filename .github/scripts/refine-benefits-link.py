from pathlib import Path

app=Path('app.js')
s=app.read_text()

# Normalize legacy Catering records as Alcohol when local state is loaded.
s=s.replace("const expenses = Array.isArray(saved?.expenses) ? saved.expenses.map((item,index) => ({...item,id:item.id || makeId('expense',index),eventSlot:Number(item.eventSlot)||0})) : [];", "const expenses = Array.isArray(saved?.expenses) ? saved.expenses.map((item,index) => ({...item,id:item.id || makeId('expense',index),category:item.category==='Catering'?'Alcohol':item.category,eventSlot:Number(item.eventSlot)||0})) : [];", 1)

old_funcs="""function eventForSlot(slot){ return state.events.find(item => Number(item.slot) === Number(slot)); }
function expensesForSlot(slot){ return state.expenses.filter(item => Number(item.eventSlot) === Number(slot)); }
function expenseTotalForSlot(slot){ return sum(expensesForSlot(slot)); }
function eventRevenue(slot){ return number(eventForSlot(slot)?.amount); }
function eventProfit(slot){ return eventRevenue(slot) - expenseTotalForSlot(slot); }
function totalRevenue(){ return sum(state.events); }
function totalExpenses(){ return sum(state.expenses); }
function totalProfit(){ return totalRevenue() - totalExpenses(); }
"""
new_funcs="""function eventForSlot(slot){ return state.events.find(item => Number(item.slot) === Number(slot)); }
function expensesForSlot(slot){ return state.expenses.filter(item => Number(item.eventSlot) === Number(slot)); }
function expenseTotalForSlot(slot){ return sum(expensesForSlot(slot)); }
function eventRevenue(slot){ return number(eventForSlot(slot)?.amount); }
function eventProfit(slot){ return eventForSlot(slot) ? eventRevenue(slot) - expenseTotalForSlot(slot) : 0; }
function totalRevenue(){ return sum(state.events); }
function totalExpenses(){ return sum(state.expenses); }
function registeredEventExpenses(){ return state.expenses.filter(item => Number(item.eventSlot) > 0 && Boolean(eventForSlot(item.eventSlot))); }
function pendingExpenses(){ return state.expenses.filter(item => !(Number(item.eventSlot) > 0 && Boolean(eventForSlot(item.eventSlot)))); }
function registeredExpenseTotal(){ return sum(registeredEventExpenses()); }
function pendingExpenseTotal(){ return sum(pendingExpenses()); }
function totalProfit(){ return totalRevenue() - registeredExpenseTotal(); }
"""
if old_funcs not in s:
    raise SystemExit('financial functions anchor not found')
s=s.replace(old_funcs,new_funcs,1)

start=s.index('function beneficiosView(){')
end=s.index('\nfunction removeItem(', start)
old=s[start:end]
new="""function beneficiosView(){
  const event = eventForSlot(selectedEventSlot);
  const revenue = event ? eventRevenue(selectedEventSlot) : 0;
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
            <div class="metric"><strong>${euro(revenue)}</strong><span>Ingresos del evento</span></div>
            <div class="metric"><strong class="${event && invested>0?'negative':''}">${euro(invested)}</strong><span>Inversión del evento</span></div>
            <div class="metric"><strong class="${moneyClass(profit)}">${euro(profit)}</strong><span>Beneficio del evento</span></div>
            <div class="metric"><strong class="${moneyClass(total)}">${euro(total)}</strong><span>Beneficio total</span></div>
          </div>
          <div class="benefits-roi-row">
            <div><span>Rentabilidad (ROI)</span><strong class="${roi===null?'':moneyClass(roi)}">${roi===null ? (event ? 'Sin inversión' : 'Sin calcular') : `${roi>=0?'+':''}${roi.toFixed(1).replace('.',',')}%`}</strong></div>
            <small>${event ? (invested>0 ? 'Beneficio ÷ inversión' : 'Añade inversión para calcularla') : 'Registra este evento para activar sus resultados'}</small>
          </div>
          <div class="event-actions">
            <button class="secondary-button green" data-action="edit-event">${event ? 'Editar evento' : 'Añadir evento'}</button>
            <button class="primary-button green" data-action="add-event">${icon('plus',20)}${event ? 'Actualizar ingresos' : 'Registrar evento'}</button>
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
"""
s=s[:start]+new+s[end:]
app.write_text(s)

css=Path('styles.css')
c=css.read_text()
marker='/* Beneficios linked investment refinement v1 */'
if marker not in c:
    c += '''\n\n/* Beneficios linked investment refinement v1 */
.pending-investment-card{display:grid;grid-template-columns:46px minmax(0,1fr);gap:13px;align-items:center;margin-top:16px;padding:15px 16px;border:1px solid rgba(20,151,111,.16);border-radius:20px;background:linear-gradient(135deg,rgba(239,255,249,.96),rgba(244,248,255,.94));box-shadow:0 12px 28px rgba(24,98,85,.08)}
.pending-investment-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#14c999,#168cff);box-shadow:0 9px 18px rgba(20,169,142,.20)}
.pending-investment-copy{min-width:0}.pending-investment-copy span{display:block;color:#65798a;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.pending-investment-copy strong{display:block;margin-top:2px;color:#0f2d3a;font-size:23px;letter-spacing:-.5px}.pending-investment-copy small{display:block;margin-top:3px;color:#788995;font-size:9.5px;line-height:1.35}
.benefits-roi-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0 4px;padding:11px 13px;border:1px solid rgba(16,157,111,.13);border-radius:15px;background:rgba(255,255,255,.55)}
.benefits-roi-row>div{display:flex;align-items:baseline;gap:8px;min-width:0}.benefits-roi-row span{font-size:10px;color:#698079;font-weight:800}.benefits-roi-row strong{font-size:14px;color:#12352d;white-space:nowrap}.benefits-roi-row small{font-size:9px;color:#7a8f88;text-align:right;line-height:1.25;max-width:48%}
.benefits-breakdown-card{margin-top:14px;border-color:rgba(14,161,112,.16);background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(236,253,247,.92));box-shadow:0 14px 30px rgba(31,111,89,.08)}
.benefits-category-bars{display:grid;gap:10px;margin-top:14px}.benefits-category-copy{display:flex;justify-content:space-between;gap:10px;align-items:center;color:#687e77;font-size:10px}.benefits-category-copy strong{color:#183d34;font-size:10px}.benefits-category-track{height:8px;margin-top:5px;border-radius:999px;overflow:hidden;background:rgba(53,135,112,.11)}.benefits-category-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#19c995,#0aaa80 58%,#31a5e8);box-shadow:0 0 10px rgba(16,164,126,.18);transition:width .4s ease}
.summary-empty-value{font-size:13px!important;color:#7d8b96!important;line-height:1.2!important;white-space:normal!important}
@media(max-width:390px){.benefits-roi-row{align-items:flex-start;flex-direction:column;gap:4px}.benefits-roi-row small{max-width:none;text-align:left}.pending-investment-card{grid-template-columns:42px minmax(0,1fr);padding:13px}.pending-investment-icon{width:42px;height:42px}.pending-investment-copy strong{font-size:20px}}
'''
css.write_text(c)
