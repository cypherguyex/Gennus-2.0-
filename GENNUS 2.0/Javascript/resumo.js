/* =========================================================
   Gennus ERP — Resumo do Período

   Objetivo:
   - Buscar dados do backend.
   - Renderizar KPIs, meta, destaques, canais, heatmap,
     ranking e insights.
   - Não usar localStorage.
   - Não mostrar alertas de erro de backend para o usuário.

   Rota esperada:
   GET /api/resumo?periodo=7d
========================================================= */

(() => {
  "use strict";

  const API = "/api/resumo";

  const $ = (id) => document.getElementById(id);

  const dom = {
    scoreValue: $("score-value"),
    scoreDesc: $("score-desc"),
    periodFilter: $("period-filter"),

    vendas: $("kpi-vendas"),
    vendasDelta: $("kpi-vendas-delta"),
    ticket: $("kpi-ticket"),
    ticketDelta: $("kpi-ticket-delta"),
    conversao: $("kpi-conversao"),
    clientes: $("kpi-clientes"),
    clientesDelta: $("kpi-clientes-delta"),
    pedidos: $("kpi-pedidos"),
    pedidosSub: $("kpi-pedidos-sub"),

    badgeMeta: $("badge-meta-status"),
    metaRealizado: $("meta-realizado"),
    metaAlvo: $("meta-alvo"),
    metaPct: $("meta-pct"),
    metaBar: $("meta-bar"),
    metaBarLabelPct: $("meta-bar-label-pct"),
    subMetas: $("sub-metas"),

    destaques: $("destaques-grid"),
    canais: $("canais-list"),
    heatmap: $("heatmap-grid"),
    ranking: $("ranking-list"),
    insights: $("insights-list")
  };

  const state = {
    periodo: "7d",
    dados: null
  };

  const periodoTexto = {
    "7d": "7 dias",
    "30d": "30 dias",
    "90d": "3 meses",
    "1y": "1 ano"
  };

  const canalCores = ["#a855f7", "#22c55e", "#60a5fa", "#fbbf24", "#fb923c"];

  init();

  function init() {
    registrarEventos();
    carregarResumo();
  }

  function registrarEventos() {
    dom.periodFilter.addEventListener("click", (event) => {
      const button = event.target.closest("[data-period]");
      if (!button) return;

      state.periodo = button.dataset.period;
      ativarBotaoPeriodo();
      carregarResumo();
    });
  }

  async function carregarResumo() {
    setLoading();

    try {
      const dados = await request(`${API}?periodo=${encodeURIComponent(state.periodo)}`);
      state.dados = normalizarResumo(dados);
      render();
    } catch (error) {
      console.error(error);
      limparTela();
    }
  }

  async function request(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  function normalizarResumo(dados) {
    return {
      vendas: num(dados.vendas),
      vendasDelta: num(dados.vendasDelta),
      ticketMedio: num(dados.ticketMedio),
      ticketDelta: num(dados.ticketDelta),
      conversao: num(dados.conversao),
      clientesAtivos: num(dados.clientesAtivos),
      clientesDelta: num(dados.clientesDelta),
      pedidos: num(dados.pedidos),

      meta: {
        realizado: num(dados.meta?.realizado),
        alvo: num(dados.meta?.alvo)
      },

      subMetas: array(dados.subMetas),
      destaques: array(dados.destaques),
      canais: array(dados.canais),
      heatmap: array(dados.heatmap),
      ranking: array(dados.ranking)
    };
  }

  function render() {
    const d = state.dados;

    renderScore(d);
    renderKPIs(d);
    renderMeta(d);
    renderDestaques(d.destaques);
    renderCanais(d.canais);
    renderHeatmap(d.heatmap);
    renderRanking(d.ranking);
    renderInsights(d);
  }

  function renderScore(d) {
    const metaPct = percentual(d.meta.realizado, d.meta.alvo);

    const score = calcularScore({
      vendasDelta: d.vendasDelta,
      ticketDelta: d.ticketDelta,
      conversao: d.conversao,
      metaPct
    });

    dom.scoreValue.className = `score-value score-${score.toLowerCase()}`;
    dom.scoreValue.textContent = score;
    dom.scoreDesc.textContent = textoScore(score);
  }

  function renderKPIs(d) {
    dom.vendas.textContent = dinheiro(d.vendas);
    dom.vendasDelta.textContent = delta(d.vendasDelta);
    dom.vendasDelta.className = `kpi-delta ${classeDelta(d.vendasDelta)}`;

    dom.ticket.textContent = dinheiro(d.ticketMedio);
    dom.ticketDelta.textContent = delta(d.ticketDelta);
    dom.ticketDelta.className = `kpi-delta ${classeDelta(d.ticketDelta)}`;

    dom.conversao.textContent = `${d.conversao.toFixed(1)}%`;

    dom.clientes.textContent = d.clientesAtivos;
    dom.clientesDelta.textContent = delta(d.clientesDelta);
    dom.clientesDelta.className = `kpi-delta ${classeDelta(d.clientesDelta)}`;

    dom.pedidos.textContent = d.pedidos;
    dom.pedidosSub.textContent = `no período de ${periodoTexto[state.periodo]}`;
  }

  function renderMeta(d) {
    const realizado = d.meta.realizado;
    const alvo = d.meta.alvo;
    const pct = percentual(realizado, alvo);
    const pctLimitado = clamp(pct, 0, 100);
    const status = statusMeta(pct);

    dom.metaRealizado.textContent = dinheiro(realizado);
    dom.metaAlvo.textContent = dinheiro(alvo);
    dom.metaPct.textContent = `${pct.toFixed(1)}%`;
    dom.metaBar.style.width = `${pctLimitado}%`;
    dom.metaBarLabelPct.textContent = `${pctLimitado.toFixed(1)}%`;

    dom.badgeMeta.textContent = status.texto;
    dom.badgeMeta.className = `resumo-badge ${status.classe}`;

    dom.subMetas.innerHTML = d.subMetas.map(subMetaHTML).join("");
  }

  function subMetaHTML(item) {
    const label = escapeHTML(item.label);
    const atual = num(item.atual);
    const alvo = num(item.alvo);
    const cor = escapeStyleColor(item.cor || "#a855f7");
    const progresso = clamp(percentual(atual, alvo), 0, 100);

    return `
      <div class="sub-meta-item">
        <div class="sub-meta-top">
          <span class="sub-meta-label">${label}</span>
          <span class="sub-meta-val">${atual} / ${alvo}</span>
        </div>

        <div class="sub-meta-track">
          <div class="sub-meta-bar" style="width:${progresso}%;background:${cor}"></div>
        </div>
      </div>
    `;
  }

  function renderDestaques(lista) {
    dom.destaques.innerHTML = lista.map((item) => `
      <div class="destaque-item">
        <span class="destaque-icone">${escapeHTML(item.icone || "•")}</span>
        <span class="destaque-label">${escapeHTML(item.label)}</span>
        <strong class="destaque-valor">${escapeHTML(item.valor)}</strong>
        <span class="destaque-sub">${escapeHTML(item.sub)}</span>
      </div>
    `).join("");
  }

  function renderCanais(lista) {
    const total = lista.reduce((soma, item) => soma + num(item.valor), 0);

    dom.canais.innerHTML = lista.map((item, index) => {
      const valor = num(item.valor);
      const pct = percentual(valor, total);
      const cor = canalCores[index % canalCores.length];

      return `
        <li class="canal-item">
          <div class="canal-top">
            <span class="canal-nome">
              <span class="canal-dot" style="background:${cor}"></span>
              ${escapeHTML(item.nome)}
            </span>

            <span class="canal-vals">
              <span class="canal-valor">${dinheiro(valor)}</span>
              <strong class="canal-pct">${pct.toFixed(1)}%</strong>
            </span>
          </div>

          <div class="canal-track">
            <div class="canal-bar" style="width:${pct}%;background:${cor}"></div>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderHeatmap(lista) {
    const maiorVenda = Math.max(...lista.map((item) => num(item.vendas)), 1);

    dom.heatmap.innerHTML = lista.map((item) => {
      const vendas = num(item.vendas);
      const nivel = Math.ceil(clamp(percentual(vendas, maiorVenda), 0, 100) / 20);
      const tooltip = `${formatarDataCurta(item.dia)} · ${dinheiro(vendas)}`;

      return `
        <span class="heatmap-cell hm-${nivel}" data-tip="${escapeAttr(tooltip)}"></span>
      `;
    }).join("");
  }

  function renderRanking(lista) {
    const top5 = lista.slice(0, 5);
    const maiorValor = Math.max(...top5.map((item) => num(item.valor)), 1);

    dom.ranking.innerHTML = top5.map((item, index) => {
      const valor = num(item.valor);
      const largura = percentual(valor, maiorValor);

      return `
        <li class="ranking-item">
          <span class="ranking-pos">${index + 1}</span>

          <div class="ranking-info">
            <strong class="ranking-nome">${escapeHTML(item.nome)}</strong>

            <div class="ranking-bar-track">
              <div class="ranking-bar" style="width:${largura}%"></div>
            </div>
          </div>

          <div class="ranking-vals">
            <strong class="ranking-valor">${dinheiro(valor)}</strong>
            <span class="ranking-qtd">${num(item.quantidade)} un.</span>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderInsights(d) {
    const metaPct = percentual(d.meta.realizado, d.meta.alvo);
    const faltante = Math.max(d.meta.alvo - d.meta.realizado, 0);
    const canalTop = maiorPorValor(d.canais);
    const produtoTop = d.ranking[0];

    const insights = [
      {
        tipo: d.vendasDelta >= 0 ? "pos" : "neg",
        icone: "📊",
        texto: `Vendas ${d.vendasDelta >= 0 ? "cresceram" : "caíram"} <strong>${Math.abs(d.vendasDelta).toFixed(1)}%</strong> vs. período anterior.`
      },
      {
        tipo: metaPct >= 75 ? "warn" : "info",
        icone: "🎯",
        texto: `Meta <strong>${metaPct.toFixed(1)}%</strong> concluída. Faltam <strong>${dinheiro(faltante)}</strong> para bater o objetivo.`
      },
      {
        tipo: d.ticketDelta >= 0 ? "pos" : "neg",
        icone: "💰",
        texto: `Ticket médio em <strong>${dinheiro(d.ticketMedio)}</strong>, variação de <strong>${d.ticketDelta.toFixed(1)}%</strong>.`
      },
      {
        tipo: "info",
        icone: "🏪",
        texto: canalTop
          ? `<strong>${escapeHTML(canalTop.nome)}</strong> foi o canal mais relevante do período.`
          : "Nenhum canal informado no período."
      },
      {
        tipo: d.conversao >= 20 ? "pos" : "warn",
        icone: "⚠️",
        texto: `Taxa de conversão em <strong>${d.conversao.toFixed(1)}%</strong>.`
      },
      {
        tipo: "info",
        icone: "⭐",
        texto: produtoTop
          ? `<strong>${escapeHTML(produtoTop.nome)}</strong> foi o produto mais vendido.`
          : "Nenhum produto no ranking."
      }
    ];

    dom.insights.innerHTML = insights.map((item) => `
      <li class="insight-item ${item.tipo}">
        <span class="insight-icone">${item.icone}</span>
        <span class="insight-texto">${item.texto}</span>
      </li>
    `).join("");
  }

  function ativarBotaoPeriodo() {
    dom.periodFilter.querySelectorAll("[data-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.period === state.periodo);
    });
  }

  function setLoading() {
    [
      dom.vendas,
      dom.ticket,
      dom.conversao,
      dom.clientes,
      dom.pedidos,
      dom.metaRealizado,
      dom.metaAlvo,
      dom.metaPct
    ].forEach((element) => {
      if (element) element.textContent = "—";
    });

    dom.scoreValue.textContent = "—";
    dom.scoreDesc.textContent = "carregando";
  }

  function limparTela() {
    dom.scoreValue.textContent = "—";
    dom.scoreDesc.textContent = "sem dados";

    dom.destaques.innerHTML = "";
    dom.canais.innerHTML = "";
    dom.heatmap.innerHTML = "";
    dom.ranking.innerHTML = "";
    dom.insights.innerHTML = "";
    dom.subMetas.innerHTML = "";
  }

  function calcularScore({ vendasDelta, ticketDelta, conversao, metaPct }) {
    const pontos =
      clamp(vendasDelta, -20, 30) +
      clamp(ticketDelta, -15, 20) +
      clamp(conversao - 15, -15, 20) +
      clamp(metaPct - 70, -30, 30);

    if (pontos >= 55) return "S";
    if (pontos >= 35) return "A";
    if (pontos >= 15) return "B";
    if (pontos >= 0) return "C";

    return "D";
  }

  function textoScore(score) {
    return {
      S: "período excelente",
      A: "acima do esperado",
      B: "dentro do esperado",
      C: "atenção recomendada",
      D: "ação necessária"
    }[score];
  }

  function statusMeta(pct) {
    if (pct >= 100) {
      return { texto: "Batida", classe: "badge-ok" };
    }

    if (pct >= 75) {
      return { texto: "No caminho", classe: "badge-atencao" };
    }

    return { texto: "Abaixo", classe: "badge-critico" };
  }

  function maiorPorValor(lista) {
    return [...lista].sort((a, b) => num(b.valor) - num(a.valor))[0];
  }

  function percentual(valor, total) {
    return total > 0 ? (valor / total) * 100 : 0;
  }

  function clamp(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
  }

  function num(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  function array(valor) {
    return Array.isArray(valor) ? valor : [];
  }

  function dinheiro(valor) {
    return num(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function delta(valor) {
    const sinal = valor >= 0 ? "+" : "-";
    return `${sinal}${Math.abs(valor).toFixed(1)}% vs. anterior`;
  }

  function classeDelta(valor) {
    return valor >= 0 ? "pos" : "neg";
  }

  function formatarDataCurta(valor) {
    if (!valor) return "Sem data";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return String(valor);
    }

    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  }

  function escapeHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function escapeAttr(valor) {
    return escapeHTML(valor).replace(/`/g, "&#096;");
  }

  function escapeStyleColor(valor) {
    const texto = String(valor).trim();

    if (/^#[0-9a-fA-F]{3,8}$/.test(texto)) return texto;
    if (/^rgba?\([\d\s.,%]+\)$/.test(texto)) return texto;
    if (/^var\(--[a-zA-Z0-9-_]+\)$/.test(texto)) return texto;

    return "#a855f7";
  }
})();