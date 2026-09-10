from pathlib import Path

p = Path('app.js')
s = p.read_text()

# Keep Beneficios fully net-benefit based: no gross-income wording or double subtraction.
s = s.replace("function eventRevenue(slot){ return eventBenefit(slot) + expenseTotalForSlot(slot); }\n", "")
s = s.replace("function totalRevenue(){ return totalBenefits() + registeredExpenseTotal(); }\n", "")
s = s.replace("function totalProfit(){ return totalRevenue() - registeredExpenseTotal(); }", "function totalProfit(){ return totalBenefits(); }")

s = s.replace("  const revenue = totalRevenue();\n  const available = revenue - invested;", "  const benefits = totalBenefits();\n  const available = benefits;\n  const managedTotal = benefits + invested;")
s = s.replace("<span class=\"investment-kicker\">Presupuesto disponible</span>", "<span class=\"investment-kicker\">Beneficio acumulado</span>")
s = s.replace("--budget-progress:${Math.min(100, revenue>0 ? invested/revenue*100 : 0).toFixed(1)}%\"><span>${revenue>0 ? Math.round(invested/revenue*100) : 0}%", "--budget-progress:${Math.min(100, managedTotal>0 ? invested/managedTotal*100 : 0).toFixed(1)}%\"><span>${managedTotal>0 ? Math.round(invested/managedTotal*100) : 0}%")
s = s.replace("<div class=\"metric\"><strong>${euro(totalRevenue())}</strong><span>Beneficios</span></div>", "<div class=\"metric\"><strong>${euro(totalBenefits())}</strong><span>Beneficios</span></div>")

s = s.replace("  const revenue = event ? eventRevenue(selectedEventSlot) : 0;", "  const declaredBenefit = event ? eventBenefit(selectedEventSlot) : 0;")
s = s.replace("<div class=\"metric\"><strong>${euro(revenue)}</strong><span>Beneficio declarado</span></div>", "<div class=\"metric\"><strong class=\"${moneyClass(declaredBenefit)}\">${euro(declaredBenefit)}</strong><span>Beneficio neto</span></div>")
s = s.replace("<div class=\"metric\"><strong class=\"${moneyClass(profit)}\">${euro(profit)}</strong><span>Beneficio del evento</span></div>", "<div class=\"metric\"><strong>${euro(declaredBenefit + invested)}</strong><span>Total gestionado</span></div>")
s = s.replace("${event ? 'Actualizar ingresos' : 'Registrar evento'}", "${event ? 'Actualizar beneficio' : 'Registrar evento'}")

# Give the final green content a little extra breathing room above the fixed bottom nav.
css = Path('styles.css')
c = css.read_text()
marker = '/* Final Beneficios spacing v1 */'
if marker not in c:
    c += "\n\n/* Final Beneficios spacing v1 */\n.theme-green .motivation{margin-bottom:34px!important;}\n@media(max-width:520px){.theme-green .motivation{margin-bottom:44px!important;}}\n"
    css.write_text(c)

p.write_text(s)
