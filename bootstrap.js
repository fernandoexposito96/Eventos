// Capa final de resiliencia. Se carga justo después de cloud-robust.js.
(function hardenEventos(){
  try{
    const localCount = (state?.savings?.length || 0) + (state?.expenses?.length || 0) + (state?.events?.length || 0);
    if(localCount > 0 && !cloudMeta?.lastSyncAt){
      // Primera conexión: conserva y sube los datos locales antes de aceptar una nube vacía.
      localDirty = true;
    }
  }catch(error){ console.error('initial migration guard', error); }

  // Un borrado offline solo gana si no existe una edición remota posterior.
  flushPendingDeletes = async function(){
    if(!eventosDb || !cloudUser || !pendingDeletes.length) return;
    const remaining = [];
    for(const entry of pendingDeletes){
      try{
        const { data: remote, error: readError } = await eventosDb
          .from(entry.table)
          .select('id,updated_at,deleted_at')
          .eq('workspace_id', entry.workspaceId)
          .eq('id', entry.id)
          .maybeSingle();
        if(readError) throw readError;
        if(!remote || remote.deleted_at) continue;

        const deleteTime = Date.parse(entry.deletedAt || '') || 0;
        const remoteTimeValue = Date.parse(remote.updated_at || '') || 0;
        if(remoteTimeValue > deleteTime){
          // La otra persona editó después: se conserva su versión.
          continue;
        }

        const { error } = await eventosDb
          .from(entry.table)
          .update({ deleted_at: entry.deletedAt || new Date().toISOString() })
          .eq('workspace_id', entry.workspaceId)
          .eq('id', entry.id);
        if(error) throw error;
      }catch(error){
        console.error('soft delete retry', error);
        remaining.push(entry);
      }
    }
    pendingDeletes = remaining;
    persistPendingDeletes();
  };

  // Realtime con recuperación automática si el canal cae o vence el tiempo de conexión.
  subscribeWorkspace = function(){
    if(cloudChannel){ eventosDb.removeChannel(cloudChannel); cloudChannel = null; }
    if(!cloudWorkspace || !eventosDb) return;
    const wid = cloudWorkspace.id;
    let reloadTimer;
    let reconnectTimer;
    const reload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(async () => {
        if(cloudSyncing || localDirty) return;
        await loadRemoteState(true);
        render();
      }, 350);
    };
    cloudChannel = eventosDb.channel(`eventos-${wid}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'eventos_settings',filter:`workspace_id=eq.${wid}`},reload)
      .on('postgres_changes',{event:'*',schema:'public',table:'eventos_savings',filter:`workspace_id=eq.${wid}`},reload)
      .on('postgres_changes',{event:'*',schema:'public',table:'eventos_expenses',filter:`workspace_id=eq.${wid}`},reload)
      .on('postgres_changes',{event:'*',schema:'public',table:'eventos_events',filter:`workspace_id=eq.${wid}`},reload)
      .subscribe(status => {
        if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if(navigator.onLine && cloudWorkspace?.id === wid) subscribeWorkspace();
          }, 2500);
        }
      });
  };

  // Añade restauración de copia JSON a los ajustes sin alterar el diseño principal.
  const robustOpenSettings = openSettings;
  openSettings = function(){
    robustOpenSettings();
    const card = document.querySelector('.cloud-settings-card');
    if(!card || document.getElementById('restoreBackup')) return;
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.id = 'restoreBackup';
    restoreButton.className = 'cloud-secondary-btn';
    restoreButton.textContent = 'Restaurar copia de seguridad';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    card.appendChild(restoreButton);
    card.appendChild(input);
    restoreButton.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if(!file) return;
      try{
        const parsed = JSON.parse(await file.text());
        const incoming = parsed?.state || parsed;
        if(!incoming || !Array.isArray(incoming.savings) || !Array.isArray(incoming.expenses) || !Array.isArray(incoming.events)) throw new Error('Formato no válido');
        const goal = Number(incoming.goal);
        if(!Number.isFinite(goal) || goal <= 0) throw new Error('Objetivo no válido');
        if(!confirm('¿Restaurar esta copia? Sustituirá los datos visibles actuales.')) return;
        state = {
          goal,
          savings: incoming.savings,
          expenses: incoming.expenses,
          events: incoming.events
        };
        normalizeState(true);
        saveState();
        closeSheet();
        render();
        toast('Copia restaurada');
      }catch(error){
        console.error('restore backup', error);
        toast('La copia no es válida');
      }finally{
        input.value = '';
      }
    });
  };

  // Pulso de sincronización: recupera cambios aunque Realtime haya fallado silenciosamente.
  setInterval(async () => {
    if(document.hidden || !navigator.onLine || !cloudWorkspace || !eventosDb) return;
    if(localDirty || pendingDeletes.length) await syncStateToRemote(false);
    else await loadRemoteState(false);
  }, 60000);

  document.addEventListener('visibilitychange', async () => {
    if(document.hidden || !navigator.onLine || !cloudWorkspace || !eventosDb) return;
    if(localDirty || pendingDeletes.length) await syncStateToRemote(false);
    else await loadRemoteState(false);
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.error('Service worker', error));
    });
  }
})();
