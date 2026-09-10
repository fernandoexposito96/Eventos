from pathlib import Path

css = Path('styles.css')
text = css.read_text(encoding='utf-8')
marker = '/* Three visible mobile fixes v1 */'
block = r'''

/* Three visible mobile fixes v1 */
/* 1) Give the savings chart breathing room before the history title */
.theme-purple .savings-insight{
  margin-bottom:20px!important;
}
.theme-purple .savings-insight + .list-section,
.theme-purple .insight-card + .list-section{
  margin-top:0!important;
}

/* 2) Keep all scrollable content clear of the fixed bottom navigation */
.screen{
  padding-bottom:calc(132px + env(safe-area-inset-bottom))!important;
}
.content{
  padding-bottom:calc(122px + env(safe-area-inset-bottom))!important;
}
.theme-purple.screen{
  padding-bottom:calc(132px + env(safe-area-inset-bottom))!important;
}
.theme-purple .content{
  padding-bottom:calc(122px + env(safe-area-inset-bottom))!important;
}
.list-section:last-of-type,
.history-list:last-child{
  margin-bottom:18px!important;
}

/* 3) Respect the iPhone top safe area and avoid visual clashes under Dynamic Island */
html{
  scroll-padding-top:calc(env(safe-area-inset-top) + 14px);
}
.screen{
  scroll-padding-top:calc(env(safe-area-inset-top) + 14px);
}
.premium-header{
  padding-top:calc(18px + env(safe-area-inset-top))!important;
}
@supports (padding-top:max(0px)){
  .premium-header{
    padding-top:max(18px,calc(10px + env(safe-area-inset-top)))!important;
  }
}

@media(max-width:520px){
  .theme-purple .savings-insight{margin-bottom:22px!important;}
  .screen,.theme-purple.screen{padding-bottom:calc(138px + env(safe-area-inset-bottom))!important;}
  .content,.theme-purple .content{padding-bottom:calc(126px + env(safe-area-inset-bottom))!important;}
}
'''
if marker not in text:
    css.write_text(text.rstrip() + block + '\n', encoding='utf-8')

idx = Path('index.html')
s = idx.read_text(encoding='utf-8')
s = s.replace('styles.css?v=20260910-layout-integrity-v3','styles.css?v=20260910-mobile-spacing-v1')
idx.write_text(s, encoding='utf-8')
