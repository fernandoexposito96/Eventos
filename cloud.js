const EVENTOS_SUPABASE_URL = 'https://pyodzkmreynyxhvxstta.supabase.co';
const EVENTOS_SUPABASE_KEY = 'sb_publishable_QZg1qCPbqEUNZbKgEBcEdA_iolMkX8e';
const eventosDb = window.supabase.createClient(EVENTOS_SUPABASE_URL, EVENTOS_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let cloudUser = null;
let cloudWorkspace = null;
let cloudRole = null;
let cloudChannel = null;
let cloudSyncTimer = null;
let cloudSyncing = false;
let cloudLoading = false;
let cloudBooted = false;

const localSaveState = saveState;
const localRender = render;
const localOpenSettings = openSettings;

function cloudDate(value){
  if(!value) return dateLabel();
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? dateLabel() : new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(d);
}

function isoToday(){ return new Date().toISOString().slice(0,10); }

function ensureCloudIds(){
  ['savings','expenses','events'].forEach(key => {
    state[key] = (state[key] || []).map(item => ({...item,id:item.id || crypto.randomUUID()}));
  });
}

saveState = function(){
  ensureCloudIds();
  localSaveState();
  scheduleCloudSync();
};

render = function(){
  localRender();
  decorateCloudUI();
};

openSettings = function(){
  localOpenSettings();
  if(!cloudUser) return;
  const wrap = document.createElement('section');
  wrap.className = 'cloud-settings-card';
  const invite = cloudWorkspace?.invite_code || '—';
  wrap.innerHTML = `
    <div class="cloud-settings-title">Compartir Eventos</div>
    <p>Tu amigo debe crear su cuenta y usar este código para entrar en el mismo espacio.</p>
    <div class="invite-code-row"><code>${clean(invite)}</code><button type="button" id="copyInviteCode">Copiar</button></div>
    <button type="button" class="cloud-secondary-btn" id="joinAnotherWorkspace">Unirme con otro código</button>
    <button type="button" class="cloud-logout-btn" id="cloudLogout">Cerrar sesión</button>`;
  sheetForm.appendChild(wrap);
  document.getElementById('copyInviteCode')?.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(invite); toast('Código copiado'); }
    catch{ toast(invite); }
  });
  document.getElementById('joinAnotherWorkspace')?.addEventListener('click', () => showWorkspaceGate('join'));
  document.getElementById('cloudLogout')?.addEventListener('click', async () => {
    await eventosDb.auth.signOut();
    closeSheet();
  });
};

function decorateCloudUI(){
  const header = document.querySelector('.premium-header .header-side');
  if(header && !header.querySelector('.cloud-dot')){
    const badge = document.createElement('span');
    badge.className = `cloud-dot ${cloudUser && cloudWorkspace ? 'online' : ''}`;
    badge.title = cloudUser && cloudWorkspace ? 'Sincronización activa' : 'Sin conexión compartida';
    header.appendChild(badge);
  }
}

function mountCloudShell(){
  if(document.getElementById('cloudAuthGate')) return;
  const gate = document.createElement('div');
  gate.id = 'cloudAuthGate';
  gate.className = 'cloud-gate';
  gate.hidden = true;
  gate.innerHTML = `
    <div class="cloud-gate-card">
      <div class="cloud-gate-logo">EV</div>
      <h2 id="cloudGateTitle">Entrar en Eventos</h2>
      <p id="cloudGateText">Tus datos estarán sincronizados y podrás compartirlos con otra persona.</p>
      <form id="cloudAuthForm" class="cloud-auth-form">
        <input id="cloudEmail" type="email" autocomplete="email" placeholder="Correo electrónico" required>
        <input id="cloudPassword" type="password" minlength="6" autocomplete="current-password" placeholder="Contraseña" required>
        <button type="submit" class="cloud-main-btn">Entrar</button>
      </form>
      <button type="button" id="cloudSignup" class="cloud-link-btn">Crear cuenta</button>
      <div id="cloudGateMessage" class="cloud-gate-message"></div>
    </div>`;
  document.body.appendChild(gate);

  document.getElementById('cloudAuthForm').addEventListener('submit', async event => {
    event.preventDefault();
    setGateMessage('Entrando…');
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    const { error } = await eventosDb.auth.signInWithPassword({ email, password });
    if(error) setGateMessage(error.message);
  });

  document.getElementById('cloudSignup').addEventListener('click', async () => {
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    if(!email || password.length < 6){ setGateMessage('Escribe un correo y una contraseña de al menos 6 caracteres.'); return; }
    setGateMessage('Creando cuenta…');
    const { data, error } = await eventosDb.auth.signUp({ email, password });
    if(error){ setGateMessage(error.message); return; }
    if(!data.session) setGateMessage('Cuenta creada. Revisa tu correo para confirmarla y después entra.');
  });
}

function setGateMessage(message){
  const node = document.getElementById('cloudGateMessage');
  if(node) node.textContent = message || '';
}

function showAuthGate(){
  const gate = document.getElementById('cloudAuthGate');
  gate.hidden = false;
  document.getElementById('cloudGateTitle').textContent = 'Entrar en Eventos';
  document.getElementById('cloudGateText').textContent = 'Inicia sesión para guardar y compartir los mismos datos entre dispositivos.';
  document.getElementById('cloudAuthForm').hidden = false;
  document.getElementById('cloudSignup').hidden = false;
  document.getElementById('cloudWorkspaceActions')?.remove();
}

function hideCloudGate(){ document.getElementById('cloudAuthGate').hidden = true; }

function showWorkspaceGate(mode = 'choose'){
  const gate = document.getElementById('cloudAuthGate');
  gate.hidden = false;
  document.getElementById('cloudGateTitle').textContent = mode === 'join' ? 'Unirme a un espacio' : 'Configurar espacio compartido';
  document.getElementById('cloudGateText').textContent = mode === 'join' ? 'Introduce el código de 12 caracteres que te han compartido.' : 'Crea tu espacio o entra en uno que ya exista.';
  document.getElementById('cloudAuthForm').hidden = true;
  document.getElementById('cloudSignup').hidden = true;
  document.getElementById('cloudWorkspaceActions')?.remove();
  const actions = document.createElement('div');
  actions.id = 'cloudWorkspaceActions';
  actions.className = 'cloud-workspace-actions';
  actions.innerHTML = `
    ${mode !== 'join' ? '<button type="button" id="createCloudWorkspace" class="cloud-main-btn">Crear mi espacio</button><div class="cloud-separator">o</div>' : ''}
    <input id="cloudInviteInput" maxlength="12" autocapitalize="characters" placeholder="CÓDIGO DE INVITACIÓN">
    <button type="button" id="joinCloudWorkspace" class="cloud-secondary-btn">Unirme con código</button>
    ${cloudWorkspace ? '<button type="button" id="cancelWorkspaceGate" class="cloud-link-btn">Cancelar</button>' : ''}`;
  document.querySelector('.cloud-gate-card').appendChild(actions);

  document.getElementById('createCloudWorkspace')?.addEventListener('click', createCloudWorkspace);
  document.getElementById('joinCloudWorkspace')?.addEventListener('click', joinCloudWorkspace);
  document.getElementById('cancelWorkspaceGate')?.addEventListener('click', hideCloudGate);
}

async function createCloudWorkspace(){
  if(!cloudUser) return;
  setGateMessage('Creando espacio…');
  const { data: workspace, error } = await eventosDb.from('eventos_workspaces')
    .insert({ name: 'Eventos compartidos', owner_id: cloudUser.id })
    .select('id,name,invite_code,owner_id').single();
  if(error){ setGateMessage(error.message); return; }

  const { error: memberError } = await eventosDb.from('eventos_workspace_members')
    .insert({ workspace_id: workspace.id, user_id: cloudUser.id, role: 'owner' });
  if(memberError){ setGateMessage(memberError.message); return; }

  await eventosDb.from('eventos_settings').upsert({ workspace_id: workspace.id, goal: Number(state.goal) || 7000 });
  cloudWorkspace = workspace;
  cloudRole = 'owner';
  ensureCloudIds();
  localSaveState();
  await syncStateToRemote();
  subscribeWorkspace();
  hideCloudGate();
  render();
  toast('Espacio compartido creado');
}

async function joinCloudWorkspace(){
  const code = document.getElementById('cloudInviteInput')?.value.trim().toUpperCase();
  if(!/^[A-F0-9]{12}$/.test(code || '')){ setGateMessage('El código debe tener 12 caracteres.'); return; }
  setGateMessage('Uniéndote al espacio…');
  const { data, error } = await eventosDb.functions.invoke('join-eventos-workspace', { body: { code } });
  if(error || !data?.workspaceId){ setGateMessage(data?.error || error?.message || 'No se pudo usar ese código.'); return; }
  await selectWorkspace(data.workspaceId);
  hideCloudGate();
  toast('Ya compartís el mismo espacio');
}

async function bootstrapWorkspace(){
  if(!cloudUser) return;
  const { data: memberships, error } = await eventosDb.from('eventos_workspace_members')
    .select('workspace_id,role').eq('user_id', cloudUser.id).order('joined_at', { ascending: true });
  if(error){ setGateMessage(error.message); showWorkspaceGate(); return; }
  if(!memberships?.length){ showWorkspaceGate(); return; }
  cloudRole = memberships[0].role;
  await selectWorkspace(memberships[0].workspace_id, false);
}

async function selectWorkspace(workspaceId, findRole = true){
  if(findRole){
    const { data: membership } = await eventosDb.from('eventos_workspace_members')
      .select('role').eq('workspace_id', workspaceId).eq('user_id', cloudUser.id).maybeSingle();
    cloudRole = membership?.role || 'editor';
  }
  const { data: workspace, error } = await eventosDb.from('eventos_workspaces')
    .select('id,name,invite_code,owner_id').eq('id', workspaceId).single();
  if(error){ setGateMessage(error.message); showWorkspaceGate(); return; }
  cloudWorkspace = workspace;
  await loadRemoteState();
  subscribeWorkspace();
  hideCloudGate();
  render();
}

async function loadRemoteState(){
  if(!cloudWorkspace || cloudLoading) return;
  cloudLoading = true;
  try{
    const wid = cloudWorkspace.id;
    const [settingsRes,savingsRes,expensesRes,eventsRes] = await Promise.all([
      eventosDb.from('eventos_settings').select('goal').eq('workspace_id', wid).maybeSingle(),
      eventosDb.from('eventos_savings').select('id,name,amount,movement_date,created_at').eq('workspace_id', wid).order('created_at'),
      eventosDb.from('eventos_expenses').select('id,name,category,event_slot,amount,movement_date,created_at').eq('workspace_id', wid).order('created_at'),
      eventosDb.from('eventos_events').select('id,slot,name,amount,event_date,created_at').eq('workspace_id', wid).order('slot')
    ]);
    const errors = [settingsRes.error,savingsRes.error,expensesRes.error,eventsRes.error].filter(Boolean);
    if(errors.length) throw errors[0];
    state = {
      goal: Number(settingsRes.data?.goal || 7000),
      savings: (savingsRes.data || []).map(item => ({id:item.id,name:item.name,amount:Number(item.amount),date:cloudDate(item.movement_date)})),
      expenses: (expensesRes.data || []).map(item => ({id:item.id,name:item.name,category:item.category,eventSlot:Number(item.event_slot)||0,amount:Number(item.amount),date:cloudDate(item.movement_date)})),
      events: (eventsRes.data || []).map(item => ({id:item.id,slot:Number(item.slot),name:item.name,amount:Number(item.amount),date:cloudDate(item.event_date)}))
    };
    localSaveState();
  }catch(error){
    console.error('loadRemoteState', error);
    toast('No se pudieron actualizar los datos');
  }finally{ cloudLoading = false; }
}

function scheduleCloudSync(){
  if(!cloudUser || !cloudWorkspace || cloudLoading) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncStateToRemote, 250);
}

async function syncCollection(table, rows){
  const wid = cloudWorkspace.id;
  const { data: remote, error: remoteError } = await eventosDb.from(table).select('id').eq('workspace_id', wid);
  if(remoteError) throw remoteError;
  const localIds = new Set(rows.map(row => row.id));
  const deleteIds = (remote || []).map(row => row.id).filter(id => !localIds.has(id));
  if(deleteIds.length){
    const { error } = await eventosDb.from(table).delete().in('id', deleteIds);
    if(error) throw error;
  }
  if(rows.length){
    const { error } = await eventosDb.from(table).upsert(rows, { onConflict: 'id' });
    if(error) throw error;
  }
}

async function syncStateToRemote(){
  if(!cloudUser || !cloudWorkspace || cloudSyncing || cloudLoading) return;
  cloudSyncing = true;
  try{
    ensureCloudIds();
    localSaveState();
    const wid = cloudWorkspace.id;
    const today = isoToday();
    const { error: settingsError } = await eventosDb.from('eventos_settings')
      .upsert({ workspace_id: wid, goal: Number(state.goal) || 7000, updated_at: new Date().toISOString() });
    if(settingsError) throw settingsError;

    await syncCollection('eventos_savings', state.savings.map(item => ({
      id:item.id, workspace_id:wid, name:String(item.name || 'Aportación').slice(0,80), amount:Number(item.amount)||0.01, movement_date:today, updated_at:new Date().toISOString()
    })));
    await syncCollection('eventos_expenses', state.expenses.map(item => ({
      id:item.id, workspace_id:wid, name:String(item.name || 'Inversión').slice(0,80), category:item.category || 'Otros', event_slot:Number(item.eventSlot)||0, amount:Number(item.amount)||0.01, movement_date:today, updated_at:new Date().toISOString()
    })));
    await syncCollection('eventos_events', state.events.map(item => ({
      id:item.id, workspace_id:wid, slot:Number(item.slot), name:String(item.name || 'Evento').slice(0,100), amount:Math.max(0,Number(item.amount)||0), event_date:today, updated_at:new Date().toISOString()
    })));
  }catch(error){
    console.error('syncStateToRemote', error);
    toast('Error al sincronizar');
  }finally{ cloudSyncing = false; }
}

function subscribeWorkspace(){
  if(cloudChannel){ eventosDb.removeChannel(cloudChannel); cloudChannel = null; }
  if(!cloudWorkspace) return;
  const wid = cloudWorkspace.id;
  let reloadTimer;
  const reload = () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      if(cloudSyncing) return;
      await loadRemoteState();
      render();
    }, 220);
  };
  cloudChannel = eventosDb.channel(`eventos-${wid}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_settings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_savings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_expenses',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_events',filter:`workspace_id=eq.${wid}`},reload)
    .subscribe();
}

async function bootCloud(){
  if(cloudBooted) return;
  cloudBooted = true;
  mountCloudShell();
  ensureCloudIds();
  localSaveState();

  const { data: { session } } = await eventosDb.auth.getSession();
  if(session?.user){
    cloudUser = session.user;
    await bootstrapWorkspace();
  }else showAuthGate();

  eventosDb.auth.onAuthStateChange(async (event, sessionNow) => {
    if(event === 'SIGNED_OUT' || !sessionNow?.user){
      cloudUser = null; cloudWorkspace = null; cloudRole = null;
      if(cloudChannel){ eventosDb.removeChannel(cloudChannel); cloudChannel = null; }
      showAuthGate(); render(); return;
    }
    cloudUser = sessionNow.user;
    if(event === 'SIGNED_IN'){ await bootstrapWorkspace(); }
  });
  render();
}

bootCloud();
