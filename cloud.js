const EVENTOS_API='https://pyodzkmreynyxhvxstta.supabase.co/functions/v1/eventos-code-api';
const SHARED_DEVICE_KEY='eventos-shared-device-v2';
const SHARED_WORKSPACE_KEY='eventos-shared-workspace-v2';
const SHARED_META_KEY='eventos-shared-meta-v2';
const SHARED_DELETE_KEY='eventos-shared-deletes-v2';
const SHARED_DIRTY_KEY='eventos-shared-dirty-v2';

function sharedParse(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')??fallback}catch{return fallback}}
function sharedUid(){return crypto?.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}
function sharedDeviceToken(){let token=localStorage.getItem(SHARED_DEVICE_KEY);if(!/^[a-f0-9]{64}$/i.test(String(token||''))){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);token=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(SHARED_DEVICE_KEY,token)}return token}
function sharedNow(){return new Date().toISOString()}
function sharedToday(){return sharedNow().slice(0,10)}
function sharedDateLabel(v){if(!v)return dateLabel();const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?dateLabel():new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function sharedIsoFromLabel(label){const s=String(label||'').toLowerCase().replace(/\./g,'').trim();const m=s.match(/^(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})$/i);if(!m)return sharedToday();const months={ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};const mo=months[m[2]];return mo?`${m[3]}-${String(mo).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`:sharedToday()}
function sharedRecordDate(item){return /^\d{4}-\d{2}-\d{2}$/.test(String(item?.isoDate||''))?item.isoDate:sharedIsoFromLabel(item?.date)}
function sharedSignature(item,key){if(key==='savings')return JSON.stringify([item.name,Number(item.amount||0),sharedRecordDate(item)]);if(key==='expenses')return JSON.stringify([item.name,item.category,Number(item.eventSlot||0),Number(item.amount||0),sharedRecordDate(item)]);return JSON.stringify([Number(item.slot||0),item.name,Number(item.amount||0),sharedRecordDate(item)])}

let sharedWorkspace=sharedParse(SHARED_WORKSPACE_KEY,null);
let sharedMeta=sharedParse(SHARED_META_KEY,{goalUpdatedAt:null,lastSyncAt:null});
let sharedDeletes=sharedParse(SHARED_DELETE_KEY,[]);
let sharedDirty=localStorage.getItem(SHARED_DIRTY_KEY)==='1';
let sharedSyncing=false;
let sharedLoading=false;
let sharedTimer=null;
let sharedPoll=null;
let sharedLastSnapshot=null;
let sharedApplyingRemote=false;
const sharedBaseSaveState=saveState;

function persistShared(){try{sharedWorkspace?localStorage.setItem(SHARED_WORKSPACE_KEY,JSON.stringify(sharedWorkspace)):localStorage.removeItem(SHARED_WORKSPACE_KEY);localStorage.setItem(SHARED_META_KEY,JSON.stringify(sharedMeta));localStorage.setItem(SHARED_DELETE_KEY,JSON.stringify(sharedDeletes));localStorage.setItem(SHARED_DIRTY_KEY,sharedDirty?'1':'0')}catch{}}
function sharedSnapshot(){const snap={goal:Number(state.goal||0)};['savings','expenses','events'].forEach(k=>snap[k]=new Map((state[k]||[]).map(x=>[x.id,sharedSignature(x,k)])));return snap}
function normalizeShared(mark=false){const stamp=sharedNow();['savings','expenses','events'].forEach(k=>{state[k]=Array.isArray(state[k])?state[k]:[];state[k]=state[k].map(item=>{const n={...item};n.id=n.id||sharedUid();n.isoDate=sharedRecordDate(n);const before=sharedLastSnapshot?.[k]?.get(n.id),after=sharedSignature(n,k);if(!n.updatedAt||(mark&&before!==after))n.updatedAt=stamp;return n})});if(!sharedMeta.goalUpdatedAt)sharedMeta.goalUpdatedAt=stamp}
function queueSharedDeletes(previous){if(!sharedWorkspace||!previous)return;const table={savings:'eventos_savings',expenses:'eventos_expenses',events:'eventos_events'};['savings','expenses','events'].forEach(k=>{const current=new Set((state[k]||[]).map(x=>x.id));for(const id of previous[k]?.keys?.()||[]){if(!current.has(id)&&!sharedDeletes.some(x=>x.workspaceId===sharedWorkspace.id&&x.table===table[k]&&x.id===id))sharedDeletes.push({workspaceId:sharedWorkspace.id,table:table[k],id,deletedAt:sharedNow()})}})}

saveState=function(){const previous=sharedLastSnapshot;normalizeShared(true);if(previous&&Number(previous.goal)!==Number(state.goal))sharedMeta.goalUpdatedAt=sharedNow();queueSharedDeletes(previous);try{sharedBaseSaveState()}catch(error){console.error(error)}sharedLastSnapshot=sharedSnapshot();if(!sharedApplyingRemote&&sharedWorkspace){sharedDirty=true;scheduleSharedSync()}persistShared()};

async function sharedApi(action,extra={}){const res=await fetch(EVENTOS_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,deviceToken:sharedDeviceToken(),...extra}),cache:'no-store'});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data?.error||`Error ${res.status}`);return data}
function sharedPayload(){normalizeShared(false);return{goal:Number(state.goal)||7000,goalUpdatedAt:sharedMeta.goalUpdatedAt||sharedNow(),savings:(state.savings||[]).map(x=>({id:x.id,name:x.name,amount:Number(x.amount)||0,isoDate:sharedRecordDate(x),updatedAt:x.updatedAt||sharedNow()})),expenses:(state.expenses||[]).map(x=>({id:x.id,name:x.name,category:x.category,eventSlot:Number(x.eventSlot)||0,amount:Number(x.amount)||0,isoDate:sharedRecordDate(x),updatedAt:x.updatedAt||sharedNow()})),events:(state.events||[]).map(x=>({id:x.id,slot:Number(x.slot)||1,name:x.name,amount:Number(x.amount)||0,isoDate:sharedRecordDate(x),updatedAt:x.updatedAt||sharedNow()}))}}
function applySharedRemote(data){if(data?.workspace)sharedWorkspace={id:data.workspace.id,name:data.workspace.name,role:data.workspace.role};const remote=data?.state;if(!remote)return;sharedApplyingRemote=true;state={goal:Number(remote.goal||7000),savings:(remote.savings||[]).map(x=>({id:x.id,name:x.name,amount:Number(x.amount),date:sharedDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt})),expenses:(remote.expenses||[]).map(x=>({id:x.id,name:x.name,category:x.category,eventSlot:Number(x.eventSlot)||0,amount:Number(x.amount),date:sharedDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt})),events:(remote.events||[]).map(x=>({id:x.id,slot:Number(x.slot)||1,name:x.name,amount:Number(x.amount),date:sharedDateLabel(x.isoDate),isoDate:x.isoDate,updatedAt:x.updatedAt}))};sharedMeta.goalUpdatedAt=remote.goalUpdatedAt||sharedMeta.goalUpdatedAt;sharedMeta.lastSyncAt=sharedNow();sharedDirty=false;sharedDeletes=sharedDeletes.filter(x=>x.workspaceId!==sharedWorkspace?.id);try{sharedBaseSaveState()}catch{}sharedLastSnapshot=sharedSnapshot();sharedApplyingRemote=false;persistShared();render()}
function localHasData(){return (state.savings?.length||0)+(state.expenses?.length||0)+(state.events?.length||0)>0||Number(state.goal||7000)!==7000}

async function joinSharedWorkspace(code){const localCopy=JSON.parse(JSON.stringify(state));const hadLocal=localHasData();const data=await sharedApi('join',{code:String(code||'').trim().toUpperCase()});sharedWorkspace={id:data.workspace.id,name:data.workspace.name,role:data.workspace.role};persistShared();if(data.workspace.role==='owner'&&hadLocal){state=localCopy;normalizeShared(true);sharedLastSnapshot=sharedSnapshot();sharedDirty=true;persistShared();await syncSharedState(true)}else{applySharedRemote(data)}startSharedPolling();return true}
async function loadSharedState(force=false){if(!sharedWorkspace||sharedLoading||(!force&&sharedDirty)||!navigator.onLine)return;sharedLoading=true;try{const data=await sharedApi('load',{workspaceId:sharedWorkspace.id});applySharedRemote(data)}catch(error){console.error('loadSharedState',error);if(/no autorizado|no válido/i.test(String(error.message))){sharedWorkspace=null;sharedDirty=false;persistShared()}}finally{sharedLoading=false}}
async function syncSharedState(force=false){if(!sharedWorkspace||sharedSyncing||sharedLoading||(!force&&!sharedDirty&&!sharedDeletes.length))return;if(!navigator.onLine){sharedDirty=true;persistShared();return}sharedSyncing=true;try{const deletes=sharedDeletes.filter(x=>x.workspaceId===sharedWorkspace.id);const data=await sharedApi('sync',{workspaceId:sharedWorkspace.id,state:sharedPayload(),deletes});applySharedRemote(data)}catch(error){console.error('syncSharedState',error);sharedDirty=true;persistShared()}finally{sharedSyncing=false}}
function scheduleSharedSync(){if(!sharedWorkspace)return;clearTimeout(sharedTimer);sharedTimer=setTimeout(()=>syncSharedState(false),450)}
function startSharedPolling(){clearInterval(sharedPoll);sharedPoll=setInterval(()=>{if(document.hidden||!navigator.onLine||!sharedWorkspace)return;if(sharedDirty||sharedDeletes.length)syncSharedState(false);else loadSharedState(false)},10000)}
async function bootSharedCloud(){normalizeShared(false);try{sharedBaseSaveState()}catch{}sharedLastSnapshot=sharedSnapshot();if(sharedWorkspace){if(sharedDirty||sharedDeletes.length)await syncSharedState(false);else await loadSharedState(true)}startSharedPolling();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine&&sharedWorkspace){if(sharedDirty||sharedDeletes.length)syncSharedState(false);else loadSharedState(true)}});window.addEventListener('online',()=>{if(sharedWorkspace)syncSharedState(false)})}

window.EventosCloud={
  isPaired:()=>Boolean(sharedWorkspace?.id),
  role:()=>sharedWorkspace?.role||null,
  join:joinSharedWorkspace,
  refresh:()=>loadSharedState(true),
  sync:()=>syncSharedState(true)
};

bootSharedCloud();
