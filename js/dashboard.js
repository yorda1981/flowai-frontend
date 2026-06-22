// NexaAI CRM — dashboard.js

async function loadDashboard() {
  const [stats, contactsData] = await Promise.all([
    api('/api/stats'),
    api('/api/contacts')
  ]);
  if (!stats) return;

  injectDashStyles();

  // ── Métricas principais ──
  document.getElementById('m-messages').textContent  = (stats.total_messages||0).toLocaleString();
  document.getElementById('m-contacts').textContent  = (stats.total_contacts||0).toLocaleString();
  document.getElementById('m-convs').textContent     = (stats.total_conversations||0).toLocaleString();
  document.getElementById('m-flows').textContent     = (stats.flows||[]).filter(f=>f.status==='active').length;

  // ── Mini-sparklines reais (7 dias) ──
  const daily = stats.daily || [];
  const totals = daily.map(d => d.total);
  const maxT   = Math.max(...totals, 1);
  ['mc1','mc2','mc3','mc4'].forEach((id, i) => {
    const el = document.getElementById(id); if (!el) return;
    const d = i === 0 ? totals
            : i === 1 ? daily.map(d=>d.inbound)
            : i === 2 ? daily.map(d=>d.outbound)
            : totals.map(()=>0); // flows — sem série temporal
    const mx = Math.max(...d, 1);
    el.innerHTML = d.map(v => `<div class="mini-bar" style="height:${Math.round(v/mx*100)}%"></div>`).join('');
  });

  // ── Onboarding ──
  initOnboarding(stats);

  // ── Flows ──
  const flowsEl = document.getElementById('dash-flows-list');
  flowsEl.innerHTML = (stats.flows||[]).length === 0
    ? '<div style="font-size:13px;color:var(--text2);padding:10px 0">No hay flujos aún. <a href="#" onclick="nav(\'flows\',null)" style="color:var(--blue)">Crea el primero</a></div>'
    : (stats.flows||[]).slice(0,4).map(f => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <i class="ti ti-topology-star" style="color:var(--blue);font-size:16px"></i>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${f.name}</div>
            <div style="font-size:11px;color:var(--text2)">${f.executions||0} execuções</div>
          </div>
          <span class="badge ${f.status==='active'?'green':'amber'}">${f.status==='active'?'Ativo':'Rascunho'}</span>
        </div>`).join('');

  // ── Contatos recentes ──
  const contactsEl = document.getElementById('dash-contacts-list');
  contactsEl.innerHTML = (!contactsData||contactsData.length===0)
    ? '<div style="font-size:13px;color:var(--text2);padding:10px 0">Nenhum contato ainda.</div>'
    : contactsData.slice(0,4).map(c => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div class="avatar" style="width:28px;height:28px;font-size:11px">${(c.name||'?').substring(0,2).toUpperCase()}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${c.name||'Sin nombre'}</div>
            <div style="font-size:11px;color:var(--text2)">${c.phone||''}</div>
          </div>
          ${c.pipeline_stage ? `<span class="badge gray" style="font-size:10px">${c.pipeline_stage}</span>` : ''}
        </div>`).join('');

  // ── Gráfico 7 dias (real) ──
  renderWeekChart(daily);

  // ── Cards executivos ──
  renderExecCards(stats);

  // ── Pipeline mini ──
  renderPipelineMini(stats);
}

// ── Gráfico 7 dias ──────────────────────────────────────────────────────────
function renderWeekChart(daily) {
  const el = document.getElementById('hourly-chart');
  if (!el) return;
  if (!daily.length) { el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:20px">Sem dados ainda</div>'; return; }
  const max = Math.max(...daily.map(d => d.total), 1);
  el.innerHTML = daily.map(d => `
    <div class="bar" style="height:${Math.max(Math.round(d.total/max*100),4)}%;position:relative" title="${d.label}: ${d.total} msgs">
      <span class="bar-val">${d.total}</span>
      <span class="bar-label">${d.label}</span>
    </div>`).join('');
}

// ── Cards executivos (novos) ─────────────────────────────────────────────────
function renderExecCards(stats) {
  const wrap = document.getElementById('exec-cards');
  if (!wrap) return;
  const cards = [
    {
      icon: 'ti-messages',
      color: 'var(--blue)',
      bg: 'var(--blue-light)',
      label: 'Mensagens hoje',
      value: (stats.messages_today||0).toLocaleString(),
      sub: `${(stats.messages_month||0).toLocaleString()} este mês`
    },
    {
      icon: 'ti-robot',
      color: 'var(--teal)',
      bg: 'var(--teal-light)',
      label: 'Automação IA',
      value: (stats.bot_automation_pct||0) + '%',
      sub: `${stats.bot_conversations||0} conversas no bot`
    },
    {
      icon: 'ti-user-check',
      color: 'var(--purple)',
      bg: 'var(--purple-light)',
      label: 'Aguardando humano',
      value: (stats.open_conversations||0).toLocaleString(),
      sub: 'conversas abertas'
    },
    {
      icon: 'ti-chart-line',
      color: 'var(--green)',
      bg: 'var(--green-light)',
      label: 'Conversão Lead→Cliente',
      value: (stats.conversion_rate||0) + '%',
      sub: `${stats.pipeline_total||0} contatos no pipeline`
    },
  ];
  wrap.innerHTML = cards.map(c => `
    <div class="exec-card">
      <div class="exec-icon" style="background:${c.bg};color:${c.color}">
        <i class="ti ${c.icon}"></i>
      </div>
      <div class="exec-body">
        <div class="exec-label">${c.label}</div>
        <div class="exec-value" style="color:${c.color}">${c.value}</div>
        <div class="exec-sub">${c.sub}</div>
      </div>
    </div>`).join('');
}

// ── Pipeline mini ────────────────────────────────────────────────────────────
function renderPipelineMini(stats) {
  const wrap = document.getElementById('pipeline-mini');
  if (!wrap) return;
  const p = stats.pipeline || {};
  const total = stats.pipeline_total || 1;
  const stages = [
    { key:'lead',        label:'Lead',        color:'var(--blue)',   icon:'ti-user'      },
    { key:'interesado',  label:'Interesado',  color:'var(--amber)',  icon:'ti-star'      },
    { key:'negociacion', label:'Negociación', color:'var(--purple)', icon:'ti-handshake' },
    { key:'cliente',     label:'Cliente',     color:'var(--green)',  icon:'ti-trophy'    },
  ];
  wrap.innerHTML = stages.map(s => {
    const count = p[s.key] || 0;
    const pct   = Math.round((count/total)*100);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <i class="ti ${s.icon}" style="color:${s.color};font-size:16px;width:18px;text-align:center"></i>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:500">${s.label}</span>
            <span style="font-weight:700;color:${s.color}">${count}</span>
          </div>
          <div style="background:var(--bg);border-radius:10px;height:5px;overflow:hidden">
            <div style="height:100%;background:${s.color};border-radius:10px;width:${pct}%;transition:width .5s ease"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Onboarding ───────────────────────────────────────────────────────────────
function initOnboarding(stats) {
  const card = document.getElementById('onboarding-card');
  if (!card) return;
  const hasAgent   = true;
  const hasFlow    = (stats.flows||[]).length > 0;
  const hasContact = (stats.total_contacts||0) > 0;
  const hasAI      = false;
  const hasCampaign= false;
  const steps = [hasAgent, hasFlow, hasContact, hasAI, hasCampaign];
  const done  = steps.filter(Boolean).length;
  if (done === steps.length) { card.style.display='none'; return; }
  const pct = Math.round((done/steps.length)*100);
  document.getElementById('onboarding-bar').style.width  = pct + '%';
  document.getElementById('onboarding-progress-text').textContent = `${done}/${steps.length} pasos completados`;
  const ids = ['step-agent','step-flow','step-contact','step-ai','step-campaign'];
  ids.forEach((id,i) => {
    const el = document.getElementById(id); if(!el) return;
    el.classList.toggle('done', steps[i]);
    const icon = el.querySelector('.step-icon');
    if (icon) icon.innerHTML = steps[i] ? '<i class="ti ti-check"></i>' : el.querySelector('.step-icon')?.innerHTML || '';
  });
}

function dismissOnboarding() {
  const card = document.getElementById('onboarding-card');
  if (card) card.style.display = 'none';
}

// ── Estilos ──────────────────────────────────────────────────────────────────
function injectDashStyles() {
  if (document.getElementById('dash-exec-styles')) return;
  const s = document.createElement('style');
  s.id = 'dash-exec-styles';
  s.textContent = `
    #exec-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .exec-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .exec-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .exec-label { font-size: 11px; color: var(--text2); margin-bottom: 3px; font-weight: 500; }
    .exec-value { font-size: 22px; font-weight: 800; line-height: 1; margin-bottom: 3px; }
    .exec-sub   { font-size: 11px; color: var(--text3); }
  `;
  document.head.appendChild(s);
}
