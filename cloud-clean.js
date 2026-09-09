const EVENTOS_CLEAN_API='https://pyodzkmreynyxhvxstta.supabase.co/functions/v1/eventos-code-api';
const EVENTOS_AUTO_INVITE='40FFA5C76FA5';
const CLEAN_DEVICE_KEY='eventos-clean-device-v1';
const CLEAN_WORKSPACE_KEY='eventos-clean-workspace-v1';
const CLEAN_META_KEY='eventos-clean-meta-v1';
const CLEAN_DELETE_KEY='eventos-clean-deletes-v1';
const CLEAN_DIRTY_KEY='eventos-clean-dirty-v1';

function cleanParse(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')??fallback}catch{return fallback}}
function cleanUid(){return crypto?.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}
function cleanDeviceToken(){let token=localStorage.getItem(CLEAN_DEVICE_KEY);if(!token){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);token=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(CLEAN_DEVICE_KEY,token)}return token}
function cleanNow(){return new Date().toISOString()}
function cleanToday(){return cleanNow().slice(0,10)}
function cleanDateLabel(v){if(!v)return dateLabel();const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?dateLabel():new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function cleanIsoFromLabel(label){const s=String(label||'').toLowerCase().replace(/\./g,'').trim();const m=s.match(/^(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})$/i);if(!m)return cleanToday();const months={ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};const mo=months[m[2]];return mo?`${m[3]}-${String(mo).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`:cleanToday()}
function cleanRecordDate(item){return /^\d{4}-\d{2}-\d{2}$/.test(String(item?.isoDate||''))?item.isoDate:cleanIsoFromLabel(item?.date)}
function cleanSignature(item,key){if(key==='savings')return JSON.stringify([item.name,Number(item.amount||0),cleanRecordDate(item)]);if(key==='expenses')return JSON.stringify([item.name,item.category,Number(item.eventSlot||0),Number(item.amount||0),cleanRecordDate(item)]);return JSON.stringify([Number(item.slot||0),item.name,Number(item.amount||0),cleanRecordDate(item)])}

let cleanWorkspace=cleanParse(CLEAN_WORKSPACE_KEY,null);
let cleanMeta=cleanParse(CLEAN_META_KEY,{goalUpdatedAt:null,lastSyncAt:null});
let cleanDeletes=cleanParse(CLEAN_DELETE_KEY,[]);
let cleanDirty=localStorage.getItem(CLEAN_DIRTY_KEY)==='1';
let cleanSyncing=false;
let cleanLoading=false;
let cleanTimer=null;
let cleanPoll=null;
let cleanLastSnapshot=null;
let cleanApplyingRemote=false;

const cleanBaseSaveState=saveState;

function persistClean(){try{cleanWorkspace?localStorage.setItem(CLEAN_WORKSPACE_KEY,JSON.stringify(cleanWorkspace)):localStorage.removeItem(CLEAN_WORKSPACE_KEY);localStorage.setItem(CLEAN_META_KEY,JSON.stringify(cleanMeta));localStorage.setItem(CLEAN_DELETE_KEY,JSON.stringify(cleanDeletes));localStorage.setItem(CLEAN_DIRTY_KEY,cleanDirty?'1':'0')}catch{}}
function cleanSnapshot(){const snap={goal:Number(state.goal||0)};['savings','expenses','events'].forEach(k=>snap[k]=new Map((state[k]||[]).map(x=>[x.id,cleanSignature(x,k)])));return snap}
function normalizeClean(mark=false){const stamp=cleanNow();['savings','expenses','events'].forEach(k=>{state[k]=Array.isArray(state[k])?state[k]:[];state[k]=state[k].map(item=>{const n={...item};n.id=n.id||cleanUid();n.isoDate=cleanRecordDate(n);const before=cleanLastSnapshot?.[k]?.get(n.id),after=cleanSignature(n,k);if(!n.updatedAt||(mark&&before!==after))n.updatedAt=stamp;return n})});if(!cleanMeta.goalUpdatedAt)cleanMeta.goalUpdatedAt=stamp}
function queueCleanDeletes(previous){if(!cleanWorkspace||!previous)return;const table={savings:'eventos_savings',expenses:'eventos_expenses',events:'eventos_events'};['savings','expenses','events'].forEach(k=>{const current=new Set((state[k]||[]).map(x=>x.id));for(const id of previous[k]?.keys?.()||[]){if(!current.has(id)&&!cleanDeletes.some(x=>x.workspaceId===cleanWorkspace.id&&x.table===table[k]&&x.id===id))cleanDeletes.push({workspaceId:cleanWorkspace.id,table:table[k],id,deletedAt:cleanNow()})}})}

saveState=function(){const previous=cleanLastSnapshot;normalizeClean(true);if(previous&&Number(previous.goal)!==Number(state.goal))cleanMeta.goalUpdatedAt=cleanNow();queueCleanDeletes(previous);try{cleanBaseSaveState()}catch(error){console.error(error)}cleanLastSnapshot=cleanSnapshot();if(!cleanApplyingRemote){cleanDirty=true;scheduleCleanSync()}persistClean()};

async function cleanApi(action,extra={}){const res=await fetch(EVENTOS_CLEAN_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,deviceToken:cleanDeviceToken(),...extra}),cache:'no-store'});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data?.error||`Error ${res.status}`);return data}
function cleanPayload(){normalizeClean(false);return{goal:Number(state.goal)||7000,goalUpdatedAt:cleanMeta.goalUpdatedAt||cleanNow(),savings:(state.savings||[]).map(x=>({id:x.id,name:x.name,amount:Number(x.amount)||0,isoDate:cleanRecordDate(x),updatedAt:x.updatedAt||cleanNow()})),expenses:(state.expenses||[]).map(x=>({id:x.id,name:x.name,category:x.category,eventSlot:Number(x.eventSlot)||0,amount:Number(x.amount)||0,isoDate:cleanRecordDate(x),updatedAt:x.updatedAt||cleanNow()})),events:(state.events||[]).map(x=>({id:x.id,slot:Number(x.slot)||1,name:x.name,amount:Number(x.amount)||0,isoDate:cleanRecordDate(x),updatedAt:x.updatedAt||cleanNow()}))}}
function applyCleanRemote(data){if(data?.workspace)cleanWorkspace={id:data.workspace.id,name:data.workspace.name,role:data.workspace.role};const remote=data?.state;if(!remote)return;cleanApplyingRemote=true;state={goal:Number(remote.goal||7000),savings:(remote.savings||[]).map(x=>({id:x.id,name:x.name,amount:Number(x.amount),date:cleanDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt})),expenses:(remote.expenses||[]).map(x=>({id:x.id,name:x.name,category:x.category,eventSlot:Number(x.eventSlot)||0,amount:Number(x.amount),date:cleanDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt})),events:(remote.events||[]).map(x=>({id:x.id,slot:Number(x.slot)||1,name:x.name,amount:Number(x.amount),date:cleanDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt}))};cleanMeta.goalUpdatedAt=remote.goalUpdatedAt||cleanMeta.goalUpdatedAt;cleanMeta.lastSyncAt=cleanNow();cleanDirty=false;cleanDeletes=cleanDeletes.filter(x=>x.workspaceId!==cleanWorkspace?.id);try{cleanBaseSaveState()}catch{}cleanLastSnapshot=cleanSnapshot();cleanApplyingRemote=false;persistClean()}
function localHasData(){return (state.savings?.length||0)+(state.expenses?.length||0)+(state.events?.length||0)>0||Number(state.goal||7000)!==7000}

async function ensureCleanWorkspace(){if(cleanWorkspace)return true;const localCopy=JSON.parse(JSON.stringify(state));const hadLocal=localHasData();try{const data=await cleanApi('join',{code:EVENTOS_AUTO_INVITE});cleanWorkspace={id:data.workspace.id,name:data.workspace.name,role:data.workspace.role};cleanMeta.goalUpdatedAt=data?.state?.goalUpdatedAt||cleanMeta.goalUpdatedAt;persistClean();if(hadLocal){state=localCopy;normalizeClean(true);cleanLastSnapshot=cleanSnapshot();cleanDirty=true;persistClean();await syncCleanState(true)}else{applyCleanRemote(data);render()}return true}catch(error){console.error('ensureCleanWorkspace',error);return false}}
async function loadCleanState(force=false){if(!cleanWorkspace||cleanLoading||(!force&&cleanDirty)||!navigator.onLine)return;cleanLoading=true;try{const data=await cleanApi('load',{workspaceId:cleanWorkspace.id});applyCleanRemote(data);render()}catch(error){console.error('loadCleanState',error);if(String(error.message).toLowerCase().includes('autorizado')){cleanWorkspace=null;persistClean();await ensureCleanWorkspace()}}finally{cleanLoading=false}}
async function syncCleanState(force=false){if(!cleanWorkspace||cleanSyncing||cleanLoading||(!force&&!cleanDirty&&!cleanDeletes.length))return;if(!navigator.onLine){cleanDirty=true;persistClean();return}cleanSyncing=true;try{const deletes=cleanDeletes.filter(x=>x.workspaceId===cleanWorkspace.id);const data=await cleanApi('sync',{workspaceId:cleanWorkspace.id,state:cleanPayload(),deletes});applyCleanRemote(data);render()}catch(error){console.error('syncCleanState',error);cleanDirty=true;persistClean()}finally{cleanSyncing=false}}
function scheduleCleanSync(){if(!cleanWorkspace)return;clearTimeout(cleanTimer);cleanTimer=setTimeout(()=>syncCleanState(false),500)}

async function bootCleanCloud(){normalizeClean(false);try{cleanBaseSaveState()}catch{}cleanLastSnapshot=cleanSnapshot();const ready=await ensureCleanWorkspace();if(ready){if(cleanDirty||cleanDeletes.length)await syncCleanState(false);else await loadCleanState(true)}clearInterval(cleanPoll);cleanPoll=setInterval(()=>{if(document.hidden||!navigator.onLine||!cleanWorkspace)return;if(cleanDirty||cleanDeletes.length)syncCleanState(false);else loadCleanState(false)},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine&&cleanWorkspace){if(cleanDirty||cleanDeletes.length)syncCleanState(false);else loadCleanState(true)}});window.addEventListener('online',()=>{if(cleanWorkspace)syncCleanState(false)});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));render()}

bootCleanCloud();
