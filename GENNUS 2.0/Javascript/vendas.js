/* =========================================================
   Gennus ERP — Gestão de Vendas

   Sem localStorage.
   Sem alert de erro de backend.
   Pronto para backend real.
   Com fallback mockado para apresentação.

   Rotas esperadas:
   GET    /api/vendas?periodo=7d
   POST   /api/vendas
   PUT    /api/vendas/:id
   PATCH  /api/vendas/:id/cancelar
   GET    /api/vendas/exportar?periodo=7d
========================================================= */

(() => {
  "use strict";

  const API = "/api/vendas";
  const PAGE_SIZE = 8;
  const USE_MOCK_FALLBACK = true;

  const $ = (id) => document.getElementById(id);

  const dom = {
    btnNova: $("btn-nova-venda"),
    btnExport: $("btn-export"),

    periodFilter: $("period-filter"),
    search: $("search-input"),
    searchClear: $("search-clear"),
    statusPills: $("status-pills"),
    canal: $("select-canal"),
    tableSort: $("table-sort"),

    kpiFaturado: $("kpi-faturado"),
    kpiFaturadoDelta: $("kpi-faturado-delta"),
    kpiPedidos: $("kpi-pedidos"),
    kpiPedidosDelta: $("kpi-pedidos-delta"),
    kpiTicket: $("kpi-ticket"),
    kpiTicketDelta: $("kpi-ticket-delta"),
    kpiConcluidos: $("kpi-concluidos"),
    kpiCancelados: $("kpi-cancelados"),

    count: $("table-count"),
    tbody: $("venda-tbody"),
    empty: $("empty-state"),
    pagination: $("pagination"),
    prev: $("pag-prev"),
    next: $("pag-next"),
    pages: $("pag-pages"),

    modal: $("venda-modal"),
    modalTitle: $("venda-modal-title"),
    btnFecharModal: $("btn-fechar-venda-modal"),
    btnCancelarForm: $("btn-cancelar-form-venda"),
    form: $("form-venda"),

    vendaId: $("venda-id"),
    cliente: $("venda-cliente"),
    email: $("venda-email"),
    canalForm: $("venda-canal"),
    statusForm: $("venda-status"),
    dataForm: $("venda-data"),
    pagamento: $("venda-pagamento"),
    produtoList: $("produto-venda-list"),
    btnAddProduto: $("btn-add-produto-venda"),
    desconto: $("venda-desconto"),
    frete: $("venda-frete"),
    totalPreview: $("venda-total-preview"),
    observacao: $("venda-observacao"),

    cancelModal: $("cancelar-venda-modal"),
    btnFecharCancel: $("btn-fechar-cancelar-modal"),
    btnVoltarCancel: $("btn-voltar-cancelamento"),
    btnConfirmarCancel: $("btn-confirmar-cancelamento"),
    cancelId: $("cancelar-venda-id"),
    cancelMotivo: $("cancelar-venda-motivo")
  };

  const state = {
    vendas: [],
    periodo: "7d",
    busca: "",
    status: "todos",
    canal: "todos",
    sort: "data",
    dir: "desc",
    page: 1,
    expandedId: null,
    usandoMock: false
  };

  const statusText = {
    concluido: "Concluído",
    pendente: "Pendente",
    processando: "Processando",
    cancelado: "Cancelado"
  };

  const canalText = {
    online: "Loja Online",
    whatsapp: "WhatsApp",
    presencial: "Presencial",
    marketplace: "Marketplace"
  };

  const pagamentoText = {
    pix: "Pix",
    credito: "Cartão de crédito",
    debito: "Cartão de débito",
    dinheiro: "Dinheiro",
    boleto: "Boleto"
  };

  const mockVendas = [
    vendaMock("PED-00081", "Maria Souza", "maria@email.com", "whatsapp", "concluido", "pix", "2026-06-23T19:42", [
      ["Produto Alpha", 2, 180],
      ["Cabo USB-C", 1, 39.9]
    ]),
    vendaMock("PED-00080", "João Pereira", "joao@email.com", "online", "processando", "credito", "2026-06-23T16:18", [
      ["Produto Beta", 1, 490]
    ]),
    vendaMock("PED-00079", "Camila Rocha", "camila@email.com", "marketplace", "pendente", "boleto", "2026-06-22T12:05", [
      ["Produto Gamma", 3, 89.9]
    ]),
    vendaMock("PED-00078", "Pedro Lima", "pedro@email.com", "presencial", "concluido", "dinheiro", "2026-06-22T10:31", [
      ["Produto Delta", 1, 520],
      ["Outros", 2, 45]
    ]),
    vendaMock("PED-00077", "Ana Martins", "ana@email.com", "online", "cancelado", "credito", "2026-06-21T18:15", [
      ["Produto Alpha", 1, 180]
    ], "Cliente desistiu da compra."),
    vendaMock("PED-00076", "Lucas Alves", "lucas@email.com", "whatsapp", "concluido", "pix", "2026-06-21T14:22", [
      ["Produto Beta", 2, 490]
    ]),
    vendaMock("PED-00075", "Fernanda Dias", "fernanda@email.com", "online", "concluido", "debito", "2026-06-20T09:44", [
      ["Produto Gamma", 5, 89.9]
    ]),
    vendaMock("PED-00074", "Rafael Costa", "rafael@email.com", "marketplace", "processando", "credito", "2026-06-19T20:10", [
      ["Produto Alpha", 1, 180],
      ["Produto Delta", 1, 520]
    ]),
    vendaMock("PED-00073", "Beatriz Melo", "bia@email.com", "presencial", "concluido", "dinheiro", "2026-06-18T11:30", [
      ["Outros", 4, 35]
    ]),
    vendaMock("PED-00072", "Gustavo Nunes", "gustavo@email.com", "whatsapp", "pendente", "pix", "2026-06-17T15:50", [
      ["Produto Beta", 1, 490]
    ])
  ];

  init();

  function init() {
    bindEvents();
    carregarVendas();
  }

  function bindEvents() {
    dom.btnNova.addEventListener("click", abrirNovaVenda);
    dom.btnExport.addEventListener("click", exportarVendas);

    dom.periodFilter.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-period]");
      if (!btn) return;

      state.periodo = btn.dataset.period;
      state.page = 1;
      ativarPeriodo();
      carregarVendas();
    });

    dom.search.addEventListener("input", debounce((event) => {
      state.busca = event.target.value;
      state.page = 1;
      render();
    }, 250));

    dom.searchClear.addEventListener("click", () => {
      state.busca = "";
      state.page = 1;
      dom.search.value = "";
      dom.search.focus();
      render();
    });

    dom.statusPills.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-status]");
      if (!btn) return;

      state.status = btn.dataset.status;
      state.page = 1;
      render();
    });

    dom.canal.addEventListener("change", (event) => {
      state.canal = event.target.value;
      state.page = 1;
      render();
    });

    dom.tableSort.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-sort]");
      if (!btn) return;

      const sameSort = state.sort === btn.dataset.sort;

      state.sort = btn.dataset.sort;
      state.dir = sameSort && state.dir === "desc" ? "asc" : "desc";
      state.page = 1;

      render();
    });

    dom.prev.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        render();
      }
    });

    dom.next.addEventListener("click", () => {
      const totalPages = getTotalPages(getVendasFiltradas().length);

      if (state.page < totalPages) {
        state.page += 1;
        render();
      }
    });

    dom.pages.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-page]");
      if (!btn) return;

      state.page = Number(btn.dataset.page);
      render();
    });

    dom.tbody.addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-edit]");
      const cancelBtn = event.target.closest("[data-cancel]");
      const row = event.target.closest("[data-row-id]");

      if (editBtn) {
        abrirEditarVenda(editBtn.dataset.edit);
        return;
      }

      if (cancelBtn) {
        abrirCancelarVenda(cancelBtn.dataset.cancel);
        return;
      }

      if (row) {
        alternarDetalhe(row.dataset.rowId);
      }
    });

    dom.btnFecharModal.addEventListener("click", fecharVendaModal);
    dom.btnCancelarForm.addEventListener("click", fecharVendaModal);
    dom.modal.addEventListener("click", fecharAoClicarFora);
    dom.form.addEventListener("submit", salvarVenda);

    dom.btnAddProduto.addEventListener("click", () => adicionarProdutoRow());
    dom.produtoList.addEventListener("click", removerProdutoRow);
    dom.produtoList.addEventListener("input", atualizarPreviewTotal);
    dom.desconto.addEventListener("input", atualizarPreviewTotal);
    dom.frete.addEventListener("input", atualizarPreviewTotal);

    dom.btnFecharCancel.addEventListener("click", fecharCancelarModal);
    dom.btnVoltarCancel.addEventListener("click", fecharCancelarModal);
    dom.cancelModal.addEventListener("click", fecharAoClicarFora);
    dom.btnConfirmarCancel.addEventListener("click", confirmarCancelamento);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        fecharVendaModal();
        fecharCancelarModal();
      }
    });
  }

  async function carregarVendas() {
    setLoading();

    try {
      const data = await request(`${API}?periodo=${encodeURIComponent(state.periodo)}`);
      state.vendas = normalizarResposta(data);
      state.usandoMock = false;
    } catch (error) {
      console.error(error);

      if (USE_MOCK_FALLBACK) {
        state.vendas = mockVendas.map(normalizarVenda);
        state.usandoMock = true;
      } else {
        state.vendas = [];
      }
    }

    render();
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers
      },
      body: options.body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function normalizarResposta(data) {
    const lista = Array.isArray(data) ? data : data?.vendas;

    return Array.isArray(lista)
      ? lista.map(normalizarVenda)
      : [];
  }

  function normalizarVenda(venda) {
    const produtos = Array.isArray(venda.produtos)
      ? venda.produtos.map((item) => ({
          nome: String(item.nome ?? "Produto sem nome"),
          quantidade: Math.max(parseInt(item.quantidade ?? 1, 10), 1),
          valorUnitario: num(item.valorUnitario ?? item.valor ?? 0)
        }))
      : [];

    const subtotal = produtos.reduce((soma, item) => {
      return soma + item.quantidade * item.valorUnitario;
    }, 0);

    const desconto = num(venda.desconto);
    const frete = num(venda.frete);
    const valorTotal = venda.valorTotal === undefined
      ? Math.max(subtotal - desconto + frete, 0)
      : num(venda.valorTotal);

    return {
      id: String(venda.id ?? gerarPedidoId()),
      cliente: {
        nome: String(venda.cliente?.nome ?? venda.clienteNome ?? venda.cliente ?? "Cliente sem nome"),
        email: String(venda.cliente?.email ?? venda.clienteEmail ?? venda.email ?? "")
      },
      produtos,
      canal: String(venda.canal ?? "online"),
      status: String(venda.status ?? "pendente"),
      pagamento: String(venda.pagamento ?? "pix"),
      data: String(venda.data ?? new Date().toISOString()),
      desconto,
      frete,
      valorTotal,
      observacao: String(venda.observacao ?? ""),
      motivoCancelamento: String(venda.motivoCancelamento ?? "")
    };
  }

  function render() {
    const filtradas = getVendasFiltradas();
    const pageItems = getPageItems(filtradas);

    renderKPIs();
    renderTabela(pageItems, filtradas.length);
    renderPaginacao(filtradas.length);
    renderControles();
    renderSort();
  }

  function renderKPIs() {
    const totalPedidos = state.vendas.length;
    const concluidos = state.vendas.filter((v) => v.status === "concluido");
    const cancelados = state.vendas.filter((v) => v.status === "cancelado");

    const faturado = concluidos.reduce((soma, venda) => soma + venda.valorTotal, 0);
    const ticket = concluidos.length ? faturado / concluidos.length : 0;
    const taxaCancelamento = totalPedidos ? (cancelados.length / totalPedidos) * 100 : 0;

    dom.kpiFaturado.textContent = money(faturado);
    dom.kpiFaturadoDelta.textContent = "+0,0% vs. anterior";
    dom.kpiFaturadoDelta.className = "kpi-delta pos";

    dom.kpiPedidos.textContent = totalPedidos;
    dom.kpiPedidosDelta.textContent = "+0,0% vs. anterior";
    dom.kpiPedidosDelta.className = "kpi-delta pos";

    dom.kpiTicket.textContent = money(ticket);
    dom.kpiTicketDelta.textContent = "+0,0% vs. anterior";
    dom.kpiTicketDelta.className = "kpi-delta pos";

    dom.kpiConcluidos.textContent = concluidos.length;
    dom.kpiCancelados.textContent = `${taxaCancelamento.toFixed(1)}%`;
  }

  function renderTabela(lista, total) {
    dom.count.textContent = `${total} ${total === 1 ? "pedido" : "pedidos"}`;
    dom.empty.style.display = total ? "none" : "flex";
    dom.pagination.style.display = total > PAGE_SIZE ? "flex" : "none";

    dom.tbody.innerHTML = lista.map(vendaHTML).join("");
  }

  function vendaHTML(venda) {
    const expanded = state.expandedId === venda.id;
    const primeiroProduto = venda.produtos[0]?.nome ?? "Sem produtos";
    const extras = venda.produtos.length > 1 ? `<span class="produto-mais">+${venda.produtos.length - 1}</span>` : "";
    const podeEditar = venda.status === "pendente" || venda.status === "processando";
    const podeCancelar = venda.status !== "cancelado";

    return `
      <tr class="venda-row ${expanded ? "active-row" : ""}" data-row-id="${escapeAttr(venda.id)}">
        <td><span class="pedido-num">${escapeHTML(venda.id)}</span></td>

        <td>
          <div class="cliente-nome">${escapeHTML(venda.cliente.nome)}</div>
          <div class="cliente-email">${escapeHTML(venda.cliente.email)}</div>
        </td>

        <td>
          <span class="produto-nome">${escapeHTML(primeiroProduto)}</span>
          ${extras}
        </td>

        <td>
          <span class="canal-badge canal-${escapeAttr(venda.canal)}">
            ${escapeHTML(canalText[venda.canal] || venda.canal)}
          </span>
        </td>

        <td class="venda-valor">${money(venda.valorTotal)}</td>

        <td class="col-status">
          <span class="status-badge status-${escapeAttr(venda.status)}">
            ${escapeHTML(statusText[venda.status] || venda.status)}
          </span>
        </td>

        <td class="venda-data">${formatDate(venda.data)}</td>

        <td class="col-actions">
          <div class="venda-actions">
            <button class="action-btn edit" data-edit="${escapeAttr(venda.id)}" ${podeEditar ? "" : "disabled"} type="button">
              Editar
            </button>

            <button class="action-btn cancel" data-cancel="${escapeAttr(venda.id)}" ${podeCancelar ? "" : "disabled"} type="button">
              Cancelar
            </button>
          </div>
        </td>

        <td class="expand-arrow">⌄</td>
      </tr>

      <tr class="expand-row">
        <td colspan="9">
          <div class="expand-content ${expanded ? "open" : ""}">
            ${detalheVendaHTML(venda)}
          </div>
        </td>
      </tr>
    `;
  }

  function detalheVendaHTML(venda) {
    return `
      <div class="expand-section">
        <span class="expand-section-title">Itens do pedido</span>

        <div class="expand-items">
          ${venda.produtos.map((item) => `
            <div class="expand-item">
              <span class="expand-item-nome">${escapeHTML(item.nome)}</span>
              <span class="expand-item-qtd">${item.quantidade}x</span>
              <span class="expand-item-val">${money(item.quantidade * item.valorUnitario)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="expand-section">
        <span class="expand-section-title">Pagamento</span>

        <div class="expand-info-row">
          <span class="expand-info-label">Forma</span>
          <span class="expand-info-val">${escapeHTML(pagamentoText[venda.pagamento] || venda.pagamento)}</span>
        </div>

        <div class="expand-info-row">
          <span class="expand-info-label">Desconto</span>
          <span class="expand-info-val">${money(venda.desconto)}</span>
        </div>

        <div class="expand-info-row">
          <span class="expand-info-label">Frete</span>
          <span class="expand-info-val">${money(venda.frete)}</span>
        </div>

        <div class="expand-info-row">
          <span class="expand-info-label">Observação</span>
          <span class="expand-info-val">${escapeHTML(venda.observacao || "—")}</span>
        </div>
      </div>

      <div class="expand-section">
        <span class="expand-section-title">Status</span>

        <div class="expand-timeline">
          ${timelineHTML(venda)}
        </div>

        ${venda.motivoCancelamento ? `
          <div class="expand-info-row">
            <span class="expand-info-label">Motivo do cancelamento</span>
            <span class="expand-info-val">${escapeHTML(venda.motivoCancelamento)}</span>
          </div>
        ` : ""}
      </div>
    `;
  }

  function timelineHTML(venda) {
    const fluxo = ["pendente", "processando", "concluido"];
    const statusAtual = venda.status;
    const indexAtual = fluxo.indexOf(statusAtual);

    if (statusAtual === "cancelado") {
      return `
        <div class="timeline-step">
          <span class="timeline-dot done"></span>
          <div class="timeline-text">
            <span class="timeline-label">Pedido criado</span>
            <span class="timeline-date">${formatDate(venda.data)}</span>
          </div>
        </div>

        <div class="timeline-step">
          <span class="timeline-dot current"></span>
          <div class="timeline-text">
            <span class="timeline-label">Venda cancelada</span>
            <span class="timeline-date">Histórico preservado</span>
          </div>
        </div>
      `;
    }

    return fluxo.map((status, index) => {
      const done = index < indexAtual;
      const current = index === indexAtual;

      return `
        <div class="timeline-step">
          <span class="timeline-dot ${done ? "done" : current ? "current" : "pending"}"></span>
          <div class="timeline-text">
            <span class="timeline-label">${escapeHTML(statusText[status])}</span>
            <span class="timeline-date">${current ? formatDate(venda.data) : done ? "concluído" : "aguardando"}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderPaginacao(total) {
    const totalPages = getTotalPages(total);

    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= totalPages;

    dom.pages.innerHTML = Array.from({ length: totalPages }, (_, index) => {
      const page = index + 1;

      return `
        <button class="pag-num ${page === state.page ? "active" : ""}" data-page="${page}" type="button">
          ${page}
        </button>
      `;
    }).join("");
  }

  function renderControles() {
    dom.searchClear.style.display = state.busca ? "block" : "none";
    dom.canal.value = state.canal;

    dom.statusPills.querySelectorAll("[data-status]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.status === state.status);
    });
  }

  function renderSort() {
    dom.tableSort.querySelectorAll("[data-sort]").forEach((btn) => {
      const active = btn.dataset.sort === state.sort;
      const arrow = active ? (state.dir === "desc" ? "↓" : "↑") : "↕";

      btn.classList.toggle("active", active);
      btn.dataset.dir = active ? state.dir : "desc";
      btn.querySelector(".sort-arrow").textContent = arrow;
    });
  }

  function getVendasFiltradas() {
    const termo = normalize(state.busca);

    return [...state.vendas]
      .filter((venda) => {
        const texto = normalize(`
          ${venda.id}
          ${venda.cliente.nome}
          ${venda.cliente.email}
          ${venda.produtos.map((p) => p.nome).join(" ")}
        `);

        const bateBusca = texto.includes(termo);
        const bateStatus = state.status === "todos" || venda.status === state.status;
        const bateCanal = state.canal === "todos" || venda.canal === state.canal;

        return bateBusca && bateStatus && bateCanal;
      })
      .sort(sorter());
  }

  function sorter() {
    return (a, b) => {
      const mult = state.dir === "desc" ? -1 : 1;

      if (state.sort === "valor") {
        return (a.valorTotal - b.valorTotal) * mult;
      }

      return (new Date(a.data) - new Date(b.data)) * mult;
    };
  }

  function getPageItems(lista) {
    const start = (state.page - 1) * PAGE_SIZE;
    return lista.slice(start, start + PAGE_SIZE);
  }

  function getTotalPages(total) {
    return Math.max(Math.ceil(total / PAGE_SIZE), 1);
  }

  function abrirNovaVenda() {
    dom.form.reset();
    dom.vendaId.value = "";
    dom.modalTitle.textContent = "Nova Venda";
    dom.dataForm.value = toDatetimeLocal(new Date());
    resetProdutoRows();
    atualizarPreviewTotal();
    abrirModal(dom.modal);
  }

  function abrirEditarVenda(id) {
    const venda = state.vendas.find((item) => item.id === id);
    if (!venda) return;

    dom.form.reset();
    dom.modalTitle.textContent = "Editar Venda";

    dom.vendaId.value = venda.id;
    dom.cliente.value = venda.cliente.nome;
    dom.email.value = venda.cliente.email;
    dom.canalForm.value = venda.canal;
    dom.statusForm.value = venda.status;
    dom.dataForm.value = toDatetimeLocal(venda.data);
    dom.pagamento.value = venda.pagamento;
    dom.desconto.value = venda.desconto;
    dom.frete.value = venda.frete;
    dom.observacao.value = venda.observacao;

    dom.produtoList.innerHTML = "";
    venda.produtos.forEach((produto) => adicionarProdutoRow(produto));

    atualizarPreviewTotal();
    abrirModal(dom.modal);
  }

  async function salvarVenda(event) {
    event.preventDefault();

    const payload = getFormPayload();
    if (!payload) return;

    const id = dom.vendaId.value;

    try {
      if (id) {
        await apiUpdate(id, payload);
      } else {
        await apiCreate(payload);
      }

      fecharVendaModal();
      await carregarVendas();
    } catch (error) {
      console.error(error);

      if (USE_MOCK_FALLBACK) {
        if (id) {
          atualizarVendaMock(id, payload);
        } else {
          criarVendaMock(payload);
        }

        fecharVendaModal();
        render();
      }
    }
  }

  async function apiCreate(payload) {
    if (state.usandoMock) throw new Error("mock mode");

    return request(API, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function apiUpdate(id, payload) {
    if (state.usandoMock) throw new Error("mock mode");

    return request(`${API}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  function abrirCancelarVenda(id) {
    const venda = state.vendas.find((item) => item.id === id);
    if (!venda || venda.status === "cancelado") return;

    dom.cancelId.value = id;
    dom.cancelMotivo.value = "";
    abrirModal(dom.cancelModal);
  }

  async function confirmarCancelamento() {
    const id = dom.cancelId.value;
    const motivo = dom.cancelMotivo.value.trim();

    if (!id) return;

    try {
      if (state.usandoMock) throw new Error("mock mode");

      await request(`${API}/${encodeURIComponent(id)}/cancelar`, {
        method: "PATCH",
        body: JSON.stringify({ motivo })
      });

      fecharCancelarModal();
      await carregarVendas();
    } catch (error) {
      console.error(error);

      if (USE_MOCK_FALLBACK) {
        cancelarVendaMock(id, motivo);
        fecharCancelarModal();
        render();
      }
    }
  }

  function getFormPayload() {
    const produtos = getProdutosDoForm();

    if (!produtos.length) {
      return null;
    }

    const desconto = num(dom.desconto.value);
    const frete = num(dom.frete.value);
    const subtotal = produtos.reduce((soma, item) => {
      return soma + item.quantidade * item.valorUnitario;
    }, 0);

    return {
      cliente: {
        nome: dom.cliente.value.trim(),
        email: dom.email.value.trim()
      },
      canal: dom.canalForm.value,
      status: dom.statusForm.value,
      pagamento: dom.pagamento.value,
      data: new Date(dom.dataForm.value).toISOString(),
      produtos,
      desconto,
      frete,
      valorTotal: Math.max(subtotal - desconto + frete, 0),
      observacao: dom.observacao.value.trim()
    };
  }

  function getProdutosDoForm() {
    const rows = [...dom.produtoList.querySelectorAll("[data-produto-row]")];

    return rows
      .map((row) => {
        const nome = row.querySelector('[name="produtoNome[]"]').value.trim();
        const quantidade = Math.max(parseInt(row.querySelector('[name="produtoQtd[]"]').value, 10), 1);
        const valorUnitario = num(row.querySelector('[name="produtoValor[]"]').value);

        return { nome, quantidade, valorUnitario };
      })
      .filter((item) => item.nome && item.quantidade > 0);
  }

  function adicionarProdutoRow(produto = {}) {
    const row = document.createElement("div");

    row.className = "produto-venda-row";
    row.dataset.produtoRow = "";

    row.innerHTML = `
      <label class="form-field produto-field-nome">
        <span>Produto</span>
        <input class="form-control" name="produtoNome[]" type="text"
          placeholder="Ex: Produto Alpha" value="${escapeAttr(produto.nome ?? "")}" required>
      </label>

      <label class="form-field produto-field-qtd">
        <span>Qtd.</span>
        <input class="form-control" name="produtoQtd[]" type="number" min="1" step="1"
          value="${escapeAttr(produto.quantidade ?? 1)}" required>
      </label>

      <label class="form-field produto-field-valor">
        <span>Valor unit.</span>
        <input class="form-control" name="produtoValor[]" type="number" min="0" step="0.01"
          value="${escapeAttr(produto.valorUnitario ?? "")}" placeholder="0,00" required>
      </label>

      <button class="btn-remove-item" type="button" data-remove-produto aria-label="Remover produto">
        ✕
      </button>
    `;

    dom.produtoList.appendChild(row);
    atualizarPreviewTotal();
  }

  function removerProdutoRow(event) {
    const btn = event.target.closest("[data-remove-produto]");
    if (!btn) return;

    const rows = dom.produtoList.querySelectorAll("[data-produto-row]");

    if (rows.length <= 1) {
      rows[0].querySelector('[name="produtoNome[]"]').value = "";
      rows[0].querySelector('[name="produtoQtd[]"]').value = 1;
      rows[0].querySelector('[name="produtoValor[]"]').value = "";
    } else {
      btn.closest("[data-produto-row]").remove();
    }

    atualizarPreviewTotal();
  }

  function resetProdutoRows() {
    dom.produtoList.innerHTML = "";
    adicionarProdutoRow();
  }

  function atualizarPreviewTotal() {
    const produtos = getProdutosDoForm();
    const desconto = num(dom.desconto.value);
    const frete = num(dom.frete.value);

    const subtotal = produtos.reduce((soma, item) => {
      return soma + item.quantidade * item.valorUnitario;
    }, 0);

    dom.totalPreview.textContent = money(Math.max(subtotal - desconto + frete, 0));
  }

  function criarVendaMock(payload) {
    state.vendas.unshift(normalizarVenda({
      ...payload,
      id: gerarPedidoId()
    }));
  }

  function atualizarVendaMock(id, payload) {
    state.vendas = state.vendas.map((venda) => {
      return venda.id === id
        ? normalizarVenda({ ...venda, ...payload, id })
        : venda;
    });
  }

  function cancelarVendaMock(id, motivo) {
    state.vendas = state.vendas.map((venda) => {
      return venda.id === id
        ? { ...venda, status: "cancelado", motivoCancelamento: motivo }
        : venda;
    });
  }

  function exportarVendas() {
    window.location.href = `${API}/exportar?periodo=${encodeURIComponent(state.periodo)}`;
  }

  function alternarDetalhe(id) {
    state.expandedId = state.expandedId === id ? null : id;
    render();
  }

  function abrirModal(modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function fecharVendaModal() {
    dom.modal.classList.remove("open");
    dom.modal.setAttribute("aria-hidden", "true");
  }

  function fecharCancelarModal() {
    dom.cancelModal.classList.remove("open");
    dom.cancelModal.setAttribute("aria-hidden", "true");
  }

  function fecharAoClicarFora(event) {
    if (event.target === dom.modal) fecharVendaModal();
    if (event.target === dom.cancelModal) fecharCancelarModal();
  }

  function ativarPeriodo() {
    dom.periodFilter.querySelectorAll("[data-period]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.period === state.periodo);
    });
  }

  function setLoading() {
    dom.kpiFaturado.textContent = "—";
    dom.kpiPedidos.textContent = "—";
    dom.kpiTicket.textContent = "—";
    dom.kpiConcluidos.textContent = "—";
    dom.kpiCancelados.textContent = "—";
    dom.count.textContent = "— pedidos";
  }

  function vendaMock(id, nome, email, canal, status, pagamento, data, produtos, motivoCancelamento = "") {
    return {
      id,
      cliente: { nome, email },
      canal,
      status,
      pagamento,
      data,
      produtos: produtos.map(([nomeProduto, quantidade, valorUnitario]) => ({
        nome: nomeProduto,
        quantidade,
        valorUnitario
      })),
      desconto: 0,
      frete: 0,
      observacao: "Venda de demonstração.",
      motivoCancelamento
    };
  }

  function gerarPedidoId() {
    return `PED-${String(Date.now()).slice(-5)}`;
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function money(value) {
    return num(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function toDatetimeLocal(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);

    return local.toISOString().slice(0, 16);
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function debounce(fn, delay = 300) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#096;");
  }
})();