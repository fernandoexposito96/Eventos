/* Personalización avanzada — Eventos v2 */
(() => {
  const KEY='eventos-ui-settings-v2';
  const LEGACY='eventos-ui-settings-v1';
  const defaults={
    mode:'auto',accent:'purple',background:'default',customBackground:'',font:'system',fontScale:1,strongText:false,
    density:'normal',cards:'glass',radius:'normal',animations:true,shadows:true,contrast:false,grayscale:false,
    reduceTransparency:false,blur:18,nav:'default',header:'default',customColors:false,
    accentCustom:'#6558f6',accent2Custom:'#8a5df7',textColor:'#0b1d38',mutedColor:'#6f7f99',cardColor:'#ffffff',
    appBgColor:'#edf5fb',headerColor:'#17233f',borderColor:'#dbe4ef',buttonTextColor:'#ffffff'
  };
  const accents={
    purple:['#6558f6','#8a5df7'],violet:['#7138f4','#a56cff'],blue:['#1677f2','#35a2ff'],navy:['#143d78','#2d66b1'],
    cyan:['#0b9fb6','#3bd8ec'],teal:['#078f8a','#35c9bc'],green:['#07996c','#22c992'],lime:['#63a50a','#9ed832'],
    yellow:['#d39a00','#ffd24a'],orange:['#ed7a22','#ffad42'],coral:['#ee6548','#ff9a7a'],red:['#d94552','#ff6c76'],
    rose:['#e14886','#ff70a8'],pink:['#d63cc5','#ff77e8'],gold:['#b68516','#e7bc4c'],silver:['#6d7787','#b7c0cc'],
    graphite:['#394150','#697384'],brown:['#7d5137','#b57a59']
  };
  const labels={default:'Original',soft:'Suave',ocean:'Océano',sunset:'Atardecer',forest:'Bosque',cream:'Crema',lavender:'Lavanda',midnight:'Medianoche',amoled:'Negro AMOLED',flat:'Color liso',custom:'Mi fondo'};
  let prefs=load();

  function load(){
    try{
      const current=localStorage.getItem(KEY); if(current) return {...defaults,...JSON.parse(current)};
      const legacy=localStorage.getItem(LEGACY); return legacy?{...defaults,...JSON.parse(legacy)}:{...defaults};
    }catch{return {...defaults}}
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(prefs));}
  function isDark(){if(prefs.mode==='dark')return true;if(prefs.mode==='light')return false;return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches}
  function cleanClasses(node,prefix='ui-'){if(!node)return;[...node.classList].filter(c=>c.startsWith(prefix)).forEach(c=>node.classList.remove(c))}
  function apply(){
    const b=document.body,root=document.documentElement,app=document.getElementById('app'); cleanClasses(b); if(app)cleanClasses(app,'ui-font-');
    if(isDark())b.classList.add('ui-dark'); b.classList.add(`ui-bg-${prefs.background}`);
    if(prefs.font!=='system'){b.classList.add(`ui-font-${prefs.font}`);app?.classList.add(`ui-font-${prefs.font}`)}
    if(prefs.strongText)b.classList.add('ui-font-strong'); if(prefs.density==='compact')b.classList.add('ui-compact'); if(prefs.density==='roomy')b.classList.add('ui-roomy');
    b.classList.add(`ui-card-${prefs.cards}`); if(prefs.radius!=='normal')b.classList.add(`ui-radius-${prefs.radius}`);
    if(!prefs.animations)b.classList.add('ui-no-animations'); if(!prefs.shadows)b.classList.add('ui-shadow-off'); if(prefs.contrast)b.classList.add('ui-high-contrast');
    if(prefs.grayscale)b.classList.add('ui-grayscale'); if(prefs.reduceTransparency)b.classList.add('ui-reduce-transparency');
    if(prefs.nav!=='default')b.classList.add(`ui-nav-${prefs.nav}`); if(prefs.header!=='default')b.classList.add(`ui-header-${prefs.header}`);
    let pair=accents[prefs.accent]||accents.purple; if(prefs.accent==='custom')pair=[prefs.accentCustom,prefs.accent2Custom];
    root.style.setProperty('--ui-accent',pair[0]);root.style.setProperty('--ui-accent-2',pair[1]);root.style.setProperty('--purple',pair[0]);root.style.setProperty('--purple2',pair[1]);
    root.style.setProperty('--ui-font-scale',String(Math.max(.8,Math.min(1.35,Number(prefs.fontScale)||1))));root.style.setProperty('--ui-glass-blur',`${Math.max(0,Math.min(32,Number(prefs.blur)||18))}px`);
    const vars={textColor:'--ui-text',mutedColor:'--ui-muted',cardColor:'--ui-card',appBgColor:'--ui-app-bg',headerColor:'--ui-header',borderColor:'--ui-border',buttonTextColor:'--ui-button-text'};
    Object.entries(vars).forEach(([k,v])=>root.style.setProperty(v,prefs[k]));
    if(prefs.customBackground){const safe=String(prefs.customBackground).replace(/["'()]/g,'');root.style.setProperty('--ui-custom-bg',`url("${safe}")`)}else root.style.setProperty('--ui-custom-bg','none');
    b.classList.add('ui-accent-custom'); if(prefs.customColors)b.classList.add('ui-custom-colors');
  }
  const active=(a,b)=>a===b?' active':'';
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  function toggleRow(key,title,desc){return `<div class="settings-row"><div><strong>${title}</strong><small>${desc}</small></div><button type="button" class="settings-toggle ${prefs[key]?'on':''}" data-toggle="${key}" aria-pressed="${prefs[key]}"><span></span></button></div>`}
  function colorInput(key,label){return `<label class="settings-color"><span>${label}</span><input type="color" data-color="${key}" value="${prefs[key]}"></label>`}
  function choice(group,value,label){return `<button type="button" class="settings-choice${active(value,prefs[group])}" data-pref="${group}" data-value="${value}">${label}</button>`}
  function swatch(name,pair){return `<button type="button" class="settings-choice${active(name,prefs.accent)}" data-pref="accent" data-value="${name}"><span class="swatch" style="background:linear-gradient(135deg,${pair[0]},${pair[1]})"></span>${name[0].toUpperCase()+name.slice(1)}</button>`}

  function openSettings(e){
    const btn=e.target.closest?.('#settingsBtn');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();
    const sheet=document.getElementById('sheet'),backdrop=document.getElementById('sheetBackdrop'),form=document.getElementById('sheetForm'),title=document.getElementById('sheetTitle'),eyebrow=document.getElementById('sheetEyebrow');if(!sheet||!backdrop||!form)return;
    if(title)title.textContent='Ajustes';if(eyebrow)eyebrow.textContent='Eventos';
    form.innerHTML=`<div class="settings-panel">
      <div class="settings-intro"><strong>Personalización completa</strong><p>Cambia colores, fondos, letras, tarjetas, navegación, contraste y movimiento. Todo queda guardado en este dispositivo.</p></div>

      <section class="settings-group"><div class="settings-group-head"><h3>Fondo y tema</h3><span>Apariencia general</span></div><div class="settings-grid">${Object.keys(labels).map(v=>choice('background',v,labels[v])).join('')}</div>
        <div class="settings-row"><div><strong>Modo de color</strong><small>Claro, oscuro o automático</small></div><select class="settings-select" data-select="mode"><option value="auto" ${prefs.mode==='auto'?'selected':''}>Automático</option><option value="light" ${prefs.mode==='light'?'selected':''}>Claro</option><option value="dark" ${prefs.mode==='dark'?'selected':''}>Oscuro</option></select></div>
        <div class="settings-subtitle">Imagen de fondo personalizada</div><input class="settings-url" id="customBgInput" type="url" inputmode="url" placeholder="https://..." value="${esc(prefs.customBackground)}">
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Color principal</h3><span>18 combinaciones</span></div><div class="settings-grid">${Object.entries(accents).map(([n,p])=>swatch(n,p)).join('')}${choice('accent','custom','🎨 Personalizado')}</div>
        <div class="settings-subtitle">Crear mi propio degradado</div><div class="settings-color-grid">${colorInput('accentCustom','Color 1')}${colorInput('accent2Custom','Color 2')}</div>
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Colores avanzados</h3><span>Control total</span></div>${toggleRow('customColors','Usar colores personalizados','Permite cambiar textos, tarjetas, fondo, cabecera y bordes')}
        <div class="settings-color-grid">${colorInput('textColor','Texto principal')}${colorInput('mutedColor','Texto secundario')}${colorInput('cardColor','Tarjetas')}${colorInput('appBgColor','Fondo liso')}${colorInput('headerColor','Cabecera')}${colorInput('borderColor','Bordes')}${colorInput('buttonTextColor','Texto botones')}</div>
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Letras</h3><span>Tipografía y lectura</span></div>
        <div class="settings-row"><div><strong>Tipo de letra</strong><small>Estilo global</small></div><select class="settings-select" data-select="font"><option value="system" ${prefs.font==='system'?'selected':''}>Sistema</option><option value="rounded" ${prefs.font==='rounded'?'selected':''}>Redondeada</option><option value="serif" ${prefs.font==='serif'?'selected':''}>Elegante</option><option value="mono" ${prefs.font==='mono'?'selected':''}>Monoespaciada</option></select></div>
        <div class="settings-row"><div><strong>Tamaño del texto</strong><small data-value-label="fontScale">${Math.round(prefs.fontScale*100)}%</small></div><input class="settings-input" data-range="fontScale" type="range" min="0.80" max="1.35" step="0.05" value="${prefs.fontScale}"></div>
        ${toggleRow('strongText','Texto más marcado','Aumenta el peso visual')}${toggleRow('contrast','Alto contraste','Mejora la diferenciación')}${toggleRow('grayscale','Escala de grises','Elimina el color de la interfaz')}
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Tarjetas</h3><span>Forma y profundidad</span></div>
        <div class="settings-row"><div><strong>Estilo</strong><small>Cómo se ven las tarjetas</small></div><select class="settings-select" data-select="cards"><option value="glass" ${prefs.cards==='glass'?'selected':''}>Cristal</option><option value="solid" ${prefs.cards==='solid'?'selected':''}>Sólidas</option><option value="soft" ${prefs.cards==='soft'?'selected':''}>Suaves</option><option value="outline" ${prefs.cards==='outline'?'selected':''}>Solo borde</option></select></div>
        <div class="settings-row"><div><strong>Esquinas</strong><small>Radio visual</small></div><select class="settings-select" data-select="radius"><option value="small" ${prefs.radius==='small'?'selected':''}>Cuadradas</option><option value="normal" ${prefs.radius==='normal'?'selected':''}>Normales</option><option value="large" ${prefs.radius==='large'?'selected':''}>Muy redondeadas</option><option value="pill" ${prefs.radius==='pill'?'selected':''}>Píldora</option></select></div>
        <div class="settings-row"><div><strong>Desenfoque</strong><small data-value-label="blur">${prefs.blur}px</small></div><input class="settings-input" data-range="blur" type="range" min="0" max="32" step="2" value="${prefs.blur}"></div>
        ${toggleRow('shadows','Sombras','Activa o elimina profundidad')}${toggleRow('reduceTransparency','Reducir transparencias','Fondo más sólido y legible')}
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Estructura</h3><span>Distribución</span></div>
        <div class="settings-row"><div><strong>Densidad</strong><small>Espacio entre elementos</small></div><select class="settings-select" data-select="density"><option value="compact" ${prefs.density==='compact'?'selected':''}>Compacta</option><option value="normal" ${prefs.density==='normal'?'selected':''}>Normal</option><option value="roomy" ${prefs.density==='roomy'?'selected':''}>Amplia</option></select></div>
        <div class="settings-row"><div><strong>Navegación superior</strong><small>Estilo de Hucha / Inversión / Beneficios</small></div><select class="settings-select" data-select="nav"><option value="default" ${prefs.nav==='default'?'selected':''}>Original</option><option value="filled" ${prefs.nav==='filled'?'selected':''}>Con fondo</option><option value="minimal" ${prefs.nav==='minimal'?'selected':''}>Minimalista</option><option value="strong" ${prefs.nav==='strong'?'selected':''}>Selección marcada</option></select></div>
        <div class="settings-row"><div><strong>Cabecera</strong><small>Altura y presencia visual</small></div><select class="settings-select" data-select="header"><option value="default" ${prefs.header==='default'?'selected':''}>Original</option><option value="compact" ${prefs.header==='compact'?'selected':''}>Compacta</option><option value="soft" ${prefs.header==='soft'?'selected':''}>Suave</option></select></div>
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Movimiento y accesibilidad</h3><span>Experiencia</span></div>${toggleRow('animations','Animaciones','Transiciones y movimiento')}${toggleRow('contrast','Alto contraste','Más separación visual entre elementos')}${toggleRow('reduceTransparency','Menos transparencias','Mejor legibilidad')}</section>

      <section class="settings-group"><div class="settings-group-head"><h3>Restablecer</h3><span>Control</span></div><div class="settings-actions"><button type="button" class="settings-action" id="resetAppearance">Restablecer solo apariencia</button><button type="button" class="settings-action danger" id="resetAppAdvanced">Restablecer todos los datos</button></div><p class="settings-note">Restablecer apariencia no borra la Hucha, Inversión ni Beneficios.</p></section>
    </div>`;
    backdrop.hidden=false;sheet.hidden=false;sheet.classList.remove('closing');requestAnimationFrame(()=>sheet.classList.add('open'));bind(form);
  }

  function bind(form){
    form.querySelectorAll('[data-pref]').forEach(el=>el.addEventListener('click',()=>{prefs[el.dataset.pref]=el.dataset.value;save();apply();refresh(form)}));
    form.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('change',()=>{prefs[el.dataset.select]=el.value;save();apply();refresh(form)}));
    form.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const k=el.dataset.toggle;prefs[k]=!prefs[k];save();apply();refresh(form)}));
    form.querySelectorAll('[data-range]').forEach(el=>el.addEventListener('input',()=>{prefs[el.dataset.range]=Number(el.value);save();apply();const label=form.querySelector(`[data-value-label="${el.dataset.range}"]`);if(label)label.textContent=el.dataset.range==='fontScale'?`${Math.round(Number(el.value)*100)}%`:`${el.value}px`}));
    form.querySelectorAll('[data-color]').forEach(el=>el.addEventListener('input',()=>{prefs[el.dataset.color]=el.value;if(el.dataset.color.startsWith('accent'))prefs.accent='custom';else prefs.customColors=true;save();apply();refresh(form)}));
    form.querySelector('#customBgInput')?.addEventListener('change',e=>{prefs.customBackground=e.target.value.trim();if(prefs.customBackground)prefs.background='custom';save();apply();refresh(form)});
    form.querySelector('#resetAppearance')?.addEventListener('click',()=>{prefs={...defaults};save();apply();form.innerHTML='';openSettings({target:document.getElementById('settingsBtn'),preventDefault(){},stopImmediatePropagation(){}})});
    form.querySelector('#resetAppAdvanced')?.addEventListener('click',()=>{if(!confirm('¿Restablecer todos los datos de Hucha, Inversión y Beneficios?'))return;try{localStorage.removeItem('eventos-premium-v2');localStorage.removeItem('eventos-premium-v1')}catch{}location.reload()});
  }
  function refresh(form){form.querySelectorAll('[data-pref]').forEach(el=>el.classList.toggle('active',prefs[el.dataset.pref]===el.dataset.value));form.querySelectorAll('[data-toggle]').forEach(el=>{const on=!!prefs[el.dataset.toggle];el.classList.toggle('on',on);el.setAttribute('aria-pressed',String(on))})}
  apply();window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(prefs.mode==='auto')apply()});document.addEventListener('click',openSettings,true);
})();
