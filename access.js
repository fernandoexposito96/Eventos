(() => {
  const SESSION_KEY = 'eventos-access-ok-v1';
  const EXPECTED = '1515';
  const body = document.body;
  const gate = document.getElementById('accessGate');
  const form = document.getElementById('accessForm');
  const input = document.getElementById('accessPassword');
  const eye = document.getElementById('accessEye');
  const error = document.getElementById('accessError');

  function unlock(){
    try{ sessionStorage.setItem(SESSION_KEY,'1'); }catch{}
    body.classList.remove('access-locked');
    if(gate) gate.hidden = true;
    document.getElementById('app')?.setAttribute('aria-hidden','false');
  }

  function isUnlocked(){
    try{return sessionStorage.getItem(SESSION_KEY)==='1'}catch{return false}
  }

  if(isUnlocked()){
    unlock();
    return;
  }

  body.classList.add('access-locked');
  gate.hidden = false;
  document.getElementById('app')?.setAttribute('aria-hidden','true');
  setTimeout(() => input?.focus(), 120);

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const value = String(input?.value || '').replace(/\s+/g,'');
    if(value === EXPECTED){
      error.textContent = '';
      unlock();
      return;
    }
    error.textContent = 'Contraseña incorrecta';
    gate.classList.remove('shake');
    void gate.offsetWidth;
    gate.classList.add('shake');
    if(input){ input.value=''; input.focus(); }
  });

  eye?.addEventListener('click', () => {
    if(!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
})();
