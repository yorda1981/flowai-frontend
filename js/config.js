// NexaAI CRM — config.js

async function loadKnowledgeBase() {
  const data = await api('/api/config/knowledge-base');
  if (data?.knowledge_base) {
    document.getElementById('knowledge-base').value = data.knowledge_base;
  }
}

async function saveKnowledgeBase() {
  const text = document.getElementById('knowledge-base').value.trim();
  const btn = document.getElementById('save-kb-btn');
  btn.innerHTML = '<i class="ti ti-loader-2"></i>Guardando...'; btn.disabled = true;
  const result = await api('/api/config/knowledge-base', 'POST', { knowledge_base: text });
  if (result?.success) {
    showToast('✅ Base de conocimiento guardada');
  } else {
    showToast('❌ Error al guardar');
  }
  btn.innerHTML = '<i class="ti ti-device-floppy"></i>Guardar base de conocimiento'; btn.disabled = false;
}

async function loadTokenUsage() {
  const data = await api('/api/ai/usage');
  if (!data) return;
  document.getElementById('tokens-used').textContent = (data.tokens_used||0).toLocaleString();
  document.getElementById('tokens-limit').textContent = (data.tokens_limit||0).toLocaleString();
  const bar = document.getElementById('token-bar');
  const pct = data.percentage || 0;
  bar.style.width = pct + '%';
  bar.style.background = pct >= 90 ? '#E24B4A' : pct >= 70 ? '#BA7517' : '#185FA5';
  const badge = document.getElementById('token-badge');
  const msg = document.getElementById('token-msg');
  if (data.has_own_key) {
    badge.textContent = 'API Key propia ✓';
    badge.className = 'badge green';
    document.getElementById('has-own-key').style.display = 'block';
    document.getElementById('own-key-section').style.display = 'none';
    msg.textContent = 'Usando tu propia API key sin límites.';
  } else if (pct >= 100) {
    badge.textContent = 'Agotado';
    badge.className = 'badge red';
    document.getElementById('own-key-section').style.display = 'block';
    msg.textContent = 'Tokens agotados. Conecta tu API key para continuar.';
  } else if (pct >= 70) {
    badge.textContent = pct + '% usado';
    badge.className = 'badge amber';
    msg.textContent = `Te quedan ${(data.tokens_remaining||0).toLocaleString()} tokens este mes.`;
  } else {
    badge.textContent = pct + '% usado';
    badge.className = 'badge blue';
    msg.textContent = `Te quedan ${(data.tokens_remaining||0).toLocaleString()} tokens este mes.`;
  }
}

async function saveOpenAIKey() {
  const key = document.getElementById('openai-key').value.trim();
  if (!key) { showToast('Ingresa tu API key'); return; }
  const btn = document.getElementById('save-key-btn');
  btn.textContent = 'Verificando...'; btn.disabled = true;
  try {
    const data = await api('/api/ai/save-key', 'POST', { openai_api_key: key });
    if (data?.success) {
      showToast('✓ API key guardada. Ahora usas tu propia IA sin límites.');
      loadTokenUsage();
    } else {
      showToast('❌ ' + (data?.error || 'Error al guardar'));
    }
  } catch { showToast('❌ Error al conectar'); }
  btn.innerHTML = '<i class="ti ti-device-floppy"></i>Guardar'; btn.disabled = false;
}

function toggleKeyVisibility() {
  const inp = document.getElementById('openai-key');
  const icon = document.getElementById('eye-icon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'ti ti-eye-off';
  } else {
    inp.type = 'password';
    icon.className = 'ti ti-eye';
  }
}

async function loadStats(){
  const stats=await api('/api/stats');if(!stats)return;
  document.getElementById('s-contacts').textContent=(stats.total_contacts||0).toLocaleString();
  document.getElementById('s-messages').textContent=(stats.total_messages||0).toLocaleString();
  document.getElementById('s-convs').textContent=(stats.total_conversations||0).toLocaleString();
  document.getElementById('stats-flows').innerHTML=(stats.flows||[]).map((f,i)=>`<div style="display:flex;align-items:center;gap:10px;font-size:13px"><div style="width:22px;height:22px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text2)">${i+1}</div><div style="flex:1">${f.name}</div><div style="font-size:12px;color:var(--text2)">${f.executions||0}</div></div>`).join('');
}

async function loadPlanStatus() {
  const data = await api('/api/payments/status');
  if (!data) return;
  const plan = data.plan || 'free';
  const status = data.status || 'none';
  const label = document.getElementById('current-plan-label');
  const statusEl = document.getElementById('current-plan-status');
  const cancelBtn = document.getElementById('btn-cancel-plan');
  if (label) label.textContent = `Plan ${plan.charAt(0).toUpperCase()+plan.slice(1)} ${status==='authorized'?'✅':''}`;
  if (statusEl) statusEl.textContent = status==='authorized'?'Suscripción activa — Renovación automática mensual': status==='pending'?'Pago pendiente':'Sin suscripción activa';
  if (cancelBtn) cancelBtn.style.display = status==='authorized'?'':'none';
  // Marcar plan activo
  ['starter','pro','business'].forEach(p => {
    const btn = document.getElementById('btn-plan-'+p);
    if (btn) {
      if (p===plan && status==='authorized') {
        btn.textContent = '✅ Plan activo';
        btn.disabled = true;
      }
    }
  });
}

async function subscribePlan(plan) {
  const btn = document.getElementById('btn-plan-'+plan);
  if (btn) { btn.innerHTML = '<i class="ti ti-loader-2"></i>Procesando...'; btn.disabled = true; }
  const data = await api('/api/payments/subscribe', 'POST', { plan });
  if (data?.init_point) {
    showToast('Redirigiendo a Mercado Pago...');
    setTimeout(() => { window.open(data.init_point, '_blank'); }, 500);
  } else {
    showToast('❌ Error al crear suscripción');
  }
  if (btn) { btn.innerHTML = `<i class="ti ti-credit-card"></i>Assinatura`; btn.disabled = false; }
}

async function cancelSubscription() {
  if (!confirm('¿Cancelar tu suscripción? Perderás acceso al plan al final del período.')) return;
  const result = await api('/api/payments/cancel', 'POST');
  if (result?.success) {
    showToast('Suscripción cancelada');
    loadPlanStatus();
  }
}

// ── Upload de documento para base de conhecimento ──────────────────────────

async function uploadKnowledgeDoc(input) {
  const file = input.files[0];
  if (!file) return;

  const MAX_MB = 10;
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`❌ Arquivo muito grande. Máximo ${MAX_MB}MB`);
    input.value = '';
    return;
  }

  const btn    = document.getElementById('upload-doc-btn');
  const status = document.getElementById('upload-doc-status');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2"></i> Processando...';
  if (status) { status.style.display = 'none'; }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API}/api/config/upload-doc`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN },
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showToast(`✅ "${data.filename}" importado — ${data.chars.toLocaleString()} caracteres extraídos`);
      if (status) {
        status.style.display = 'block';
        status.innerHTML = `
          <div style="background:var(--green-light);border:1px solid var(--green);border-radius:var(--radius);padding:10px 14px;font-size:12px;color:var(--green)">
            <strong>✓ ${data.filename}</strong> — ${data.chars.toLocaleString()} caracteres adicionados à base de conhecimento
            ${data.truncated ? ' <span style="opacity:.7">(truncado em 8.000 chars)</span>' : ''}
            <div style="margin-top:6px;color:var(--text2);font-family:monospace;font-size:11px;background:var(--surface);padding:6px;border-radius:4px;line-height:1.4">${data.preview}</div>
          </div>`;
      }
      // Atualizar textarea com novo conteúdo
      loadKnowledgeBase();
    } else {
      showToast('❌ ' + (data.error || 'Erro ao processar arquivo'));
    }
  } catch(e) {
    showToast('❌ Erro ao enviar arquivo');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-upload"></i> Importar arquivo';
  input.value = '';
}
