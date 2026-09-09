(() => {
  const SESSION_KEY = 'eventos-access-ok-v1';
  const EXPECTED = '1515';
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

  function unlock(){
    try{ sessionStorage.setItem(SESSION_KEY,'1'); }catch{}
    body.classList.remove('access-locked');
    if(gate) gate.hidden = true;
    document.getElementById('app')?.setAttribute('aria-hidden','false');
  }

  function lock(){
    try{ sessionStorage.removeItem(SESSION_KEY); }catch{}
    if(sheet) sheet.hidden = true;
    if(backdrop) backdrop.hidden = true;
    body.classList.add('access-locked');
    if(gate) gate.hidden = false;
    document.getElementById('app')?.setAttribute('aria-hidden','true');
    if(error) error.textContent = '';
    if(input){ input.value = ''; input.type = 'password'; }
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

  if(isUnlocked()){
    unlock();
  }else{
    lock();
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const value = String(input?.value || '').replace(/\s+/g,'');
    if(value === EXPECTED){
      if(error) error.textContent = '';
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
    if(!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  window.EventosAccess = { logout: lock };
})();
