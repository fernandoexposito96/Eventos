from pathlib import Path

p = Path('styles.css')
s = p.read_text()
marker = '/* Mobile layout integrity pass v1 */'
if marker not in s:
    s += r'''

/* Mobile layout integrity pass v1 */
#app,.screen,.content,.premium-header,.hero-panel,.list-section,.person-contribution-section{max-width:100%;}
.content>*{min-width:0;max-width:100%;}
.header-line,.feature-head,.section-head,.insight-head,.history-row,.event-row,.summary-section,.metric-grid{min-width:0;}
.brand-copy,.feature-copy,.history-copy,.event-name,.insight-head>div{min-width:0;}
.brand-copy h1,.eyebrow-card,.section-head h2,.insight-head h3{overflow-wrap:anywhere;}
.feature-copy p,.history-copy small,.event-name small{overflow-wrap:anywhere;word-break:normal;}
.feature-head>*{min-width:0;}
.feature-head .mini-button,.feature-head .profit-pill,.settings-button{flex-shrink:0;white-space:nowrap;}
.hero-money{max-width:100%;overflow-wrap:anywhere;}
.goal-line{gap:10px;}
.goal-line>*{min-width:0;}
.goal-line strong{flex:0 0 auto;white-space:nowrap;}
.metric{overflow:hidden;}
.metric strong,.metric span{max-width:100%;}
.metric strong{word-break:normal;overflow-wrap:anywhere;}
.section-head>h2{min-width:0;line-height:1.15;}
.section-head .section-link,.section-head .text-button,.extract-link{flex:0 0 auto;white-space:nowrap;}
.history-row{width:100%;}
.history-value{min-width:0;white-space:nowrap;}
.history-value>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;}
.history-actions{flex:0 0 auto;}
.event-row{width:100%;min-width:0;}
.event-name strong,.event-name small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.event-profit{white-space:nowrap;}
.summary-card{overflow:hidden;}
.summary-card strong{max-width:100%;}
.insight-head{align-items:center;}
.insight-head>strong{max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chart-foot span{min-width:0;}
.chart-foot span:last-child{text-align:right;}
.profit-bar-copy>*{min-width:0;}
.bottom-nav{max-width:calc(100% - 24px);}
.nav-btn{min-width:0;}
.nav-btn .nav-symbol{flex:0 0 auto;}

@media(max-width:420px){
  .content{padding-left:12px;padding-right:12px;}
  .feature-head{grid-template-columns:50px minmax(0,1fr) auto;gap:9px;}
  .feature-icon{width:50px;height:50px;}
  .eyebrow-card{font-size:14px;line-height:1.15;}
  .feature-copy p{font-size:9.5px;line-height:1.3;}
  .metric-grid.four{grid-template-columns:repeat(2,minmax(0,1fr));}
  .metric-grid.three{grid-template-columns:repeat(3,minmax(0,1fr));}
  .metric{padding-left:7px;padding-right:7px;}
  .metric strong{font-size:12px;line-height:1.12;}
  .metric span{font-size:8.5px;}
  .history-row{grid-template-columns:36px minmax(0,1fr) auto;gap:8px;padding:10px;}
  .history-value{gap:5px;}
  .single-edit-btn,.single-delete-btn{width:28px;height:28px;}
  .summary-section{grid-template-columns:repeat(2,minmax(0,1fr));}
  .summary-card{padding:13px 11px;}
  .summary-card strong{font-size:16px;}
  .insight-head>strong{font-size:13px;}
}

@media(max-width:360px){
  .premium-header{padding-left:10px!important;padding-right:10px!important;}
  .header-line{grid-template-columns:38px minmax(0,1fr) 38px;gap:6px;}
  .settings-button{width:38px;height:38px;}
  .tabs{grid-template-columns:repeat(3,minmax(0,1fr));}
  .tab{gap:4px;font-size:10px;}
  .feature-head{grid-template-columns:46px minmax(0,1fr) auto;gap:7px!important;}
  .feature-icon{width:46px!important;height:46px!important;}
  .feature-head .mini-button,.feature-head .profit-pill{padding-left:8px;padding-right:8px;font-size:9px;}
  .hero-money{font-size:31px!important;letter-spacing:-1px!important;}
  .metric-grid.three{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px!important;}
  .metric-grid.three .metric{padding-left:5px!important;padding-right:5px!important;}
  .metric-grid.three .metric strong{font-size:11.5px!important;}
  .history-row{grid-template-columns:34px minmax(0,1fr) auto;gap:7px;padding:9px;}
  .history-avatar{width:34px;height:34px;}
  .history-actions{gap:2px;}
  .single-edit-btn,.single-delete-btn{width:26px;height:26px;}
  .summary-section{grid-template-columns:1fr;}
  .insight-head{gap:8px;}
  .insight-head>strong{max-width:46%;font-size:12px;}
}
'''
    p.write_text(s)
