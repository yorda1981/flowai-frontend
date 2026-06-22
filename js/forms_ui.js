// NexaAI CRM — forms_ui.js

const API_BASE = 'https://flowai-server-production.up.railway.app';
let allForms = [];
let editingFormId = null;
let formFields = [];

// ── Tipos de campo disponíveis ──
const FIELD_TYPES = [
  { value:'name',     label:'Nome',         icon:'ti-user',       placeholder:'Seu nome completo' },
  { value:'phone',    label:'WhatsApp',     icon:'ti-brand-whatsapp', placeholder:'(11) 99999-9999' },
  { value:'email',    label:'Email',        icon:'ti-mail',       placeholder:'seu@email.com' },
  { value:'text',     label:'Texto curto',  icon:'ti-forms',      placeholder:'Resposta...' },
  { value:'textarea', label:'Texto longo',  icon:'ti-align-left', placeholder:'Descreva...' },
  { value:'select',   label:'Seleção',      icon:'ti-list',       placeholder:'Opção 1, Opção 2' },
];

async function loadForms() {
  injectFormStyles();
  allForms = await api('/api/forms') || [];
  renderFormsList();
}

function renderFormsList() {
  const page = document.getElementById('page-forms');
  if (!page) return;

  if (allForms.length === 0) {
    document.getElementById('forms-list').innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--text3)">
        <i class="ti ti-forms" style="font-size:40px;display:block;margin-bottom:12px"></i>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--text2)">Nenhum formulário ainda</div>
        <div style="font-size:13px;margin-bottom:20px">Crie seu primeiro formulário e capture leads automaticamente</div>
        <button class="btn primary" onclick="openFormBuilder(null)"><i class="ti ti-plus"></i> Criar formulário</button>
      </div>`;
    return;
  }

  document.getElementById('forms-list').innerHTML = allForms.map(f => `
    <div class="form-card">
      <div class="form-card-accent" style="background:${f.color||'var(--blue)'}"></div>
      <div class="form-card-body">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
          <div style="flex:1">
            <div class="form-card-title">${f.name}</div>
            ${f.description ? `<div class="form-card-desc">${f.description}</div>` : ''}
          </div>
          <span class="badge ${f.active ? 'green' : 'gray'}" style="flex-shrink:0">${f.active ? 'Ativo' : 'Pausado'}</span>
        </div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text2);margin-bottom:14px">
          <span><i class="ti ti-layout-list" style="font-size:13px;vertical-align:-2px"></i> ${(f.fields||[]).length} campos</span>
          <span><i class="ti ti-users" style="font-size:13px;vertical-align:-2px"></i> ${f.submissions||0} leads</span>
        </div>
        <div class="form-link-box" onclick="copyFormLink('${f.id}','${f.tenant_id||''}')">
          <i class="ti ti-link" style="color:var(--blue);font-size:13px;flex-shrink:0"></i>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text2)">
            /form/${(f.tenant_id||'').substring(0,8)}.../${f.id.substring(0,8)}...
          </span>
          <i class="ti ti-copy" style="font-size:13px;color:var(--text3);flex-shrink:0"></i>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn" style="flex:1;font-size:12px;justify-content:center" onclick="openFormBuilder('${f.id}')">
            <i class="ti ti-edit"></i> Editar
          </button>
          <button class="btn" style="padding:5px 9px;font-size:12px" onclick="previewForm('${f.id}')" title="Visualizar">
            <i class="ti ti-eye"></i>
          </button>
          <button class="btn" style="padding:5px 9px;font-size:12px" onclick="toggleFormActive('${f.id}',${!f.active})" title="${f.active?'Pausar':'Ativar'}">
            <i class="ti ti-${f.active?'pause':'play'}"></i>
          </button>
          <button class="btn" style="padding:5px 9px;font-size:12px;color:var(--red)" onclick="deleteForm('${f.id}')">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

// ── Builder ──────────────────────────────────────────────────────────────────

function openFormBuilder(id) {
  const f = id ? allForms.find(x => x.id === id) : null;
  editingFormId = id || null;
  formFields = f ? JSON.parse(JSON.stringify(f.fields || [])) : [
    { id: 'f_name',  label: 'Nome',     type: 'name',  required: true,  placeholder: 'Seu nome completo' },
    { id: 'f_phone', label: 'WhatsApp', type: 'phone', required: true,  placeholder: '(11) 99999-9999' },
    { id: 'f_email', label: 'Email',    type: 'email', required: false, placeholder: 'seu@email.com' },
  ];

  document.getElementById('forms-index').style.display = 'none';
  document.getElementById('form-builder').style.display = '';

  document.getElementById('fb-name').value         = f?.name || '';
  document.getElementById('fb-desc').value         = f?.description || '';
  document.getElementById('fb-color').value        = f?.color || '#185FA5';
  document.getElementById('fb-thanks').value       = f?.thank_you_msg || 'Obrigado! Entraremos em contato em breve. 😊';
  document.getElementById('fb-redirect').value     = f?.redirect_url || '';

  renderFieldsList();
  updateFormPreview();
}

function closeFormBuilder() {
  document.getElementById('form-builder').style.display = 'none';
  document.getElementById('forms-index').style.display = '';
}

function renderFieldsList() {
  const list = document.getElementById('fb-fields-list');
  list.innerHTML = formFields.map((f, i) => `
    <div class="fb-field-row" data-idx="${i}">
      <div class="fb-field-drag"><i class="ti ti-grip-vertical"></i></div>
      <div class="fb-field-info">
        <input value="${f.label}" class="fb-field-input" placeholder="Label do campo"
          onchange="updateField(${i},'label',this.value);updateFormPreview()">
        <select class="fb-field-select" onchange="updateField(${i},'type',this.value);updateFormPreview()">
          ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type===t.value?'selected':''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <label class="fb-field-req" title="Obrigatório">
        <input type="checkbox" ${f.required?'checked':''} onchange="updateField(${i},'required',this.checked);updateFormPreview()">
        <span style="font-size:11px;color:var(--text2)">Obrig.</span>
      </label>
      <button class="btn" style="padding:4px 7px;color:var(--red)" onclick="removeField(${i})">
        <i class="ti ti-x"></i>
      </button>
    </div>`).join('');
}

function updateField(idx, key, value) {
  if (formFields[idx]) formFields[idx][key] = value;
}

function addField() {
  formFields.push({ id: 'f_' + Date.now(), label: 'Novo campo', type: 'text', required: false, placeholder: '' });
  renderFieldsList();
  updateFormPreview();
}

function removeField(idx) {
  formFields.splice(idx, 1);
  renderFieldsList();
  updateFormPreview();
}

function updateFormPreview() {
  const name    = document.getElementById('fb-name')?.value || 'Meu Formulário';
  const desc    = document.getElementById('fb-desc')?.value || '';
  const color   = document.getElementById('fb-color')?.value || '#185FA5';
  const thanks  = document.getElementById('fb-thanks')?.value || '';
  const preview = document.getElementById('form-preview-frame');
  if (!preview) return;

  preview.innerHTML = `
    <div style="background:#f8f9fb;min-height:100%;padding:20px;font-family:-apple-system,sans-serif">
      <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1)">
        <div style="background:${color};padding:28px 24px;color:#fff">
          <div style="font-size:20px;font-weight:700;margin-bottom:6px">${name || 'Meu Formulário'}</div>
          ${desc ? `<div style="font-size:13px;opacity:.85">${desc}</div>` : ''}
        </div>
        <div style="padding:24px">
          ${formFields.map(f => `
            <div style="margin-bottom:16px">
              <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px">
                ${f.label}${f.required?' <span style="color:#ef4444">*</span>':''}
              </label>
              ${f.type === 'textarea'
                ? `<textarea disabled placeholder="${f.placeholder||''}" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;font-family:inherit;resize:none;height:72px;box-sizing:border-box;background:#f9fafb"></textarea>`
                : f.type === 'select'
                ? `<select disabled style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;background:#f9fafb"><option>Selecione...</option></select>`
                : `<input disabled type="${f.type==='phone'?'tel':f.type==='email'?'email':'text'}" placeholder="${f.placeholder||''}" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;box-sizing:border-box;background:#f9fafb">`
              }
            </div>`).join('')}
          <button disabled style="width:100%;padding:12px;background:${color};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:not-allowed;margin-top:4px">
            Enviar →
          </button>
          ${thanks ? `<div style="text-align:center;font-size:12px;color:#9ca3af;margin-top:14px">${thanks}</div>` : ''}
        </div>
      </div>
    </div>`;
}

async function saveForm() {
  const name   = document.getElementById('fb-name').value.trim();
  if (!name) { showToast('Nome do formulário obrigatório'); return; }

  const payload = {
    name,
    description:  document.getElementById('fb-desc').value.trim(),
    fields:       formFields,
    color:        document.getElementById('fb-color').value,
    thank_you_msg: document.getElementById('fb-thanks').value.trim(),
    redirect_url: document.getElementById('fb-redirect').value.trim(),
  };

  const btn = document.getElementById('save-form-btn');
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Salvando...';

  let result;
  if (editingFormId) {
    result = await api(`/api/forms/${editingFormId}`, 'PATCH', payload);
    if (result?.id) {
      const idx = allForms.findIndex(f => f.id === editingFormId);
      if (idx !== -1) allForms[idx] = result;
      showToast('Formulário atualizado ✓');
    }
  } else {
    result = await api('/api/forms', 'POST', payload);
    if (result?.id) {
      allForms.unshift(result);
      showToast('Formulário criado ✓');
    }
  }

  btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy"></i> Salvar';
  closeFormBuilder();
  renderFormsList();
}

// ── Ações ────────────────────────────────────────────────────────────────────

async function toggleFormActive(id, active) {
  const result = await api(`/api/forms/${id}`, 'PATCH', { active });
  if (result?.id) {
    const idx = allForms.findIndex(f => f.id === id);
    if (idx !== -1) allForms[idx] = result;
    renderFormsList();
    showToast(active ? 'Formulário ativado ✓' : 'Formulário pausado');
  }
}

async function deleteForm(id) {
  if (!confirm('Excluir este formulário?')) return;
  await api(`/api/forms/${id}`, 'DELETE');
  allForms = allForms.filter(f => f.id !== id);
  renderFormsList();
  showToast('Formulário excluído');
}

function copyFormLink(formId, tenantId) {
  const url = `https://nexacrm.ia.br/form.html?t=${tenantId}&f=${formId}`;
  navigator.clipboard.writeText(url).then(() => showToast('Link copiado ✓'));
}

function previewForm(id) {
  const f = allForms.find(x => x.id === id);
  if (!f) return;
  const url = `https://nexacrm.ia.br/form.html?t=${f.tenant_id||''}&f=${f.id}`;
  window.open(url, '_blank');
}

// ── Estilos ──────────────────────────────────────────────────────────────────

function injectFormStyles() {
  if (document.getElementById('form-styles')) return;
  const s = document.createElement('style');
  s.id = 'form-styles';
  s.textContent = `
    #forms-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .form-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: box-shadow .15s;
    }
    .form-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.1); }
    .form-card-accent { height: 4px; }
    .form-card-body { padding: 14px; }
    .form-card-title { font-size: 14px; font-weight: 700; }
    .form-card-desc  { font-size: 12px; color: var(--text2); margin-top: 2px; }
    .form-link-box {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 10px; background: var(--bg);
      border-radius: var(--radius); cursor: pointer;
      border: 1px solid var(--border);
      transition: border-color .15s;
    }
    .form-link-box:hover { border-color: var(--blue); }

    /* Builder */
    .fb-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: calc(100vh - 120px); }
    .fb-panel  { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow-y: auto; padding: 18px; }
    .fb-section-title { font-size: 12px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: .5px; margin: 16px 0 8px; }
    .fb-section-title:first-child { margin-top: 0; }
    .fb-input {
      width: 100%; padding: 8px 12px; box-sizing: border-box;
      border: 1px solid var(--border2); border-radius: var(--radius);
      font-size: 13px; font-family: inherit; outline: none;
      background: var(--surface); color: var(--text);
    }
    .fb-input:focus { border-color: var(--blue); }
    textarea.fb-input { resize: vertical; min-height: 60px; }

    .fb-field-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px; background: var(--bg);
      border-radius: var(--radius); margin-bottom: 7px;
      border: 1px solid var(--border);
    }
    .fb-field-drag { color: var(--text3); cursor: grab; font-size: 15px; }
    .fb-field-info { flex: 1; display: flex; gap: 6px; }
    .fb-field-input {
      flex: 1; padding: 5px 8px;
      border: 1px solid var(--border2); border-radius: var(--radius);
      font-size: 12px; font-family: inherit; outline: none;
      background: var(--surface); color: var(--text);
    }
    .fb-field-select {
      padding: 5px 6px; border: 1px solid var(--border2);
      border-radius: var(--radius); font-size: 12px; outline: none;
      background: var(--surface); color: var(--text);
    }
    .fb-field-req { display: flex; align-items: center; gap: 4px; cursor: pointer; flex-shrink: 0; }
  `;
  document.head.appendChild(s);
}
