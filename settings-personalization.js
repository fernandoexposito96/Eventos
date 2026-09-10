/* Ajustes avanzados de personalización — Eventos */
(() => {
  const KEY = 'eventos-ui-settings-v1';
  const defaults = {
    mode:'auto', accent:'purple', background:'default', customBackground:'',
    font:'system', fontScale:1, strongText:false, compact:false,
    cards:'glass', radius:'normal', animations:true, shadows:true,
    contrast:false, blur:18
  };
  const accents = {
    purple:['#6558f6','#8a5df7'], blue:['#1677f2','#35a2ff'], green:['#07996c','#22c992'],
    rose:['#e14886','#ff70a8'], orange:['#ed7a22','#ffad42'], gold:['#b68516','#e7bc4c'],
    cyan:['#0b9fb6','#3bd8ec'], red:['#d94552','#ff6c76']
  };
  let prefs = load();

  function load(){
    try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(prefs));}
  function isDark(){
    if(prefs.mode==='dark') return true;
    if(prefs.mode==='light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  }
  function apply(){
    const b=document.body, root=document.documentElement, app=document.getElementById('app');
    [...b.classList].filter(c=>c.startsWith('ui-')).forEach(c=>b.classList.remove(c));
    if(app) [...app.classList].filter(c=>c.startsWith('ui-font-')).forEach(c=>app.classList.remove(c));
    if(isDark()) b.classList.add('ui-dark');
    b.classList.add(`ui-bg-${prefs.background}`);
    if(prefs.font!=='system'){ b.classList.add(`ui-font-${prefs.font}`); app?.classList.add(`ui-font-${prefs.font}`); }
    if(prefs.strongText) b.classList.add('ui-font-strong');
    if(prefs.compact) b.classList.add('ui-compact');
    b.classList.add(`ui-card-${prefs.cards}`);
    if(prefs.radius==='small') b.classList.add('ui-radius-small');
    if(prefs.radius==='large') b.classList.add('ui-radius-large');
    if(!prefs.animations) b.classList.add('ui-no-animations');
    if(!prefs.shadows) b.classList.add('ui-shadow-off');
    if(prefs.contrast) b.classList.add('ui-high-contrast');
    const pair=accents[prefs.accent]||accents.purple;
    root.style.setProperty('--ui-accent',pair[0]); root.style.setProperty('--ui-accent-2',pair[1]);
    root.style.setProperty('--purple',pair[0]); root.style.setProperty('--purple2',pair[1]);
    root.style.setProperty('--ui-font-scale',String(Math.max(.85,Math.min(1.25,Number(prefs.fontScale)||1))));
    root.style.setProperty('--ui-glass-blur',`${Math.max(0,Math.min(30,Number(prefs.blur)||18))}px`);
    if(prefs.customBackground){
      const safe=String(prefs.customBackground).replace(/["'()]/g,'');
      root.style.setProperty('--ui-custom-bg',`url("${safe}")`);
    } else root.style.setProperty('--ui-custom-bg','none');
    b.classList.add('ui-accent-custom');
  }
  function active(value,current){return value===current?' active':''}
  function swatch(name,color){return `<button type="button" class="settings-choice${active(name,prefs.accent)}" data-pref="accent" data-value="${name}"><span class="swatch" style="background:${color}"></span>${name[0].toUpperCase()+name.slice(1)}</button>`}
  function toggleRow(key,title,desc){return `<div class="settings-row"><div><strong>${title}</strong><small>${desc}</small></div><button type="button" class="settings-toggle ${prefs[key]?'on':''}" data-toggle="${key}" aria-pressed="${prefs[key]}"><span></span></button></div>`}

  function openAdvancedSettings(e){
    const btn=e.target.closest?.('#settingsBtn');
    if(!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const sheet=document.getElementById('sheet'), backdrop=document.getElementById('sheetBackdrop'), form=document.getElementById('sheetForm');
    const title=document.getElementById('sheetTitle'), eyebrow=document.getElementById('sheetEyebrow');
    if(!sheet||!backdrop||!form) return;
    if(title) title.textContent='Ajustes'; if(eyebrow) eyebrow.textContent='Eventos';
    form.innerHTML=`<div class="settings-panel">
      <div class="settings-intro"><strong>Personaliza Eventos a tu gusto</strong><p>Los cambios se guardan en este dispositivo y puedes volver al diseño original cuando quieras.</p></div>

      <section class="settings-group"><div class="settings-group-head"><h3>Apariencia</h3><span>Fondo y modo</span></div>
        <div class="settings-grid">
          ${['default','soft','ocean','sunset','forest','midnight','amoled','custom'].map(v=>`<button type="button" class="settings-choice${active(v,prefs.background)}" data-pref="background" data-value="${v}">${({default:'Original',soft:'Suave',ocean:'Océano',sunset:'Atardecer',forest:'Bosque',midnight:'Medianoche',amoled:'Negro AMOLED',custom:'Mi fondo'})[v]}</button>`).join('')}
        </div>
        <div class="settings-row"><div><strong>Modo de color</strong><small>Claro, oscuro o según el teléfono</small></div><select class="settings-select" data-select="mode"><option value="auto" ${prefs.mode==='auto'?'selected':''}>Automático</option><option value="light" ${prefs.mode==='light'?'selected':''}>Claro</option><option value="dark" ${prefs.mode==='dark'?'selected':''}>Oscuro</option></select></div>
        <div class="settings-row"><div><strong>Fondo personalizado</strong><small>Pega la dirección de una imagen y selecciona “Mi fondo”</small></div></div>
        <input class="settings-url" id="customBgInput" type="url" inputmode="url" placeholder="https://..." value="${String(prefs.customBackground||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Colores</h3><span>Color principal</span></div><div class="settings-grid">
        ${Object.entries(accents).map(([n,p])=>swatch(n,p[0])).join('')}
      </div></section>

      <section class="settings-group"><div class="settings-group-head"><h3>Texto y letras</h3><span>Lectura</span></div>
        <div class="settings-row"><div><strong>Tipo de letra</strong><small>Cambia el estilo de toda la aplicación</small></div><select class="settings-select" data-select="font"><option value="system" ${prefs.font==='system'?'selected':''}>Sistema</option><option value="rounded" ${prefs.font==='rounded'?'selected':''}>Redondeada</option><option value="serif" ${prefs.font==='serif'?'selected':''}>Elegante</option><option value="mono" ${prefs.font==='mono'?'selected':''}>Monoespaciada</option></select></div>
        <div class="settings-row"><div><strong>Tamaño del texto</strong><small>${Math.round(prefs.fontScale*100)}%</small></div><input class="settings-input" data-range="fontScale" type="range" min="0.85" max="1.25" step="0.05" value="${prefs.fontScale}"></div>
        ${toggleRow('strongText','Texto más marcado','Aumenta ligeramente el peso de las letras')}
        ${toggleRow('contrast','Alto contraste','Refuerza la lectura de textos y elementos')}
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Tarjetas y estructura</h3><span>Diseño</span></div>
        <div class="settings-row"><div><strong>Estilo de tarjetas</strong><small>Cristal o fondo sólido</small></div><select class="settings-select" data-select="cards"><option value="glass" ${prefs.cards==='glass'?'selected':''}>Cristal</option><option value="solid" ${prefs.cards==='solid'?'selected':''}>Sólidas</option></select></div>
        <div class="settings-row"><div><strong>Esquinas</strong><small>Forma general de tarjetas y menús</small></div><select class="settings-select" data-select="radius"><option value="small" ${prefs.radius==='small'?'selected':''}>Pequeñas</option><option value="normal" ${prefs.radius==='normal'?'selected':''}>Normales</option><option value="large" ${prefs.radius==='large'?'selected':''}>Redondeadas</option></select></div>
        <div class="settings-row"><div><strong>Desenfoque de cristal</strong><small>${prefs.blur}px</small></div><input class="settings-input" data-range="blur" type="range" min="0" max="30" step="2" value="${prefs.blur}"></div>
        ${toggleRow('compact','Modo compacto','Reduce espacios para mostrar más contenido')}
        ${toggleRow('shadows','Sombras','Activa profundidad alrededor de tarjetas')}
      </section>

      <section class="settings-group"><div class="settings-group-head"><h3>Movimiento</h3><span>Efectos</span></div>${toggleRow('animations','Animaciones','Transiciones y movimientos de la interfaz')}</section>

      <section class="settings-group"><div class="settings-group-head"><h3>Restablecer</h3><span>Control</span></div><div class="settings-actions"><button type="button" class="settings-action" id="resetAppearance">Restablecer apariencia</button><button type="button" class="settings-action danger" id="resetAppAdvanced">Restablecer todos los datos</button></div><p class="settings-note">Restablecer apariencia no borra la hucha, inversiones ni beneficios.</p></section>
    </div>`;
    backdrop.hidden=false; sheet.hidden=false; sheet.classList.remove('closing');
    requestAnimationFrame(()=>sheet.classList.add('open'));
    bindControls(form);
  }

  function bindControls(form){
    form.querySelectorAll('[data-pref]').forEach(el=>el.addEventListener('click',()=>{prefs[el.dataset.pref]=el.dataset.value; save(); apply(); refreshSettings(form);}));
    form.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('change',()=>{prefs[el.dataset.select]=el.value; save(); apply(); refreshSettings(form);}));
    form.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const k=el.dataset.toggle;prefs[k]=!prefs[k];save();apply();refreshSettings(form);}));
    form.querySelectorAll('[data-range]').forEach(el=>el.addEventListener('input',()=>{prefs[el.dataset.range]=Number(el.value);save();apply();const small=el.parentElement?.querySelector('small');if(small)small.textContent=el.dataset.range==='fontScale'?`${Math.round(Number(el.value)*100)}%`:`${el.value}px`;}));
    form.querySelector('#customBgInput')?.addEventListener('change',e=>{prefs.customBackground=e.target.value.trim();if(prefs.customBackground)prefs.background='custom';save();apply();refreshSettings(form);});
    form.querySelector('#resetAppearance')?.addEventListener('click',()=>{prefs={...defaults};save();apply();refreshSettings(form);});
    form.querySelector('#resetAppAdvanced')?.addEventListener('click',()=>{
      if(!confirm('¿Restablecer todos los datos de Hucha, Inversión y Beneficios?')) return;
      try{localStorage.removeItem('eventos-premium-v2');localStorage.removeItem('eventos-premium-v1');}catch{}
      location.reload();
    });
  }
  function refreshSettings(form){
    form.querySelectorAll('[data-pref]').forEach(el=>el.classList.toggle('active',prefs[el.dataset.pref]===el.dataset.value));
    form.querySelectorAll('[data-toggle]').forEach(el=>{const on=!!prefs[el.dataset.toggle];el.classList.toggle('on',on);el.setAttribute('aria-pressed',String(on));});
  }

  apply();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(prefs.mode==='auto')apply()});
  document.addEventListener('click',openAdvancedSettings,true);
})();
