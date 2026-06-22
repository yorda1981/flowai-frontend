// NexaAI CRM — contacts.js

// ─── LOAD & RENDER LIST ────────────────────────────────────────────────────

async function loadContacts(){
  const [data, labelsData] = await Promise.all([api('/api/contacts'), api('/api/labels')]);
  allContacts = data || [];
  allLabels   = labelsData || [];
  renderContacts(allContacts);
}

function renderContacts(list){
  const chColors = { whatsapp:'green', telegram:'blue', webchat:'amber' };
  const labelColorMap = Object.fromEntries(allLabels.map(l => [l.name, l.color||'gray']));
  document.getElementById('contacts-body').innerHTML = list.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:20px">No hay contactos. Añade el primero.</td></tr>'
    : list.map(c => `<tr>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div class="avatar" style="width:28px;height:28px;font-size:11px">${(c.name||'?').substring(0,2).toUpperCase()}</div>
          ${c.name||'Sin nombre'}
        </div></td>
        <td style="color:var(--text2)">${c.phone||'—'}</td>
        <td><span class="badge ${chColors[c.channel]||'gray'}">${c.channel||'—'}</span></td>
        <td>
          <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
            ${(c.tags||[]).map(t => `<span class="badge ${labelColorMap[t]||'gray'}" style="cursor:pointer" onclick="removeTag('${c.id}','${t}','${(c.tags||[]).join(',')}')">${t} ×</span>`).join('')}
            <span class="badge blue" style="cursor:pointer;font-size:11px" onclick="addTag('${c.id}','${(c.tags||[]).join(',')}')"><i class="ti ti-plus" style="font-size:10px"></i> etiqueta</span>
          </div>
        </td>
        <td>
          <select style="font-size:12px;padding:3px 6px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--surface);color:var(--text);outline:none;cursor:pointer" onchange="updateStage('${c.id}',this.value)">
            <option value="" ${!c.pipeline_stage?'selected':''}>— Sin etapa —</option>
            <option value="lead"        ${c.pipeline_stage==='lead'?'selected':''}>🎯 Lead</option>
            <option value="interesado"  ${c.pipeline_stage==='interesado'?'selected':''}>⭐ Interesado</option>
            <option value="negociacion" ${c.pipeline_stage==='negociacion'?'selected':''}>🤝 Negociación</option>
            <option value="cliente"     ${c.pipeline_stage==='cliente'?'selected':''}>🏆 Cliente</option>
          </select>
        </td>
        <td><button class="btn" style="padding:3px 8px;font-size:12px" onclick="deleteContact('${c.id}')"><i class="ti ti-trash"></i></button></td>
      </tr>`).join('');
}

// ─── VIEW TOGGLE ───────────────────────────────────────────────────────────

function setContactView(view){
  contactView = view;
  document.getElementById('contacts-list-view').style.display   = view === 'list'   ? '' : 'none';
  document.getElementById('contacts-kanban-view').style.display = view === 'kanban' ? '' : 'none';
  const lBtn = document.getElementById('view-list-btn');
  const kBtn = document.getElementById('view-kanban-btn');
  lBtn.style.background = view === 'list'   ? 'var(--blue)' : '';
  lBtn.style.color      = view === 'list'   ? '#fff'        : '';
  kBtn.style.background = view === 'kanban' ? 'var(--blue)' : '';
  kBtn.style.color      = view === 'kanban' ? '#fff'        : '';
  if(view === 'kanban') renderKanban(allContacts);
}

// ─── KANBAN DRAG & DROP ────────────────────────────────────────────────────

let _dragId   = null;   // id do contato sendo arrastado
let _dragFrom = null;   // coluna de origem

function renderKanban(list){
  injectKanbanStyles();

  const STAGES = [
    { key:'lead',        label:'Lead',        icon:'ti-user',      color:'var(--blue)',   badge:'blue'   },
    { key:'interesado',  label:'Interesado',  icon:'ti-star',      color:'var(--amber)',  badge:'amber'  },
    { key:'negociacion', label:'Negociación', icon:'ti-handshake', color:'var(--purple)', badge:'purple' },
    { key:'cliente',     label:'Cliente',     icon:'ti-trophy',    color:'var(--green)',  badge:'green'  },
  ];

  // Atualiza contadores
  STAGES.forEach(s => {
    const count = list.filter(c => c.pipeline_stage === s.key).length;
    const el = document.getElementById('count-' + s.key);
    if(el) el.textContent = count;
  });

  // Renderiza cards em cada coluna
  STAGES.forEach(s => {
    const col = document.getElementById('kanban-' + s.key);
    if(!col) return;
    const contacts = list.filter(c => c.pipeline_stage === s.key);

    col.innerHTML = contacts.length === 0
      ? `<div class="kd-empty">Arraste contatos aqui</div>`
      : contacts.map(c => buildKanbanCard(c)).join('');

    // Evento nos cards
    col.querySelectorAll('.kd-card').forEach(card => {
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragend',   onDragEnd);
      card.addEventListener('click',     () => openContactModal(card.dataset.id));
    });

    // Eventos na coluna (drop zone)
    col.addEventListener('dragover',  onDragOver);
    col.addEventListener('dragleave', onDragLeave);
    col.addEventListener('drop',      onDrop);
  });
}

function buildKanbanCard(c){
  const initials = (c.name||'?').substring(0,2).toUpperCase();
  const tags     = (c.tags||[]).slice(0,3);
  const valor    = c.custom_data?.valor ? `<div class="kd-valor">R$ ${c.custom_data.valor}</div>` : '';
  return `
    <div class="kd-card" draggable="true" data-id="${c.id}" data-stage="${c.pipeline_stage||''}">
      <div class="kd-top">
        <div class="kd-avatar">${initials}</div>
        <div class="kd-info">
          <div class="kd-name">${c.name||'Sin nombre'}</div>
          <div class="kd-phone">${c.phone||'—'}</div>
        </div>
        <div class="kd-drag-handle"><i class="ti ti-grip-vertical"></i></div>
      </div>
      ${valor}
      ${tags.length ? `<div class="kd-tags">${tags.map(t=>`<span class="kd-tag">${t}</span>`).join('')}</div>` : ''}
    </div>`;
}

// ── Drag events ──

function onDragStart(e){
  _dragId   = this.dataset.id;
  _dragFrom = this.dataset.stage;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragId);
  this.classList.add('kd-dragging');
}

function onDragEnd(e){
  this.classList.remove('kd-dragging');
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.classList.remove('kd-over');
    const drop = col.querySelector('.kd-drop-indicator');
    if(drop) drop.remove();
  });
}

function onDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = this.closest('.kanban-col') || this;
  if(!col.classList.contains('kd-over')){
    col.classList.add('kd-over');
    // indicador visual de drop
    if(!col.querySelector('.kd-drop-indicator')){
      const ind = document.createElement('div');
      ind.className = 'kd-drop-indicator';
      col.appendChild(ind);
    }
  }
}

function onDragLeave(e){
  // só remove se saiu de fato da coluna
  const col = this.closest('.kanban-col') || this;
  if(!col.contains(e.relatedTarget)){
    col.classList.remove('kd-over');
    const ind = col.querySelector('.kd-drop-indicator');
    if(ind) ind.remove();
  }
}

async function onDrop(e){
  e.preventDefault();
  const col      = this.closest('.kanban-col') || this;
  const newStage = col.dataset.stage;
  col.classList.remove('kd-over');
  const ind = col.querySelector('.kd-drop-indicator');
  if(ind) ind.remove();

  if(!_dragId || newStage === _dragFrom) return;

  // Otimista: atualiza local antes da API
  const contact = allContacts.find(c => c.id === _dragId);
  if(contact) contact.pipeline_stage = newStage;
  renderKanban(allContacts);

  try {
    await api(`/api/contacts/${_dragId}`, 'PATCH', { pipeline_stage: newStage });
    showToast(`Movido para ${newStage} ✓`);
  } catch(err) {
    // Reverte se API falhar
    if(contact) contact.pipeline_stage = _dragFrom;
    renderKanban(allContacts);
    showToast('Erro ao mover contato');
  }

  _dragId = null; _dragFrom = null;
}

// ─── MODAL DE DETALHES DO CONTATO ─────────────────────────────────────────

function openContactModal(id){
  const c = allContacts.find(x => x.id === id);
  if(!c) return;

  document.getElementById('kd-modal')?.remove();

  const STAGES = [
    { key:'lead',        label:'🎯 Lead'        },
    { key:'interesado',  label:'⭐ Interesado'  },
    { key:'negociacion', label:'🤝 Negociación' },
    { key:'cliente',     label:'🏆 Cliente'     },
  ];

  const modal = document.createElement('div');
  modal.id = 'kd-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:28px;width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div class="avatar" style="width:46px;height:46px;font-size:16px;flex-shrink:0">${(c.name||'?').substring(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700">${c.name||'Sin nombre'}</div>
          <div style="font-size:13px;color:var(--text2)">${c.phone||'—'}</div>
        </div>
        <i class="ti ti-x" style="cursor:pointer;font-size:20px;color:var(--text3)" onclick="document.getElementById('kd-modal').remove()"></i>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:var(--radius);padding:12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Canal</div>
          <div style="font-size:13px;font-weight:500">${c.channel||'—'}</div>
        </div>
        <div style="background:var(--bg);border-radius:var(--radius);padding:12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Etapa</div>
          <select id="modal-stage" style="font-size:13px;font-weight:500;border:none;background:transparent;color:var(--text);outline:none;width:100%;cursor:pointer">
            <option value="">— Sin etapa —</option>
            ${STAGES.map(s => `<option value="${s.key}" ${c.pipeline_stage===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Valor estimado (R$)</div>
        <input id="modal-valor" type="number" placeholder="0,00" value="${c.custom_data?.valor||''}"
          style="width:100%;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box">
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Notas</div>
        <textarea id="modal-notes" rows="3" placeholder="Observações sobre este contato..."
          style="width:100%;padding:8px 12px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box">${c.custom_data?.notes||''}</textarea>
      </div>

      ${(c.tags||[]).length > 0 ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Etiquetas</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${(c.tags||[]).map(t=>`<span class="badge gray">${t}</span>`).join('')}</div>
      </div>` : ''}

      <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:16px">
        <button class="btn" onclick="document.getElementById('kd-modal').remove()">Cancelar</button>
        <button class="btn primary" onclick="saveContactModal('${c.id}')"><i class="ti ti-device-floppy"></i> Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
}

async function saveContactModal(id){
  const stage = document.getElementById('modal-stage').value;
  const valor = document.getElementById('modal-valor').value;
  const notes = document.getElementById('modal-notes').value;

  const contact = allContacts.find(c => c.id === id);
  if(contact){
    contact.pipeline_stage = stage;
    contact.custom_data    = { ...(contact.custom_data||{}), valor, notes };
  }

  await api(`/api/contacts/${id}`, 'PATCH', {
    pipeline_stage: stage,
    custom_data: { valor, notes }
  });

  document.getElementById('kd-modal').remove();
  showToast('Contato atualizado ✓');
  renderKanban(allContacts);
  renderContacts(allContacts);
}

// ─── STAGE UPDATE (lista) ──────────────────────────────────────────────────

async function updateStage(contactId, stage){
  await api(`/api/contacts/${contactId}`, 'PATCH', { pipeline_stage: stage });
  const c = allContacts.find(x => x.id === contactId);
  if(c) c.pipeline_stage = stage;
  if(contactView === 'kanban') renderKanban(allContacts);
  showToast('Etapa actualizada ✓');
}

async function moveStage(contactId, stage){ await updateStage(contactId, stage); }

// ─── TAGS ──────────────────────────────────────────────────────────────────

async function addTag(contactId, currentTagsStr){
  const currentTags = currentTagsStr ? currentTagsStr.split(',').filter(Boolean) : [];
  const labels = await api('/api/labels') || [];
  showLabelModal(contactId, currentTags, labels);
}

async function removeTag(contactId, tag, currentTagsStr){
  const currentTags = currentTagsStr ? currentTagsStr.split(',').filter(Boolean) : [];
  const newTags = currentTags.filter(t => t !== tag);
  await api(`/api/contacts/${contactId}`, 'PATCH', { tags: newTags });
  showToast('Etiqueta eliminada');
  loadContacts();
}

function showLabelModal(contactId, currentTags, labels){
  document.getElementById('label-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'label-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:24px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-weight:600;font-size:15px">Etiquetas del contacto</div>
        <i class="ti ti-x" style="cursor:pointer;font-size:18px;color:var(--text2)" onclick="document.getElementById('label-modal').remove()"></i>
      </div>
      <div id="label-list" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;margin-bottom:16px">
        ${labels.length === 0
          ? '<div style="color:var(--text2);font-size:13px;padding:10px 0">No tienes etiquetas. Crea una abajo.</div>'
          : labels.map(l => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius);cursor:pointer;border:1px solid var(--border)">
              <input type="checkbox" value="${l.name}" ${currentTags.includes(l.name)?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--blue)">
              <span class="badge ${l.color||'gray'}" style="font-size:12px">${l.name}</span>
            </label>`).join('')
        }
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500">+ Nueva etiqueta</div>
        <div style="display:flex;gap:8px">
          <input id="new-label-input" type="text" placeholder="Nombre..." style="flex:1;padding:7px 10px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;font-family:inherit;outline:none">
          <select id="new-label-color" style="padding:7px;border:1px solid var(--border2);border-radius:var(--radius);font-size:13px;outline:none">
            <option value="gray">Gris</option>
            <option value="blue">Azul</option>
            <option value="green">Verde</option>
            <option value="amber">Naranja</option>
            <option value="red">Rojo</option>
          </select>
          <button class="btn primary" style="padding:7px 12px" onclick="createLabelAndReload('${contactId}','${currentTags.join(',')}')"><i class="ti ti-plus"></i></button>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" onclick="document.getElementById('label-modal').remove()">Cancelar</button>
        <button class="btn primary" onclick="saveLabelModal('${contactId}')"><i class="ti ti-check"></i>Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

async function saveLabelModal(contactId){
  const checks  = document.querySelectorAll('#label-list input[type=checkbox]');
  const newTags = Array.from(checks).filter(c => c.checked).map(c => c.value);
  await api(`/api/contacts/${contactId}`, 'PATCH', { tags: newTags });
  document.getElementById('label-modal').remove();
  showToast('Etiquetas actualizadas ✓');
  loadContacts();
}

async function createLabelAndReload(contactId, currentTagsStr){
  const name  = document.getElementById('new-label-input').value.trim();
  const color = document.getElementById('new-label-color').value;
  if(!name){ showToast('Ingresa el nombre'); return; }
  await api('/api/labels', 'POST', { name, color });
  showToast('Etiqueta creada ✓');
  const currentTags = currentTagsStr ? currentTagsStr.split(',').filter(Boolean) : [];
  const labels = await api('/api/labels') || [];
  showLabelModal(contactId, currentTags, labels);
}

// ─── SEARCH ────────────────────────────────────────────────────────────────

function searchContacts(q){
  const f = q.toLowerCase();
  const filtered = allContacts.filter(c => (c.name||'').toLowerCase().includes(f)||(c.phone||'').includes(f));
  renderContacts(filtered);
  if(contactView === 'kanban') renderKanban(filtered);
}

// ─── ADD / DELETE ──────────────────────────────────────────────────────────

async function showAddContact(){
  const name    = prompt('Nombre del contacto:'); if(!name) return;
  const phone   = prompt('Número de teléfono:'); if(!phone) return;
  const channel = prompt('Canal (whatsapp/telegram/webchat):') || 'whatsapp';
  await api('/api/contacts', 'POST', { name, phone, channel });
  showToast('Contacto añadido ✓');
  loadContacts();
}

async function deleteContact(id){
  if(!confirm('¿Eliminar este contacto?')) return;
  await api(`/api/contacts/${id}`, 'DELETE');
  showToast('Contacto eliminado');
  loadContacts();
}

// ─── CSV IMPORT ────────────────────────────────────────────────────────────

async function importContactsCSV(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async function(e){
    const lines = e.target.result.split('\n').filter(l => l.trim());
    if(!lines.length){ showToast('CSV vazio'); return; }
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome')||firstLine.includes('telefone')||firstLine.includes('phone')||firstLine.includes('name')||firstLine.includes('número');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    let imported = 0, skipped = 0, errors = 0;
    showToast('Importando contatos...');
    for(const line of dataLines){
      if(!line.trim()) continue;
      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/"/g,''));
      if(!cols.length) continue;
      let phone = '', name = '';
      if(cols.length === 1){
        phone = cols[0].replace(/\D/g,'');
      } else {
        const c0 = cols[0].replace(/\D/g,''), c1 = cols[1] ? cols[1].replace(/\D/g,'') : '';
        if(c0.length >= 8){ phone = c0; name = cols[1]||''; }
        else if(c1.length >= 8){ phone = c1; name = cols[0]||''; }
        else { skipped++; continue; }
      }
      if(!phone || phone.length < 8){ skipped++; continue; }
      try {
        await api('/api/contacts', 'POST', { name: name||phone, phone, channel:'whatsapp' });
        imported++;
      } catch(e){ errors++; }
    }
    input.value = '';
    loadContacts();
    showToast(`✅ ${imported} contatos importados${skipped>0?` · ${skipped} ignorados`:''}${errors>0?` · ${errors} erros`:''}`);
  };
  reader.readAsText(file);
}

// ─── ESTILOS KANBAN (injetados uma vez) ────────────────────────────────────

function injectKanbanStyles(){
  if(document.getElementById('kd-styles')) return;
  const s = document.createElement('style');
  s.id = 'kd-styles';
  s.textContent = `
    #contacts-kanban-view {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      align-items: start;
    }

    /* Cabeçalho da coluna já existe no HTML — só estilos do drop zone */
    .kanban-col {
      background: var(--bg);
      border-radius: var(--radius-lg);
      padding: 10px;
      min-height: 200px;
      transition: background .15s;
      border: 2px solid transparent;
    }
    .kanban-col.kd-over {
      background: var(--blue-light);
      border-color: var(--blue);
    }

    /* Card */
    .kd-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px;
      cursor: grab;
      user-select: none;
      transition: box-shadow .15s, opacity .15s, transform .1s;
      margin-bottom: 8px;
    }
    .kd-card:hover {
      box-shadow: 0 2px 12px rgba(0,0,0,.1);
      transform: translateY(-1px);
    }
    .kd-card.kd-dragging {
      opacity: .45;
      cursor: grabbing;
      box-shadow: 0 8px 24px rgba(0,0,0,.18);
    }
    .kd-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kd-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: var(--blue-light);
      color: var(--blue);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      flex-shrink: 0;
    }
    .kd-info { flex: 1; min-width: 0; }
    .kd-name {
      font-size: 13px; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .kd-phone { font-size: 11px; color: var(--text2); }
    .kd-drag-handle {
      color: var(--text3); font-size: 15px;
      cursor: grab; padding: 0 2px;
    }
    .kd-valor {
      font-size: 13px; font-weight: 700;
      color: var(--green); margin-top: 7px;
    }
    .kd-tags {
      display: flex; flex-wrap: wrap; gap: 4px;
      margin-top: 7px;
    }
    .kd-tag {
      font-size: 10px; padding: 2px 7px;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 10px; color: var(--text2);
    }

    /* Indicador de drop */
    .kd-drop-indicator {
      height: 3px;
      background: var(--blue);
      border-radius: 2px;
      margin: 4px 0;
      animation: kd-pulse .5s ease-in-out infinite alternate;
    }
    @keyframes kd-pulse { from { opacity:.4 } to { opacity:1 } }

    /* Empty state */
    .kd-empty {
      text-align: center;
      color: var(--text3);
      font-size: 12px;
      padding: 28px 10px;
      border: 2px dashed var(--border);
      border-radius: var(--radius);
    }
  `;
  document.head.appendChild(s);
}
