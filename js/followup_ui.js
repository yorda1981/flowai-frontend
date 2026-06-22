// NexaAI CRM — followup_ui.js
// Gerenciamento da UI de follow-up automático

let followupRules = [];

async function loadFollowup() {
  followupRules = await api('/api/followup') || [];
  renderFollowup();
}

function renderFollowup() {
  const container = document.getElementById('followup-rules-list');
  if(!container) return;

  if(followupRules.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;color:var(--text3);padding:24px;font-size:13px">
        Nenhuma regra configurada. Clique em "+ Adicionar mensagem" para começar.
      </div>`;
    return;
  }

  const DELAY_OPTIONS = [
    { v:1,   l:'1 hora'    },
    { v:2,   l:'2 horas'   },
    { v:4,   l:'4 horas'   },
    { v:8,   l:'8 horas'   },
    { v:24,  l:'1 dia'     },
    { v:48,  l:'2 dias'    },
    { v:72,  l:'3 dias'    },
    { v:168, l:'7 dias'    },
  ];

  container.innerHTML = followupRules.map((r, i) => `
    <div class="followup-rule-card" id="fup-card-${i}">
      <div class="fup-header">
        <div class="fup-step-badge">Mensagem ${i+1}</div>
        <label class="fup-toggle">
          <input type="checkbox" ${r.enabled !== false ? 'checked' : ''} onchange="toggleFollowupRule(${i}, this.checked)">
          <span class="fup-toggle-slider"></span>
        </label>
        <button class="btn" style="padding:3px 8px;font-size:12px;margin-left:auto" onclick="removeFollowupRule(${i})" title="Remover">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <div class="fup-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <i class="ti ti-clock" style="color:var(--text3);font-size:16px"></i>
          <span style="font-size:13px;color:var(--text2)">Enviar se não houver resposta em:</span>
          <select class="fup-select" onchange="updateFollowupRule(${i},'delay_hours',this.value)">
            ${DELAY_OPTIONS.map(o => `<option value="${o.v}" ${r.delay_hours==o.v?'selected':''}>${o.l}</option>`).join('')}
          </select>
        </div>
        <textarea class="fup-textarea" rows="3"
          placeholder="Ex: Olá {nome}! Vi que você nos contactou. Posso ajudar? 😊"
          onchange="updateFollowupRule(${i},'message',this.value)"
          oninput="updateFollowupRule(${i},'message',this.value)"
        >${r.message||''}</textarea>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">
          <i class="ti ti-info-circle"></i> Use <strong>{nome}</strong> para personalizar com o nome do contato
        </div>
      </div>
    </div>`).join('');
}

function addFollowupRule() {
  const DEFAULTS = [
    { delay_hours: 1,  message: 'Olá {nome}! Vi que você nos contactou. Posso te ajudar? 😊' },
    { delay_hours: 24, message: 'Oi {nome}, tudo bem? Só passando para ver se ainda posso ajudar! 🙂' },
    { delay_hours: 72, message: '{nome}, última tentativa de contato! Se mudar de ideia, estaremos aqui. 👋' },
  ];
  const def = DEFAULTS[followupRules.length] || { delay_hours: 24, message: '' };
  followupRules.push({ ...def, enabled: true });
  renderFollowup();
}

function removeFollowupRule(index) {
  followupRules.splice(index, 1);
  renderFollowup();
}

function updateFollowupRule(index, field, value) {
  if(!followupRules[index]) return;
  followupRules[index][field] = field === 'delay_hours' ? Number(value) : value;
}

function toggleFollowupRule(index, enabled) {
  if(!followupRules[index]) return;
  followupRules[index].enabled = enabled;
}

async function saveFollowup() {
  const btn = document.getElementById('save-followup-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2"></i> Salvando...';
  try {
    await api('/api/followup', 'POST', { rules: followupRules });
    showToast('Follow-up salvo ✓');
  } catch(e) {
    showToast('Erro ao salvar');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-device-floppy"></i> Salvar follow-up';
}

function injectFollowupStyles() {
  if(document.getElementById('fup-styles')) return;
  const s = document.createElement('style');
  s.id = 'fup-styles';
  s.textContent = `
    .followup-rule-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .fup-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .fup-step-badge {
      font-size: 12px;
      font-weight: 600;
      color: var(--blue);
      background: var(--blue-light);
      padding: 3px 10px;
      border-radius: 10px;
    }
    .fup-body {
      padding: 14px;
    }
    .fup-select {
      padding: 5px 8px;
      border: 1px solid var(--border2);
      border-radius: var(--radius);
      font-size: 13px;
      background: var(--surface);
      color: var(--text);
      outline: none;
      cursor: pointer;
    }
    .fup-textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border2);
      border-radius: var(--radius);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      background: var(--surface);
      color: var(--text);
    }
    .fup-textarea:focus { border-color: var(--blue); }

    /* Toggle switch */
    .fup-toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
    .fup-toggle input { opacity: 0; width: 0; height: 0; }
    .fup-toggle-slider {
      position: absolute; cursor: pointer; inset: 0;
      background: var(--border2); border-radius: 20px; transition: .2s;
    }
    .fup-toggle-slider:before {
      content: ''; position: absolute;
      width: 14px; height: 14px; left: 3px; bottom: 3px;
      background: white; border-radius: 50%; transition: .2s;
    }
    .fup-toggle input:checked + .fup-toggle-slider { background: var(--blue); }
    .fup-toggle input:checked + .fup-toggle-slider:before { transform: translateX(16px); }
  `;
  document.head.appendChild(s);
}
