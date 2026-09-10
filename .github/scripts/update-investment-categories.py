from pathlib import Path

p=Path('app.js')
s=p.read_text()

# 1) Catering -> Alcohol everywhere in investment UI/data labels.
s=s.replace("'Catering'", "'Alcohol'").replace('>Catering<', '>Alcohol<')

# 2) Show custom detail as the movement title when present.
s=s.replace("item.name || item.category || 'Movimiento'", "item.detail || item.name || item.category || 'Movimiento'")

# 3) Add conditional detail field to new investment form.
old_new='''      <div class="field"><label>Categoría</label><select name="category">${options}</select></div>\n      ${field('Cantidad','amount','number','','min=\"0.01\" step=\"0.01\"')}'''
new_new='''      <div class="field"><label>Categoría</label><select name="category" id="expenseCategory">${options}</select></div>\n      <div class="field" id="expenseOtherField" hidden><label>¿Qué quieres añadir?</label><input name="detail" id="expenseDetail" type="text" placeholder="Ej. decoración, taxi, seguridad"></div>\n      ${field('Cantidad','amount','number','','min=\"0.01\" step=\"0.01\"')}'''
if old_new not in s:
    raise SystemExit('new investment form anchor not found')
s=s.replace(old_new,new_new,1)

# 4) Persist the custom detail.
old_push="""state.expenses.push({id:crypto.randomUUID?.() || String(Date.now()), category:String(data.get('category')), amount:number(data.get('amount')), date:String(data.get('date') || dateLabel()), eventSlot:Number(data.get('eventSlot')) || 0});"""
new_push="""state.expenses.push({id:crypto.randomUUID?.() || String(Date.now()), category:String(data.get('category')), detail:String(data.get('category')) === 'Otros' ? String(data.get('detail') || '').trim() : '', amount:number(data.get('amount')), date:String(data.get('date') || dateLabel()), eventSlot:Number(data.get('eventSlot')) || 0});"""
if old_push not in s:
    raise SystemExit('expense push anchor not found')
s=s.replace(old_push,new_push,1)

# 5) Add same conditional field to edit form and preserve existing detail.
old_edit='''    <div class="field"><label>Categoría</label><select name="category">${categories}</select></div>\n    ${field('Cantidad','amount','number',item.amount,'min=\"0.01\" step=\"0.01\"')}'''
new_edit='''    <div class="field"><label>Categoría</label><select name="category" id="expenseCategory">${categories}</select></div>\n    <div class="field" id="expenseOtherField" ${item.category==='Otros'?'':'hidden'}><label>¿Qué quieres añadir?</label><input name="detail" id="expenseDetail" type="text" value="${clean(item.detail || '')}" placeholder="Ej. decoración, taxi, seguridad"></div>\n    ${field('Cantidad','amount','number',item.amount,'min=\"0.01\" step=\"0.01\"')}'''
if old_edit not in s:
    raise SystemExit('edit investment form anchor not found')
s=s.replace(old_edit,new_edit,1)

old_assign="""      item.category = String(data.get('category'));\n      item.amount = number(data.get('amount'));"""
new_assign="""      item.category = String(data.get('category'));\n      item.detail = item.category === 'Otros' ? String(data.get('detail') || '').trim() : '';\n      item.amount = number(data.get('amount'));"""
if old_assign not in s:
    raise SystemExit('edit assignment anchor not found')
s=s.replace(old_assign,new_assign,1)

# 6) Toggle Otros field without observers/patch layers. openSheet calls this after rendering.
old_open="""  sheetForm.innerHTML = html;\n  sheetForm.onsubmit = event => { event.preventDefault(); onSubmit(new FormData(sheetForm)); };"""
new_open="""  sheetForm.innerHTML = html;\n  const categorySelect = sheetForm.querySelector('#expenseCategory');\n  const otherField = sheetForm.querySelector('#expenseOtherField');\n  const syncOtherField = () => {\n    if(!categorySelect || !otherField) return;\n    const isOther = categorySelect.value === 'Otros';\n    otherField.hidden = !isOther;\n    const input = otherField.querySelector('input[name=\"detail\"]');\n    if(input) input.required = isOther;\n  };\n  categorySelect?.addEventListener('change', syncOtherField);\n  syncOtherField();\n  sheetForm.onsubmit = event => { event.preventDefault(); onSubmit(new FormData(sheetForm)); };"""
if old_open not in s:
    raise SystemExit('openSheet anchor not found')
s=s.replace(old_open,new_open,1)

p.write_text(s)
