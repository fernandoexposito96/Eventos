from pathlib import Path

app_path=Path('app.js')
css_path=Path('styles.css')
app=app_path.read_text()
css=css_path.read_text()

marker='function inversionView(){'
if 'function investmentInsights(){' not in app:
    helpers=r'''function investmentInsights(){
  const items = [...state.expenses].sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
  const invested = totalExpenses();
  const revenue = totalRevenue();
  const available = revenue - invested;
  const categories = ['Material','Catering','Local','Otros'];
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
      <div><span class="investment-kicker">Presupuesto disponible</span><strong class="${moneyClass(available)}">${euro(available)}</strong><small>Ingresos ${euro(revenue)} · Invertido ${euro(invested)}</small></div>
      <div class="investment-budget-ring" style="--budget-progress:${Math.min(100, revenue>0 ? invested/revenue*100 : 0).toFixed(1)}%"><span>${revenue>0 ? Math.round(invested/revenue*100) : 0}%</span></div>
    </section>

    <section class="insight-card investment-category-card">
      <div class="insight-head"><div><span>Distribución</span><h3>Inversión por categoría</h3></div>${icon('chart',19)}</div>
      <div class="investment-category-bars">${categoryTotals.map(item => `<div class="investment-category-row"><div class="investment-category-copy"><span>${item.category}</span><strong>${euro(item.total)}</strong></div><div class="investment-category-track"><span style="width:${item.total>0 ? Math.max(5,Math.round(item.total/categoryMax*100)) : 0}%"></span></div></div>`).join('')}</div>
    </section>
  </section>`;
}

'''
    app=app.replace(marker,helpers+marker,1)

needle='''      <section class="list-section compact-top">\n        <div class="section-head"><h2>Últimas operaciones</h2>${historyButton('expenses')}</div>'''
if '${investmentInsights()}' not in app:
    if needle not in app:
        raise SystemExit('investment insertion point not found')
    app=app.replace(needle,'''      ${investmentInsights()}\n      <section class="list-section compact-top">\n        <div class="section-head"><h2>Últimas operaciones</h2>${historyButton('expenses')}</div>''',1)

css_marker='/* Investment insights premium v1 */'
if css_marker not in css:
    css += r'''

/* Investment insights premium v1 */
.investment-insights{display:grid;gap:14px;margin-top:18px}
.theme-blue .investment-insights+.list-section{margin-top:20px}
.investment-insights .insight-card{border-color:rgba(22,114,234,.16);background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(235,245,255,.90));box-shadow:0 14px 32px rgba(28,91,168,.10)}
.investment-evolution{overflow:hidden;position:relative}
.investment-evolution:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,transparent 18%,rgba(65,177,255,.08),transparent 50%)}
.investment-chart{display:block;width:100%;height:auto;margin-top:8px;padding:4px 0;background-image:linear-gradient(rgba(54,124,214,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(54,124,214,.07) 1px,transparent 1px);background-size:25% 25%;border-radius:15px}
.investment-axis{stroke:rgba(71,111,166,.20);stroke-width:1}
.investment-line{fill:none;stroke:url(#none);stroke:#168cff;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:650;stroke-dashoffset:650;filter:drop-shadow(0 3px 6px rgba(19,126,245,.28));animation:investmentLineDraw 1.15s cubic-bezier(.2,.8,.2,1) forwards}
.investment-dot{fill:#6a5cff;stroke:#fff;stroke-width:3;transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 6px rgba(40,143,255,.55));animation:investmentDotIn .4s ease-out .9s both,investmentDotPulse 2.1s ease-in-out 1.3s infinite}
.investment-chart-foot{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#72839b;font-size:10px;font-weight:700}
.investment-chart-foot span:first-child{color:#137ce8}
.investment-chart-empty{padding:25px 8px 10px;text-align:center;color:#8190a6;font-size:11px}
.investment-budget-card{display:grid;grid-template-columns:minmax(0,1fr) 76px;align-items:center;gap:15px;padding:16px 17px;border:1px solid rgba(25,131,241,.18);border-radius:20px;background:linear-gradient(135deg,#edf8ff,#f5f1ff);box-shadow:0 13px 28px rgba(28,91,168,.09)}
.investment-budget-card>div:first-child{min-width:0}
.investment-kicker{display:block;color:#69809f;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.investment-budget-card strong{display:block;margin-top:5px;font-size:25px;letter-spacing:-.7px;color:#0d2545}
.investment-budget-card small{display:block;margin-top:4px;color:#78889d;font-size:9.5px;line-height:1.4}
.investment-budget-ring{--budget-progress:0%;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#1aa3ff var(--budget-progress),#7557ff var(--budget-progress),rgba(118,150,195,.14) 0);position:relative;box-shadow:0 8px 18px rgba(40,123,222,.15)}
.investment-budget-ring:before{content:"";position:absolute;inset:8px;border-radius:50%;background:#f7fbff}
.investment-budget-ring span{position:relative;z-index:1;font-size:12px;font-weight:850;color:#116fd0}
.investment-category-bars{display:grid;gap:11px;margin-top:14px}
.investment-category-copy{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:10px;color:#657a97}
.investment-category-copy strong{font-size:10px;color:#17304f}
.investment-category-track{height:8px;margin-top:5px;border-radius:999px;overflow:hidden;background:rgba(92,132,184,.12)}
.investment-category-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#1bb7ff,#2479f2 58%,#7558ff);box-shadow:0 0 12px rgba(30,127,239,.20);transition:width .45s ease}
@keyframes investmentLineDraw{to{stroke-dashoffset:0}}
@keyframes investmentDotIn{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes investmentDotPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.32)}}
@media(max-width:360px){.investment-budget-card{grid-template-columns:minmax(0,1fr) 64px;padding:14px}.investment-budget-ring{width:60px;height:60px}.investment-budget-ring:before{inset:7px}.investment-budget-card strong{font-size:22px}}
@media(prefers-reduced-motion:reduce){.investment-line,.investment-dot{animation:none!important}.investment-line{stroke-dashoffset:0}}
'''

app_path.write_text(app)
css_path.write_text(css)
