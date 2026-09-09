const EVENTOS_SUPABASE_URL = 'https://pyodzkmreynyxhvxstta.supabase.co';
const EVENTOS_SUPABASE_KEY = 'sb_publishable_QZg1qCPbqEUNZbKgEBcEdA_iolMkX8e';
const CLOUD_META_KEY = 'eventos-cloud-meta-v4';
const CLOUD_DELETE_KEY = 'eventos-cloud-deletes-v4';

const eventosDb = window.supabase?.createClient(EVENTOS_SUPABASE_URL, EVENTOS_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let cloudUser = null;
let cloudWorkspace = null;
let cloudChannel = null;
let cloudSyncTimer = null;
let cloudSyncing = false;
let cloudLoading = false;
let cloudBooted = false;
let localDirty = false;
let lastSnapshot = null;

const baseSaveState = saveState;
const baseRender = render;
const baseOpenSettings = openSettings;
const baseOpenForm = openForm;

function safeParse(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key) || '') || fallback; }
  catch{ return fallback; }
}

let cloudMeta = safeParse(CLOUD_META_KEY, { goalUpdatedAt: null, lastSyncAt: null });
let pendingDeletes = safeParse(CLOUD_DELETE_KEY, []);

function persistCloudMeta(){
  try{ localStorage.setItem(CLOUD_META_KEY, JSON.stringify(cloudMeta)); }catch{}
}
function persistPendingDeletes(){
  try{ localStorage.setItem(CLOUD_DELETE_KEY, JSON.stringify(pendingDeletes)); }catch{}
}
function uid(){
  if(crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function nowIso(){ return new Date().toISOString(); }
function isoToday(){ return new Date().toISOString().slice(0,10); }
function validIsoDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
function parseSpanishDate(label){
  const text = String(label || '').trim().toLowerCase().replace(/\./g,'');
  const m = text.match(/^(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})$/i);
  if(!m) return null;
  const months = {ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};
  const month = months[m[2]];
  if(!month) return null;
  return `${m[3]}-${String(month).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
}
function cloudDate(value){
  if(!value) return dateLabel();
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? dateLabel() : new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(d);
}
function recordDate(item){
  return validIsoDate(item?.isoDate) ? item.isoDate : (parseSpanishDate(item?.date) || isoToday());
}
function recordSignature(item, key){
  if(key === 'savings') return JSON.stringify([String(item.name || ''), Number(item.amount || 0), recordDate(item)]);
  if(key === 'expenses') return JSON.stringify([String(item.name || ''), String(item.category || ''), Number(item.eventSlot || 0), Number(item.amount || 0), recordDate(item)]);
  return JSON.stringify([Number(item.slot || 0), String(item.name || ''), Number(item.amount || 0), recordDate(item)]);
}
function makeSnapshot(){
  const snap = { goal:Number(state.goal || 0) };
  ['savings','expenses','events'].forEach(key => {
    snap[key] = new Map((state[key] || []).map(item => [item.id, recordSignature(item,key)]));
  });
  return snap;
}
function normalizeState(markChanges = false){
  const stamp = nowIso();
  ['savings','expenses','events'].forEach(key => {
    state[key] = Array.isArray(state[key]) ? state[key] : [];
    state[key] = state[key].map(item => {
      const next = {...item};
      next.id = next.id || uid();
      next.isoDate = recordDate(next);
      const previousSig = lastSnapshot?.[key]?.get(next.id);
      const currentSig = recordSignature(next,key);
      if(!next.updatedAt || (markChanges && previousSig !== undefined && previousSig !== currentSig) || (markChanges && previousSig === undefined)) next.updatedAt = stamp;
      return next;
    });
  });
  if(!cloudMeta.goalUpdatedAt) cloudMeta.goalUpdatedAt = stamp;
}
function queueRemovedRows(previous){
  if(!cloudWorkspace || !previous) return;
  const tableFor = {savings:'eventos_savings',expenses:'eventos_expenses',events:'eventos_events'};
  ['savings','expenses','events'].forEach(key => {
    const current = new Set((state[key] || []).map(item => item.id));
    for(const id of previous[key]?.keys?.() || []){
      if(!current.has(id) && !pendingDeletes.some(x => x.workspaceId === cloudWorkspace.id && x.table === tableFor[key] && x.id === id)){
        pendingDeletes.push({workspaceId:cloudWorkspace.id,table:tableFor[key],id,deletedAt:nowIso()});
      }
    }
  });
  persistPendingDeletes();
}

saveState = function(){
  const previous = lastSnapshot;
  normalizeState(true);
  if(previous && Number(previous.goal) !== Number(state.goal)) cloudMeta.goalUpdatedAt = nowIso();
  queueRemovedRows(previous);
  try{ baseSaveState(); }
  catch(error){ console.error('local save failed', error); toast('No se pudo guardar en el dispositivo'); }
  localDirty = true;
  lastSnapshot = makeSnapshot();
  persistCloudMeta();
  scheduleCloudSync();
};

render = function(){
  baseRender();
  decorateCloudUI();
};

openForm = function(kind){
  if(kind !== 'add-event') return baseOpenForm(kind);
  const current = eventForSlot(selectedEventSlot);
  openSheet(current ? 'Editar evento' : 'Añadir evento','Beneficios',`
    <div class="field"><label>Posición</label><select name="slot">${slotLabels.map((label,index)=>`<option value="${index+1}" ${selectedEventSlot===index+1?'selected':''}>${label}</option>`).join('')}</select></div>
    <div class="field"><label>Nombre del evento</label><input name="name" maxlength="60" value="${clean(current?.name || slotLabels[selectedEventSlot-1])}" required></div>
    <div class="field"><label>Ingresos del evento (€)</label><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" value="${number(current?.amount)}" required></div>
    <p class="helper">El beneficio neto será: ingresos − inversiones asignadas a esta posición.</p>
    <button class="sheet-submit green-submit">Guardar evento</button>`, fd => {
      const slot = Math.min(5,Math.max(1,number(fd.get('slot'))));
      const name = String(fd.get('name') || '').trim().slice(0,60);
      const amount = Math.max(0,number(fd.get('amount')));
      if(!name){ toast('Escribe un nombre para el evento'); return; }
      const target = eventForSlot(slot);
      const keepId = current?.id || target?.id || uid();
      const keepDate = current?.isoDate || target?.isoDate || isoToday();
      state.events = state.events.filter(item => item.id !== current?.id && item.id !== target?.id && number(item.slot) !== slot);
      state.events.push({id:keepId,slot,name,amount,date:cloudDate(keepDate),isoDate:keepDate,updatedAt:nowIso()});
      state.events.sort((a,b)=>number(a.slot)-number(b.slot));
      selectedEventSlot = slot;
      saveState(); closeSheet(); render(); toast('Evento guardado');
    });
};

openSettings = function(){
  baseOpenSettings();
  const wrap = document.createElement('section');
  wrap.className = 'cloud-settings-card';
  const connected = Boolean(cloudUser && cloudWorkspace);
  const invite = cloudWorkspace?.invite_code || '—';
  const syncText = connected ? (localDirty ? 'Cambios pendientes de sincronizar' : `Sincronizado${cloudMeta.lastSyncAt ? ` · ${new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date(cloudMeta.lastSyncAt))}` : ''}`) : 'Modo local';
  wrap.innerHTML = `
    <div class="cloud-settings-title">Datos y sincronización</div>
    <p>${clean(syncText)}</p>
    ${connected ? `<div class="invite-code-row"><code>${clean(invite)}</code><button type="button" id="copyInviteCode">Copiar</button></div>
    <button type="button" class="cloud-secondary-btn" id="syncNow">Sincronizar ahora</button>
    <button type="button" class="cloud-secondary-btn" id="joinAnotherWorkspace">Unirme con otro código</button>` : `<p>Sin correo ni contraseña. Puedes activar el espacio compartido cuando el acceso automático del servidor esté disponible.</p>
    <button type="button" class="cloud-secondary-btn" id="retryAnonymousAccess">Activar espacio compartido</button>`}
    <button type="button" class="cloud-secondary-btn" id="exportBackup">Exportar copia de seguridad</button>
    <p class="cloud-device-note">La app conserva una copia local y un historial de cambios en la nube cuando el espacio compartido está activo.</p>`;
  sheetForm.appendChild(wrap);
  document.getElementById('copyInviteCode')?.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(invite); toast('Código copiado'); }catch{ toast(invite); }
  });
  document.getElementById('syncNow')?.addEventListener('click', async () => { await syncStateToRemote(true); });
  document.getElementById('joinAnotherWorkspace')?.addEventListener('click', () => { closeSheet(); showWorkspaceGate('join'); });
  document.getElementById('retryAnonymousAccess')?.addEventListener('click', async () => { closeSheet(); await startAnonymousAccess(true); });
  document.getElementById('exportBackup')?.addEventListener('click', exportBackup);
};

function exportBackup(){
  const backup = {version:4,exportedAt:nowIso(),workspace:cloudWorkspace ? {name:cloudWorkspace.name,inviteCode:cloudWorkspace.invite_code} : null,state};
  const blob = new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventos-backup-${isoToday()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Copia de seguridad creada');
}

function decorateCloudUI(){
  const header = document.querySelector('.premium-header .header-side');
  if(!header) return;
  let badge = header.querySelector('.cloud-dot');
  if(!badge){ badge = document.createElement('span'); badge.className='cloud-dot'; header.appendChild(badge); }
  const online = navigator.onLine && cloudUser && cloudWorkspace && !localDirty;
  badge.classList.toggle('online', Boolean(online));
  badge.title = !navigator.onLine ? 'Sin conexión · guardando localmente' : online ? 'Sincronización al día' : cloudWorkspace ? 'Sincronización pendiente' : 'Modo local';
}

function mountCloudShell(){
  if(document.getElementById('cloudAuthGate')) return;
  const gate = document.createElement('div');
  gate.id = 'cloudAuthGate'; gate.className='cloud-gate'; gate.hidden=true;
  gate.innerHTML = `<div class="cloud-gate-card"><div class="cloud-gate-logo">EV</div><h2 id="cloudGateTitle">Preparando Eventos</h2><p id="cloudGateText">Sin correo. Sin contraseña. Acceso automático en este dispositivo.</p><div id="cloudWorkspaceActions"></div><div id="cloudGateMessage" class="cloud-gate-message"></div></div>`;
  document.body.appendChild(gate);
}
function setGateMessage(message){ const node=document.getElementById('cloudGateMessage'); if(node) node.textContent=message||''; }
function setGateCopy(title,text){
  const gate=document.getElementById('cloudAuthGate'); if(!gate) return;
  gate.hidden=false; document.getElementById('cloudGateTitle').textContent=title; document.getElementById('cloudGateText').textContent=text; document.getElementById('cloudWorkspaceActions').innerHTML=''; setGateMessage('');
}
function hideCloudGate(){ const gate=document.getElementById('cloudAuthGate'); if(gate) gate.hidden=true; }
function showWorkspaceGate(mode='choose'){
  if(!cloudUser){ startAnonymousAccess(true); return; }
  setGateCopy(mode==='join'?'Unirme a un espacio':'Espacio compartido',mode==='join'?'Introduce el código que te ha compartido tu amigo.':'Crea tu espacio o entra en uno existente. No hace falta correo ni contraseña.');
  const actions=document.getElementById('cloudWorkspaceActions'); actions.className='cloud-workspace-actions';
  actions.innerHTML=`${mode!=='join'?'<button type="button" id="createCloudWorkspace" class="cloud-main-btn">Crear mi espacio</button><div class="cloud-separator">o</div>':''}<input id="cloudInviteInput" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="CÓDIGO DE INVITACIÓN"><button type="button" id="joinCloudWorkspace" class="cloud-secondary-btn">Unirme con código</button>${cloudWorkspace?'<button type="button" id="cancelWorkspaceGate" class="cloud-link-btn">Cancelar</button>':''}`;
  document.getElementById('createCloudWorkspace')?.addEventListener('click',createCloudWorkspace);
  document.getElementById('joinCloudWorkspace')?.addEventListener('click',joinCloudWorkspace);
  document.getElementById('cancelWorkspaceGate')?.addEventListener('click',hideCloudGate);
}

async function createCloudWorkspace(){
  if(!cloudUser || !eventosDb) return;
  setGateMessage('Creando espacio…');
  const {data:workspace,error}=await eventosDb.from('eventos_workspaces').insert({name:'Eventos compartidos',owner_id:cloudUser.id}).select('id,name,invite_code,owner_id').single();
  if(error){ setGateMessage(error.message); return; }
  const {error:memberError}=await eventosDb.from('eventos_workspace_members').insert({workspace_id:workspace.id,user_id:cloudUser.id,role:'owner'});
  if(memberError){ setGateMessage(memberError.message); return; }
  const {error:settingsError}=await eventosDb.from('eventos_settings').upsert({workspace_id:workspace.id,goal:Number(state.goal)||7000});
  if(settingsError){ setGateMessage(settingsError.message); return; }
  cloudWorkspace=workspace; localDirty=true; await syncStateToRemote(true); subscribeWorkspace(); hideCloudGate(); render(); toast('Espacio compartido creado');
}

async function joinCloudWorkspace(){
  const code=document.getElementById('cloudInviteInput')?.value.trim().toUpperCase();
  if(!/^[A-F0-9]{12}$/.test(code||'')){ setGateMessage('El código debe tener 12 caracteres.'); return; }
  setGateMessage('Uniéndote al espacio…');
  await flushPendingDeletes();
  const {data,error}=await eventosDb.functions.invoke('join-eventos-workspace',{body:{code}});
  if(error||!data?.workspaceId){ setGateMessage(data?.error||error?.message||'No se pudo usar ese código.'); return; }
  await selectWorkspace(data.workspaceId); hideCloudGate(); toast('Ya compartís el mismo espacio');
}

async function bootstrapWorkspace(){
  if(!cloudUser || !eventosDb) return;
  const {data:memberships,error}=await eventosDb.from('eventos_workspace_members').select('workspace_id,role').eq('user_id',cloudUser.id).order('joined_at',{ascending:true});
  if(error){ console.error('bootstrapWorkspace',error); hideCloudGate(); render(); return; }
  if(!memberships?.length){ showWorkspaceGate(); return; }
  await selectWorkspace(memberships[0].workspace_id);
}
async function selectWorkspace(workspaceId){
  const {data:workspace,error}=await eventosDb.from('eventos_workspaces').select('id,name,invite_code,owner_id').eq('id',workspaceId).single();
  if(error){ console.error('selectWorkspace',error); showWorkspaceGate(); setGateMessage(error.message); return; }
  cloudWorkspace=workspace;
  if(localDirty) await syncStateToRemote(true); else await loadRemoteState(true);
  subscribeWorkspace(); hideCloudGate(); render();
}

async function loadRemoteState(force=false){
  if(!cloudWorkspace || cloudLoading || (!force && localDirty)) return;
  cloudLoading=true;
  try{
    const wid=cloudWorkspace.id;
    const [settingsRes,savingsRes,expensesRes,eventsRes]=await Promise.all([
      eventosDb.from('eventos_settings').select('goal,updated_at').eq('workspace_id',wid).maybeSingle(),
      eventosDb.from('eventos_savings').select('id,name,amount,movement_date,created_at,updated_at,deleted_at').eq('workspace_id',wid).is('deleted_at',null).order('created_at'),
      eventosDb.from('eventos_expenses').select('id,name,category,event_slot,amount,movement_date,created_at,updated_at,deleted_at').eq('workspace_id',wid).is('deleted_at',null).order('created_at'),
      eventosDb.from('eventos_events').select('id,slot,name,amount,event_date,created_at,updated_at,deleted_at').eq('workspace_id',wid).is('deleted_at',null).order('slot')
    ]);
    const errors=[settingsRes.error,savingsRes.error,expensesRes.error,eventsRes.error].filter(Boolean); if(errors.length) throw errors[0];
    state={
      goal:Number(settingsRes.data?.goal||7000),
      savings:(savingsRes.data||[]).map(item=>({id:item.id,name:item.name,amount:Number(item.amount),date:cloudDate(item.movement_date),isoDate:item.movement_date,updatedAt:item.updated_at})),
      expenses:(expensesRes.data||[]).map(item=>({id:item.id,name:item.name,category:item.category,eventSlot:Number(item.event_slot)||0,amount:Number(item.amount),date:cloudDate(item.movement_date),isoDate:item.movement_date,updatedAt:item.updated_at})),
      events:(eventsRes.data||[]).map(item=>({id:item.id,slot:Number(item.slot),name:item.name,amount:Number(item.amount),date:cloudDate(item.event_date),isoDate:item.event_date,updatedAt:item.updated_at}))
    };
    cloudMeta.goalUpdatedAt=settingsRes.data?.updated_at||cloudMeta.goalUpdatedAt;
    try{ baseSaveState(); }catch{}
    localDirty=false; lastSnapshot=makeSnapshot(); cloudMeta.lastSyncAt=nowIso(); persistCloudMeta();
  }catch(error){ console.error('loadRemoteState',error); toast('No se pudieron actualizar los datos'); }
  finally{ cloudLoading=false; decorateCloudUI(); }
}

function scheduleCloudSync(){
  if(!cloudUser || !cloudWorkspace || cloudLoading || !eventosDb) return;
  clearTimeout(cloudSyncTimer); cloudSyncTimer=setTimeout(()=>syncStateToRemote(false),450);
}
function remoteTime(value){ const t=Date.parse(value||''); return Number.isFinite(t)?t:0; }
function localTime(item){ const t=Date.parse(item?.updatedAt||''); return Number.isFinite(t)?t:Date.now(); }

async function syncSimpleCollection(table,key,toRow){
  const wid=cloudWorkspace.id;
  const {data:remote,error}=await eventosDb.from(table).select('id,updated_at,deleted_at').eq('workspace_id',wid);
  if(error) throw error;
  const byId=new Map((remote||[]).map(row=>[row.id,row]));
  const rows=[];
  for(const item of state[key]||[]){
    const r=byId.get(item.id);
    if(r?.deleted_at) continue;
    if(!r || localTime(item)>remoteTime(r.updated_at)) rows.push(toRow(item,wid));
  }
  if(rows.length){ const {error:upsertError}=await eventosDb.from(table).upsert(rows,{onConflict:'id'}); if(upsertError) throw upsertError; }
}
async function syncEvents(){
  const wid=cloudWorkspace.id;
  const {data:remote,error}=await eventosDb.from('eventos_events').select('id,slot,updated_at,deleted_at').eq('workspace_id',wid);
  if(error) throw error;
  const byId=new Map((remote||[]).map(row=>[row.id,row]));
  const bySlot=new Map((remote||[]).filter(row=>!row.deleted_at).map(row=>[Number(row.slot),row]));
  for(const item of state.events||[]){
    const bySameId=byId.get(item.id);
    if(bySameId?.deleted_at) continue;
    const slotConflict=bySlot.get(Number(item.slot));
    const row={id:item.id,workspace_id:wid,slot:Number(item.slot),name:String(item.name||'Evento').trim().slice(0,100),amount:Math.max(0,Number(item.amount)||0),event_date:recordDate(item),updated_at:item.updatedAt||nowIso()};
    if(bySameId){
      if(localTime(item)>remoteTime(bySameId.updated_at)){ const {error:e}=await eventosDb.from('eventos_events').update({...row,id:undefined}).eq('id',item.id); if(e) throw e; }
    }else if(slotConflict){
      if(localTime(item)>remoteTime(slotConflict.updated_at)){
        const {error:e}=await eventosDb.from('eventos_events').update({slot:row.slot,name:row.name,amount:row.amount,event_date:row.event_date}).eq('id',slotConflict.id); if(e) throw e;
        item.id=slotConflict.id;
      }
    }else{
      const {error:e}=await eventosDb.from('eventos_events').insert(row); if(e) throw e;
    }
  }
}
async function flushPendingDeletes(){
  if(!eventosDb || !cloudUser || !pendingDeletes.length) return;
  const remaining=[];
  for(const entry of pendingDeletes){
    try{
      const {error}=await eventosDb.from(entry.table).update({deleted_at:entry.deletedAt||nowIso()}).eq('workspace_id',entry.workspaceId).eq('id',entry.id);
      if(error) throw error;
    }catch(error){ console.error('soft delete failed',error); remaining.push(entry); }
  }
  pendingDeletes=remaining; persistPendingDeletes();
}

async function syncStateToRemote(force=false){
  if(!eventosDb || !cloudUser || !cloudWorkspace || cloudSyncing || cloudLoading || (!force && !localDirty && !pendingDeletes.length)) return;
  if(!navigator.onLine){ localDirty=true; decorateCloudUI(); return; }
  cloudSyncing=true;
  try{
    normalizeState(false);
    await flushPendingDeletes();
    const wid=cloudWorkspace.id;
    const {data:remoteSettings,error:settingsReadError}=await eventosDb.from('eventos_settings').select('goal,updated_at').eq('workspace_id',wid).maybeSingle();
    if(settingsReadError) throw settingsReadError;
    if(!remoteSettings || remoteTime(cloudMeta.goalUpdatedAt)>=remoteTime(remoteSettings.updated_at)){
      const {error:settingsError}=await eventosDb.from('eventos_settings').upsert({workspace_id:wid,goal:Math.max(1,Number(state.goal)||7000)}); if(settingsError) throw settingsError;
    }
    await syncSimpleCollection('eventos_savings','savings',(item,w)=>({id:item.id,workspace_id:w,name:String(item.name||'Aportación').trim().slice(0,80)||'Aportación',amount:Math.max(.01,Number(item.amount)||.01),movement_date:recordDate(item),updated_at:item.updatedAt||nowIso()}));
    await syncSimpleCollection('eventos_expenses','expenses',(item,w)=>({id:item.id,workspace_id:w,name:String(item.name||'Inversión').trim().slice(0,80)||'Inversión',category:['Material','Catering','Local','Otros'].includes(item.category)?item.category:'Otros',event_slot:Math.min(5,Math.max(0,Number(item.eventSlot)||0)),amount:Math.max(.01,Number(item.amount)||.01),movement_date:recordDate(item),updated_at:item.updatedAt||nowIso()}));
    await syncEvents();
    localDirty=false; cloudMeta.lastSyncAt=nowIso(); persistCloudMeta(); lastSnapshot=makeSnapshot();
    await loadRemoteState(true);
  }catch(error){ console.error('syncStateToRemote',error); localDirty=true; toast('Cambios guardados en el dispositivo; se sincronizarán después'); }
  finally{ cloudSyncing=false; decorateCloudUI(); }
}

function subscribeWorkspace(){
  if(cloudChannel){ eventosDb.removeChannel(cloudChannel); cloudChannel=null; }
  if(!cloudWorkspace || !eventosDb) return;
  const wid=cloudWorkspace.id; let reloadTimer;
  const reload=()=>{ clearTimeout(reloadTimer); reloadTimer=setTimeout(async()=>{ if(cloudSyncing||localDirty) return; await loadRemoteState(true); render(); },350); };
  cloudChannel=eventosDb.channel(`eventos-${wid}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_settings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_savings',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_expenses',filter:`workspace_id=eq.${wid}`},reload)
    .on('postgres_changes',{event:'*',schema:'public',table:'eventos_events',filter:`workspace_id=eq.${wid}`},reload)
    .subscribe();
}

async function startAnonymousAccess(forceGate=false){
  if(!eventosDb){ hideCloudGate(); render(); return; }
  if(forceGate) setGateCopy('Preparando Eventos','Sin correo. Sin contraseña. Acceso automático en este dispositivo.');
  setGateMessage('Conectando…');
  try{
    const {data:sessionData,error:sessionError}=await eventosDb.auth.getSession(); if(sessionError) throw sessionError;
    if(sessionData?.session?.user){ cloudUser=sessionData.session.user; await bootstrapWorkspace(); return; }
    const {data,error}=await eventosDb.auth.signInAnonymously(); if(error) throw error;
    cloudUser=data?.user||data?.session?.user||null; if(!cloudUser) throw new Error('No se pudo crear la identidad automática.');
    await bootstrapWorkspace();
  }catch(error){
    console.error('anonymous access unavailable',error); cloudUser=null; cloudWorkspace=null; hideCloudGate(); render(); toast('Modo local activo');
  }
}

async function bootCloud(){
  if(cloudBooted) return; cloudBooted=true; mountCloudShell(); normalizeState(false);
  try{ baseSaveState(); }catch{}
  lastSnapshot=makeSnapshot();
  setGateCopy('Preparando Eventos','Sin correo. Sin contraseña. Acceso automático en este dispositivo.');
  await startAnonymousAccess();
  eventosDb?.auth.onAuthStateChange((event,sessionNow)=>{ if(sessionNow?.user){ cloudUser=sessionNow.user; if(event==='SIGNED_IN') setTimeout(()=>bootstrapWorkspace(),0); } });
  window.addEventListener('online',()=>{ toast('Conexión recuperada'); scheduleCloudSync(); render(); });
  window.addEventListener('offline',()=>{ toast('Sin conexión · los cambios se guardarán aquí'); render(); });
  window.addEventListener('error',event=>{ console.error('Eventos runtime error',event.error||event.message); });
  window.addEventListener('unhandledrejection',event=>{ console.error('Eventos promise rejection',event.reason); });
  render();
}

bootCloud();
