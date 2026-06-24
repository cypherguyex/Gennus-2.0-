/* =========================================================
   Gennus ERP — Renda Bruta / Líquida

   Sem localStorage.
   Sem alert de erro de backend.
   Pronto para API real.

   Rota esperada:
   GET /api/renda?periodo=7d
========================================================= */

(() => {
  "use strict";

  const API = "/api/renda";

  const $ = (id) => document.getElementById(id);

  const dom = {
    periodFilter: $("period-filter"),
    badgePeriodo: $("badge-periodo"),

    bruta: $("kpi-bruta"),
    brutaDelta: $("kpi-bruta-delta"),
    liquida: $("kpi-liquida"),
    liquidaDelta: $("kpi-liquida-delta"),
    deducoes: $("kpi-deducoes"),
    margem: $("kpi-margem"),

    wfBrutaVal: $("wf-bruta-val"),
    wfImpostosVal: $("wf-impostos-val"),
    wfCustosVal: $("wf-custos-val"),
    wfOutrasVal: $("wf-outras-val"),
    wfLiquidaVal: $("wf-liquida-val"),

    wfBarBruta: $("wf-bar-bruta"),
    wfBarImpostos: $("wf-bar-impostos"),
    wfBarCustos: $("wf-bar-custos"),
    wfBarOutras: $("wf-bar-outras"),
    wfBarLiquida: $("wf-bar-liquida"),

    wfImpostosPct: $("wf-impostos-pct"),
    wfCustosPct: $("wf-custos-pct"),
    wfOutrasPct: $("wf-outras-pct"),
    wfLiquidaPct: $("wf-liquida-pct"),

    detalheList: $("detalhe-list"),
    dfDeducoes: $("df-deducoes"),
    dfLiquida: $("df-liquida"),

    historico: $("historico-tbody"),

    saudeMargemVal: $("saude-margem-val"),
    saudeBarMargem: $("saude-bar-margem"),
    saudeEficienciaVal: $("saude-eficiencia-val"),
    saudeBarEficiencia: $("saude-bar-eficiencia"),
    saudeTributosVal: $("saude-tributos-val"),
    saudeBarTributos: $("saude-bar-tributos"),
    saudeCrescimentoVal: $("saude-crescimento-val"),
    saudeCrescimentoDesc: $("saude-crescimento-desc")
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

  const deducaoConfig = [
    { key: "impostos", nome: "Impostos", cor: "#f87171" },
    { key: "custos", nome: "Custos Operacionais", cor: "#fb923c" },
    { key: "outras", nome: "Outras Deduções", cor: "#fbbf24" }
  ];

  init();

  function init() {
    registrarEventos();
    carregarRenda();
  }

  function registrarEventos() {
    dom.periodFilter.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-period]");
      if (!btn) return;

      state.periodo = btn.dataset.period;
      ativarPeriodo();
      carregarRenda();
    });
  }

  async function carregarRenda() {
    setLoading();

    try {
      const dados = await request(`${API}?periodo=${encodeURIComponent(state.periodo)}`);
      state.dados = normalizarDados(dados);
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

  function normalizarDados(dados) {
    const deducoes = {
      impostos: num(dados.deducoes?.impostos),
      custos: num(dados.deducoes?.custos),
      outras: num(dados.deducoes?.outras)
    };

    const bruta = num(dados.bruta);
    const totalDeducoes = deducoes.impostos + deducoes.custos + deducoes.outras;
    const liquida = dados.liquida === undefined ? bruta - totalDeducoes : num(dados.liquida);

    return {
      bruta,
      liquida,
      brutaDelta: num(dados.brutaDelta),
      liquidaDelta: num(dados.liquidaDelta),
      deducoes,
      totalDeducoes,
      historico: Array.isArray(dados.historico) ? dados.historico : []
    };
  }

  function render() {
    const d = state.dados;

    renderKPIs(d);
    renderWaterfall(d);
    renderDetalhamento(d);
    renderHistorico(d.historico);
    renderSaude(d);
  }

  function renderKPIs(d) {
    const margem = pct(d.liquida, d.bruta);

    dom.bruta.textContent = money(d.bruta);
    dom.brutaDelta.textContent = delta(d.brutaDelta);
    dom.brutaDelta.className = `kpi-delta ${classeDelta(d.brutaDelta)}`;

    dom.liquida.textContent = money(d.liquida);
    dom.liquidaDelta.textContent = delta(d.liquidaDelta);
    dom.liquidaDelta.className = `kpi-delta ${classeDelta(d.liquidaDelta)}`;

    dom.deducoes.textContent = money(d.totalDeducoes);
    dom.margem.textContent = `${margem.toFixed(1)}%`;
    dom.badgePeriodo.textContent = periodoTexto[state.periodo];
  }

  function renderWaterfall(d) {
    const impostosPct = pct(d.deducoes.impostos, d.bruta);
    const custosPct = pct(d.deducoes.custos, d.bruta);
    const outrasPct = pct(d.deducoes.outras, d.bruta);
    const liquidaPct = pct(d.liquida, d.bruta);

    dom.wfBrutaVal.textContent = money(d.bruta);
    dom.wfImpostosVal.textContent = `− ${money(d.deducoes.impostos)}`;
    dom.wfCustosVal.textContent = `− ${money(d.deducoes.custos)}`;
    dom.wfOutrasVal.textContent = `− ${money(d.deducoes.outras)}`;
    dom.wfLiquidaVal.textContent = money(d.liquida);

    dom.wfBarBruta.style.width = "100%";
    dom.wfBarImpostos.style.width = `${clamp(impostosPct, 0, 100)}%`;
    dom.wfBarCustos.style.width = `${clamp(custosPct, 0, 100)}%`;
    dom.wfBarOutras.style.width = `${clamp(outrasPct, 0, 100)}%`;
    dom.wfBarLiquida.style.width = `${clamp(liquidaPct, 0, 100)}%`;

    dom.wfImpostosPct.textContent = `${impostosPct.toFixed(1)}%`;
    dom.wfCustosPct.textContent = `${custosPct.toFixed(1)}%`;
    dom.wfOutrasPct.textContent = `${outrasPct.toFixed(1)}%`;
    dom.wfLiquidaPct.textContent = `${liquidaPct.toFixed(1)}%`;
  }

  function renderDetalhamento(d) {
    dom.detalheList.innerHTML = deducaoConfig.map((item) => {
      const valor = d.deducoes[item.key];
      const percentual = pct(valor, d.bruta);

      return `
        <li class="detalhe-item">
          <span class="detalhe-dot" style="background:${item.cor}"></span>
          <span class="detalhe-nome">${escapeHTML(item.nome)}</span>
          <strong class="detalhe-valor">− ${money(valor)}</strong>
          <span class="detalhe-pct-tag">${percentual.toFixed(1)}%</span>
        </li>
      `;
    }).join("");

    dom.dfDeducoes.textContent = `− ${money(d.totalDeducoes)}`;
    dom.dfLiquida.textContent = money(d.liquida);
  }

  function renderHistorico(lista) {
    dom.historico.innerHTML = lista.map((item) => {
      const bruto = num(item.bruto);
      const deducoes = num(item.deducoes);
      const liquido = item.liquido === undefined ? bruto - deducoes : num(item.liquido);
      const margem = pct(liquido, bruto);
      const variacao = item.variacao;

      return `
        <tr>
          <td>${escapeHTML(item.periodo)}</td>
          <td class="td-bruto">${money(bruto)}</td>
          <td class="wf-neg">${money(deducoes)}</td>
          <td class="td-liquido">${money(liquido)}</td>
          <td>
            <span class="margem-tag ${classeMargem(margem)}">${margem.toFixed(1)}%</span>
          </td>
          <td class="${classeVariacao(variacao)}">${textoVariacao(variacao)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderSaude(d) {
    const margem = pct(d.liquida, d.bruta);
    const eficiencia = 100 - pct(d.deducoes.custos, d.bruta);
    const cargaTributaria = pct(d.deducoes.impostos, d.bruta);

    dom.saudeMargemVal.textContent = `${margem.toFixed(1)}%`;
    dom.saudeBarMargem.style.width = `${clamp(margem, 0, 100)}%`;

    dom.saudeEficienciaVal.textContent = `${eficiencia.toFixed(1)}%`;
    dom.saudeBarEficiencia.style.width = `${clamp(eficiencia, 0, 100)}%`;

    dom.saudeTributosVal.textContent = `${cargaTributaria.toFixed(1)}%`;
    dom.saudeBarTributos.style.width = `${clamp(cargaTributaria, 0, 100)}%`;

    dom.saudeCrescimentoVal.textContent = deltaCurto(d.liquidaDelta);
    dom.saudeCrescimentoVal.className = `saude-valor saude-valor-crescimento ${classeDelta(d.liquidaDelta)}`;
    dom.saudeCrescimentoDesc.textContent =
      d.liquidaDelta >= 0
        ? "↑ Crescimento vs. período anterior"
        : "↓ Queda vs. período anterior";
  }

  function ativarPeriodo() {
    dom.periodFilter.querySelectorAll("[data-period]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.period === state.periodo);
    });
  }

  function setLoading() {
    [
      dom.bruta,
      dom.liquida,
      dom.deducoes,
      dom.margem,
      dom.wfBrutaVal,
      dom.wfImpostosVal,
      dom.wfCustosVal,
      dom.wfOutrasVal,
      dom.wfLiquidaVal,
      dom.dfDeducoes,
      dom.dfLiquida,
      dom.saudeMargemVal,
      dom.saudeEficienciaVal,
      dom.saudeTributosVal,
      dom.saudeCrescimentoVal
    ].forEach((el) => {
      if (el) el.textContent = "—";
    });
  }

  function limparTela() {
    dom.detalheList.innerHTML = "";
    dom.historico.innerHTML = "";

    [
      dom.wfBarImpostos,
      dom.wfBarCustos,
      dom.wfBarOutras,
      dom.wfBarLiquida,
      dom.saudeBarMargem,
      dom.saudeBarEficiencia,
      dom.saudeBarTributos
    ].forEach((bar) => {
      if (bar) bar.style.width = "0%";
    });
  }

  function pct(valor, total) {
    return total > 0 ? (valor / total) * 100 : 0;
  }

  function clamp(valor, min, max) {
    return Math.min(Math.max(valor, min), max);
  }

  function num(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function money(valor) {
    return num(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function delta(valor) {
    const sinal = valor >= 0 ? "+" : "−";
    return `${sinal}${Math.abs(valor).toFixed(1)}% vs. anterior`;
  }

  function deltaCurto(valor) {
    const sinal = valor >= 0 ? "+" : "−";
    return `${sinal}${Math.abs(valor).toFixed(1)}%`;
  }

  function classeDelta(valor) {
    return valor >= 0 ? "pos" : "neg";
  }

  function classeMargem(margem) {
    if (margem >= 40) return "alta";
    if (margem >= 20) return "media";
    return "baixa";
  }

  function classeVariacao(valor) {
    if (valor === null || valor === undefined) return "";
    return num(valor) >= 0 ? "td-var-pos" : "td-var-neg";
  }

  function textoVariacao(valor) {
    if (valor === null || valor === undefined) return "—";

    const sinal = num(valor) >= 0 ? "+" : "";
    return `${sinal}${num(valor).toFixed(1)}%`;
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
})();