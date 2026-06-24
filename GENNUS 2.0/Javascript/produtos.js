document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000/api/produtos';

  let produtos = [];
  let editandoId = null;

  const $ = (id) => document.getElementById(id);

  const els = {
    btnNovo: $('btn-novo'),
    modal: $('modal-overlay'),
    close: $('modal-close'),
    cancelar: $('btn-cancelar'),
    salvar: $('btn-salvar'),
    tbody: $('prd-tbody'),

    busca: $('search-input'),
    limparBusca: $('search-clear'),
    statusPills: $('status-pills'),
    categoriaFiltro: $('select-categoria'),
    ordem: $('select-ordem'),

    kpiTotal: $('kpi-total'),
    kpiAtivos: $('kpi-ativos'),
    kpiBaixo: $('kpi-baixo'),
    kpiValor: $('kpi-valor'),
    kpiCategorias: $('kpi-categorias'),

    nome: $('f-nome'),
    ean: $('f-ean'),
    categoria: $('f-categoria'),
    descricao: $('f-descricao'),
    custo: $('f-custo'),
    venda: $('f-venda'),
    estoque: $('f-estoque'),
    estoqueMin: $('f-estoque-min'),
    unidade: $('f-unidade'),
    status: $('f-status'),
    obs: $('f-obs')
  };

  function abrirModal(produto = null) {
    editandoId = produto?.id || null;

    els.nome.value = produto?.nome || '';
    els.ean.value = produto?.ean || '';
    els.categoria.value = produto?.categoria || '';
    els.descricao.value = produto?.descricao || '';
    els.custo.value = produto?.preco_custo || '';
    els.venda.value = produto?.preco_venda || '';
    els.estoque.value = produto?.quantidade_estoque || '';
    els.estoqueMin.value = produto?.estoque_minimo || '';
    els.unidade.value = produto?.unidade || 'un';
    els.status.value = produto?.status || 'ativo';
    els.obs.value = produto?.observacoes_internas || '';

    els.modal.classList.add('open'); // teu CSS usa .open
    document.body.style.overflow = 'hidden';
    setTimeout(() => els.nome?.focus(), 100);
  }

  function fecharModal() {
    els.modal.classList.remove('open');
    document.body.style.overflow = '';
    editandoId = null;
  }

  function lerForm() {
    return {
      nome: els.nome.value.trim(),
      ean: els.ean.value.trim(),
      categoria: els.categoria.value,
      descricao: els.descricao.value.trim(),
      preco_custo: Number(els.custo.value || 0),
      preco_venda: Number(els.venda.value || 0),
      quantidade_estoque: Number(els.estoque.value || 0),
      estoque_minimo: Number(els.estoqueMin.value || 0),
      unidade: els.unidade.value || 'un',
      status: els.status.value || 'ativo',
      observacoes_internas: els.obs.value.trim()
    };
  }

  function validar(p) {
    if (!p.nome) return 'Nome é obrigatório.';
    if (!p.categoria) return 'Categoria é obrigatória.';
    if (!p.descricao) return 'Descrição é obrigatória.';
    if (p.ean && !/^\d{13}$/.test(p.ean)) return 'EAN precisa ter 13 números.';
    if (p.preco_custo < 0 || p.preco_venda < 0) return 'Preço não pode ser negativo.';
    if (p.quantidade_estoque < 0 || p.estoque_minimo < 0) return 'Estoque não pode ser negativo.';
    return null;
  }

  async function salvar() {
    const produto = lerForm();
    const erro = validar(produto);

    if (erro) {
      alert(erro);
      return;
    }

    const url = editandoId ? `${API}/${editandoId}` : API;
    const method = editandoId ? 'PUT' : 'POST';

    await fetchJson(url, {
      method,
      body: JSON.stringify(produto)
    });

    fecharModal();
    await carregar();
  }

  async function carregar() {
    const params = new URLSearchParams();

    if (els.busca?.value.trim()) params.set('busca', els.busca.value.trim());
    if (els.categoriaFiltro?.value && els.categoriaFiltro.value !== 'todos') {
      params.set('categoria', els.categoriaFiltro.value);
    }
    if (els.ordem?.value) params.set('ordem', els.ordem.value);

    const data = await fetchJson(`${API}?${params.toString()}`);
    produtos = Array.isArray(data) ? data : data.produtos || [];

    renderTabela();
    renderKpis();
  }

  function renderTabela() {
    if (!els.tbody) return;

    els.tbody.innerHTML = '';

    if (!produtos.length) {
      els.tbody.innerHTML = `<tr><td colspan="9">Nenhum produto encontrado.</td></tr>`;
      return;
    }

    produtos.forEach((p) => {
      const margem = p.margem_percentual ?? calcMargem(p.preco_custo, p.preco_venda);
      const statusVisual = getStatusVisual(p);

      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.ean || '-')}</td>
        <td>${escapeHtml(p.descricao || '-')}</td>
        <td>${escapeHtml(p.categoria || '-')}</td>
        <td>${moeda(p.preco_venda)}</td>
        <td>${margem.toFixed(1)}%</td>
        <td>${p.quantidade_estoque || 0} ${escapeHtml(p.unidade || 'un')}</td>
        <td>${statusVisual}</td>
        <td>
          <button data-edit="${p.id}">Editar</button>
          <button data-del="${p.id}">Excluir</button>
        </td>
      `;

      els.tbody.appendChild(tr);
    });
  }

  function renderKpis() {
    const total = produtos.length;
    const ativos = produtos.filter((p) => p.status === 'ativo').length;
    const baixo = produtos.filter((p) => getStatusVisual(p) === 'baixo-estoque').length;
    const valor = produtos.reduce((soma, p) => {
      return soma + Number(p.preco_custo || 0) * Number(p.quantidade_estoque || 0);
    }, 0);
    const categorias = new Set(produtos.map((p) => p.categoria).filter(Boolean)).size;

    if (els.kpiTotal) els.kpiTotal.textContent = total;
    if (els.kpiAtivos) els.kpiAtivos.textContent = ativos;
    if (els.kpiBaixo) els.kpiBaixo.textContent = baixo;
    if (els.kpiValor) els.kpiValor.textContent = moeda(valor);
    if (els.kpiCategorias) els.kpiCategorias.textContent = categorias;
  }

  async function excluir(id) {
    if (!confirm('Deseja excluir este produto?')) return;

    await fetchJson(`${API}/${id}`, { method: 'DELETE' });
    await carregar();
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.mensagem || data?.message || 'Erro na requisição.');
    }

    return data;
  }

  function getStatusVisual(p) {
    if (p.status === 'inativo') return 'inativo';
    if (Number(p.quantidade_estoque) === 0) return 'esgotado';
    if (Number(p.quantidade_estoque) <= Number(p.estoque_minimo)) return 'baixo-estoque';
    return 'ativo';
  }

  function calcMargem(custo, venda) {
    custo = Number(custo || 0);
    venda = Number(venda || 0);
    return venda > 0 ? ((venda - custo) / venda) * 100 : 0;
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function escapeHtml(texto) {
    return String(texto)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  els.btnNovo?.addEventListener('click', () => abrirModal());
  els.close?.addEventListener('click', fecharModal);
  els.cancelar?.addEventListener('click', fecharModal);
  els.salvar?.addEventListener('click', salvar);

  els.modal?.addEventListener('click', (e) => {
    if (e.target === els.modal) fecharModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });

  els.tbody?.addEventListener('click', (e) => {
    const editId = e.target.dataset.edit;
    const delId = e.target.dataset.del;

    if (editId) {
      const produto = produtos.find((p) => String(p.id) === String(editId));
      abrirModal(produto);
    }

    if (delId) {
      excluir(delId);
    }
  });

  els.busca?.addEventListener('input', debounce(carregar, 400));
  els.categoriaFiltro?.addEventListener('change', carregar);
  els.ordem?.addEventListener('change', carregar);

  els.limparBusca?.addEventListener('click', () => {
    els.busca.value = '';
    carregar();
  });

  function debounce(fn, delay) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  carregar().catch((err) => {
    console.warn('Backend ainda não respondeu:', err.message);
  });
});