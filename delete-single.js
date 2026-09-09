(() => {
  function currentItems(type){
    if(type === 'savings') return [...(state.savings || [])].reverse().slice(0,8);
    if(type === 'expenses'){
      const filtered = expenseFilter === 'Todos' ? (state.expenses || []) : (state.expenses || []).filter(item => item.category === expenseFilter);
      return [...filtered].reverse().slice(0,8);
    }
    return [];
  }

  function removeItem(type,item){
    if(!['savings','expenses'].includes(type) || !item) return;
    const list = state[type] || [];
    let index = item.id ? list.findIndex(row => String(row.id || '') === String(item.id)) : list.indexOf(item);
    if(index < 0) index = list.indexOf(item);
    if(index < 0){ toast('No se encontró ese movimiento'); return; }
    if(!confirm('¿Borrar solo este movimiento?')) return;
    list.splice(index,1);
    saveState();
    render();
    toast('Movimiento eliminado');
  }

  function removeEvent(slot){
    const item = eventForSlot(slot);
    if(!item) return;
    if(!confirm('¿Borrar solo este evento?')) return;
    state.events = (state.events || []).filter(row => Number(row.slot) !== Number(slot));
    saveState();
    render();
    toast('Evento eliminado');
  }

  function decorateContributors(){
    const section = document.querySelector('.theme-purple .person-contribution-section');
    if(!section) return;

    const heading = section.querySelector('.person-contribution-head h2');
    if(heading && heading.textContent !== 'Contribuyentes') heading.textContent = 'Contribuyentes';

    const names = section.querySelectorAll('.person-contribution-copy strong');
    if(names[0] && names[0].textContent !== 'Fernando') names[0].textContent = 'Fernando';
    if(names[1] && names[1].textContent !== 'José') names[1].textContent = 'José';

    const head = section.querySelector('.person-contribution-head');
    if(head && !head.querySelector('.extract-link')){
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'extract-link';
      button.textContent = 'Ver extracto';
      button.addEventListener('click', () => {
        document.querySelector('.theme-purple .list-section')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      head.appendChild(button);
    }
  }

  function decorateHistory(){
    document.querySelectorAll('[data-clear]').forEach(button => button.remove());
    decorateContributors();

    ['savings','expenses'].forEach(type => {
      const items = currentItems(type);
      document.querySelectorAll(`.history-row.${type}`).forEach((row,index) => {
        if(row.querySelector('.single-delete-btn')) return;
        const item = items[index];
        if(!item) return;
        const value = row.querySelector('.history-value');
        if(!value) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'single-delete-btn';
        button.setAttribute('aria-label','Borrar solo este movimiento');
        button.innerHTML = icon('trash',14);
        button.style.cssText = 'border:0;background:transparent;color:#e34b58;padding:6px;margin-left:4px;border-radius:10px;display:inline-grid;place-items:center;vertical-align:middle';
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          removeItem(type,item);
        });
        value.style.display = 'flex';
        value.style.alignItems = 'center';
        value.style.justifyContent = 'flex-end';
        value.appendChild(button);
      });
    });

    document.querySelectorAll('.event-row[data-event-slot]').forEach(row => {
      if(row.querySelector('.single-event-delete')) return;
      const slot = Number(row.dataset.eventSlot);
      if(!eventForSlot(slot)) return;
      const button = document.createElement('span');
      button.className = 'single-event-delete';
      button.setAttribute('role','button');
      button.setAttribute('tabindex','0');
      button.setAttribute('aria-label','Borrar solo este evento');
      button.innerHTML = icon('trash',14);
      button.style.cssText = 'display:grid;place-items:center;color:#e34b58;padding:7px;margin:-7px -3px -7px 3px;border-radius:10px';
      const run = event => {
        event.preventDefault();
        event.stopPropagation();
        removeEvent(slot);
      };
      button.addEventListener('click',run);
      button.addEventListener('keydown',event => {
        if(event.key === 'Enter' || event.key === ' ') run(event);
      });
      row.appendChild(button);
    });
  }

  let scheduled = false;
  function scheduleDecorate(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateHistory();
    });
  }

  const appRoot = document.getElementById('app');
  if(appRoot){
    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(appRoot,{childList:true,subtree:true});
    decorateHistory();
  }
})();
// stable contributor cards + individual history deletion
