/* =========================================================
   Gennus ERP — Estoque
   JS enxuto, pronto para backend e seguro contra XSS básico.

   Endpoints esperados:
   GET  /api/estoque
   POST /api/estoque/:id/reposicao
   GET  /api/estoque/exportar

   Esta tela NÃO faz CRUD de produto.
   Ela apenas lista, filtra, ordena, pagina, alerta e solicita reposição.
========================================================= */

(() => {
  "use strict";

  /* Centralizar configs poupa linhas repetidas e facilita mudar depois. */
  const API = "/api/estoque";
  const PAGE_SIZE = 10;

  /* Guardamos referências do DOM uma vez só. Mais eficiente que buscar toda hora. */
  const $ = (id) => document.getElementById(id);

  const dom = {
    total: $("kpi-total"),
    ok: $("kpi-ok"),
    okSub: $("kpi-ok-sub"),
    medio: $("kpi-medio"),
    baixo: $("kpi-baixo"),
    esgotado: $("kpi-esgotado"),

    distBar: $("dist-bar"),
    distLegend: $("dist-legend"),

    search: $("search-input"),
    clear: $("search-clear"),
    pills: $("status-pills"),
    ordem: $("select-ordem"),

    count: $("table-count"),
    tbody: $("est-tbody"),
    empty: $("empty-state"),

    prev: $("pag-prev"),
    next: $("pag-next"),
    pages: $("pag-pages"),
    pagination: $("pagination"),

    alertCount: $("alertas-count"),
    alertList: $("alertas-list"),

    export: $("btn-export")
  };

  /* Estado único da tela. Evita variáveis espalhadas. */
  const state = {
    produtos: [],
    busca: "",
    status: "todos",
    ordem: "critico",
    page: 1
  };

  const statusLabel = {
    ok: "OK",
    medio: "Médio",
    baixo: "Baixo",
    esgotado: "Esgotado"
  };

  const statusColor = {
    ok: "var(--verde)",
    medio: "#60a5fa",
    baixo: "var(--amarelo)",
    esgotado: "var(--vermelho)"
  };

  /* =========================================================
     API
     ---------------------------------------------------------
     Fetch isolado deixa o código pronto para backend.
     Outros programadores costumam espalhar fetch em eventos.
     Isso vira bagunça quando precisa tratar token, erro ou header.
  ========================================================= */

  async function request(url, options = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });

    if (!res.ok) {
      throw new Error(`Erro ${res.status}`);
    }

    return res.json();
  }

  async function carregarEstoque() {
    const data = await request(API);

    /*
      Normalizar evita quebrar a tela se o backend mandar número como string
      ou algum campo vazio.
    */
    state.produtos = data.map((p) => ({
      id: String(p.id ?? ""),
      nome: String(p.nome ?? "Produto sem nome"),
      categoria: String(p.categoria ?? "Sem categoria"),
      icone: String(p.icone ?? "📦"),
      estoqueAtual: toNumber(p.estoqueAtual),
      estoqueMinimo: toNumber(p.estoqueMinimo),
      capacidade: toNumber(p.capacidade),
      valorUnitario: toNumber(p.valorUnitario)
    }));

    render();
  }

  async function solicitarReposicao(id) {
    const produto = state.produtos.find((p) => p.id === id);
    if (!produto) return alert("Produto não encontrado.");

    const quantidade = reposicaoSugerida(produto);
    if (quantidade <= 0) return alert("Este produto não precisa de reposição.");

    const ok = confirm(`Solicitar reposição de ${quantidade} un. para ${produto.nome}?`);
    if (!ok) return;

    /*
      encodeURIComponent protege a URL caso o ID tenha caracteres especiais.
      Exemplo: espaço, barra, acento etc.
    */
    await request(`${API}/${encodeURIComponent(id)}/reposicao`, {
      method: "POST",
      body: JSON.stringify({ quantidade })
    });

    alert("Reposição solicitada com sucesso.");
  }

  /* =========================================================
     Regras de negócio
  ========================================================= */

  function statusDoProduto(p) {
    if (p.estoqueAtual === 0) return "esgotado";
    if (p.estoqueAtual < p.estoqueMinimo) return "baixo";
    if (percentual(p.estoqueAtual, p.capacidade) <= 50) return "medio";
    return "ok";
  }

  function reposicaoSugerida(p) {
    return Math.max(p.capacidade - p.estoqueAtual, 0);
  }

  function valorEstoque(p) {
    return p.estoqueAtual * p.valorUnitario;
  }

  function percentual(valor, total) {
    if (!total) return 0;
    return Math.min(Math.max((valor / total) * 100, 0), 100);
  }

  function resumo() {
    return state.produtos.reduce(
      (acc, p) => {
        acc.total++;
        acc[statusDoProduto(p)]++;
        return acc;
      },
      { total: 0, ok: 0, medio: 0, baixo: 0, esgotado: 0 }
    );
  }

  /* =========================================================
     Filtro, ordenação e paginação
  ========================================================= */

  function produtosFiltrados() {
    const termo = normalize(state.busca);

    return state.produtos
      .filter((p) => {
        const texto = normalize(`${p.id} ${p.nome} ${p.categoria}`);
        const bateBusca = texto.includes(termo);
        const bateStatus = state.status === "todos" || statusDoProduto(p) === state.status;

        return bateBusca && bateStatus;
      })
      .sort(sorter());
  }

  function sorter() {
    const peso = { esgotado: 1, baixo: 2, medio: 3, ok: 4 };

    const sorters = {
      critico: (a, b) => peso[statusDoProduto(a)] - peso[statusDoProduto(b)],
      "nome-asc": (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      "estoque-asc": (a, b) => a.estoqueAtual - b.estoqueAtual,
      "estoque-desc": (a, b) => b.estoqueAtual - a.estoqueAtual,
      "valor-desc": (a, b) => valorEstoque(b) - valorEstoque(a)
    };

    return sorters[state.ordem] || sorters.critico;
  }

  function paginaAtual(lista) {
    const start = (state.page - 1) * PAGE_SIZE;
    return lista.slice(start, start + PAGE_SIZE);
  }

  /* =========================================================
     Renderização
     ---------------------------------------------------------
     Uso innerHTML para ficar enxuto.
     Mas todo dado externo passa por escapeHTML().
     Assim evita o erro comum de jogar dado cru do backend na tela.
  ========================================================= */

  function render() {
    const lista = produtosFiltrados();
    const pagina = paginaAtual(lista);
    const totalPages = Math.max(Math.ceil(lista.length / PAGE_SIZE), 1);

    renderKPIs();
    renderDistribuicao();
    renderTabela(pagina, lista.length);
    renderPaginacao(totalPages);
    renderAlertas();
    renderControles();
  }

  function renderKPIs() {
    const r = resumo();

    dom.total.textContent = r.total;
    dom.ok.textContent = r.ok;
    dom.medio.textContent = r.medio;
    dom.baixo.textContent = r.baixo;
    dom.esgotado.textContent = r.esgotado;
    dom.okSub.textContent = `${Math.round(percentual(r.ok, r.total))}% do catálogo`;
  }

  function renderDistribuicao() {
    const r = resumo();

    const itens = [
      ["ok", "Estoque OK", r.ok],
      ["medio", "Estoque Médio", r.medio],
      ["baixo", "Estoque Baixo", r.baixo],
      ["esgotado", "Esgotado", r.esgotado]
    ];

    dom.distBar.innerHTML = itens
      .map(([status, label, valor]) => {
        const pct = Math.round(percentual(valor, r.total));
        return `<div class="dist-seg" title="${label}: ${valor} (${pct}%)" style="width:${pct}%;background:${statusColor[status]}"></div>`;
      })
      .join("");

    dom.distLegend.innerHTML = itens
      .map(([status, label, valor]) => {
        const pct = Math.round(percentual(valor, r.total));
        return `
          <div class="dist-leg-item">
            <span class="dist-leg-dot" style="background:${statusColor[status]}"></span>
            <span>${label}:</span>
            <span class="dist-leg-val">${valor} (${pct}%)</span>
          </div>
        `;
      })
      .join("");
  }

  function renderTabela(lista, total) {
    dom.count.textContent = `${total} ${total === 1 ? "item" : "itens"}`;
    dom.empty.style.display = total ? "none" : "flex";
    dom.pagination.style.display = total > PAGE_SIZE ? "flex" : "none";

    dom.tbody.innerHTML = lista.map(rowHTML).join("");
  }

  function rowHTML(p) {
    const status = statusDoProduto(p);
    const pct = Math.round(percentual(p.estoqueAtual, p.capacidade));
    const min = Math.round(percentual(p.estoqueMinimo, p.capacidade));
    const precisaRepor = status === "baixo" || status === "esgotado";

    return `
      <tr>
        <td>
          <div class="prd-cell">
            <div class="prd-icon">${escapeHTML(p.icone)}</div>
            <div class="prd-nome-wrap">
              <span class="prd-nome">${escapeHTML(p.nome)}</span>
              <span class="prd-id">${escapeHTML(p.id)}</span>
            </div>
          </div>
        </td>

        <td><span class="cat-badge">${escapeHTML(p.categoria)}</span></td>

        <td>
          <span class="estoque-num">${p.estoqueAtual}</span>
          <span class="estoque-unidade">/ ${p.capacidade}</span>
        </td>

        <td class="ta-r">
          <div class="cap-cell">
            <span class="cap-pct" style="color:${statusColor[status]}">${pct}%</span>
            <div class="cap-bar">
              <div class="cap-fill" style="width:${pct}%;background:${statusColor[status]}"></div>
              <span class="cap-min-mark" style="left:${min}%"></span>
            </div>
          </div>
        </td>

        <td class="ta-r">
          <span class="status-badge status-${status}">${statusLabel[status]}</span>
        </td>

        <td class="valor-estoque">${money(valorEstoque(p))}</td>

        <td class="ta-r">
          <button 
            class="btn-repor" 
            data-repor="${escapeHTML(p.id)}"
            ${precisaRepor ? "" : "disabled"}>
            Repor
          </button>
        </td>
      </tr>
    `;
  }

  function renderPaginacao(totalPages) {
    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= totalPages;

    dom.pages.innerHTML = Array.from({ length: totalPages }, (_, i) => {
      const page = i + 1;
      return `
        <button class="pag-num ${page === state.page ? "active" : ""}" data-page="${page}">
          ${page}
        </button>
      `;
    }).join("");
  }

  function renderAlertas() {
    const alertas = state.produtos
      .filter((p) => ["baixo", "esgotado"].includes(statusDoProduto(p)))
      .sort((a, b) => reposicaoSugerida(b) - reposicaoSugerida(a));

    dom.alertCount.textContent = `${alertas.length} ${alertas.length === 1 ? "pendente" : "pendentes"}`;

    dom.alertList.innerHTML = alertas.length
      ? alertas.map(alertaHTML).join("")
      : `<div class="alertas-empty">Nenhum alerta de reposição.</div>`;
  }

  function alertaHTML(p) {
    const status = statusDoProduto(p);

    return `
      <div class="alerta-item">
        <div class="alerta-top">
          <div>
            <div class="alerta-nome">${escapeHTML(p.icone)} ${escapeHTML(p.nome)}</div>
            <div class="alerta-meta">
              ${escapeHTML(p.id)} · atual: ${p.estoqueAtual} / mín: ${p.estoqueMinimo}
            </div>
          </div>

          <span class="status-badge status-${status}">
            ${statusLabel[status]}
          </span>
        </div>

        <div class="alerta-sugestao">
          <span>Reposição sugerida</span>
          <strong>+${reposicaoSugerida(p)} un.</strong>
        </div>
      </div>
    `;
  }

  function renderControles() {
    dom.clear.style.display = state.busca ? "block" : "none";

    dom.pills.querySelectorAll("[data-status]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.status === state.status);
    });

    dom.ordem.value = state.ordem;
  }

  /* =========================================================
     Eventos
     ---------------------------------------------------------
     Event delegation poupa linhas e memória.
     Em vez de evento em cada botão Repor/Página,
     usamos um evento no pai.
  ========================================================= */

  dom.search.addEventListener("input", debounce((e) => {
    state.busca = e.target.value;
    state.page = 1;
    render();
  }, 250));

  dom.clear.addEventListener("click", () => {
    state.busca = "";
    state.page = 1;
    dom.search.value = "";
    dom.search.focus();
    render();
  });

  dom.pills.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;

    state.status = btn.dataset.status;
    state.page = 1;
    render();
  });

  dom.ordem.addEventListener("change", (e) => {
    state.ordem = e.target.value;
    state.page = 1;
    render();
  });

  dom.prev.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      render();
    }
  });

  dom.next.addEventListener("click", () => {
    const totalPages = Math.ceil(produtosFiltrados().length / PAGE_SIZE);
    if (state.page < totalPages) {
      state.page++;
      render();
    }
  });

  dom.pages.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn) return;

    state.page = Number(btn.dataset.page);
    render();
  });

  dom.tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-repor]");
    if (!btn) return;

    try {
      btn.disabled = true;
      btn.textContent = "Enviando";
      await solicitarReposicao(btn.dataset.repor);
      await carregarEstoque();
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar reposição.");
      btn.disabled = false;
      btn.textContent = "Repor";
    }
  });

  dom.export.addEventListener("click", () => {
    /*
      Mais enxuto: deixa o backend gerar o arquivo.
      Isso evita CSV pesado no front e centraliza regra no servidor.
    */
    window.location.href = `${API}/exportar`;
  });

  /* =========================================================
     Helpers
  ========================================================= */

  function escapeHTML(value) {
    /*
      Protege contra XSS.
      Transforma <script> em texto comum, não em código executável.
    */
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function normalize(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function money(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function debounce(fn, delay = 300) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* Inicialização */
  carregarEstoque().catch((err) => {
    console.error(err);
    alert("Erro ao carregar estoque. Verifique o backend.");
  });
})();