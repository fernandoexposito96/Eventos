(() => {
  const SESSION_KEY = 'eventos-access-ok-v2';
  const LOCAL_PIN = '1515';
  const body = document.body;
  const gate = document.getElementById('accessGate');
  const form = document.getElementById('accessForm');
  const input = document.getElementById('accessPassword');
  const eye = document.getElementById('accessEye');
  const error = document.getElementById('accessError');
  const sheet = document.getElementById('sheet');
  const backdrop = document.getElementById('sheetBackdrop');
  const sheetForm = document.getElementById('sheetForm');
  const sheetTitle = document.getElementById('sheetTitle');
  const submit = form?.querySelector('.access-submit');
  const heading = form?.querySelector('h2');

  const isPaired = () => Boolean(window.EventosCloud?.isPaired?.());

  function configureMode(){
    if(!input) return;
    if(isPaired()){
      if(heading) heading.textContent = 'Contraseña';
      input.type = 'password';
      input.inputMode = 'numeric';
      input.maxLength = 4;
      input.placeholder = 'Introduce 1515';
      input.autocapitalize = 'off';
      if(submit) submit.innerHTML = 'Entrar <span aria-hidden="true">→</span>';
      if(eye) eye.hidden = false;
    }else{
      if(heading) heading.textContent = 'Vincular dispositivo';
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 4;
      input.placeholder = 'Código 1515';
      input.autocapitalize = 'off';
      if(submit) submit.innerHTML = 'Vincular <span aria-hidden="true">→</span>';
      if(eye) eye.hidden = true;
    }
  }

  function unlock(){
    try{ sessionStorage.setItem(SESSION_KEY,'1'); }catch{}
    body.classList.remove('access-locked');
    if(gate) gate.hidden = true;
    document.getElementById('app')?.setAttribute('aria-hidden','false');
    window.EventosCloud?.refresh?.();
  }

  function lock(){
    try{ sessionStorage.removeItem(SESSION_KEY); }catch{}
    if(sheet) sheet.hidden = true;
    if(backdrop) backdrop.hidden = true;
    body.classList.add('access-locked');
    if(gate) gate.hidden = false;
    document.getElementById('app')?.setAttribute('aria-hidden','true');
    if(error) error.textContent = '';
    if(input) input.value = '';
    configureMode();
    window.scrollTo({top:0,left:0,behavior:'auto'});
    setTimeout(() => input?.focus(), 120);
  }

  function isUnlocked(){
    try{return sessionStorage.getItem(SESSION_KEY)==='1'}catch{return false}
  }

  function addLogoutButton(){
    if(!sheetForm || sheetTitle?.textContent !== 'Ajustes' || document.getElementById('logoutApp')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'danger-btn';
    button.id = 'logoutApp';
    button.textContent = 'Cerrar sesión';
    button.addEventListener('click', lock);
    sheetForm.appendChild(button);
  }

  if(sheetForm){
    const observer = new MutationObserver(addLogoutButton);
    observer.observe(sheetForm,{childList:true,subtree:true});
  }

  configureMode();
  if(isUnlocked() && isPaired()) unlock(); else lock();

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const value = String(input?.value || '').replace(/\s+/g,'');
    if(error) error.textContent = '';

    if(!isPaired()){
      if(!/^\d{4}$/.test(value)){
        if(error) error.textContent = 'Introduce el código de 4 dígitos';
        return;
      }
      try{
        if(submit){ submit.disabled = true; submit.textContent = 'Vinculando…'; }
        await window.EventosCloud.join(value);
        configureMode();
        unlock();
        return;
      }catch(err){
        if(error) error.textContent = String(err?.message || 'No se pudo vincular este dispositivo');
      }finally{
        if(submit){ submit.disabled = false; submit.innerHTML = isPaired() ? 'Entrar <span aria-hidden="true">→</span>' : 'Vincular <span aria-hidden="true">→</span>'; }
      }
      return;
    }

    if(value === LOCAL_PIN){
      unlock();
      return;
    }
    if(error) error.textContent = 'Contraseña incorrecta';
    gate?.classList.remove('shake');
    if(gate) void gate.offsetWidth;
    gate?.classList.add('shake');
    if(input){ input.value=''; input.focus(); }
  });

  eye?.addEventListener('click', () => {
    if(!input || !isPaired()) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  window.EventosAccess = { logout: lock };
})();
