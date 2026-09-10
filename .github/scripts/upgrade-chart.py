from pathlib import Path

css_path = Path('styles.css')
index_path = Path('index.html')
css = css_path.read_text()
marker = '/* Savings chart premium animation v2 */'
block = r'''

/* Savings chart premium animation v2 */
.savings-insight{
  position:relative;
  overflow:hidden;
  border-color:rgba(116,82,255,.16);
  background:radial-gradient(circle at 86% 14%,rgba(79,125,255,.16),transparent 30%),radial-gradient(circle at 12% 88%,rgba(169,92,255,.13),transparent 34%),linear-gradient(145deg,rgba(255,255,255,.99),rgba(247,245,255,.97));
  box-shadow:0 16px 36px rgba(83,67,166,.12),inset 0 1px 0 rgba(255,255,255,.92);
}
.savings-insight:after{content:"";position:absolute;width:130px;height:220px;top:-80px;left:-170px;transform:rotate(24deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:savingsShine 5.5s ease-in-out infinite;pointer-events:none}
.savings-insight .insight-head>strong{padding:7px 10px;border-radius:999px;color:#5f46e8;background:linear-gradient(135deg,rgba(116,82,255,.11),rgba(70,120,255,.09));border:1px solid rgba(116,82,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
.savings-chart{height:112px;margin-top:5px;border-radius:14px;background:linear-gradient(to bottom,rgba(116,82,255,.07) 1px,transparent 1px),linear-gradient(to right,rgba(116,82,255,.045) 1px,transparent 1px),linear-gradient(180deg,rgba(124,93,255,.055),rgba(69,121,255,.02));background-size:100% 25%,25% 100%,100% 100%;padding:7px 5px 2px;overflow:visible}
.chart-axis{stroke:rgba(82,93,145,.18);stroke-width:1}
.chart-line{stroke:#7654ff;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:650;stroke-dashoffset:650;filter:drop-shadow(0 3px 5px rgba(116,82,255,.32));animation:savingsLineDraw 1.25s cubic-bezier(.2,.8,.2,1) forwards}
.chart-dot{fill:#5f62ff;stroke:#fff;stroke-width:3;transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 5px rgba(95,98,255,.5));animation:savingsDotIn .45s ease-out 1s both,savingsDotPulse 2.2s ease-in-out 1.5s infinite}
.chart-foot{margin-top:7px;padding:0 2px;font-weight:650}
.chart-foot span:first-child{color:#6d5ae8}
.chart-foot span:last-child{color:#75839a}
@keyframes savingsLineDraw{to{stroke-dashoffset:0}}
@keyframes savingsDotIn{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes savingsDotPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
@keyframes savingsShine{0%,55%{left:-170px;opacity:0}68%{opacity:.7}82%,100%{left:120%;opacity:0}}
@media (prefers-reduced-motion:reduce){.chart-line,.chart-dot,.savings-insight:after{animation:none!important}.chart-line{stroke-dashoffset:0}}
'''
if marker not in css:
    css += block
css_path.write_text(css)

index = index_path.read_text()
import re
index = re.sub(r'styles\.css\?v=[^\"\']+', 'styles.css?v=20260910-chart-premium-v2', index, count=1)
index_path.write_text(index)
