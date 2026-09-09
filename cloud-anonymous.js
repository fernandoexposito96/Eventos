const EVENTOS_SUPABASE_URL = 'https://pyodzkmreynyxhvxstta.supabase.co';
const EVENTOS_SUPABASE_KEY = 'sb_publishable_QZg1qCPbqEUNZbKgEBcEdA_iolMkX8e';
const eventosDb = window.supabase.createClient(EVENTOS_SUPABASE_URL, EVENTOS_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let cloudUser = null;
let cloudWorkspace = null;
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
  const wrap = document.createElement('section');
  wrap.className = 'cloud-settings-card';

  if(!cloudUser){
    wrap.innerHTML = `
      <div class="cloud-settings-title">Compartir Eventos</div>
      <p>El acceso es automático: no necesitas correo ni contraseña.</p>
      <button type="button" class="cloud-secondary-btn" id="retryAnonymousAccess">Activar acceso compartido</button>`;
    sheetForm.appendChild(wrap);
    document.getElementById('retryAnonymousAccess')?.addEventListener('click', async () => {
      closeSheet();
      await startAnonymousAccess(true);
    });
    return;
  }

  if(!cloudWorkspace){
    wrap.innerHTML = `
      <div class="cloud-settings-title">Compartir Eventos</div>
      <p>No necesitas cuenta. Crea tu espacio o entra con el código que te comparta otra persona.</p>
      <button type="button" class="cloud-secondary-btn" id="setupSharedSpace">Configurar espacio compartido</button>`;
    sheetForm.appendChild(wrap);
    document.getElementById('setupSharedSpace')?.addEventListener('click', () => {
      closeSheet();
      showWorkspaceGate();
    });
    return;
  }

  const invite = cloudWorkspace.invite_code || '—';
  wrap.innerHTML = `
    <div class="cloud-settings-title">Compartir Eventos</div>
    <p>Comparte este código. Tu amigo no necesita correo ni contraseña: abre Eventos y pulsa “Unirme con código”.</p>
    <div class="invite-code-row"><code>${clean(invite)}</code><button type="button" id="copyInviteCode">Copiar</button></div>
    <button type="button" class="cloud-secondary-btn" id="joinAnotherWorkspace">Unirme con otro código</button>
    <p class="cloud-device-note">Este dispositivo queda vinculado automáticamente. No cierres sesión ni borres los datos del navegador si quieres conservar este acceso.</p>`;
  sheetForm.appendChild(wrap);

  document.getElementById('copyInviteCode')?.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(invite); toast('Código copiado'); }
    catch{ toast(invite); }
  });
  document.getElementById('joinAnotherWorkspace')?.addEventListener('click', () => {
    closeSheet();
    showWorkspaceGate('join');
  });
};

function decorateCloudUI(){
  const header = document.querySelector('.premium-header .header-side');
  if(!header) return;
  let badge = header.querySelector('.cloud-dot');
  if(!badge){
    badge = document.createElement('span');
    badge.className = 'cloud-dot';
    header.appendChild(badge);
  }
  badge.classList.toggle('online', Boolean(cloudUser && cloudWorkspace));
  badge.title = cloudUser && cloudWorkspace ? 'Sincronización activa' : 'Modo local';
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
      <h2 id="cloudGateTitle">Preparando Eventos</h2>
      <p id="cloudGateText">Sin correo. Sin contraseña. Acceso automático en este dispositivo.</p>
      <div id="cloudWorkspaceActions"></div>
      <div id="cloudGateMessage" class="cloud-gate-message"></div>
    </div>`;
  document.body.appendChild(gate);
}

function setGateMessage(message){
  const node = document.getElementById('cloudGateMessage');
  if(node) node.textContent = message || '';
}

function setGateCopy(title,text){
  const gate = document.getElementById('cloudAuthGate');
  if(!gate) return;
  gate.hidden = false;
  document.getElementById('cloudGateTitle').textContent = title;
  document.getElementById('cloudGateText').textContent = text;
  document.getElementById('cloudWorkspaceActions').innerHTML = '';
  setGateMessage('');
}

function hideCloudGate(){
  const gate = document.getElementById('cloudAuthGate');
  if(gate) gate.hidden = true;
}

function showAnonymousError(error){
  setGateCopy('Acceso automático no disponible','No te pediré correo ni contraseña. El acceso anónimo del servidor todavía no está habilitado.');
  const actions = document.getElementById('cloudWorkspaceActions');
  actions.innerHTML = `<button type="button" id="retryAnonymous" class="cloud-main-btn">Reintentar</button>`;
  document.getElementById('retryAnonymous')?.addEventListener('click', () => startAnonymousAccess(true));
  setGateMessage(error?.message || 'No se pudo iniciar el acceso automático.');
}

function showWorkspaceGate(mode = 'choose'){
  if(!cloudUser){ startAnonymousAccess(true); return; }
  setGateCopy(
    mode === 'join' ? 'Unirme a un espacio' : 'Espacio compartido',
    mode === 'join' ? 'Introduce el código que te ha compartido tu amigo.' : 'Crea tu espacio o entra en uno que ya exista. No hace falta correo ni contraseña.'
  );
  const actions = document.getElementById('cloudWorkspaceActions');
  actions.className = 'cloud-workspace-actions';
  actions.innerHTML = `
    ${mode !== 'join' ? '<button type="button" id="createCloudWorkspace" class="cloud-main-btn">Crear mi espacio</button><div class="cloud-separator">o</div>' : ''}
    <input id="cloudInviteInput" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="CÓDIGO DE INVITACIÓN">
    <button type="button" id="joinCloudWorkspace" class="cloud-secondary-btn">Unirme con código</button>
    ${cloudWorkspace ? '<button type="button" id="cancelWorkspaceGate" class="cloud-link-btn">Cancelar</button>' : ''}`;

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

  const { error: settingsError } = await eventosDb.from('eventos_settings')
    .upsert({ workspace_id: workspace.id, goal: Number(state.goal) || 7000 });
  if(settingsError){ setGateMessage(settingsError.message); return; }

  cloudWorkspace = workspace;
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
  if(error){
    console.error('bootstrapWorkspace', error);
    showWorkspaceGate();
    setGateMessage(error.message);
    return;
  }
  if(!memberships?.length){ showWorkspaceGate(); return; }
  await selectWorkspace(memberships[0].workspace_id);
}

async function selectWorkspace(workspaceId){
  const { data: workspace, error } = await eventosDb.from('eventos_workspaces')
    .select('id,name,invite_code,owner_id').eq('id', workspaceId).single();
  if(error){
    console.error('selectWorkspace', error);
    showWorkspaceGate();
    setGateMessage(error.message);
    return;
  }
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
  }finally{
    cloudLoading = false;
  }
}

function scheduleCloudSync(){
  if(!cloudUser || !cloudWorkspace || cloudLoading) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncStateToRemote, 300);
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
    const now = new Date().toISOString();
    const today = isoToday();

    const { error: settingsError } = await eventosDb.from('eventos_settings')
      .upsert({ workspace_id: wid, goal: Number(state.goal) || 7000, updated_at: now });
    if(settingsError) throw settingsError;

    await syncCollection('eventos_savings', state.savings.map(item => ({
      id:item.id, workspace_id:wid, name:String(item.name || 'Aportación').slice(0,80), amount:Number(item.amount)||0.01, movement_date:today, updated_at:now
    })));
    await syncCollection('eventos_expenses', state.expenses.map(item => ({
      id:item.id, workspace_id:wid, name:String(item.name || 'Inversión').slice(0,80), category:item.category || 'Otros', event_slot:Number(item.eventSlot)||0, amount:Number(item.amount)||0.01, movement_date:today, updated_at:now
    })));
    await syncCollection('eventos_events', state.events.map(item => ({
      id:item.id, workspace_id:wid, slot:Number(item.slot), name:String(item.name || 'Evento').slice(0,100), amount:Math.max(0,Number(item.amount)||0), event_date:today, updated_at:now
    })));
  }catch(error){
    console.error('syncStateToRemote', error);
    toast('Error al sincronizar');
  }finally{
    cloudSyncing = false;
  }
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
    }, 250);
  };
  cloudChannel = eventosDb.channel(`eventos-${wid}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_settings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_savings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_expenses',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_events',filter:`workspace_id=eq.${wid}`},reload)
    .subscribe();
}

async function startAnonymousAccess(forceGate = false){
  if(forceGate) setGateCopy('Preparando Eventos','Sin correo. Sin contraseña. Acceso automático en este dispositivo.');
  setGateMessage('Conectando…');
  try{
    const { data: sessionData, error: sessionError } = await eventosDb.auth.getSession();
    if(sessionError) throw sessionError;
    if(sessionData?.session?.user){
      cloudUser = sessionData.session.user;
      await bootstrapWorkspace();
      return;
    }

    const { data, error } = await eventosDb.auth.signInAnonymously();
    if(error) throw error;
    cloudUser = data?.user || data?.session?.user || null;
    if(!cloudUser) throw new Error('No se pudo crear la identidad automática.');
    await bootstrapWorkspace();
  }catch(error){
    console.error('startAnonymousAccess', error);
    cloudUser = null;
    cloudWorkspace = null;
    showAnonymousError(error);
    render();
  }
}

async function bootCloud(){
  if(cloudBooted) return;
  cloudBooted = true;
  mountCloudShell();
  ensureCloudIds();
  localSaveState();
  setGateCopy('Preparando Eventos','Sin correo. Sin contraseña. Acceso automático en este dispositivo.');
  await startAnonymousAccess();

  eventosDb.auth.onAuthStateChange((event, sessionNow) => {
    if(sessionNow?.user){
      cloudUser = sessionNow.user;
      if(event === 'SIGNED_IN') setTimeout(() => bootstrapWorkspace(), 0);
    }
  });
  render();
}

bootCloud();
