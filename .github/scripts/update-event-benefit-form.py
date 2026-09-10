from pathlib import Path

p=Path('app.js')
s=p.read_text()

# Treat event amount as declared net benefit.
s=s.replace("function eventRevenue(slot){ return number(eventForSlot(slot)?.amount); }", "function eventBenefit(slot){ return number(eventForSlot(slot)?.amount); }\nfunction eventRevenue(slot){ return eventBenefit(slot) + expenseTotalForSlot(slot); }", 1)
s=s.replace("function eventProfit(slot){ return eventForSlot(slot) ? eventRevenue(slot) - expenseTotalForSlot(slot) : 0; }", "function eventProfit(slot){ return eventForSlot(slot) ? eventBenefit(slot) : 0; }", 1)
s=s.replace("function totalRevenue(){ return sum(state.events); }", "function totalBenefits(){ return sum(state.events); }\nfunction totalRevenue(){ return totalBenefits() + registeredExpenseTotal(); }", 1)
s=s.replace("function registeredProfit(){ return totalRevenue() - registeredExpenseTotal(); }", "function registeredProfit(){ return totalBenefits(); }", 1)

# Rename investment overview label from Ingresos to Beneficios.
s=s.replace('<span>Ingresos</span></div>', '<span>Beneficios</span></div>')
s=s.replace("<small>Ingresos ${euro(revenue)} · Invertido ${euro(invested)}</small>", "<small>Beneficios ${euro(totalBenefits())} · Invertido ${euro(invested)}</small>")

# Rename selected-event metric label.
s=s.replace('<span>Ingresos del evento</span>', '<span>Beneficio declarado</span>')

# Replace openEvent with benefit + pending-investment assignment UI.
start=s.index('function openEvent(){')
end=s.index('\nfunction openHistory(', start)
old=s[start:end]
new=r'''function openEvent(){
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
'''
s=s[:start]+new+s[end:]
p.write_text(s)

css=Path('styles.css')
c=css.read_text()
marker='/* Pending investment selector in event form v1 */'
if marker not in c:
    c += r'''

/* Pending investment selector in event form v1 */
.pending-select-field{gap:8px}.pending-expense-options{display:grid;gap:8px;max-height:230px;overflow:auto;padding-right:2px}.pending-expense-option{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:center;padding:11px 12px;border:1px solid rgba(18,151,112,.14);border-radius:14px;background:rgba(255,255,255,.72)}.pending-expense-option input{width:18px;height:18px;accent-color:#10b981}.pending-expense-option span{min-width:0}.pending-expense-option strong{display:block;color:#16382f;font-size:12px;line-height:1.2;overflow-wrap:anywhere}.pending-expense-option small{display:block;margin-top:3px;color:#71857f;font-size:10px}.field-help{display:block;color:#7d8d88;font-size:9.5px;line-height:1.35}.pending-expense-empty{padding:12px;border:1px dashed rgba(18,151,112,.18);border-radius:14px;color:#7d8d88;font-size:10px;background:rgba(255,255,255,.55)}
'''
css.write_text(c)
