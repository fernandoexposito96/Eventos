from pathlib import Path
p=Path('app.js')
s=p.read_text()
s=s.replace("function totalProfit(){ return totalRevenue() - registeredExpenseTotal(); }", "function registeredProfit(){ return totalRevenue() - registeredExpenseTotal(); }\nfunction totalProfit(){ return totalRevenue() - totalExpenses(); }", 1)
s=s.replace("<strong class=\"${moneyClass(totalProfit())}\">${euro(totalProfit())}</strong>", "<strong class=\"${moneyClass(registeredProfit())}\">${euro(registeredProfit())}</strong>", 1)
start=s.index('function beneficiosView(){')
end=s.index('\nfunction removeItem(',start)
block=s[start:end]
block=block.replace('const total = totalProfit();','const total = registeredProfit();',1)
s=s[:start]+block+s[end:]
p.write_text(s)
