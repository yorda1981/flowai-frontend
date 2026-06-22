// NexaAI CRM — catalog_ui.js

let allProducts = [];
let editingProductId = null;

async function loadCatalog() {
  allProducts = await api('/api/products') || [];
  renderCatalog();
}

function renderCatalog() {
  injectCatalogStyles();
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  if (allProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text3);font-size:13px;border:2px dashed var(--border);border-radius:var(--radius-lg)">
        <i class="ti ti-package" style="font-size:32px;display:block;margin-bottom:8px"></i>
        Nenhum produto ainda. Clique em "+ Adicionar produto".
      </div>`;
    return;
  }

  grid.innerHTML = allProducts.map(p => `
    <div class="cat-card ${!p.in_stock ? 'cat-out' : ''}">
      ${p.image_url
        ? `<div class="cat-img" style="background-image:url('${p.image_url}')"></div>`
        : `<div class="cat-img cat-img-placeholder"><i class="ti ti-photo" style="font-size:28px;color:var(--text3)"></i></div>`
      }
      <div class="cat-body">
        ${p.category ? `<div class="cat-category">${p.category}</div>` : ''}
        <div class="cat-name">${p.name}</div>
        ${p.description ? `<div class="cat-desc">${p.description}</div>` : ''}
        <div class="cat-footer">
          <div class="cat-price">${p.price ? 'R$ ' + Number(p.price).toFixed(2) : '<span style="color:var(--text3)">Sob consulta</span>'}</div>
          <span class="badge ${p.in_stock ? 'green' : 'red'}" style="font-size:10px">${p.in_stock ? 'Disponível' : 'Indisponível'}</span>
        </div>
        <div class="cat-actions">
          <button class="btn" style="flex:1;font-size:12px;justify-content:center" onclick="openProductModal('${p.id}')">
            <i class="ti ti-edit"></i> Editar
          </button>
          <button class="btn" style="padding:5px 8px;color:var(--red)" onclick="toggleStock('${p.id}',${!p.in_stock})" title="${p.in_stock ? 'Marcar como indisponível' : 'Marcar como disponível'}">
            <i class="ti ti-${p.in_stock ? 'eye-off' : 'eye'}"></i>
          </button>
          <button class="btn" style="padding:5px 8px;color:var(--red)" onclick="deleteProduct('${p.id}')">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

function openProductModal(id) {
  const p = id ? allProducts.find(x => x.id === id) : null;
  editingProductId = id || null;

  document.getElementById('cat-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'cat-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:28px;width:460px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="font-size:16px;font-weight:700">${p ? 'Editar produto' : 'Novo produto'}</div>
        <i class="ti ti-x" style="cursor:pointer;font-size:20px;color:var(--text3)" onclick="document.getElementById('cat-modal').remove()"></i>
      </div>

      <div style="display:flex;flex-direction:column;gap:13px">
        <div>
          <label class="cat-label">Nome do produto *</label>
          <input id="cat-name" class="cat-input" placeholder="Ex: Limpeza dental" value="${p?.name||''}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label class="cat-label">Preço (R$)</label>
            <input id="cat-price" class="cat-input" type="number" step="0.01" placeholder="0,00" value="${p?.price||''}">
          </div>
          <div>
            <label class="cat-label">Categoria</label>
            <input id="cat-category" class="cat-input" placeholder="Ex: Serviços" value="${p?.category||''}">
          </div>
        </div>
        <div>
          <label class="cat-label">Descrição</label>
          <textarea id="cat-desc" class="cat-input" rows="3" placeholder="Detalhes do produto ou serviço...">${p?.description||''}</textarea>
        </div>
        <div>
          <label class="cat-label">URL da imagem (opcional)</label>
          <input id="cat-image" class="cat-input" placeholder="https://..." value="${p?.image_url||''}">
          <div style="font-size:11px;color:var(--text3);margin-top:4px">Cole um link de imagem do Google, Imgur, etc.</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="cat-stock" style="width:16px;height:16px;cursor:pointer;accent-color:var(--blue)" ${!p || p.in_stock ? 'checked' : ''}>
          <label for="cat-stock" style="font-size:13px;cursor:pointer">Produto disponível</label>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <button class="btn" onclick="document.getElementById('cat-modal').remove()">Cancelar</button>
        <button class="btn primary" onclick="saveProduct()"><i class="ti ti-device-floppy"></i> Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('cat-name').focus();
}

async function saveProduct() {
  const name      = document.getElementById('cat-name').value.trim();
  const price     = document.getElementById('cat-price').value;
  const category  = document.getElementById('cat-category').value.trim();
  const desc      = document.getElementById('cat-desc').value.trim();
  const image_url = document.getElementById('cat-image').value.trim();
  const in_stock  = document.getElementById('cat-stock').checked;

  if (!name) { showToast('Nome obrigatório'); return; }

  const body = { name, price, category, description: desc, image_url, in_stock };

  if (editingProductId) {
    const updated = await api(`/api/products/${editingProductId}`, 'PATCH', body);
    if (updated?.id) {
      const idx = allProducts.findIndex(p => p.id === editingProductId);
      if (idx !== -1) allProducts[idx] = updated;
      showToast('Produto atualizado ✓');
    }
  } else {
    const created = await api('/api/products', 'POST', body);
    if (created?.id) {
      allProducts.push(created);
      showToast('Produto adicionado ✓');
    }
  }

  document.getElementById('cat-modal').remove();
  renderCatalog();
}

async function toggleStock(id, inStock) {
  const updated = await api(`/api/products/${id}`, 'PATCH', { in_stock: inStock });
  if (updated?.id) {
    const idx = allProducts.findIndex(p => p.id === id);
    if (idx !== -1) allProducts[idx] = updated;
    renderCatalog();
  }
}

async function deleteProduct(id) {
  if (!confirm('Excluir este produto?')) return;
  const result = await api(`/api/products/${id}`, 'DELETE');
  if (result?.success) {
    allProducts = allProducts.filter(p => p.id !== id);
    renderCatalog();
    showToast('Produto excluído');
  }
}

function injectCatalogStyles() {
  if (document.getElementById('cat-styles')) return;
  const s = document.createElement('style');
  s.id = 'cat-styles';
  s.textContent = `
    #catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .cat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: box-shadow .15s, transform .1s;
    }
    .cat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.1); transform: translateY(-1px); }
    .cat-card.cat-out { opacity: .6; }
    .cat-img {
      height: 130px;
      background-size: cover;
      background-position: center;
      background-color: var(--bg);
    }
    .cat-img-placeholder {
      display: flex; align-items: center; justify-content: center;
    }
    .cat-body { padding: 12px; }
    .cat-category {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .5px; color: var(--blue); margin-bottom: 4px;
    }
    .cat-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .cat-desc {
      font-size: 11px; color: var(--text2); margin-bottom: 8px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cat-footer { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .cat-price { font-size: 15px; font-weight: 700; color: var(--green); }
    .cat-actions { display: flex; gap: 5px; }
    .cat-label { display: block; font-size: 12px; color: var(--text2); font-weight: 500; margin-bottom: 5px; }
    .cat-input {
      width: 100%; padding: 8px 12px;
      border: 1px solid var(--border2); border-radius: var(--radius);
      font-size: 13px; font-family: inherit; outline: none;
      background: var(--surface); color: var(--text); box-sizing: border-box;
    }
    .cat-input:focus { border-color: var(--blue); }
    textarea.cat-input { resize: vertical; min-height: 70px; }
  `;
  document.head.appendChild(s);
}
