import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut as sairDoFirebase
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
  collection as colecaoFirestore,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  doc as documentoFirestore,
  setDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

/* =========================================================
   DADOS DA SESSÃO
========================================================= */

const nomeUsuario = sessionStorage.getItem("nomeUsuario");
const estabelecimentoId = sessionStorage.getItem("estabelecimentoId");

function collection(referencia, ...caminho) {
  if (referencia === db) {
    return colecaoFirestore(
      db,
      "estabelecimentos",
      estabelecimentoId,
      ...caminho
    );
  }

  return colecaoFirestore(referencia, ...caminho);
}

function doc(referencia, ...caminho) {
  if (referencia === db) {
    return documentoFirestore(
      db,
      "estabelecimentos",
      estabelecimentoId,
      ...caminho
    );
  }

  return documentoFirestore(referencia, ...caminho);
}

function normalizarTipoUsuario(tipo) {
  const tipoNormalizado = String(tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    tipoNormalizado === "admin" ||
    tipoNormalizado === "administrador"
  ) {
    return "administrador";
  }

  if (
    tipoNormalizado === "recepcao" ||
    tipoNormalizado === "presenca" ||
    tipoNormalizado === "recepcionista"
  ) {
    return "recepcionista";
  }

  return tipoNormalizado;
}

const tipoUsuario = normalizarTipoUsuario(
  sessionStorage.getItem("tipoUsuario")
);
const usuarioId = sessionStorage.getItem("usuarioId");

if (!nomeUsuario || !tipoUsuario || !usuarioId || !estabelecimentoId) {
  window.location.href = "index.html";
}

onAuthStateChanged(auth, (usuario) => {
  if (!usuario || usuario.uid !== usuarioId) {
    sessionStorage.clear();
    window.location.href = "index.html";
  }
});

async function encerrarSessao() {
  sessionStorage.clear();
  await sairDoFirebase(auth).catch(() => {});
  window.location.href = "index.html";
}

/* =========================================================
   TERMINOLOGIA GENÉRICA DO MEUNEGÓCIO
   Mantém os nomes internos antigos para preservar os dados,
   mas apresenta "profissional" e "estabelecimento" na tela.
========================================================= */

function adaptarTerminologia(texto) {
  return String(texto || "")
    .replace(/Barbearias/g, "Estabelecimentos")
    .replace(/barbearias/g, "estabelecimentos")
    .replace(/Barbearia/g, "Estabelecimento")
    .replace(/barbearia/g, "estabelecimento")
    .replace(/Barbeiros/g, "Profissionais")
    .replace(/barbeiros/g, "profissionais")
    .replace(/Barbeiro/g, "Profissional")
    .replace(/barbeiro/g, "profissional");
}

function atualizarTerminologiaVisivel(raiz = document.body) {
  if (!raiz) return;

  if (raiz.nodeType === Node.TEXT_NODE) {
    const novoTexto = adaptarTerminologia(raiz.nodeValue);
    if (novoTexto !== raiz.nodeValue) raiz.nodeValue = novoTexto;
    return;
  }

  if (raiz.nodeType !== Node.ELEMENT_NODE) return;

  const elemento = raiz;
  ["placeholder", "title", "aria-label"].forEach((atributo) => {
    if (!elemento.hasAttribute(atributo)) return;
    const valorAtual = elemento.getAttribute(atributo);
    const novoValor = adaptarTerminologia(valorAtual);
    if (novoValor !== valorAtual) elemento.setAttribute(atributo, novoValor);
  });

  const leitor = document.createTreeWalker(
    elemento,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(no) {
        const tag = no.parentElement?.tagName;
        return tag === "SCRIPT" || tag === "STYLE"
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textos = [];
  while (leitor.nextNode()) textos.push(leitor.currentNode);
  textos.forEach((no) => atualizarTerminologiaVisivel(no));

  elemento
    .querySelectorAll("[placeholder], [title], [aria-label]")
    .forEach((filho) => {
      ["placeholder", "title", "aria-label"].forEach((atributo) => {
        if (!filho.hasAttribute(atributo)) return;
        const valorAtual = filho.getAttribute(atributo);
        const novoValor = adaptarTerminologia(valorAtual);
        if (novoValor !== valorAtual) filho.setAttribute(atributo, novoValor);
      });
    });
}

atualizarTerminologiaVisivel();

const observadorTerminologia = new MutationObserver((alteracoes) => {
  alteracoes.forEach((alteracao) => {
    if (alteracao.type === "characterData") {
      atualizarTerminologiaVisivel(alteracao.target);
      return;
    }

    alteracao.addedNodes.forEach((no) => atualizarTerminologiaVisivel(no));
  });
});

observadorTerminologia.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

/* =========================================================
   FUNÇÃO AUXILIAR PARA ELEMENTOS
========================================================= */

function selecionarPrimeiro(...seletores) {
  for (const seletor of seletores) {
    const elemento = document.querySelector(seletor);

    if (elemento) {
      return elemento;
    }
  }

  return null;
}

/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const menu = document.querySelector("#menu");
const boasVindas = document.querySelector("#boas-vindas");

const escolherBarbeiro = document.querySelector(
  "#escolher-barbeiro"
);

const selectBarbeiro = document.querySelector(
  "#select-barbeiro"
);

const telaDashboard = document.querySelector(
  "#tela-dashboard"
);

const telaBarbeiros = document.querySelector(
  "#tela-barbeiros"
);

const telaClientes = document.querySelector(
  "#tela-clientes"
);

const telaWhatsApp = document.querySelector("#tela-whatsapp");

const telaProdutosServicos = document.querySelector(
  "#tela-produtos-servicos"
);

const telaConfiguracoes = document.querySelector(
  "#tela-configuracoes"
);

const telaRelatorio = document.querySelector(
  "#tela-relatorio"
);

const telaPlanos = document.querySelector(
  "#tela-planos"
);

/* =========================================================
   AGENDA
========================================================= */

const textoAgenda = document.querySelector(
  "#texto-agenda"
);

const agenda = document.querySelector(
  "#agenda"
);

const agendaScroll = document.querySelector(
  "#agenda-scroll"
);

const listaProximosAgendamentos =
  document.querySelector(
    "#lista-proximos-agendamentos"
  );

const quantidadeProximosAgendamentos =
  document.querySelector(
    "#quantidade-proximos-agendamentos"
  );

const botaoDiminuirZoom = document.querySelector(
  "#diminuir-zoom"
);

const botaoAumentarZoom = document.querySelector(
  "#aumentar-zoom"
);

/* =========================================================
   NOVO AGENDAMENTO
========================================================= */

const modalNovo = document.querySelector(
  "#modal-novo"
);

const formAgendamento = document.querySelector(
  "#form-agendamento"
);

const dataAgendamento = document.querySelector(
  "#data-agendamento"
);

const horaAgendamento = document.querySelector(
  "#hora-agendamento"
);

const horaFimAgendamento = document.querySelector(
  "#hora-fim-agendamento"
);

const pesquisaClienteAgendamento =
  document.querySelector(
    "#pesquisa-cliente-agendamento"
  );

const listaClientesAgendamento =
  document.querySelector(
    "#lista-clientes-agendamento"
  );

const informacaoHorario = document.querySelector(
  "#informacao-horario"
);

/* =========================================================
   DETALHES DO AGENDAMENTO
========================================================= */

const modalDetalhes = document.querySelector(
  "#modal-detalhes"
);

const detalheCliente = document.querySelector(
  "#detalhe-cliente"
);

const detalheData = document.querySelector(
  "#detalhe-data"
);

const detalheHora = document.querySelector(
  "#detalhe-hora"
);

const detalheServicosRegistrados = document.querySelector(
  "#detalhe-servicos-registrados"
);

const botaoRegistrarServicosBarbeiro = document.querySelector(
  "#registrar-servicos-barbeiro"
);

const modalRegistrarServicos = document.querySelector(
  "#modal-registrar-servicos"
);

const formRegistrarServicos = document.querySelector(
  "#form-registrar-servicos"
);

const containerServicosProduzidos = document.querySelector(
  "#container-servicos-produzidos"
);

const botaoAdicionarServicoProduzido = document.querySelector(
  "#adicionar-servico-produzido"
);

const mensagemServicosProduzidos = document.querySelector(
  "#mensagem-servicos-produzidos"
);

const subtotalServicosProduzidos = document.querySelector(
  "#subtotal-servicos-produzidos"
);

const valorTotalRegistroBarbeiro = document.querySelector(
  "#valor-total-registro-barbeiro"
);

const containerProdutosVendidosBarbeiro = document.querySelector(
  "#container-produtos-vendidos-barbeiro"
);

const botaoAdicionarProdutoVendidoBarbeiro = document.querySelector(
  "#adicionar-produto-vendido-barbeiro"
);

const valorProdutosVendidosBarbeiro = document.querySelector(
  "#valor-produtos-vendidos-barbeiro"
);

const botaoConcluirAgendamento =
  document.querySelector(
    "#concluir-agendamento"
  );

const botaoNaoRealizadoAgendamento =
  document.querySelector(
    "#nao-realizado-agendamento"
  );

const botaoCancelarAgendamento =
  document.querySelector(
    "#cancelar-agendamento"
  );

/* =========================================================
   CONCLUSÃO DO ATENDIMENTO
========================================================= */

const modalConcluirAtendimento =
  document.querySelector(
    "#modal-concluir-atendimento"
  );

const formConcluirAtendimento =
  document.querySelector(
    "#form-concluir-atendimento"
  );

const conclusaoCliente = document.querySelector(
  "#conclusao-cliente"
);

const conclusaoBarbeiro = document.querySelector(
  "#conclusao-barbeiro"
);

const conclusaoDataHora = document.querySelector(
  "#conclusao-data-hora"
);

const servicoAtendimento = document.querySelector(
  "#servico-atendimento"
);

const produtoAtendimento = document.querySelector(
  "#produto-atendimento"
);

const valorServicoAtendimento =
  document.querySelector(
    "#valor-servico-atendimento"
  );

const valorProdutoAtendimento =
  document.querySelector(
    "#valor-produto-atendimento"
  );

const valorTotalAtendimento =
  document.querySelector(
    "#valor-total-atendimento"
  );

const formaPagamentoAtendimento =
  document.querySelector(
    "#forma-pagamento-atendimento"
  );

const tipoPagamentoAtendimento = document.querySelector("#tipo-pagamento-atendimento");
const pagamentoUnicoAtendimento = document.querySelector("#pagamento-unico-atendimento");
const pagamentoDivididoAtendimento = document.querySelector("#pagamento-dividido-atendimento");
const valorPixAtendimento = document.querySelector("#valor-pix-atendimento");
const valorDinheiroAtendimento = document.querySelector("#valor-dinheiro-atendimento");
const valorCartaoAtendimento = document.querySelector("#valor-cartao-atendimento");
const resumoPagamentoDividido = document.querySelector("#resumo-pagamento-dividido");

const resumoAgendadosHoje = document.querySelector("#resumo-agendados-hoje");
const resumoProximoHorario = document.querySelector("#resumo-proximo-horario");
const resumoProximoCliente = document.querySelector("#resumo-proximo-cliente");
const resumoConcluidosHoje = document.querySelector("#resumo-concluidos-hoje");
const resumoPendentesHoje = document.querySelector("#resumo-pendentes-hoje");

const mensagemConclusaoAtendimento =
  document.querySelector(
    "#mensagem-conclusao-atendimento"
  );

/* =========================================================
   DESCONTO DO ATENDIMENTO
========================================================= */

function garantirCamposDesconto() {
  let teveDesconto = document.querySelector(
    "#teve-desconto-atendimento"
  );

  let areaDesconto = document.querySelector(
    "#area-desconto-atendimento"
  );

  let valorDesconto = document.querySelector(
    "#valor-desconto-atendimento"
  );

  let descricaoDesconto = document.querySelector(
    "#descricao-desconto-atendimento"
  );

  let valorFinal = document.querySelector(
    "#valor-final-atendimento"
  );

  /*
    Caso os campos ainda não existam no HTML,
    o próprio JavaScript cria.
  */
  if (!teveDesconto && formaPagamentoAtendimento) {
    const bloco = document.createElement("div");

    bloco.className = "bloco-desconto-atendimento";

    bloco.innerHTML = `
      <label for="teve-desconto-atendimento">
        Houve desconto?
      </label>

      <select id="teve-desconto-atendimento">
        <option value="nao" selected>
          Não
        </option>

        <option value="sim">
          Sim
        </option>
      </select>

      <div
        id="area-desconto-atendimento"
        class="escondida"
      >
        <label for="valor-desconto-atendimento">
          Valor do desconto
        </label>

        <input
          id="valor-desconto-atendimento"
          type="text"
          inputmode="decimal"
          placeholder="R$ 0,00"
          autocomplete="off"
        />

        <label for="descricao-desconto-atendimento">
          Descrição do desconto
        </label>

        <textarea
          id="descricao-desconto-atendimento"
          rows="3"
          maxlength="200"
          placeholder="Ex.: desconto para policial ou aniversariante"
        ></textarea>
      </div>

      <div class="total-final-atendimento">
        <span>
          Valor final a receber
        </span>

        <strong id="valor-final-atendimento">
          R$ 0,00
        </strong>
      </div>
    `;

    const totalAtendimento =
      document.querySelector(
        ".total-atendimento"
      );

    if (totalAtendimento) {
      totalAtendimento.insertAdjacentElement(
        "afterend",
        bloco
      );
    }

    teveDesconto = document.querySelector(
      "#teve-desconto-atendimento"
    );

    areaDesconto = document.querySelector(
      "#area-desconto-atendimento"
    );

    valorDesconto = document.querySelector(
      "#valor-desconto-atendimento"
    );

    descricaoDesconto = document.querySelector(
      "#descricao-desconto-atendimento"
    );

    valorFinal = document.querySelector(
      "#valor-final-atendimento"
    );
  }

  return {
    teveDesconto,
    areaDesconto,
    valorDesconto,
    descricaoDesconto,
    valorFinal
  };
}

const camposDesconto =
  garantirCamposDesconto();

const teveDescontoAtendimento =
  camposDesconto.teveDesconto;

const areaDescontoAtendimento =
  camposDesconto.areaDesconto;

const valorDescontoAtendimento =
  camposDesconto.valorDesconto;

const descricaoDescontoAtendimento =
  camposDesconto.descricaoDesconto;

const valorFinalAtendimento =
  camposDesconto.valorFinal;

/* =========================================================
   BARBEIROS
========================================================= */

const botaoMostrarCadastroBarbeiro =
  document.querySelector(
    "#botao-mostrar-cadastro-barbeiro"
  );

const formCadastroBarbeiro =
  document.querySelector(
    "#form-cadastro-barbeiro"
  );

const nomeNovoBarbeiro =
  document.querySelector(
    "#nome-novo-barbeiro"
  );

const senhaNovoBarbeiro =
  document.querySelector(
    "#senha-novo-barbeiro"
  );

const confirmarSenhaNovoBarbeiro =
  document.querySelector(
    "#confirmar-senha-novo-barbeiro"
  );

const pesquisaBarbeiro =
  document.querySelector(
    "#pesquisa-barbeiro"
  );

const mensagemBarbeiro =
  document.querySelector(
    "#mensagem-barbeiro"
  );

const listaGerenciarBarbeiros =
  document.querySelector(
    "#lista-gerenciar-barbeiros"
  );

/* =========================================================
   CLIENTES
========================================================= */

const botaoMostrarCadastroCliente =
  document.querySelector(
    "#botao-mostrar-cadastro-cliente"
  );

const formCadastroCliente =
  document.querySelector(
    "#form-cadastro-cliente"
  );

const nomeNovoCliente =
  document.querySelector(
    "#nome-novo-cliente"
  );

const celularNovoCliente =
  document.querySelector(
    "#celular-novo-cliente"
  );

const clienteIdEdicao = document.querySelector("#cliente-id-edicao");
const salvarCliente = document.querySelector("#salvar-cliente");
const cancelarEdicaoCliente = document.querySelector("#cancelar-edicao-cliente");

const pesquisaCliente =
  document.querySelector(
    "#pesquisa-cliente"
  );

const mensagemCliente =
  document.querySelector(
    "#mensagem-cliente"
  );

const listaGerenciarClientes =
  document.querySelector(
    "#lista-gerenciar-clientes"
  );

/* =========================================================
   PRODUTOS
========================================================= */

const botaoMostrarCadastroProduto =
  document.querySelector(
    "#botao-mostrar-cadastro-produto"
  );

const formCadastroProduto =
  document.querySelector(
    "#form-cadastro-produto"
  );

const nomeNovoProduto =
  document.querySelector(
    "#nome-novo-produto"
  );

const valorNovoProduto =
  document.querySelector(
    "#valor-novo-produto"
  );

const pesquisaProduto =
  document.querySelector(
    "#pesquisa-produto"
  );

const mensagemProduto =
  document.querySelector(
    "#mensagem-produto"
  );

const listaProdutos =
  document.querySelector(
    "#lista-produtos"
  );

/* =========================================================
   SERVIÇOS
========================================================= */

const botaoMostrarCadastroServico =
  document.querySelector(
    "#botao-mostrar-cadastro-servico"
  );

const formCadastroServico =
  document.querySelector(
    "#form-cadastro-servico"
  );

const nomeNovoServico =
  document.querySelector(
    "#nome-novo-servico"
  );

const valorNovoServico =
  document.querySelector(
    "#valor-novo-servico"
  );

const pesquisaServico =
  document.querySelector(
    "#pesquisa-servico"
  );

const mensagemServico =
  document.querySelector(
    "#mensagem-servico"
  );

const listaServicos =
  document.querySelector(
    "#lista-servicos"
  );

/* =========================================================
   EDITAR CATÁLOGO
========================================================= */

const modalEditarCatalogo =
  document.querySelector(
    "#modal-editar-catalogo"
  );

const tituloEditarCatalogo =
  document.querySelector(
    "#titulo-editar-catalogo"
  );

const formEditarCatalogo =
  document.querySelector(
    "#form-editar-catalogo"
  );

const idEditarCatalogo =
  document.querySelector(
    "#id-editar-catalogo"
  );

const tipoEditarCatalogo =
  document.querySelector(
    "#tipo-editar-catalogo"
  );

const nomeEditarCatalogo =
  document.querySelector(
    "#nome-editar-catalogo"
  );

const valorEditarCatalogo =
  document.querySelector(
    "#valor-editar-catalogo"
  );

const mensagemEditarCatalogo =
  document.querySelector(
    "#mensagem-editar-catalogo"
  );

/* =========================================================
   RELATÓRIO DE DESEMPENHO
========================================================= */

const filtroRelatorioBarbeiro =
  document.querySelector(
    "#filtro-relatorio-barbeiro"
  );

const botaoMesAnterior =
  document.querySelector(
    "#mes-anterior"
  );

const botaoProximoMes =
  document.querySelector(
    "#proximo-mes"
  );

const tituloCalendario =
  document.querySelector(
    "#titulo-calendario"
  );

const calendarioRelatorio =
  document.querySelector(
    "#calendario-relatorio"
  );

const filtroSegundoGrafico =
  document.querySelector(
    "#filtro-segundo-grafico"
  );

const tituloSegundoGrafico =
  document.querySelector(
    "#titulo-segundo-grafico"
  );

/* =========================================================
   ABAS DOS RELATÓRIOS
========================================================= */

const abaRelatorioDesempenho =
  document.querySelector(
    "#aba-relatorio-desempenho"
  );

const abaRelatorioFinanceiro =
  document.querySelector(
    "#aba-relatorio-financeiro"
  );

const abaRelatorioHistorico =
  selecionarPrimeiro(
    "#aba-relatorio-historico",
    "#aba-historico"
  );

const conteudoRelatorioDesempenho =
  document.querySelector(
    "#conteudo-relatorio-desempenho"
  );

const abaRelatorioProdutosDiarios = document.querySelector("#aba-relatorio-produtos-diarios");
const conteudoRelatorioProdutosDiarios = document.querySelector("#conteudo-relatorio-produtos-diarios");
const filtroProdutosDiariosBarbeiro = document.querySelector("#filtro-produtos-diarios-barbeiro");
const periodoRelatorioProdutos = document.querySelector("#periodo-relatorio-produtos");
const tituloPeriodoProdutos = document.querySelector("#titulo-periodo-produtos");
const periodoProdutosAnterior = document.querySelector("#periodo-produtos-anterior");
const periodoProdutosProximo = document.querySelector("#periodo-produtos-proximo");
const resumoProdutosDiarios = document.querySelector("#resumo-produtos-diarios");
const listaProdutosDiarios = document.querySelector("#lista-produtos-diarios");
const quantidadeVendasProdutos = document.querySelector("#quantidade-vendas-produtos");

/* Remove também o campo legado caso um HTML antigo esteja em cache. */
document.querySelector("#data-produtos-diarios")?.remove();

const conteudoRelatorioFinanceiro =
  document.querySelector(
    "#conteudo-relatorio-financeiro"
  );

const conteudoRelatorioHistorico =
  selecionarPrimeiro(
    "#conteudo-relatorio-historico",
    "#conteudo-historico"
  );

/* =========================================================
   FINANCEIRO
========================================================= */

const periodoRelatorioFinanceiro =
  document.querySelector(
    "#periodo-relatorio-financeiro"
  );

const filtroFinanceiroBarbeiro =
  document.querySelector(
    "#filtro-financeiro-barbeiro"
  );

const tituloPeriodoFinanceiro =
  document.querySelector(
    "#titulo-periodo-financeiro"
  );

const botaoPeriodoFinanceiroAnterior =
  document.querySelector(
    "#periodo-financeiro-anterior"
  );

const botaoPeriodoFinanceiroProximo =
  document.querySelector(
    "#periodo-financeiro-proximo"
  );

const tituloGraficoFinanceiro =
  document.querySelector(
    "#titulo-grafico-financeiro"
  );

const totalGraficoFinanceiro =
  document.querySelector(
    "#total-grafico-financeiro"
  );

const rankingFinanceiroBarbeiros =
  document.querySelector(
    "#ranking-financeiro-barbeiros"
  );

const rankingFinanceiroServicos =
  document.querySelector(
    "#ranking-financeiro-servicos"
  );

const rankingFinanceiroProdutos =
  document.querySelector(
    "#ranking-financeiro-produtos"
  );

/* =========================================================
   GERAR PDF DO HISTÓRICO FINANCEIRO
========================================================= */

const botaoGerarPdfHistorico =
  document.querySelector(
    "#gerar-pdf-historico"
  );

/* =========================================================
   VENDA DE PRODUTOS
========================================================= */

const botaoVenderProdutos = document.querySelector("#botao-vender-produtos");
const modalVendaProdutos = document.querySelector("#modal-venda-produtos");
const formVendaProdutos = document.querySelector("#form-venda-produtos");
const clienteVendaProdutos = document.querySelector("#cliente-venda-produtos");
const itensVendaProdutos = document.querySelector("#itens-venda-produtos");
const botaoAdicionarItemVenda = document.querySelector("#adicionar-item-venda-produtos");
const subtotalVendaProdutos = document.querySelector("#subtotal-venda-produtos");
const temDescontoVendaProdutos = document.querySelector("#tem-desconto-venda-produtos");
const camposDescontoVendaProdutos = document.querySelector("#campos-desconto-venda-produtos");
const descontoVendaProdutos = document.querySelector("#desconto-venda-produtos");
const pagamentoVendaProdutos = document.querySelector("#pagamento-venda-produtos");
const dataVendaProdutos = document.querySelector("#data-venda-produtos");
const horaVendaProdutos = document.querySelector("#hora-venda-produtos");
const totalVendaProdutos = document.querySelector("#total-venda-produtos");
const mensagemVendaProdutos = document.querySelector("#mensagem-venda-produtos");

const modalTipoPdfHistorico = document.querySelector(
  "#modal-tipo-pdf-historico"
);

const etapaFiltrosPdfHistorico = document.querySelector("#etapa-filtros-pdf-historico");
const periodoPdfHistorico = document.querySelector("#periodo-pdf-historico");
const barbeiroPdfHistorico = document.querySelector("#barbeiro-pdf-historico");
const botaoConfirmarGeracaoPdf = document.querySelector("#confirmar-geracao-pdf-historico");

async function gerarPdfHistorico(tipoPdf = "simples", filtrosPdf = {}) {
  if (!usuarioPodeVisualizarFinanceiro()) {
    return;
  }

  if (
    !window.jspdf ||
    !window.jspdf.jsPDF
  ) {
    alert(
      "Não foi possível carregar o gerador de PDF."
    );

    return;
  }

  const botao = botaoGerarPdfHistorico;

  if (botao) {
    botao.disabled = true;
    botao.textContent =
      "Gerando PDF...";
  }

  try {
    const periodo = obterPeriodoGenerico(
      filtrosPdf.periodo || "diario",
      new Date()
    );

    const barbeiroSelecionado =
      tipoUsuario === "barbeiro"
        ? nomeUsuario
        : (filtrosPdf.barbeiro || "todos");

    const tipoSelecionado = tipoPdf === "simples" ? "entrada" : "todos";

    const pagamentoSelecionado =
      filtrosPdf.pagamento ||
      "todos";

    /* =========================================
       BUSCAR DADOS
    ========================================= */

    const [
      respostaAgendamentos,
      respostaMovimentacoes
    ] = await Promise.all([
      getDocs(
        collection(
          db,
          "agendamentos"
        )
      ),

      getDocs(
        collection(
          db,
          "movimentacoesFinanceiras"
        )
      )
    ]);

    /* =========================================
       ENTRADAS
    ========================================= */

    const entradas =
      respostaAgendamentos.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        )
        .filter(
          (agendamento) =>
            agendamento.status ===
            "concluido" &&
            agendamento.ocultarNoHistoricoFinanceiro !== true
        )
        .map(
          transformarAtendimentoEmEntrada
        );

    const movimentacoesSalvas = respostaMovimentacoes.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    const entradasPlanos = movimentacoesSalvas
      .filter((movimentacao) =>
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "plano"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "",
        prioridadeHistorico: 1
      }));

    const entradasManuais = movimentacoesSalvas
      .filter((movimentacao) =>
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "manual"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "Barbearia",
        cliente: "",
        prioridadeHistorico: 2
      }));

    const entradasVendasProdutos = movimentacoesSalvas
      .filter((movimentacao) =>
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "venda_produtos"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "Barbearia",
        prioridadeHistorico: 2
      }));

    /* =========================================
       SAÍDAS
    ========================================= */

    const saidas =
      respostaMovimentacoes.docs
        .map(
          (documento) => ({
            id: documento.id,
            origem:
              "manual",
            ...documento.data()
          })
        )
        .filter(
          (movimentacao) =>
            movimentacao.tipo ===
              "saida" &&
            !(
              tipoUsuario === "barbeiro" &&
              movimentacao.origem === "uso_plano"
            )
        );

    const todasMovimentacoes = [
      ...entradas,
      ...entradasPlanos,
      ...entradasManuais,
      ...entradasVendasProdutos,
      ...saidas
    ];

    /* =========================================
       FILTRAR PELO PERÍODO E BARBEIRO
    ========================================= */

    const movimentacoesPeriodo =
      todasMovimentacoes.filter(
        (movimentacao) => {
          const dentroPeriodo =
            movimentacao.data >=
              periodo.inicioTexto &&
            movimentacao.data <=
              periodo.fimTexto;

          const barbeiroCorreto =
            barbeiroSelecionado ===
              "todos" ||
            movimentacao.barbeiro ===
              barbeiroSelecionado;

          return (
            dentroPeriodo &&
            barbeiroCorreto
          );
        }
      );

    /* =========================================
       FILTRO ENTRADA / SAÍDA
    ========================================= */

    const movimentacoes =
      movimentacoesPeriodo
        .filter(
          (movimentacao) => {
            const tipoCorreto = (
              tipoSelecionado ===
                "todos" ||
              tipoSelecionado ===
                "todas" ||
              movimentacao.tipo ===
                tipoSelecionado
            );

            const pagamentoCorreto =
              pagamentoSelecionado === "todos" ||
              String(movimentacao.formaPagamento || "")
                .trim()
                .toLocaleLowerCase("pt-BR") ===
                pagamentoSelecionado.toLocaleLowerCase("pt-BR");

            return tipoCorreto && pagamentoCorreto;
          }
        )
        .sort(ordenarMovimentacoesMaisRecentes);

    /* =========================================
       TOTAIS DO PERÍODO
    ========================================= */

    const totalEntradas =
      movimentacoes
        .filter(
          (movimentacao) =>
            movimentacao.tipo ===
            "entrada"
        )
        .reduce(
          (
            total,
            movimentacao
          ) =>
            total +
            (
              Number(
                movimentacao.valor
              ) || 0
            ),
          0
        );

    const totalSaidas =
      movimentacoes
        .filter(
          (movimentacao) =>
            movimentacao.tipo ===
            "saida"
        )
        .reduce(
          (
            total,
            movimentacao
          ) =>
            total +
            (
              Number(
                movimentacao.valor
              ) || 0
            ),
          0
        );

    const saldo =
      totalEntradas -
      totalSaidas;

    /* =========================================
       PDF CONSOLIDADO POR BARBEIRO
    ========================================= */

    if (tipoPdf === "simples") {
      const { jsPDF } = window.jspdf;
      const pdfResumo = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const atendimentosFiltrados = movimentacoes.filter(
        (movimentacao) => movimentacao.tipo === "entrada" && movimentacao.origem === "atendimento"
      );

      const vendasProdutosFiltradas = movimentacoes.filter(
        (movimentacao) =>
          movimentacao.tipo === "entrada" &&
          movimentacao.origem === "venda_produtos"
      );

      const nomesBarbeiros = barbeiroSelecionado === "todos"
        ? barbeiros.map((barbeiro) => barbeiro.nome)
        : [barbeiroSelecionado];

      const normalizarPagamento = (forma) =>
        String(forma || "").trim().toLocaleLowerCase("pt-BR");

      const somarPorPagamento = (itens, obterValor) => {
        const totais = { pix: 0, cartao: 0, dinheiro: 0 };
        itens.forEach((item) => {
          const pagamentos = Array.isArray(item.pagamentos) ? item.pagamentos : [];
          if (pagamentos.length > 0) {
            const valorRegistro = Math.max(
              0,
              Number(item.valorLiquido) || Number(item.valorTotal) || Number(item.valor) || 0
            );
            const valorDesejado = Math.max(0, Number(obterValor(item)) || 0);
            const proporcao = valorRegistro > 0 ? valorDesejado / valorRegistro : 0;
            pagamentos.forEach((pagamento) => {
              const forma = normalizarPagamento(pagamento.forma);
              const valor = Math.max(0, Number(pagamento.valor) || 0) * proporcao;
              if (forma === "pix") totais.pix += valor;
              if (forma === "cartão" || forma === "cartao") totais.cartao += valor;
              if (forma === "dinheiro") totais.dinheiro += valor;
            });
            return;
          }
          const forma = normalizarPagamento(item.formaPagamento);
          const valor = Math.max(0, Number(obterValor(item)) || 0);
          if (forma === "pix") totais.pix += valor;
          if (forma === "cartão" || forma === "cartao") totais.cartao += valor;
          if (forma === "dinheiro") totais.dinheiro += valor;
        });
        return totais;
      };

      const criarLinhaResumo = (nome, atendimentos, valores) => ({
        nome,
        atendimentos,
        ...valores,
        total: valores.pix + valores.cartao + valores.dinheiro
      });

      const criarLinhasProdutos = (
        nomeResponsavel,
        atendimentosResponsavel,
        vendasAvulsasResponsavel,
        propriedadeProdutos
      ) => {
        const produtosAgrupados = new Map();

        const registrarProduto = (produto, formaPagamento) => {
          const nomeProduto = produto.nome || produto.produto || "Produto";
          const quantidade = Math.max(1, Number(produto.quantidade) || 1);
          const valor =
            Number(produto.subtotal) ||
            (Number(produto.valorUnitario) || Number(produto.valor) || 0) * quantidade;
          const chave = nomeProduto.trim().toLocaleLowerCase("pt-BR");

          if (!produtosAgrupados.has(chave)) {
            produtosAgrupados.set(chave, {
              nome: nomeProduto,
              quantidade: 0,
              pix: 0,
              cartao: 0,
              dinheiro: 0
            });
          }

          const resumo = produtosAgrupados.get(chave);
          const forma = normalizarPagamento(formaPagamento);
          resumo.quantidade += quantidade;
          if (forma === "pix") resumo.pix += valor;
          if (forma === "cartão" || forma === "cartao") resumo.cartao += valor;
          if (forma === "dinheiro") resumo.dinheiro += valor;
        };

        atendimentosResponsavel.forEach((movimentacao) => {
          const itens = Array.isArray(movimentacao[propriedadeProdutos])
            ? movimentacao[propriedadeProdutos]
            : [];
          itens.forEach((produto) =>
            registrarProduto(produto, movimentacao.formaPagamento)
          );
        });

        vendasAvulsasResponsavel.forEach((movimentacao) => {
          const itens = Array.isArray(movimentacao.itens)
            ? movimentacao.itens
            : (Array.isArray(movimentacao.produtos) ? movimentacao.produtos : []);
          itens.forEach((produto) =>
            registrarProduto(produto, movimentacao.formaPagamento)
          );
        });

        return Array.from(produtosAgrupados.values()).map((produto) =>
          criarLinhaResumo(
            `${nomeResponsavel} — ${produto.nome}`,
            produto.quantidade,
            {
              pix: produto.pix,
              cartao: produto.cartao,
              dinheiro: produto.dinheiro
            }
          )
        );
      };

      const linhasResumo = nomesBarbeiros.flatMap((nomeBarbeiro) => {
        const atendimentosBarbeiro = atendimentosFiltrados.filter(
          (movimentacao) => movimentacao.barbeiro === nomeBarbeiro
        );

        const valoresServicos = somarPorPagamento(
          atendimentosBarbeiro,
          (movimentacao) => Number(movimentacao.valorServico) || 0
        );

        const vendasProdutosBarbeiro = vendasProdutosFiltradas.filter(
          (movimentacao) => movimentacao.barbeiro === nomeBarbeiro
        );

        const linhasBarbeiro = [
          criarLinhaResumo(
            nomeBarbeiro,
            atendimentosBarbeiro.length,
            valoresServicos
          )
        ];

        if (barbeiroSelecionado === "todos") {
          linhasBarbeiro.push(
            ...criarLinhasProdutos(
              nomeBarbeiro,
              atendimentosBarbeiro,
              vendasProdutosBarbeiro,
              "produtosBarbeiroDetalhados"
            )
          );
        }

        return linhasBarbeiro;
      });

      if (barbeiroSelecionado === "todos") {
        const nomesBarbeirosCadastrados = new Set(nomesBarbeiros);
        const vendasProdutosBarbearia = vendasProdutosFiltradas.filter(
          (movimentacao) =>
            !nomesBarbeirosCadastrados.has(movimentacao.barbeiro)
        );
        linhasResumo.push(
          ...criarLinhasProdutos(
            "Barbearia",
            atendimentosFiltrados,
            vendasProdutosBarbearia,
            "produtosBarbeariaDetalhados"
          )
        );
      }

      const totaisGerais = linhasResumo.reduce(
        (total, linha) => ({
          atendimentos: total.atendimentos + (Number(linha.atendimentos) || 0),
          pix: total.pix + linha.pix,
          cartao: total.cartao + linha.cartao,
          dinheiro: total.dinheiro + linha.dinheiro,
          total: total.total + linha.total
        }),
        { atendimentos: 0, pix: 0, cartao: 0, dinheiro: 0, total: 0 }
      );

      pdfResumo.setFont("helvetica", "bold");
      pdfResumo.setFontSize(20);
      pdfResumo.text("TRADIÇÃO BARBEARIA", 14, 18);
      pdfResumo.setFontSize(13);
      pdfResumo.text("Relatório Financeiro", 14, 27);
      pdfResumo.setDrawColor(190, 150, 50);
      pdfResumo.setLineWidth(0.8);
      pdfResumo.line(14, 32, 196, 32);

      pdfResumo.setFont("helvetica", "normal");
      pdfResumo.setFontSize(10);
      pdfResumo.text(`Período: ${periodo.titulo}`, 14, 41);
      pdfResumo.text(
        `Barbeiro: ${barbeiroSelecionado === "todos" ? "Barbearia inteira" : barbeiroSelecionado}`,
        14,
        47
      );
      const corpoTabela = linhasResumo.map((linha) => [
        linha.nome,
        String(linha.atendimentos),
        formatarValorEmReal(linha.pix).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(linha.cartao).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(linha.dinheiro).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(linha.total).replace("R$ ", "R$\u00a0")
      ]);

      corpoTabela.push([
        "TOTAL GERAL",
        String(totaisGerais.atendimentos),
        formatarValorEmReal(totaisGerais.pix).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(totaisGerais.cartao).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(totaisGerais.dinheiro).replace("R$ ", "R$\u00a0"),
        formatarValorEmReal(totaisGerais.total).replace("R$ ", "R$\u00a0")
      ]);

      pdfResumo.autoTable({
        startY: 57,
        margin: { left: 14, right: 14 },
        tableWidth: 182,
        head: [[barbeiroSelecionado === "todos" ? "Barbeiro / Produto" : "Barbeiro", "Qtd.", "Pix", "Cartão", "Dinheiro", "Total"]],
        body: corpoTabela,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.4,
          overflow: "visible",
          valign: "middle"
        },
        headStyles: {
          fillColor: [190, 150, 50],
          textColor: [20, 20, 20],
          fontStyle: "bold",
          fontSize: 8,
          minCellHeight: 11
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 27, halign: "center" },
          2: { cellWidth: 27, halign: "right" },
          3: { cellWidth: 27, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 28, halign: "right", fontStyle: "bold" }
        },
        didParseCell(dados) {
          if (dados.section === "body" && dados.row.index === corpoTabela.length - 1) {
            dados.cell.styles.fillColor = [245, 239, 220];
            dados.cell.styles.fontStyle = "bold";
          }
        }
      });

      /* =========================================
         TABELA GERAL DE ENTRADAS E SAÍDAS
      ========================================= */

      if (barbeiroSelecionado === "todos") {
      const entradasGerais = movimentacoesPeriodo.filter(
        (movimentacao) => movimentacao.tipo === "entrada"
      );

      const saidasRegistradas = movimentacoesPeriodo.filter((movimentacao) => {
        return (
          movimentacao.tipo === "saida" &&
          movimentacao.origem !== "desconto" &&
          movimentacao.categoria !== "desconto" &&
          !String(movimentacao.id || "").startsWith("desconto_")
        );
      });

      const entradasComDesconto = entradasGerais.filter(
        (movimentacao) =>
          (Number(movimentacao.valorDesconto) || 0) > 0
      );

      const valoresEntradas = somarPorPagamento(entradasGerais, (movimentacao) => {
        return Number(movimentacao.valorBruto) ||
          Number(movimentacao.valorTotalBruto) ||
          Number(movimentacao.valor) ||
          0;
      });

      const valoresSaidasRegistradas = somarPorPagamento(
        saidasRegistradas,
        (movimentacao) => Number(movimentacao.valor) || 0
      );

      const valoresDescontos = somarPorPagamento(
        entradasComDesconto,
        (movimentacao) => Number(movimentacao.valorDesconto) || 0
      );

      const totalizarFormas = (valores) =>
        valores.pix + valores.cartao + valores.dinheiro;

      const valoresTotalSaidas = {
        pix: valoresSaidasRegistradas.pix + valoresDescontos.pix,
        cartao: valoresSaidasRegistradas.cartao + valoresDescontos.cartao,
        dinheiro: valoresSaidasRegistradas.dinheiro + valoresDescontos.dinheiro
      };

      const valoresTotalLiquido = {
        pix: valoresEntradas.pix - valoresTotalSaidas.pix,
        cartao: valoresEntradas.cartao - valoresTotalSaidas.cartao,
        dinheiro: valoresEntradas.dinheiro - valoresTotalSaidas.dinheiro
      };

      const linhaFinanceira = (nome, valores) => [
        nome,
        formatarValorEmReal(valores.pix),
        formatarValorEmReal(valores.cartao),
        formatarValorEmReal(valores.dinheiro),
        formatarValorEmReal(totalizarFormas(valores))
      ];

      const corpoTabelaGeral = [
        linhaFinanceira("Entradas", valoresEntradas),
        linhaFinanceira("Saídas registradas", valoresSaidasRegistradas),
        linhaFinanceira("Descontos concedidos", valoresDescontos),
        linhaFinanceira("TOTAL", valoresTotalLiquido)
      ];

      let inicioTabelaGeral = (pdfResumo.lastAutoTable?.finalY || 57) + 13;
      if (inicioTabelaGeral > pdfResumo.internal.pageSize.getHeight() - 45) {
        pdfResumo.addPage();
        inicioTabelaGeral = 24;
      }

      pdfResumo.setFont("helvetica", "bold");
      pdfResumo.setFontSize(13);
      pdfResumo.text("MOVIMENTAÇÃO GERAL DA BARBEARIA", 14, inicioTabelaGeral - 6);

      pdfResumo.autoTable({
        startY: inicioTabelaGeral,
        head: [["Movimentação", "Pix", "Cartão", "Dinheiro", "Total"]],
        body: corpoTabelaGeral,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [190, 150, 50], textColor: [20, 20, 20], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" }
        },
        didParseCell(dados) {
          if (dados.section === "body" && dados.row.index === corpoTabelaGeral.length - 1) {
            dados.cell.styles.fillColor = [245, 239, 220];
            dados.cell.styles.fontStyle = "bold";
          }
        }
      });
      }

      const dataArquivoResumo = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      pdfResumo.save(`relatorio-financeiro-${dataArquivoResumo}.pdf`);
      return;
    }

    /* =========================================
       CRIAR PDF
    ========================================= */

    const { jsPDF } =
      window.jspdf;

    const pdf =
      new jsPDF({
        orientation:
          "portrait",

        unit:
          "mm",

        format:
          "a4"
      });

    const larguraPagina =
      pdf.internal.pageSize.getWidth();

    /* =========================================
       CABEÇALHO
    ========================================= */

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      20
    );

    pdf.text(
      "TRADIÇÃO BARBEARIA",
      14,
      17
    );

    pdf.setFontSize(
      13
    );

    pdf.text(
      "Relatório de Movimentações Financeiras",
      14,
      25
    );

    pdf.setDrawColor(
      190,
      150,
      50
    );

    pdf.setLineWidth(
      0.8
    );

    pdf.line(
      14,
      30,
      larguraPagina - 14,
      30
    );

    /* =========================================
       INFORMAÇÕES DO FILTRO
    ========================================= */

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(
      10
    );

    const barbeiroTexto =
      barbeiroSelecionado ===
      "todos"
        ? "Barbearia inteira"
        : barbeiroSelecionado;

    let tipoTexto =
      "Entradas e saídas";

    if (
      tipoSelecionado ===
      "entrada"
    ) {
      tipoTexto =
        "Somente entradas";
    }

    if (
      tipoSelecionado ===
      "saida"
    ) {
      tipoTexto =
        "Somente saídas";
    }

    pdf.text(
      `Período: ${periodo.titulo}`,
      14,
      38
    );

    pdf.text(
      `Barbeiro: ${barbeiroTexto}`,
      14,
      44
    );

    pdf.text(
      `Filtro: ${tipoTexto}`,
      14,
      50
    );

    /* =========================================
       RESUMO FINANCEIRO
    ========================================= */

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      11
    );

    pdf.text(
      "RESUMO FINANCEIRO",
      14,
      60
    );

    pdf.setFontSize(
      10
    );

    pdf.text(
      `Entradas: ${formatarValorEmReal(totalEntradas)}`,
      14,
      68
    );

    pdf.text(
      `Saídas: ${formatarValorEmReal(totalSaidas)}`,
      80,
      68
    );

    pdf.text(
      `Saldo: ${formatarValorEmReal(saldo)}`,
      145,
      68
    );

    /* =========================================
       MONTAR LINHAS
    ========================================= */

    const linhas =
      movimentacoes.map(
        (movimentacao) => {
          const dataFormatada =
            dataPorTexto(
              movimentacao.data
            ).toLocaleDateString(
              "pt-BR"
            );

          const hora =
            movimentacao.hora ||
            "00:00";

          const descricao =
            movimentacao.descricao ||
            (
              movimentacao.tipo ===
              "entrada"
                ? "Atendimento"
                : "Saída"
            );

          const barbeiro =
            movimentacao.barbeiro ||
            "Barbearia";

          const pagamento =
            movimentacao.formaPagamento ||
            "—";

          const valor =
            Number(
              movimentacao.valor
            ) || 0;

          const tipo =
            movimentacao.tipo ===
            "saida"
              ? "Saída"
              : "Entrada";

          const valorFormatado =
            movimentacao.tipo ===
            "saida"
              ? `- ${formatarValorEmReal(valor)}`
              : `+ ${formatarValorEmReal(valor)}`;

          return [
            dataFormatada,
            hora,
            descricao,
            barbeiro,
            pagamento,
            valorFormatado,
            tipo
          ];
        }
      );

    /* =========================================
       TABELA
    ========================================= */

    if (
      typeof pdf.autoTable !==
      "function"
    ) {
      throw new Error(
        "Plugin AutoTable não carregado."
      );
    }

    pdf.autoTable({
      startY:
        76,

      head: [[
        "Data",
        "Hora",
        "Movimentação",
        "Barbeiro",
        "Pagamento",
        "Valor",
        "Tipo"
      ]],

      body:
        linhas,

      theme:
        "grid",

      styles: {
        font:
          "helvetica",

        fontSize:
          8,

        cellPadding:
          2.5,

        valign:
          "middle"
      },

      headStyles: {
        fillColor: [
          32,
          32,
          32
        ],

        textColor: [
          255,
          255,
          255
        ],

        fontStyle:
          "bold"
      },

      columnStyles: {
        0: {
          cellWidth: 25
        },

        1: {
          cellWidth: 18
        },

        2: {
          cellWidth: 70
        },

        3: {
          cellWidth: 35
        },

        4: {
          cellWidth: 28
        },

        5: {
          cellWidth: 32
        },

        6: {
          cellWidth: 25
        }
      },

      didParseCell(
        dados
      ) {
        if (
          dados.section !==
          "body"
        ) {
          return;
        }

        const tipo =
          dados.row.raw[6];

        if (
          dados.column.index ===
          5 ||
          dados.column.index ===
          6
        ) {
          if (
            tipo ===
            "Entrada"
          ) {
            dados.cell.styles.textColor = [
              20,
              130,
              70
            ];
          } else {
            dados.cell.styles.textColor = [
              190,
              50,
              50
            ];
          }

          dados.cell.styles.fontStyle =
            "bold";
        }
      },

      didDrawPage(
        dados
      ) {
        const numeroPagina =
          pdf.internal.getNumberOfPages();

        pdf.setFontSize(
          8
        );

        pdf.setTextColor(
          100
        );

        pdf.text(
          `Página ${numeroPagina}`,
          larguraPagina - 30,
          pdf.internal.pageSize.getHeight() - 8
        );
      }
    });

    /* =========================================
       NOME DO ARQUIVO
    ========================================= */

    const dataArquivo =
      new Date()
        .toLocaleDateString(
          "pt-BR"
        )
        .replace(
          /\//g,
          "-"
        );

    pdf.save(
      `historico-financeiro-completo-${dataArquivo}.pdf`
    );
  } catch (erro) {
    console.log(
      "Erro ao gerar PDF do histórico:",
      erro
    );

    alert(
      "Não foi possível gerar o PDF do histórico."
    );
  } finally {
    if (botao) {
      botao.disabled =
        false;

      botao.textContent =
        "Gerar PDF";
    }
  }
}

/* =========================================================
   BOTÃO GERAR PDF
========================================================= */

if (
  botaoGerarPdfHistorico
) {
  botaoGerarPdfHistorico.addEventListener(
    "click",
    () => {
      if (periodoPdfHistorico) periodoPdfHistorico.value = "diario";

      if (barbeiroPdfHistorico) {
        barbeiroPdfHistorico.innerHTML = tipoUsuario === "barbeiro"
          ? `<option value="${nomeUsuario}">${nomeUsuario}</option>`
          : `<option value="todos">Barbearia inteira</option>`;

        if (tipoUsuario !== "barbeiro") {
          barbeiros.forEach((barbeiro) => {
            const opcao = document.createElement("option");
            opcao.value = barbeiro.nome;
            opcao.textContent = barbeiro.nome;
            barbeiroPdfHistorico.appendChild(opcao);
          });
          barbeiroPdfHistorico.value = filtroHistoricoBarbeiro?.value || "todos";
        }
      }

      modalTipoPdfHistorico?.classList.remove("escondido");
    }
  );
}

botaoConfirmarGeracaoPdf?.addEventListener("click", async () => {
  const filtrosPdf = {
    periodo: periodoPdfHistorico?.value || "diario",
    barbeiro: barbeiroPdfHistorico?.value || "todos",
    pagamento: "todos"
  };

  modalTipoPdfHistorico?.classList.add("escondido");
  await gerarPdfHistorico("simples", filtrosPdf);
});

/* =========================================================
   HISTÓRICO FINANCEIRO
========================================================= */

const periodoRelatorioHistorico =
  selecionarPrimeiro(
    "#periodo-relatorio-historico",
    "#periodo-historico"
  );

const filtroHistoricoBarbeiro =
  selecionarPrimeiro(
    "#filtro-historico-barbeiro",
    "#historico-filtro-barbeiro"
  );

const filtroHistoricoTipo =
  selecionarPrimeiro(
    "#filtro-historico-tipo",
    "#filtro-historico-movimentacao",
    "#historico-filtro-tipo"
  );

const botaoPeriodoHistoricoAnterior =
  selecionarPrimeiro(
    "#periodo-historico-anterior",
    "#historico-anterior"
  );

const botaoPeriodoHistoricoProximo =
  selecionarPrimeiro(
    "#periodo-historico-proximo",
    "#historico-proximo"
  );

const tituloPeriodoHistorico =
  selecionarPrimeiro(
    "#titulo-periodo-historico",
    "#historico-titulo-periodo"
  );

const historicoTotalEntradas =
  selecionarPrimeiro(
    "#historico-total-entradas",
    "#total-entradas-historico"
  );

const historicoTotalSaidas =
  selecionarPrimeiro(
    "#historico-total-saidas",
    "#total-saidas-historico"
  );

const historicoSaldo =
  selecionarPrimeiro(
    "#historico-saldo",
    "#saldo-historico"
  );

const listaHistoricoFinanceiro =
  selecionarPrimeiro(
    "#lista-historico-financeiro",
    "#lista-historico"
  );

/* =========================================================
   REGISTRAR SAÍDA
========================================================= */

const botaoRegistrarSaida =
  selecionarPrimeiro(
    "#botao-registrar-saida",
    "#registrar-saida"
  );

const modalRegistrarSaida =
  selecionarPrimeiro(
    "#modal-registrar-saida",
    "#modal-saida"
  );

const formRegistrarSaida =
  selecionarPrimeiro(
    "#form-registrar-saida",
    "#form-saida"
  );

const descricaoSaida =
  selecionarPrimeiro(
    "#descricao-saida",
    "#saida-descricao"
  );

const valorSaida =
  selecionarPrimeiro(
    "#valor-saida",
    "#saida-valor"
  );

const filtroHistoricoPagamento =
  selecionarPrimeiro(
    "#filtro-historico-pagamento",
    "#historico-filtro-pagamento"
  );

const formaPagamentoSaida = selecionarPrimeiro("#forma-pagamento-saida");

const barbeiroSaida =
  selecionarPrimeiro(
    "#barbeiro-saida",
    "#saida-barbeiro"
  );

const dataSaida =
  selecionarPrimeiro(
    "#data-saida",
    "#saida-data"
  );

const horaSaida =
  selecionarPrimeiro(
    "#hora-saida",
    "#saida-hora"
  );

const mensagemSaida =
  selecionarPrimeiro(
    "#mensagem-saida",
    "#saida-mensagem"
  );

/* =========================================================
   REGISTRAR ENTRADA MANUAL
========================================================= */

const botaoRegistrarEntrada = selecionarPrimeiro("#botao-registrar-entrada");
const modalRegistrarEntrada = selecionarPrimeiro("#modal-registrar-entrada");
const formRegistrarEntrada = selecionarPrimeiro("#form-registrar-entrada");
const motivoEntrada = selecionarPrimeiro("#motivo-entrada");
const valorEntrada = selecionarPrimeiro("#valor-entrada");
const formaPagamentoEntrada = selecionarPrimeiro("#forma-pagamento-entrada");
const registradoPorEntrada = selecionarPrimeiro("#registrado-por-entrada");
const dataEntrada = selecionarPrimeiro("#data-entrada");
const horaEntrada = selecionarPrimeiro("#hora-entrada");
const mensagemEntrada = selecionarPrimeiro("#mensagem-entrada");

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const configuracaoSenha =
  document.querySelector(
    "#configuracao-senha"
  );

const descricaoConfiguracaoSenha =
  document.querySelector(
    "#descricao-configuracao-senha"
  );

const formAlterarSenha =
  document.querySelector(
    "#form-alterar-senha"
  );

const usuarioAlterarSenha =
  document.querySelector(
    "#usuario-alterar-senha"
  );

const senhaAtualUsuario =
  document.querySelector(
    "#senha-atual-usuario"
  );

const novaSenha =
  document.querySelector(
    "#nova-senha"
  );

const confirmarNovaSenha =
  document.querySelector(
    "#confirmar-nova-senha"
  );

const mensagemSenha =
  document.querySelector(
    "#mensagem-senha"
  );

const mensagemTema =
  document.querySelector(
    "#mensagem-tema"
  );

const configuracaoApagarDados = document.querySelector(
  "#configuracao-apagar-dados"
);
const botaoApagarDados = document.querySelector(
  "#botao-apagar-dados"
);
const senhaAdministradorApagarDados = document.querySelector(
  "#senha-administrador-apagar-dados"
);
const mensagemApagarDados = document.querySelector(
  "#mensagem-apagar-dados"
);

const opcoesTema =
  document.querySelectorAll(
    'input[name="tema"]'
  );

const opcoesDispositivo = document.querySelectorAll(
  'input[name="modo-dispositivo"]'
);

const mensagemDispositivo = document.querySelector(
  "#mensagem-dispositivo"
);

const configuracaoGeral = doc(
  db,
  "configuracoes",
  "geral"
);

const historicoQuantidadeEntradas =
  document.querySelector(
    "#historico-quantidade-entradas"
  );

const historicoQuantidadeSaidas =
  document.querySelector(
    "#historico-quantidade-saidas"
  );

const quantidadeMovimentacoesHistorico =
  document.querySelector(
    "#quantidade-movimentacoes-historico"
  );

/* =========================================================
   PLANOS
========================================================= */

const botaoMostrarCadastroPlano = document.querySelector(
  "#botao-mostrar-cadastro-plano"
);
const formCadastroPlano = document.querySelector(
  "#form-cadastro-plano"
);
const planoIdEdicao = document.querySelector(
  "#plano-id-edicao"
);
const valorNovoPlano = document.querySelector(
  "#valor-novo-plano"
);
const servicoNovoPlano = document.querySelector(
  "#servico-novo-plano"
);
const usosNovoPlano = document.querySelector(
  "#usos-novo-plano"
);
const cancelarEdicaoPlano = document.querySelector(
  "#cancelar-edicao-plano"
);
const pesquisaPlano = document.querySelector(
  "#pesquisa-plano"
);
const mensagemPlano = document.querySelector(
  "#mensagem-plano"
);
const listaPlanos = document.querySelector(
  "#lista-planos"
);

const modalClientesPlano = document.querySelector(
  "#modal-clientes-plano"
);
const tituloClientesPlano = document.querySelector(
  "#titulo-clientes-plano"
);
const resumoClientesPlano = document.querySelector(
  "#resumo-clientes-plano"
);
const mensagemClientesPlano = document.querySelector(
  "#mensagem-clientes-plano"
);
const listaClientesDisponiveisPlano = document.querySelector(
  "#lista-clientes-disponiveis-plano"
);
const formVinculoClientePlano = document.querySelector("#form-vinculo-cliente-plano");
const clienteIdVinculoPlano = document.querySelector("#cliente-id-vinculo-plano");
const nomeClienteVinculoPlano = document.querySelector("#nome-cliente-vinculo-plano");
const pagamentoVinculoPlano = document.querySelector("#pagamento-vinculo-plano");
const valorVinculoPlano = document.querySelector("#valor-vinculo-plano");
const campoDataInicioCicloPlano = document.querySelector("#campo-data-inicio-ciclo-plano");
const dataInicioCicloPlano = document.querySelector("#data-inicio-ciclo-plano");
const cancelarVinculoClientePlano = document.querySelector("#cancelar-vinculo-cliente-plano");
const modalRenovarPlano = document.querySelector("#modal-renovar-plano");
const formRenovarPlano = document.querySelector("#form-renovar-plano");
const resumoRenovacaoPlano = document.querySelector("#resumo-renovacao-plano");
const clienteRenovacaoPlano = document.querySelector("#cliente-renovacao-plano");
const nomeRenovacaoPlano = document.querySelector("#nome-renovacao-plano");
const valorRenovacaoPlano = document.querySelector("#valor-renovacao-plano");
const formaPagamentoRenovacaoPlano = document.querySelector(
  "#forma-pagamento-renovacao-plano"
);
const mensagemRenovacaoPlano = document.querySelector(
  "#mensagem-renovacao-plano"
);

const modalVerificarPlano = document.querySelector(
  "#modal-verificar-plano"
);
const tituloVerificarPlano = document.querySelector(
  "#titulo-verificar-plano"
);
const conteudoVerificarPlano = document.querySelector(
  "#conteudo-verificar-plano"
);
const mensagemVerificarPlano = document.querySelector(
  "#mensagem-verificar-plano"
);
const botoesVerificarPlano = document.querySelector(
  "#botoes-verificar-plano"
);

const modalExtrasPlano = document.querySelector(
  "#modal-extras-plano"
);
const textoExtrasPlano = document.querySelector(
  "#texto-extras-plano"
);
const botaoPlanoSemExtras = document.querySelector(
  "#plano-sem-extras"
);
const botaoPlanoComExtras = document.querySelector(
  "#plano-com-extras"
);
const mensagemExtrasPlano = document.querySelector(
  "#mensagem-extras-plano"
);

const tituloConclusaoAtendimento = document.querySelector(
  "#titulo-conclusao-atendimento"
);
const descricaoConclusaoAtendimento = document.querySelector(
  "#descricao-conclusao-atendimento"
);
const labelServicoAtendimento = document.querySelector(
  "#label-servico-atendimento"
);

/* =========================================================
   SAIR
========================================================= */

const modalSair =
  document.querySelector(
    "#modal-sair"
  );

const botaoConfirmarSair =
  document.querySelector(
    "#confirmar-sair"
  );

/* =========================================================
   VARIÁVEIS
========================================================= */

let graficoStatus = null;
let graficoFinanceiro = null;

let mesRelatorio = new Date();

let dataFinanceiro = new Date();
let dataHistorico = new Date();
let dataProdutosRelatorio = new Date();

let barbeiroAtual = "";

let barbeiros = [];
let clientes = [];
let produtos = [];
let servicos = [];
let agendamentos = [];
let dias = [];
let planos = [];
let usosPlanos = [];

let planoSelecionadoParaClientes = null;
let planoAtendimentoSelecionado = null;
let renovacaoPlanoSelecionada = null;
let atendimentoPeloPlano = false;
let atendimentoPlanoComExtras = false;

let agendamentoSelecionado = null;
let valorTotalAtendimentoEditado = false;
let subtotalServicosProduzidosEditado = false;
let valorTotalRegistroBarbeiroEditado = false;
let valorServicosInformadoBarbeiro = null;
let planosDisponiveisServicosBarbeiro = [];
let planoEscolhidoServicosBarbeiro = null;
let usarPlanoEscolhidoServicosBarbeiro = false;
let perguntaExtrasPlanoAbertaPeloBarbeiro = false;
let verificacaoPlanoEmAndamento = false;
let clienteSelecionado = null;
let cancelarEscutaAgendamentos = null;

let zoomAgenda = 1;

const ZOOM_MINIMO = 0.7;
const ZOOM_MAXIMO = 1.6;
const PASSO_ZOOM = 0.15;

/* =========================================================
   PERMISSÕES
========================================================= */

function usuarioPodeVisualizarTodasAgendas() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  );
}

function usuarioPodeGerenciarBarbeiros() {
  return tipoUsuario === "administrador";
}

function usuarioPodeGerenciarCatalogo() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  );
}

function usuarioPodeGerenciarPlanos() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  );
}

function usuarioPodeFinalizarAtendimento() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  );
}

function usuarioPodeCancelarAgendamento(agendamento) {
  if (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  ) {
    return true;
  }

  return (
    tipoUsuario === "barbeiro" &&
    Boolean(agendamento) &&
    (
      agendamento.barbeiroId === usuarioId ||
      agendamento.barbeiro === nomeUsuario
    )
  );
}

function agendamentoEstaMarcadoParaHoje(agendamento) {
  return Boolean(
    agendamento?.data &&
    agendamento.data === formatarDataParaSalvar(new Date())
  );
}

function mensagemDataPermitidaDoAgendamento(agendamento) {
  const dataFormatada = agendamento?.data
    ? dataPorTexto(agendamento.data).toLocaleDateString("pt-BR")
    : "data não informada";

  return `Você só pode concluir ou marcar como não realizado no dia agendado: ${dataFormatada}.`;
}

function usuarioPodeVisualizarRelatorioGeral() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista"
  );
}

function usuarioPodeVisualizarFinanceiro() {
  return (
    tipoUsuario === "administrador" ||
    tipoUsuario === "recepcionista" ||
    tipoUsuario === "barbeiro"
  );
}

function usuarioPodeRegistrarServicos(agendamento) {
  return (
    tipoUsuario === "barbeiro" &&
    Boolean(agendamento) &&
    agendamento.status === "pendente" &&
    (
      agendamento.barbeiroId === usuarioId ||
      agendamento.barbeiro === nomeUsuario
    )
  );
}

function limitarFinanceiroDaRecepcaoAoDiario() {
  if (
    tipoUsuario !== "recepcionista" &&
    tipoUsuario !== "barbeiro"
  ) return;

  [periodoRelatorioFinanceiro, periodoRelatorioHistorico]
    .filter(Boolean)
    .forEach((seletor) => {
      seletor.innerHTML = `
        <option value="diario" selected>Diário</option>
      `;
      seletor.value = "diario";
    });

  dataFinanceiro = new Date();
  dataHistorico = new Date();
}

/* =========================================================
   DINHEIRO
========================================================= */

function formatarValorEmReal(valor) {
  const numero = Number(valor) || 0;

  return numero.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

function converterValorParaNumero(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  let texto = String(valor)
    .trim()
    .replace("R$", "")
    .replace(/\s/g, "");

  if (texto.includes(",")) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarCampoValor(campo) {
  if (!campo) {
    return;
  }

  const numeros =
    campo.value.replace(/\D/g, "");

  if (numeros === "") {
    campo.value = "";
    return;
  }

  const valor =
    Number(numeros) / 100;

  campo.value =
    formatarValorEmReal(valor);
}

/* =========================================================
   DATAS E HORÁRIOS
========================================================= */

function criarHorarios() {
  const listaHorarios = [];

  let minutos = 8 * 60;

  const ultimoHorario =
    20 * 60 + 30;

  while (minutos <= ultimoHorario) {
    const hora = String(
      Math.floor(minutos / 60)
    ).padStart(2, "0");

    const minuto = String(
      minutos % 60
    ).padStart(2, "0");

    listaHorarios.push(
      `${hora}:${minuto}`
    );

    minutos += 30;
  }

  return listaHorarios;
}

const horarios = criarHorarios();

function formatarDataParaSalvar(data) {
  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDataParaMostrar(data) {
  return data.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );
}

function dataPorTexto(dataTexto) {
  const partes =
    dataTexto.split("-");

  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );
}

function criarPrimeirosDias() {
  const hoje = new Date();

  hoje.setHours(
    0,
    0,
    0,
    0
  );

  dias = [];

  for (
    let numero = 0;
    numero < 21;
    numero++
  ) {
    const novoDia =
      new Date(hoje);

    novoDia.setDate(
      hoje.getDate() + numero
    );

    dias.push(novoDia);
  }
}

function adicionarMaisDias() {
  const ultimoDia =
    dias[dias.length - 1];

  for (
    let numero = 1;
    numero <= 14;
    numero++
  ) {
    const novoDia =
      new Date(ultimoDia);

    novoDia.setDate(
      ultimoDia.getDate() +
        numero
    );

    dias.push(novoDia);
  }
}

function obterInicioDaSemana(data) {
  const inicio =
    new Date(data);

  const diaSemana =
    inicio.getDay();

  const diferenca =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  inicio.setDate(
    inicio.getDate() +
      diferenca
  );

  inicio.setHours(
    0,
    0,
    0,
    0
  );

  return inicio;
}

function obterFimDaSemana(data) {
  const fim =
    obterInicioDaSemana(data);

  fim.setDate(
    fim.getDate() + 6
  );

  fim.setHours(
    23,
    59,
    59,
    999
  );

  return fim;
}

function criarDataHora(
  dataTexto,
  horaTexto = "00:00"
) {
  return new Date(
    `${dataTexto}T${horaTexto}:00`
  );
}

/* =========================================================
   TELAS
========================================================= */

function esconderTodasAsTelas() {
  telaDashboard?.classList.add(
    "escondida"
  );

  telaBarbeiros?.classList.add(
    "escondida"
  );

  telaClientes?.classList.add(
    "escondida"
  );

  telaWhatsApp?.classList.add("escondida");

  telaProdutosServicos?.classList.add(
    "escondida"
  );

  telaPlanos?.classList.add(
    "escondida"
  );

  telaRelatorio?.classList.add(
    "escondida"
  );

  telaConfiguracoes?.classList.add(
    "escondida"
  );
}

function marcarBotaoAtivo(
  nomeDoBotao
) {
  document
    .querySelectorAll(
      ".botao-menu"
    )
    .forEach((botao) => {
      botao.classList.toggle(
        "ativo",
        botao.textContent ===
          nomeDoBotao
      );
    });
}

function abrirTelaDashboard() {
  esconderTodasAsTelas();

  telaDashboard.classList.remove(
    "escondida"
  );

  marcarBotaoAtivo(
    "Grade de horários"
  );
}

async function abrirTelaBarbeiros() {
  esconderTodasAsTelas();

  telaBarbeiros.classList.remove(
    "escondida"
  );

  marcarBotaoAtivo(
    "Barbeiros"
  );

  formCadastroBarbeiro.classList.add(
    "escondida"
  );

  mensagemBarbeiro.textContent = "";
  pesquisaBarbeiro.value = "";

  const podeGerenciarBarbeiros =
    usuarioPodeGerenciarBarbeiros();

  botaoMostrarCadastroBarbeiro.hidden =
    !podeGerenciarBarbeiros;

  botaoMostrarCadastroBarbeiro.classList.toggle(
    "escondida",
    !podeGerenciarBarbeiros
  );

  botaoMostrarCadastroBarbeiro.style.removeProperty(
    "display"
  );

  await carregarBarbeiros();

  mostrarListaDeBarbeiros();
}

async function abrirTelaClientes() {
  if (tipoUsuario === "barbeiro") return;

  encerrarEdicaoCliente();

  esconderTodasAsTelas();

  telaClientes.classList.remove(
    "escondida"
  );

  marcarBotaoAtivo(
    "Clientes cadastrados"
  );

  formCadastroCliente.classList.add(
    "escondida"
  );

  mensagemCliente.textContent = "";
  pesquisaCliente.value = "";

  await carregarClientes();

  mostrarListaDeClientes();
}

async function abrirTelaProdutosServicos() {
  esconderTodasAsTelas();

  telaProdutosServicos.classList.remove(
    "escondida"
  );

  marcarBotaoAtivo(
    "Produtos e Serviços"
  );

  formCadastroProduto.classList.add(
    "escondida"
  );

  formCadastroServico.classList.add(
    "escondida"
  );

  pesquisaProduto.value = "";
  pesquisaServico.value = "";

  mensagemProduto.textContent = "";
  mensagemServico.textContent = "";

  const podeGerenciar =
    usuarioPodeGerenciarCatalogo();

  botaoMostrarCadastroProduto.style.display =
    podeGerenciar
      ? ""
      : "none";

  botaoMostrarCadastroServico.style.display =
    podeGerenciar
      ? ""
      : "none";

  await Promise.all([
    carregarProdutos(),
    carregarServicos()
  ]);

  mostrarListaDeProdutos();
  mostrarListaDeServicos();
}

/* =========================================================
   PLANOS - TELA E DADOS
========================================================= */

function chaveMes(dataTexto = "") {
  const data = dataTexto
    ? dataPorTexto(dataTexto)
    : new Date();

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  return `${ano}-${mes}`;
}

function vinculosDoPlano(plano) {
  return Array.isArray(plano?.clientesPlano) ? plano.clientesPlano : [];
}

function vinculoDoCliente(plano, clienteId) {
  const vinculo = vinculosDoPlano(plano).find(
    (item) => item.clienteId === clienteId && item.ativo !== false
  );
  if (vinculo) return vinculo;

  const clientesIds = Array.isArray(plano?.clientesIds) ? plano.clientesIds : [];
  if (!clientesIds.includes(clienteId)) return null;

  const dataBase = plano?.dataCadastro ? new Date(plano.dataCadastro) : new Date();
  return {
    clienteId,
    ativo: true,
    legado: true,
    valorPlano: Number(plano?.valor) || 0,
    formaPagamento: "Não informado",
    inicioCiclo: formatarDataParaSalvar(dataBase)
  };
}

function adicionarMesComDiaBase(dataInicial, quantidade) {
  const ano = dataInicial.getFullYear();
  const mes = dataInicial.getMonth() + quantidade;
  const dia = dataInicial.getDate();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimoDia));
}

function cicloIndividualDoCliente(plano, clienteId, dataReferenciaTexto = "") {
  const vinculo = vinculoDoCliente(plano, clienteId);
  if (!vinculo?.inicioCiclo) return null;

  const inicioBase = dataPorTexto(vinculo.inicioCiclo);
  const referencia = dataReferenciaTexto ? dataPorTexto(dataReferenciaTexto) : new Date();
  referencia.setHours(0, 0, 0, 0);
  inicioBase.setHours(0, 0, 0, 0);
  if (referencia < inicioBase) return null;

  let meses = (referencia.getFullYear() - inicioBase.getFullYear()) * 12
    + referencia.getMonth() - inicioBase.getMonth();
  let inicio = adicionarMesComDiaBase(inicioBase, meses);
  if (inicio > referencia) {
    meses -= 1;
    inicio = adicionarMesComDiaBase(inicioBase, meses);
  }

  const proximoInicio = adicionarMesComDiaBase(inicioBase, meses + 1);
  const fim = new Date(proximoInicio);
  fim.setDate(fim.getDate() - 1);
  const inicioTexto = formatarDataParaSalvar(inicio);

  return {
    inicio: inicioTexto,
    fim: formatarDataParaSalvar(fim),
    chave: inicioTexto,
    vinculo
  };
}

function cicloDoClienteEstaPago(ciclo) {
  if (!ciclo) return false;

  const vinculo = ciclo.vinculo;
  const ciclosPagos = Array.isArray(vinculo?.ciclosPagos)
    ? vinculo.ciclosPagos
    : [];

  if (ciclosPagos.includes(ciclo.chave)) return true;

  const pagamentoInicialRegistrado =
    Number(vinculo?.valorPlano) > 0 &&
    Boolean(vinculo?.formaPagamento) &&
    vinculo.formaPagamento !== "Não informado";

  return pagamentoInicialRegistrado && ciclo.chave === vinculo.inicioCiclo;
}

async function renovarPagamentoDoPlano(
  plano,
  cliente,
  ciclo,
  formaPagamento
) {
  if (!usuarioPodeGerenciarPlanos() || !plano || !cliente || !ciclo) {
    return;
  }

  const vinculo = ciclo.vinculo;
  const valorPlano = Number(vinculo?.valorPlano) || Number(plano.valor) || 0;

  const vinculosAtualizados = vinculosDoPlano(plano).map((item) => {
    if (item.clienteId !== cliente.id) return item;

    const ciclosPagos = Array.isArray(item.ciclosPagos)
      ? item.ciclosPagos
      : [];

    return {
      ...item,
      ciclosPagos: [...new Set([...ciclosPagos, ciclo.chave])],
      ultimoPagamentoEm: Date.now(),
      renovadoPor: nomeUsuario
    };
  });

  const agora = new Date();
  const dataPagamento = formatarDataParaSalvar(agora);
  const horaPagamento = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const idMovimentacao = `renovacao_plano_${plano.id}_${cliente.id}_${ciclo.chave}`;

  const lote = writeBatch(db);
  lote.update(doc(db, "planos", plano.id), {
    clientesPlano: vinculosAtualizados,
    atualizadoEm: Date.now()
  });
  lote.set(doc(db, "movimentacoesFinanceiras", idMovimentacao), {
    tipo: "entrada",
    origem: "plano",
    categoria: "plano",
    descricao: `Renova\u00e7\u00e3o do plano ${plano.nome}`,
    valor: valorPlano,
    data: dataPagamento,
    hora: horaPagamento,
    formaPagamento,
    planoId: plano.id,
    planoNome: plano.nome,
    cliente: cliente.nome,
    clienteId: cliente.id,
    inicioCiclo: ciclo.inicio,
    criadoPor: nomeUsuario,
    usuarioId,
    dataCadastro: Date.now()
  });

  await lote.commit();
  await carregarPlanos();
  mostrarListaDePlanos();
  mensagemPlano.textContent = `Pagamento de ${cliente.nome} renovado e contabilizado.`;
}

function abrirRenovacaoPagamento(plano, cliente, ciclo) {
  const valorPlano =
    Number(ciclo?.vinculo?.valorPlano) || Number(plano?.valor) || 0;

  renovacaoPlanoSelecionada = { plano, cliente, ciclo };
  if (
    clienteRenovacaoPlano &&
    nomeRenovacaoPlano &&
    valorRenovacaoPlano
  ) {
    clienteRenovacaoPlano.textContent = cliente.nome;
    nomeRenovacaoPlano.textContent = plano.nome;
    valorRenovacaoPlano.textContent = formatarValorEmReal(valorPlano);
  } else if (resumoRenovacaoPlano) {
    resumoRenovacaoPlano.textContent =
      `${cliente.nome} | ${plano.nome} | ${formatarValorEmReal(valorPlano)}`;
  }

  formaPagamentoRenovacaoPlano.value = "";
  mensagemRenovacaoPlano.textContent = "";
  modalRenovarPlano.classList.remove("escondido");
}

formRenovarPlano?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formaPagamento = formaPagamentoRenovacaoPlano.value;
  if (!formaPagamento || !renovacaoPlanoSelecionada) {
    mensagemRenovacaoPlano.textContent =
      "Selecione a forma de pagamento.";
    return;
  }

  const botaoConfirmar = formRenovarPlano.querySelector(
    'button[type="submit"]'
  );
  botaoConfirmar.disabled = true;
  mensagemRenovacaoPlano.textContent = "Registrando pagamento...";

  try {
    const { plano, cliente, ciclo } = renovacaoPlanoSelecionada;
    await renovarPagamentoDoPlano(
      plano,
      cliente,
      ciclo,
      formaPagamento
    );
    renovacaoPlanoSelecionada = null;
    fecharModal("modal-renovar-plano");
  } catch (erro) {
    console.log("Erro ao renovar pagamento do plano:", erro);
    mensagemRenovacaoPlano.textContent =
      "N\u00e3o foi poss\u00edvel renovar e contabilizar o pagamento.";
  } finally {
    botaoConfirmar.disabled = false;
  }
});

async function carregarPlanos() {
  const resposta = await getDocs(
    collection(db, "planos")
  );

  planos = resposta.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    );
}

async function carregarUsosPlanos() {
  const resposta = await getDocs(
    collection(db, "usosPlanos")
  );

  usosPlanos = resposta.docs.map(
    (documento) => ({
      id: documento.id,
      ...documento.data()
    })
  );
}

function usosDoClienteNoPlano(planoId, clienteId, ciclo = chaveMes()) {
  return usosPlanos.filter((uso) =>
    uso.planoId === planoId &&
    uso.clienteId === clienteId &&
    uso.ciclo === ciclo &&
    uso.cancelado !== true
  ).length;
}

function usosDoClienteNoCicloIndividual(plano, clienteId, dataReferenciaTexto = "") {
  const ciclo = cicloIndividualDoCliente(plano, clienteId, dataReferenciaTexto);
  if (!ciclo) return 0;

  return usosPlanos.filter((uso) =>
    uso.planoId === plano.id &&
    uso.clienteId === clienteId &&
    uso.cancelado !== true &&
    (uso.cicloInicio === ciclo.inicio ||
      (!uso.cicloInicio && uso.data >= ciclo.inicio && uso.data <= ciclo.fim))
  ).length;
}

function preencherServicosDoPlano(servicoSelecionado = "") {
  servicoNovoPlano.innerHTML = `
    <option value="">Selecione o serviço</option>
  `;

  servicos.forEach((servico) => {
    const opcao = document.createElement("option");
    opcao.value = servico.id;
    opcao.textContent = servico.nome;
    opcao.selected = servico.id === servicoSelecionado;
    servicoNovoPlano.appendChild(opcao);
  });
}

function limparFormularioPlano() {
  planoIdEdicao.value = "";
  formCadastroPlano.reset();
  preencherServicosDoPlano();
  mensagemPlano.textContent = "";
}

function mostrarListaDePlanos() {
  const pesquisa = (pesquisaPlano?.value || "")
    .trim()
    .toLowerCase();

  const filtrados = planos.filter((plano) =>
    String(plano.nome || "").toLowerCase().includes(pesquisa) ||
    String(plano.servicoNome || "").toLowerCase().includes(pesquisa)
  );

  listaPlanos.innerHTML = "";

  if (filtrados.length === 0) {
    listaPlanos.innerHTML = `
      <p class="lista-vazia">Nenhum plano encontrado.</p>
    `;
    return;
  }

  filtrados.forEach((plano) => {
    const clientesIdsLegados = Array.isArray(plano.clientesIds)
      ? plano.clientesIds
      : [];
    const clientesIds = [...new Set([
      ...clientesIdsLegados,
      ...vinculosDoPlano(plano)
        .filter((vinculo) => vinculo.ativo !== false)
        .map((vinculo) => vinculo.clienteId)
    ])];

    const clientesVinculados = clientes
      .filter((cliente) => clientesIds.includes(cliente.id))
      .sort((a, b) =>
        String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-BR"
        )
      );

    const limite = Number(plano.usosMensais) || 0;
    const cartao = document.createElement("article");
    cartao.className = "cartao-plano";

    cartao.innerHTML = `
      <div class="cartao-plano-topo">
        <div>
          <h4></h4>
          <small>Plano mensal</small>
        </div>
        <span class="valor-plano"></span>
      </div>

      <div class="dados-plano">
        <span><strong>Serviço:</strong> <span class="plano-servico"></span></span>
        <span><strong>Limite por mês:</strong> <span class="plano-limite"></span></span>
      </div>

      <div class="clientes-resumo-plano"></div>
      <div class="janela-clientes-card-plano"></div>
      <div class="acoes-plano"></div>
    `;

    cartao.querySelector("h4").textContent = plano.nome || "Plano";
    cartao.querySelector(".valor-plano").textContent =
      formatarValorEmReal(plano.valor);
    cartao.querySelector(".plano-servico").textContent =
      plano.servicoNome || "Serviço não definido";
    cartao.querySelector(".plano-limite").textContent =
      `${limite} uso(s)`;
    cartao.querySelector(".clientes-resumo-plano").textContent =
      `Clientes do plano (${clientesVinculados.length})`;

    const janelaClientes = cartao.querySelector(
      ".janela-clientes-card-plano"
    );

    if (clientesVinculados.length === 0) {
      janelaClientes.innerHTML = `
        <div class="cliente-card-plano vazio">
          Nenhum cliente adicionado.
        </div>
      `;
    } else {
      clientesVinculados.forEach((cliente) => {
        const ciclo = cicloIndividualDoCliente(plano, cliente.id);
        const usos = usosDoClienteNoCicloIndividual(plano, cliente.id);
        const cicloPago = cicloDoClienteEstaPago(ciclo);

        const itemCliente = document.createElement("div");
        itemCliente.className = "cliente-card-plano";
        if (cicloPago) itemCliente.classList.add("pago");
        else if (ciclo) itemCliente.classList.add("pendente");

        if (cicloPago && limite > 0 && usos > limite) {
          itemCliente.classList.add("limite-atingido");
        }

        const informacoesCliente = document.createElement("div");
        informacoesCliente.className = "informacoes-cliente-plano";

        const nomeCliente = document.createElement("strong");
        nomeCliente.textContent = cliente.nome;
        nomeCliente.title = cliente.nome;

        const statusPagamento = document.createElement("span");
        statusPagamento.className = "status-pagamento-plano";
        if (cicloPago) {
          statusPagamento.classList.add("pago");
          statusPagamento.textContent = "Plano pago";
        } else if (ciclo) {
          statusPagamento.classList.add("pendente");
          statusPagamento.textContent = "Plano não pago";
        } else {
          statusPagamento.classList.add("futuro");
          statusPagamento.textContent = "Plano ainda não iniciado";
        }

        informacoesCliente.append(nomeCliente, statusPagamento);

        const contador = document.createElement("span");
        contador.className = "contador-usos-plano";
        contador.textContent = `${usos}/${limite}`;
        contador.title = ciclo
          ? `Ciclo: ${ciclo.inicio.split("-").reverse().join("/")} a ${ciclo.fim.split("-").reverse().join("/")} — ${cicloPago ? "pago" : "pagamento pendente"}`
          : "O ciclo deste cliente ainda não começou";

        itemCliente.append(informacoesCliente, contador);

        if (!cicloPago && ciclo && usuarioPodeGerenciarPlanos()) {
          const botaoRenovarPagamento = document.createElement("button");
          botaoRenovarPagamento.type = "button";
          botaoRenovarPagamento.className = "renovar-pagamento-plano";
          botaoRenovarPagamento.textContent = "Renovar pagamento";
          botaoRenovarPagamento.addEventListener("click", () => {
            abrirRenovacaoPagamento(plano, cliente, ciclo);
          });
          itemCliente.appendChild(botaoRenovarPagamento);
        }

        if (usuarioPodeGerenciarPlanos()) {
          const botaoRemoverCliente = document.createElement("button");
          botaoRemoverCliente.type = "button";
          botaoRemoverCliente.className = "remover-cliente-plano";
          botaoRemoverCliente.textContent = "Excluir cliente";
          botaoRemoverCliente.title = `Remover ${cliente.nome} deste plano`;
          botaoRemoverCliente.addEventListener("click", async () => {
            if (!confirm(`Remover "${cliente.nome}" do plano "${plano.nome}"?`)) {
              return;
            }

            const clientesIdsAtualizados = clientesIds.filter(
              (clienteId) => clienteId !== cliente.id
            );
            const vinculosAtualizados = vinculosDoPlano(plano).filter(
              (vinculo) => vinculo.clienteId !== cliente.id
            );

            try {
              await updateDoc(doc(db, "planos", plano.id), {
                clientesIds: clientesIdsAtualizados,
                clientesPlano: vinculosAtualizados,
                atualizadoEm: Date.now()
              });
              await carregarPlanos();
              mostrarListaDePlanos();
            } catch (erro) {
              console.log("Erro ao remover cliente do plano:", erro);
              mensagemPlano.textContent = "Não foi possível remover o cliente do plano.";
            }
          });
          itemCliente.appendChild(botaoRemoverCliente);
        }

        janelaClientes.appendChild(itemCliente);
      });
    }

    const acoes = cartao.querySelector(".acoes-plano");

    const botaoAdicionarCliente = document.createElement("button");
    botaoAdicionarCliente.type = "button";
    botaoAdicionarCliente.className = "botao-principal";
    botaoAdicionarCliente.textContent = "Adicionar cliente";
    botaoAdicionarCliente.addEventListener("click", () =>
      abrirClientesDoPlano(plano)
    );
    acoes.appendChild(botaoAdicionarCliente);

    if (usuarioPodeGerenciarPlanos()) {
      const botaoEditar = document.createElement("button");
      botaoEditar.type = "button";
      botaoEditar.className = "botao-secundario";
      botaoEditar.textContent = "Editar plano";
      botaoEditar.addEventListener("click", () => {
        planoIdEdicao.value = plano.id;
        valorNovoPlano.value = formatarValorEmReal(plano.valor || 0);
        usosNovoPlano.value = Number(plano.usosMensais) || 1;
        preencherServicosDoPlano(plano.servicoId || "");
        formCadastroPlano.classList.remove("escondida");
        formCadastroPlano.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      acoes.appendChild(botaoEditar);

      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.className = "botao-perigo";
      botaoExcluir.textContent = "Cancelar plano";
      botaoExcluir.addEventListener("click", async () => {
        if (!confirm(`Cancelar o plano "${plano.nome}"? O histórico de usos será mantido.`)) {
          return;
        }

        try {
          await deleteDoc(doc(db, "planos", plano.id));
          await carregarPlanos();
          mostrarListaDePlanos();
        } catch (erro) {
          console.log("Erro ao cancelar plano:", erro);
          mensagemPlano.textContent = "Não foi possível cancelar o plano.";
        }
      });
      acoes.appendChild(botaoExcluir);
    }

    listaPlanos.appendChild(cartao);
  });
}

async function abrirTelaPlanos() {
  esconderTodasAsTelas();
  telaPlanos.classList.remove("escondida");
  marcarBotaoAtivo("Planos");

  mensagemPlano.textContent = "";
  pesquisaPlano.value = "";
  formCadastroPlano.classList.add("escondida");

  const podeGerenciar = usuarioPodeGerenciarPlanos();
  botaoMostrarCadastroPlano.style.display = podeGerenciar ? "" : "none";

  try {
    await Promise.all([
      carregarPlanos(),
      carregarClientes(),
      carregarServicos(),
      carregarUsosPlanos()
    ]);

    preencherServicosDoPlano();
    mostrarListaDePlanos();
  } catch (erro) {
    console.log("Erro ao carregar planos:", erro);
    mensagemPlano.textContent = "Não foi possível carregar os planos.";
  }
}

async function abrirClientesDoPlano(plano) {
  planoSelecionadoParaClientes = plano;
  mensagemClientesPlano.textContent = "";
  tituloClientesPlano.textContent = "Adicionar cliente";
  resumoClientesPlano.textContent =
    `${plano.nome || "Plano"} • ${plano.servicoNome || "Serviço"} • ${Number(plano.usosMensais) || 0} uso(s) por mês`;
  formVinculoClientePlano?.classList.add("escondida");
  listaClientesDisponiveisPlano?.classList.remove("escondida");
  formVinculoClientePlano?.reset();

  try {
    await carregarClientes();
  } catch (erro) {
    console.log("Erro ao carregar clientes:", erro);
    mensagemClientesPlano.textContent =
      "Não foi possível carregar os clientes.";
  }

  mostrarClientesDisponiveisParaPlano();
  modalClientesPlano.classList.remove("escondido");
}

function mostrarClientesDisponiveisParaPlano() {
  if (!planoSelecionadoParaClientes || !listaClientesDisponiveisPlano) {
    return;
  }

  const clientesIdsLegados = Array.isArray(
    planoSelecionadoParaClientes.clientesIds
  )
    ? planoSelecionadoParaClientes.clientesIds
    : [];
  const clientesIds = [...new Set([
    ...clientesIdsLegados,
    ...vinculosDoPlano(planoSelecionadoParaClientes)
      .filter((vinculo) => vinculo.ativo !== false)
      .map((vinculo) => vinculo.clienteId)
  ])];

  const disponiveis = clientes
    .filter((cliente) => !clientesIds.includes(cliente.id))
    .sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    );

  listaClientesDisponiveisPlano.innerHTML = "";

  if (disponiveis.length === 0) {
    listaClientesDisponiveisPlano.innerHTML = `
      <p class="lista-vazia">
        Todos os clientes cadastrados já estão neste plano.
      </p>
    `;
    return;
  }

  disponiveis.forEach((cliente) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "cliente-disponivel-plano";

    const nome = document.createElement("strong");
    nome.textContent = cliente.nome;

    const acao = document.createElement("span");
    acao.textContent = "Adicionar";

    botao.append(nome, acao);

    botao.addEventListener("click", async () => {
      if (!usuarioPodeGerenciarPlanos()) {
        mensagemClientesPlano.textContent =
          "Você não tem permissão para alterar planos.";
        return;
      }

      const hoje = formatarDataParaSalvar(new Date());
      clienteIdVinculoPlano.value = cliente.id;
      nomeClienteVinculoPlano.textContent = cliente.nome;
      pagamentoVinculoPlano.value = "";
      valorVinculoPlano.value = formatarValorEmReal(planoSelecionadoParaClientes.valor || 0);
      dataInicioCicloPlano.value = hoje;
      campoDataInicioCicloPlano.classList.add("escondida");
      formVinculoClientePlano.querySelector('input[name="inicio-ciclo-plano"][value="hoje"]').checked = true;
      listaClientesDisponiveisPlano.classList.add("escondida");
      formVinculoClientePlano.classList.remove("escondida");
    });

    listaClientesDisponiveisPlano.appendChild(botao);
  });
}

document.querySelectorAll('input[name="inicio-ciclo-plano"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const escolherData = radio.checked && radio.value === "data";
    campoDataInicioCicloPlano.classList.toggle("escondida", !escolherData);
    dataInicioCicloPlano.required = escolherData;
  });
});

cancelarVinculoClientePlano?.addEventListener("click", () => {
  formVinculoClientePlano.classList.add("escondida");
  listaClientesDisponiveisPlano.classList.remove("escondida");
  mensagemClientesPlano.textContent = "";
});

valorVinculoPlano?.addEventListener("input", () => {
  formatarCampoValor(valorVinculoPlano);
});

formVinculoClientePlano?.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagemClientesPlano.textContent = "";

  if (!usuarioPodeGerenciarPlanos() || !planoSelecionadoParaClientes) {
    mensagemClientesPlano.textContent = "Você não tem permissão para alterar planos.";
    return;
  }

  const clienteId = clienteIdVinculoPlano.value;
  const cliente = clientes.find((item) => item.id === clienteId);
  const formaPagamento = pagamentoVinculoPlano.value;
  const valorPlano = converterValorParaNumero(valorVinculoPlano.value);
  const modoInicio = formVinculoClientePlano.querySelector(
    'input[name="inicio-ciclo-plano"]:checked'
  )?.value;
  const inicioCiclo = modoInicio === "data"
    ? dataInicioCicloPlano.value
    : formatarDataParaSalvar(new Date());

  if (!cliente || !["Dinheiro", "Pix", "Cartão"].includes(formaPagamento)
    || valorPlano <= 0 || !inicioCiclo) {
    mensagemClientesPlano.textContent = "Preencha a forma de pagamento, o valor e o início do ciclo.";
    return;
  }

  const atuaisIds = Array.isArray(planoSelecionadoParaClientes.clientesIds)
    ? planoSelecionadoParaClientes.clientesIds
    : [];
  const vinculosAtuais = vinculosDoPlano(planoSelecionadoParaClientes)
    .filter((vinculo) => vinculo.clienteId !== clienteId);
  const novoVinculo = {
    clienteId,
    clienteNome: cliente.nome,
    formaPagamento,
    valorPlano,
    inicioCiclo,
    ciclosPagos: [inicioCiclo],
    ativo: true,
    registradoEm: Date.now(),
    registradoPor: nomeUsuario
  };

  try {
    await updateDoc(doc(db, "planos", planoSelecionadoParaClientes.id), {
      clientesIds: [...new Set([...atuaisIds, clienteId])],
      clientesPlano: [...vinculosAtuais, novoVinculo],
      atualizadoEm: Date.now()
    });

    const agora = new Date();
    const dataPagamento = formatarDataParaSalvar(agora);
    const horaPagamento = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    const idMovimentacao = `assinatura_plano_${planoSelecionadoParaClientes.id}_${clienteId}_${inicioCiclo}`;

    await setDoc(doc(db, "movimentacoesFinanceiras", idMovimentacao), {
      tipo: "entrada",
      origem: "plano",
      categoria: "plano",
      descricao: `Assinatura do plano ${planoSelecionadoParaClientes.nome}`,
      valor: valorPlano,
      data: dataPagamento,
      hora: horaPagamento,
      formaPagamento,
      planoId: planoSelecionadoParaClientes.id,
      planoNome: planoSelecionadoParaClientes.nome,
      cliente: cliente.nome,
      clienteId,
      inicioCiclo,
      criadoPor: nomeUsuario,
      usuarioId,
      dataCadastro: Date.now()
    });

    mensagemClientesPlano.textContent = `${cliente.nome} foi adicionado ao plano.`;
    await carregarPlanos();
    planoSelecionadoParaClientes = planos.find(
      (item) => item.id === planoSelecionadoParaClientes.id
    ) || planoSelecionadoParaClientes;
    mostrarListaDePlanos();
    formVinculoClientePlano.classList.add("escondida");
    listaClientesDisponiveisPlano.classList.remove("escondida");
    mostrarClientesDisponiveisParaPlano();
  } catch (erro) {
    console.log("Erro ao adicionar cliente ao plano:", erro);
    mensagemClientesPlano.textContent = "Não foi possível adicionar o cliente.";
  }
});

/* =========================================================
   TEMA
========================================================= */

function aplicarTema(tema) {
  const temaClaro = true;

  document.body.classList.add("tema-claro");

  opcoesTema.forEach(
    (opcao) => {
      opcao.checked =
        opcao.value ===
        (
          temaClaro
            ? "claro"
            : "escuro"
        );
    }
  );
}

/* Aplica imediatamente a última preferência neste aparelho,
   sem esperar a resposta da internet. */
aplicarTema(
  localStorage.getItem("temaSistema") ||
  "escuro"
);

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

async function abrirTelaConfiguracoes() {
  esconderTodasAsTelas();

  telaConfiguracoes.classList.remove(
    "escondida"
  );

  configuracaoSenha.classList.remove(
    "escondida"
  );

  mensagemTema.textContent = "";
  mensagemSenha.textContent = "";

  formAlterarSenha.reset();
  configuracaoApagarDados?.classList.toggle(
    "escondida",
    tipoUsuario !== "administrador"
  );
  if (senhaAdministradorApagarDados) senhaAdministradorApagarDados.value = "";
  if (mensagemApagarDados) mensagemApagarDados.textContent = "";

  if (
    tipoUsuario ===
    "administrador"
  ) {
    usuarioAlterarSenha.disabled = false;

    descricaoConfiguracaoSenha.textContent =
      "Altere a senha do administrador ou de qualquer profissional cadastrado.";

    await carregarBarbeiros();

    preencherUsuariosParaAlterarSenha();
  } else if (
    tipoUsuario ===
    "recepcionista"
  ) {
    descricaoConfiguracaoSenha.textContent =
      "Altere somente a senha da recepcionista.";

    preencherUsuarioAtualParaAlterarSenha();
  } else {
    descricaoConfiguracaoSenha.textContent =
      "Altere somente a senha do seu usuário.";

    preencherUsuarioAtualParaAlterarSenha();
  }

  marcarBotaoAtivo(
    "Configurações"
  );
}

/* =========================================================
   MENU
========================================================= */

const rotasDoMenu = {
  "Grade de horários": "dashboard",
  "Clientes cadastrados": "clientes",
  "WhatsApp": "whatsapp",
  "Produtos e Serviços": "produtos",
  "Planos": "planos",
  "Relatório": "relatorio",
  "Barbeiros": "barbeiros",
  "Configurações": "configuracoes"
};

function registrarTelaNoHistorico(tela) {
  if (!tela || history.state?.tela === tela) return;
  history.pushState({ painelBarbearia: true, tela }, "", window.location.href);
}

async function abrirRotaInterna(tela) {
  const rotas = {
    dashboard: abrirTelaDashboard,
    clientes: abrirTelaClientes,
    whatsapp: abrirTelaWhatsApp,
    produtos: abrirTelaProdutosServicos,
    planos: abrirTelaPlanos,
    relatorio: abrirTelaRelatorio,
    barbeiros: abrirTelaBarbeiros,
    configuracoes: abrirTelaConfiguracoes
  };

  await (rotas[tela] || abrirTelaDashboard)();
}

function configurarBotaoVoltarDoCelular() {
  history.replaceState(
    { painelBarbearia: true, tela: "limite", limitePainel: true },
    "",
    window.location.href
  );
  history.pushState(
    { painelBarbearia: true, tela: "dashboard" },
    "",
    window.location.href
  );

  window.addEventListener("popstate", async (event) => {
    if (event.state?.limitePainel || !event.state?.painelBarbearia) {
      await abrirRotaInterna("dashboard");
      history.pushState(
        { painelBarbearia: true, tela: "dashboard" },
        "",
        window.location.href
      );
      return;
    }

    await abrirRotaInterna(event.state.tela || "dashboard");
  });
}

function montarMenu() {
  menu.innerHTML = "";

  const botoesAdministrador = [
    "Grade de horários",
    "Clientes cadastrados",
    "WhatsApp",
    "Produtos e Serviços",
    "Planos",
    "Relatório",
    "Barbeiros",
    "Configurações",
    "Sair"
  ];

  const botoesRecepcionista = [
    "Grade de horários",
    "Clientes cadastrados",
    "WhatsApp",
    "Produtos e Serviços",
    "Planos",
    "Relatório",
    "Barbeiros",
    "Configurações",
    "Sair"
  ];

  const botoesBarbeiro = [
    "Grade de horários",
    "Produtos e Serviços",
    "Planos",
    "Relatório",
    "Configurações",
    "Sair"
  ];

  let botoes =
    botoesBarbeiro;

  if (
    tipoUsuario ===
    "administrador"
  ) {
    botoes =
      botoesAdministrador;
  } else if (
    tipoUsuario ===
    "recepcionista"
  ) {
    botoes =
      botoesRecepcionista;
  }

  botoes.forEach(
    (nomeBotao) => {
      const botao =
        document.createElement(
          "button"
        );

      botao.type = "button";
      botao.className =
        "botao-menu";

      botao.textContent =
        nomeBotao;

      if (
        nomeBotao ===
        "Grade de horários"
      ) {
        botao.classList.add(
          "ativo"
        );
      }

      botao.addEventListener(
        "click",
        async () => {
          registrarTelaNoHistorico(rotasDoMenu[nomeBotao]);

          if (
            nomeBotao ===
            "Grade de horários"
          ) {
            abrirTelaDashboard();
            return;
          }

          if (
            nomeBotao ===
            "Clientes cadastrados"
          ) {
            await abrirTelaClientes();
            return;
          }

          if (nomeBotao === "WhatsApp") {
            await abrirTelaWhatsApp();
            return;
          }

          if (
            nomeBotao ===
            "Produtos e Serviços"
          ) {
            await abrirTelaProdutosServicos();
            return;
          }

          if (
            nomeBotao ===
            "Planos"
          ) {
            await abrirTelaPlanos();
            return;
          }

          if (
            nomeBotao ===
            "Relatório"
          ) {
            await abrirTelaRelatorio();
            return;
          }

          if (
            nomeBotao ===
            "Barbeiros"
          ) {
            await abrirTelaBarbeiros();
            return;
          }

          if (
            nomeBotao ===
            "Configurações"
          ) {
            await abrirTelaConfiguracoes();
            return;
          }

          if (
            nomeBotao ===
            "Sair"
          ) {
            if (modalSair) {
              modalSair.classList.remove(
                "escondido"
              );
            } else {
              await encerrarSessao();
            }
          }
        }
      );

      menu.appendChild(
        botao
      );
    }
  );
}

/* =========================================================
   CARREGAR DADOS
========================================================= */

async function carregarBarbeiros() {
  const resposta =
    await getDocs(
      collection(
        db,
        "barbeiros"
      )
    );

  barbeiros =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .filter(
        (barbeiro) =>
          barbeiro.ativo !== false
      )
      .sort(
        (a, b) =>
          a.nome.localeCompare(
            b.nome,
            "pt-BR"
          )
      );
}

async function carregarClientes() {
  const resposta =
    await getDocs(
      collection(
        db,
        "clientes"
      )
    );

  clientes =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .sort(
        (a, b) =>
          a.nome.localeCompare(
            b.nome,
            "pt-BR"
          )
      );
}

async function carregarProdutos() {
  const resposta =
    await getDocs(
      collection(
        db,
        "produtos"
      )
    );

  produtos =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .sort(
        (a, b) =>
          a.nome.localeCompare(
            b.nome,
            "pt-BR"
          )
      );
}

async function carregarServicos() {
  const resposta =
    await getDocs(
      collection(
        db,
        "servicos"
      )
    );

  servicos =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .sort(
        (a, b) =>
          a.nome.localeCompare(
            b.nome,
            "pt-BR"
          )
      );
}

/* =========================================================
   SELECT BARBEIROS
========================================================= */

function preencherSelectDeBarbeiros() {
  selectBarbeiro.innerHTML = `
    <option value="">
      Escolha um profissional
    </option>
  `;

  barbeiros.forEach(
    (barbeiro) => {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        barbeiro.nome;

      opcao.textContent =
        barbeiro.nome;

      selectBarbeiro.appendChild(
        opcao
      );
    }
  );

  if (barbeiroAtual) {
    selectBarbeiro.value =
      barbeiroAtual;
  }
}

/* =========================================================
   SENHAS
========================================================= */

function preencherUsuariosParaAlterarSenha() {
  usuarioAlterarSenha.disabled =
    false;

  usuarioAlterarSenha.innerHTML = `
    <option value="">
      Selecione um usuário
    </option>

    <option value="administrador">
      Administrador
    </option>

  `;

  barbeiros.forEach(
    (barbeiro) => {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        barbeiro.id;

      opcao.textContent =
        barbeiro.nome;

      usuarioAlterarSenha.appendChild(
        opcao
      );
    }
  );

  atualizarSenhaAtualSelecionada();
}

function preencherUsuarioAtualParaAlterarSenha() {
  usuarioAlterarSenha.innerHTML =
    "";

  const opcao =
    document.createElement(
      "option"
    );

  opcao.value =
    usuarioId;

  opcao.textContent =
    nomeUsuario;

  usuarioAlterarSenha.appendChild(
    opcao
  );

  usuarioAlterarSenha.value =
    usuarioId;

  usuarioAlterarSenha.disabled =
    true;

  atualizarSenhaAtualSelecionada();
}

async function atualizarSenhaAtualSelecionada() {
  if (!senhaAtualUsuario) return;

  const selecionado = usuarioAlterarSenha?.value || "";

  if (!selecionado) {
    senhaAtualUsuario.value = "";
    senhaAtualUsuario.placeholder = "Selecione um usuário";
    return;
  }

  try {
    if (selecionado === "administrador") {
      const documentoConfiguracao = await getDoc(configuracaoGeral);
      const configuracoes = documentoConfiguracao.exists()
        ? documentoConfiguracao.data()
        : {};

      senhaAtualUsuario.value = configuracoes.senhaAdministrador || configuracoes.senha || "";
      return;
    }

    const barbeiro = barbeiros.find((item) => item.id === selecionado);
    senhaAtualUsuario.value = barbeiro?.senha || "";
    senhaAtualUsuario.placeholder = barbeiro?.senha
      ? ""
      : "Este profissional ainda não possui senha";
  } catch (erro) {
    console.log("Erro ao carregar senha atual:", erro);
    senhaAtualUsuario.value = "";
    senhaAtualUsuario.placeholder = "Não foi possível carregar a senha";
  }
}

usuarioAlterarSenha?.addEventListener(
  "change",
  atualizarSenhaAtualSelecionada
);

/* =========================================================
   CLIENTES NO AGENDAMENTO
========================================================= */

function mostrarClientesNoAgendamento() {
  const pesquisa =
    pesquisaClienteAgendamento.value
      .trim()
      .toLowerCase();

  const clientesFiltrados =
    clientes.filter(
      (cliente) =>
        cliente.nome
          .toLowerCase()
          .includes(pesquisa)
    );

  listaClientesAgendamento.innerHTML =
    "";

  if (
    clientesFiltrados.length === 0
  ) {
    listaClientesAgendamento.innerHTML = `
      <p class="cliente-nao-encontrado">
        Nenhum cliente encontrado.
      </p>
    `;

    return;
  }

  clientesFiltrados.forEach(
    (cliente) => {
      const botao =
        document.createElement(
          "button"
        );

      botao.type = "button";

      botao.className =
        "opcao-cliente-agendamento";

      botao.textContent =
        cliente.nome;

      if (
        clienteSelecionado &&
        clienteSelecionado.id ===
          cliente.id
      ) {
        botao.classList.add(
          "selecionado"
        );
      }

      botao.addEventListener(
        "click",
        () => {
          clienteSelecionado =
            cliente;

          pesquisaClienteAgendamento.value =
            cliente.nome;

          mostrarClientesNoAgendamento();
        }
      );

      listaClientesAgendamento.appendChild(
        botao
      );
    }
  );
}

/* =========================================================
   AGENDAMENTOS
========================================================= */

async function carregarAgendamentos() {
  if (!barbeiroAtual) {
    agendamentos = [];
    return;
  }

  const [resposta, respostaMovimentacoes] = await Promise.all([
    getDocs(collection(db, "agendamentos")),
    getDocs(collection(db, "movimentacoesFinanceiras"))
  ]);

  agendamentos =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .filter(
        (agendamento) =>
          agendamento.barbeiro ===
            barbeiroAtual &&
          agendamento.status !==
            "cancelado"
      );
}

function encontrarAgendamentos(
  data,
  hora
 ) {
  return agendamentos.filter(
    (agendamento) =>
      agendamento.data === data &&
      agendamento.hora === hora
  );
}

function atualizarResumoDoDashboard() {
  const hoje = formatarDataParaSalvar(new Date());
  const agora = new Date();
  const agendamentosHoje = agendamentos.filter(
    (agendamento) =>
      agendamento.data === hoje &&
      agendamento.status !== "cancelado"
  );

  const concluidos = agendamentosHoje.filter(
    (agendamento) => agendamento.status === "concluido"
  );
  const pendentes = agendamentosHoje.filter(
    (agendamento) =>
      agendamento.status !== "concluido" &&
      agendamento.status !== "nao_realizado"
  );
  const proximo = pendentes
    .filter((agendamento) => criarDataHora(agendamento.data, agendamento.hora) >= agora)
    .sort(
      (a, b) =>
        criarDataHora(a.data, a.hora) - criarDataHora(b.data, b.hora)
    )[0];

  resumoAgendadosHoje.textContent = agendamentosHoje.length;
  resumoConcluidosHoje.textContent = concluidos.length;
  resumoPendentesHoje.textContent = pendentes.length;
  resumoProximoHorario.textContent = proximo?.hora || "—";
  resumoProximoCliente.textContent = proximo?.cliente || "Nenhum cliente";
}

function mostrarProximosAgendamentos() {
  atualizarResumoDoDashboard();

  listaProximosAgendamentos.innerHTML =
    "";

  if (!barbeiroAtual) {
    quantidadeProximosAgendamentos.textContent =
      "0 horários";

    listaProximosAgendamentos.innerHTML = `
      <p class="lista-agendamentos-vazia">
        Escolha um profissional para visualizar os horários marcados.
      </p>
    `;

    return;
  }

  const proximosAgendamentos =
    agendamentos
      .filter(
        (agendamento) =>
          agendamento.status !==
            "cancelado" &&
          agendamento.status !==
            "concluido" &&
          agendamento.status !==
            "nao_realizado"
      )
      .sort(
        (a, b) =>
          criarDataHora(
            a.data,
            a.hora
          ) -
          criarDataHora(
            b.data,
            b.hora
          )
      );

  quantidadeProximosAgendamentos.textContent =
    proximosAgendamentos.length === 1
      ? "1 horário"
      : `${proximosAgendamentos.length} horários`;

  if (
    proximosAgendamentos.length === 0
  ) {
    listaProximosAgendamentos.innerHTML = `
      <p class="lista-agendamentos-vazia">
        Nenhum horário marcado para ${barbeiroAtual}.
      </p>
    `;

    return;
  }

  proximosAgendamentos.forEach(
    (agendamento) => {
      const botao =
        document.createElement(
          "button"
        );

      botao.type = "button";

      botao.className =
        "item-proximo-agendamento";

      const data =
        dataPorTexto(
          agendamento.data
        );

      const dataFormatada =
        data.toLocaleDateString(
          "pt-BR"
        );

      const diaDaSemana =
        data.toLocaleDateString(
          "pt-BR",
          {
            weekday: "long"
          }
        );

      botao.innerHTML = `
        <div class="data-proximo-agendamento">
          ${dataFormatada}
        </div>

        <div class="hora-proximo-agendamento">
          ${agendamento.hora}
        </div>

        <div class="cliente-proximo-agendamento">
          <strong>
            ${agendamento.cliente}
          </strong>

          <small>
            ${diaDaSemana}
          </small>
        </div>

        <div class="servico-proximo-agendamento">
          <strong>
            ${
              agendamento.servico ||
              agendamento.tipo ||
              "Horário marcado"
            }
          </strong>

          <small>
            ${agendamento.barbeiro}
          </small>
        </div>
      `;

      botao.addEventListener(
        "click",
        () => {
          abrirDetalhes(
            agendamento
          );
        }
      );

      listaProximosAgendamentos.appendChild(
        botao
      );
    }
  );
}

function minutosDoHorario(horario) {
  const [hora, minuto] = String(horario || "00:00")
    .split(":")
    .map(Number);

  return Math.max(
    0,
    Math.min(24 * 60, (hora || 0) * 60 + (minuto || 0))
  );
}

function horaFinalDoAgendamento(agendamento) {
  if (agendamento.horaFim) {
    return agendamento.horaFim;
  }

  const inicio = minutosDoHorario(agendamento.hora);
  const fim = Math.min(24 * 60, inicio + 30);
  const hora = String(Math.floor(fim / 60)).padStart(2, "0");
  const minuto = String(fim % 60).padStart(2, "0");
  return `${hora}:${minuto}`;
}

function mostrarAgendaContinua() {
  const grade = document.createElement("div");
  grade.className = "grade-agenda grade-agenda-continua";

  const inicioGrade = 7 * 60;
  const fimGrade = 22 * 60;
  const duracaoGrade = fimGrade - inicioGrade;
  const larguraColuna = Math.round(180 * zoomAgenda);
  const larguraRegua = Math.round(72 * zoomAgenda);
  const alturaHora = Math.round(72 * zoomAgenda);
  const alturaDia = 15 * alturaHora;
  const tamanhoTexto = Math.round(13 * zoomAgenda);

  grade.style.gridTemplateColumns =
    `${larguraRegua}px repeat(${dias.length}, ${larguraColuna}px)`;
  grade.style.setProperty("--largura-coluna", `${larguraColuna}px`);
  grade.style.setProperty("--largura-regua", `${larguraRegua}px`);
  grade.style.setProperty("--altura-dia", `${alturaDia}px`);
  grade.style.setProperty("--altura-hora", `${alturaHora}px`);
  grade.style.setProperty("--tamanho-texto", `${tamanhoTexto}px`);

  const canto = document.createElement("div");
  canto.className = "canto-agenda-continua";
  canto.textContent = "Horário";
  grade.appendChild(canto);

  dias.forEach((dia) => {
    const cabecalho = document.createElement("div");
    cabecalho.className = "dia-cabecalho dia-cabecalho-continuo";
    cabecalho.textContent = formatarDataParaMostrar(dia);
    grade.appendChild(cabecalho);
  });

  const regua = document.createElement("div");
  regua.className = "regua-horarios";

  for (let hora = 7; hora <= 22; hora++) {
    const marcador = document.createElement("span");
    marcador.textContent = `${String(hora).padStart(2, "0")}:00`;
    marcador.style.top = `${(hora - 7) * alturaHora}px`;
    regua.appendChild(marcador);
  }

  grade.appendChild(regua);

  dias.forEach((dia) => {
    const data = formatarDataParaSalvar(dia);
    const coluna = document.createElement("div");
    coluna.className = "coluna-dia-continua";
    coluna.dataset.data = data;
    coluna.title = "Clique para adicionar um agendamento";

    const botaoAdicionar = document.createElement("button");
    botaoAdicionar.type = "button";
    botaoAdicionar.className = "adicionar-na-coluna";
    botaoAdicionar.textContent = "+";
    botaoAdicionar.title = "Adicionar agendamento neste dia";
    botaoAdicionar.setAttribute(
      "aria-label",
      `Adicionar agendamento em ${formatarDataParaMostrar(dia)}`
    );

    const abrirNovo = async (event) => {
      event?.stopPropagation();

      if (!barbeiroAtual) {
        alert("Escolha um profissional antes de criar um agendamento.");
        return;
      }

      await abrirNovoAgendamento(data, "");
    };

    botaoAdicionar.addEventListener("click", abrirNovo);
    coluna.addEventListener("click", abrirNovo);
    coluna.appendChild(botaoAdicionar);

    const agendamentosDoDia = agendamentos
      .filter((agendamento) => agendamento.data === data)
      .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));

    agendamentosDoDia.forEach((agendamento) => {
      const inicio = minutosDoHorario(agendamento.hora);
      const horaFim = horaFinalDoAgendamento(agendamento);
      let fim = minutosDoHorario(horaFim);
      if (fim <= inicio) fim = Math.min(24 * 60, inicio + 30);

      if (fim <= inicioGrade || inicio >= fimGrade) {
        return;
      }

      const inicioVisivel = Math.max(inicioGrade, inicio);
      const fimVisivel = Math.min(fimGrade, fim);

      const bloco = document.createElement("button");
      bloco.type = "button";
      bloco.className = "agendamento-continuo";
      bloco.style.top = `${((inicioVisivel - inicioGrade) / duracaoGrade) * alturaDia}px`;
      bloco.style.height = `${Math.max(34, ((fimVisivel - inicioVisivel) / duracaoGrade) * alturaDia)}px`;

      const aguardandoPagamento = Boolean(
        agendamento.status !== "concluido" &&
        agendamento.status !== "cancelado" &&
        agendamento.status !== "nao_realizado" &&
        (
          agendamento.aguardandoPagamento === true ||
          (
            agendamento.dataRegistroServicos &&
            Array.isArray(agendamento.servicosProduzidos) &&
            agendamento.servicosProduzidos.length > 0
          )
        )
      );

      if (aguardandoPagamento) bloco.classList.add("aguardando-pagamento");
      if (agendamento.status === "concluido") bloco.classList.add("concluido");
      if (
        agendamento.status === "cancelado" ||
        agendamento.status === "nao_realizado"
      ) {
        bloco.classList.add("nao-realizado");
      }

      const periodo = document.createElement("strong");
      periodo.className = "periodo-agendamento-continuo";
      periodo.textContent = `${agendamento.hora || "--:--"} – ${horaFim}`;

      const nome = document.createElement("span");
      nome.className = "nome-agendamento-continuo";
      nome.textContent = agendamento.cliente || "Cliente";

      const tipo = document.createElement("small");
      tipo.textContent = aguardandoPagamento
        ? "Aguardando pagamento"
        : agendamento.servico || agendamento.tipo || "Horário marcado";

      bloco.append(periodo, nome, tipo);
      bloco.addEventListener("click", (event) => {
        event.stopPropagation();
        abrirDetalhes(agendamento);
      });

      coluna.appendChild(bloco);
    });

    grade.appendChild(coluna);
  });

  agenda.innerHTML = "";
  agenda.appendChild(grade);

  agendaScroll.scrollTop = 0;

  mostrarProximosAgendamentos();
}

function mostrarAgenda() {
  return mostrarAgendaContinua();

  /*
   * Grade antiga em intervalos de 30 minutos mantida abaixo apenas como
   * referência temporária. O retorno acima ativa a coluna contínua.
   */
  const grade =
    document.createElement(
      "div"
    );

  grade.className =
    "grade-agenda";


  /* =========================================
     TAMANHOS DA GRADE
  ========================================= */

  const larguraHorario =
    Math.round(
      82 * zoomAgenda
    );

  const larguraColuna =
    Math.round(
      155 * zoomAgenda
    );

  const alturaCabecalho =
    Math.round(
      50 * zoomAgenda
    );

  const alturaLinha =
    Math.round(
      74 * zoomAgenda
    );

  const tamanhoTexto =
    Math.round(
      13 * zoomAgenda
    );


  grade.style.gridTemplateColumns =
    `${larguraHorario}px repeat(${dias.length}, ${larguraColuna}px)`;


  grade.style.setProperty(
    "--largura-coluna",
    `${larguraColuna}px`
  );

  grade.style.setProperty(
    "--altura-cabecalho",
    `${alturaCabecalho}px`
  );

  grade.style.setProperty(
    "--altura-linha",
    `${alturaLinha}px`
  );

  grade.style.setProperty(
    "--tamanho-texto",
    `${tamanhoTexto}px`
  );


  /* =========================================
     CANTO SUPERIOR
  ========================================= */

  const canto =
    document.createElement(
      "div"
    );

  canto.className =
    "canto-horario";

  grade.appendChild(
    canto
  );


  /* =========================================
     CABEÇALHO DOS DIAS
  ========================================= */

  dias.forEach(
    (dia) => {

      const cabecalho =
        document.createElement(
          "div"
        );

      cabecalho.className =
        "dia-cabecalho";

      cabecalho.textContent =
        formatarDataParaMostrar(
          dia
        );

      grade.appendChild(
        cabecalho
      );
    }
  );


  /* =========================================
     HORÁRIOS
  ========================================= */

  horarios.forEach(
    (hora) => {

      const horario =
        document.createElement(
          "div"
        );

      horario.className =
        "horario";

      horario.textContent =
        hora;

      grade.appendChild(
        horario
      );


      /* =========================================
         DIAS DE CADA HORÁRIO
      ========================================= */

      dias.forEach(
        (dia) => {

          const data =
            formatarDataParaSalvar(
              dia
            );


          /*
            Aqui pegamos TODOS os clientes
            daquele mesmo horário.
          */

          const agendamentosHorario =
            encontrarAgendamentos(
              data,
              hora
            );


          const celula =
            document.createElement(
              "div"
            );

          celula.className =
            "celula-horario";


          /* =========================================
             HORÁRIO VAZIO
          ========================================= */

          if (
            agendamentosHorario.length ===
            0
          ) {

            /*
              Horário vazio continua funcionando
              como antes.

              Clicou na célula = novo agendamento.
            */

            celula.addEventListener(
              "click",
              async () => {

                if (!barbeiroAtual) {

                  alert(
                    "Escolha um profissional antes de criar um agendamento."
                  );

                  return;
                }

                await abrirNovoAgendamento(
                  data,
                  hora
                );
              }
            );

          } else {

            /* =========================================
               HORÁRIO COM CLIENTES
            ========================================= */

            celula.classList.add(
              "ocupado"
            );


            const containerClientes =
              document.createElement(
                "div"
              );

            containerClientes.className =
              "clientes-mesmo-horario";


            /* =========================================
               MOSTRAR TODOS OS CLIENTES
            ========================================= */

            agendamentosHorario.forEach(
              (agendamento) => {

                const item =
                  document.createElement(
                    "button"
                  );

                item.type =
                  "button";

                item.className =
                  "cliente-horario-agenda";


                /* ===============================
                   STATUS
                =============================== */

                const aguardandoPagamento = Boolean(
                  agendamento.status !== "concluido" &&
                  agendamento.status !== "cancelado" &&
                  agendamento.status !== "nao_realizado" &&
                  (
                    agendamento.aguardandoPagamento === true ||
                    (
                      agendamento.dataRegistroServicos &&
                      Array.isArray(agendamento.servicosProduzidos) &&
                      agendamento.servicosProduzidos.length > 0
                    )
                  )
                );

                if (aguardandoPagamento) {
                  item.classList.add("aguardando-pagamento");
                  item.title = `${agendamento.cliente} — aguardando confirmação de pagamento`;
                  item.setAttribute(
                    "aria-label",
                    `${agendamento.cliente}, aguardando confirmação de pagamento`
                  );
                }

                if (
                  agendamento.status ===
                  "concluido"
                ) {

                  item.classList.add(
                    "concluido"
                  );
                }


                if (
                  agendamento.status ===
                    "cancelado" ||
                  agendamento.status ===
                    "nao_realizado"
                ) {

                  item.classList.add(
                    "nao-realizado"
                  );
                }


                /* ===============================
                   NOME
                =============================== */

                const nome =
                  document.createElement(
                    "span"
                  );

                nome.className =
                  "nome-agendamento";

                nome.textContent =
                  agendamento.cliente;


                /* ===============================
                   TIPO / SERVIÇO
                =============================== */

                const tipo =
                  document.createElement(
                    "span"
                  );

                tipo.className =
                  "tipo-agendamento-grade";

                tipo.textContent = aguardandoPagamento
                  ? "Aguardando pagamento"
                  : agendamento.servico ||
                    agendamento.tipo ||
                    "Horário marcado";


                item.appendChild(
                  nome
                );

                item.appendChild(
                  tipo
                );


                /* ===============================
                   ABRIR CLIENTE
                =============================== */

                item.addEventListener(
                  "click",
                  (event) => {

                    event.stopPropagation();

                    abrirDetalhes(
                      agendamento
                    );
                  }
                );


                containerClientes.appendChild(
                  item
                );
              }
            );


            celula.appendChild(
              containerClientes
            );


            /* =========================================
               BOTÃO + NOVO CLIENTE
            ========================================= */

            const botaoAdicionar =
              document.createElement(
                "button"
              );

            botaoAdicionar.type =
              "button";

            botaoAdicionar.className =
              "botao-adicionar-cliente-horario";

            botaoAdicionar.textContent =
              "+";

            botaoAdicionar.title =
              "Adicionar outro cliente neste horário";


            botaoAdicionar.addEventListener(
              "click",
              async (event) => {

                event.stopPropagation();

                if (!barbeiroAtual) {

                  alert(
                    "Escolha um profissional antes de criar um agendamento."
                  );

                  return;
                }


                await abrirNovoAgendamento(
                  data,
                  hora
                );
              }
            );


            /*
              IMPORTANTE:
              agora o botão é colocado aqui,
              dentro do mesmo bloco em que
              ele foi criado.
            */

            celula.appendChild(
              botaoAdicionar
            );
          }


          grade.appendChild(
            celula
          );
        }
      );
    }
  );


  /* =========================================
     MOSTRAR GRADE
  ========================================= */

  agenda.innerHTML =
    "";

  agenda.appendChild(
    grade
  );


  mostrarProximosAgendamentos();
}

async function abrirNovoAgendamento(
  data,
  hora
) {
  await carregarClientes();

  if (
    clientes.length === 0
  ) {
    alert(
      "Cadastre um cliente antes de criar um agendamento."
    );

    return;
  }

  clienteSelecionado = null;

  pesquisaClienteAgendamento.value =
    "";

  const horarioMarcado =
    document.querySelector(
      'input[name="tipo-agendamento"][value="Horário marcado"]'
    );

  if (horarioMarcado) {
    horarioMarcado.checked =
      true;
  }

  mostrarClientesNoAgendamento();

  dataAgendamento.value =
    data;

  horaAgendamento.value =
    hora || "";

  horaFimAgendamento.value =
    "";

  const dataFormatada =
    dataPorTexto(
      data
    ).toLocaleDateString(
      "pt-BR"
    );

  informacaoHorario.textContent =
    `${dataFormatada} — profissional ${barbeiroAtual} vai atender. Informe o início e o término.`;

  modalNovo.classList.remove(
    "escondido"
  );
}

function abrirDetalhes(
  agendamento
) {
  agendamentoSelecionado =
    agendamento;

  detalheCliente.textContent =
    agendamento.cliente;

  detalheData.textContent =
    dataPorTexto(
      agendamento.data
    ).toLocaleDateString(
      "pt-BR"
    );

  detalheHora.textContent =
    `${agendamento.hora || "--:--"} até ${horaFinalDoAgendamento(agendamento)}`;

  const nomesServicosRegistrados = Array.isArray(
    agendamento.servicosProduzidos
  )
    ? agendamento.servicosProduzidos
        .map((servico) => servico.nome)
        .filter(Boolean)
    : [];

  if (detalheServicosRegistrados) {
    detalheServicosRegistrados.textContent =
      nomesServicosRegistrados.length > 0
        ? nomesServicosRegistrados.join(" + ")
        : "Ainda não informados";
  }

  const podeFinalizar = usuarioPodeFinalizarAtendimento();
  const podeCancelar = usuarioPodeCancelarAgendamento(agendamento);
  const podeRegistrarServicos = usuarioPodeRegistrarServicos(agendamento);
  botaoConcluirAgendamento.style.display = podeFinalizar ? "" : "none";
  botaoCancelarAgendamento.style.display = podeCancelar ? "" : "none";
  botaoNaoRealizadoAgendamento.style.display = podeFinalizar ? "" : "none";
  if (botaoRegistrarServicosBarbeiro) {
    botaoRegistrarServicosBarbeiro.style.display = podeRegistrarServicos ? "" : "none";
  }

  modalDetalhes.classList.remove(
    "escondido"
  );
}

function calcularSubtotalServicosProduzidos() {
  const ids = Array.from(
    containerServicosProduzidos?.querySelectorAll(".select-servico-produzido") || []
  )
    .map((select) => select.value)
    .filter(Boolean);

  return [...new Set(ids)].reduce((total, id) => {
    const servico = servicos.find((item) => item.id === id);
    return total + (Number(servico?.valor) || 0);
  }, 0);
}

function iniciarEscutaAgendamentosTempoReal() {
  if (cancelarEscutaAgendamentos) {
    cancelarEscutaAgendamentos();
    cancelarEscutaAgendamentos = null;
  }

  if (!barbeiroAtual) return;

  const barbeiroDaEscuta = barbeiroAtual;
  const consultaAgenda = query(
    collection(db, "agendamentos"),
    where("barbeiro", "==", barbeiroDaEscuta)
  );

  cancelarEscutaAgendamentos = onSnapshot(
    consultaAgenda,
    (resposta) => {
      if (barbeiroAtual !== barbeiroDaEscuta) return;

      const scrollHorizontal = agendaScroll?.scrollLeft || 0;
      const scrollVertical = agendaScroll?.scrollTop || 0;

      agendamentos = resposta.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data()
        }))
        .filter((agendamento) => agendamento.status !== "cancelado");

      mostrarAgenda();

      if (agendaScroll) {
        agendaScroll.scrollLeft = scrollHorizontal;
        agendaScroll.scrollTop = scrollVertical;
      }
    },
    (erro) => {
      console.log("Erro na atualização automática da agenda:", erro);
    }
  );
}

function atualizarSubtotalServicosProduzidos() {
  const subtotal = calcularSubtotalServicosProduzidos();

  if (subtotalServicosProduzidos && !subtotalServicosProduzidosEditado) {
    subtotalServicosProduzidos.value = formatarValorEmReal(subtotal);
  }

  atualizarValorTotalRegistroBarbeiro();
}

function recalcularSubtotalServicosProduzidos() {
  subtotalServicosProduzidosEditado = false;
  atualizarSubtotalServicosProduzidos();
}

function adicionarLinhaServicoProduzido(servicoId = "") {
  if (!containerServicosProduzidos) return;

  const linha = document.createElement("div");
  linha.className = "linha-selecao-atendimento";

  const select = document.createElement("select");
  select.className = "select-servico-produzido";
  select.innerHTML = `<option value="">Selecione o serviço</option>`;

  servicos.forEach((servico) => {
    const opcao = document.createElement("option");
    opcao.value = servico.id;
    opcao.textContent = `${servico.nome} — ${formatarValorEmReal(servico.valor)}`;
    select.appendChild(opcao);
  });

  select.value = servicoId;
  select.addEventListener("change", recalcularSubtotalServicosProduzidos);
  linha.appendChild(select);

  if (containerServicosProduzidos.children.length > 0) {
    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "botao-remover-item-atendimento";
    remover.textContent = "×";
    remover.addEventListener("click", () => {
      linha.remove();
      recalcularSubtotalServicosProduzidos();
    });
    linha.appendChild(remover);
  }

  containerServicosProduzidos.appendChild(linha);
  atualizarSubtotalServicosProduzidos();
}

function obterProdutosVendidosPeloBarbeiro() {
  const ids = Array.from(
    containerProdutosVendidosBarbeiro?.querySelectorAll(".select-produto-vendido-barbeiro") || []
  )
    .map((select) => select.value)
    .filter(Boolean);

  return [...new Set(ids)]
    .map((id) => produtos.find((produto) => produto.id === id))
    .filter(Boolean);
}

function atualizarValorProdutosVendidosBarbeiro() {
  const total = obterProdutosVendidosPeloBarbeiro().reduce(
    (soma, produto) => soma + (Number(produto.valor) || 0),
    0
  );

  if (valorProdutosVendidosBarbeiro) {
    valorProdutosVendidosBarbeiro.textContent = formatarValorEmReal(total);
  }

  atualizarValorTotalRegistroBarbeiro();
}

function calcularValorTotalRegistroBarbeiro() {
  const valorServicos = calcularSubtotalServicosProduzidos();
  const valorProdutos = obterProdutosVendidosPeloBarbeiro().reduce(
    (total, produto) => total + (Number(produto.valor) || 0),
    0
  );

  return valorServicos + valorProdutos;
}

function atualizarValorTotalRegistroBarbeiro() {
  if (!valorTotalRegistroBarbeiro || valorTotalRegistroBarbeiroEditado) return;

  valorTotalRegistroBarbeiro.value = formatarValorEmReal(
    calcularValorTotalRegistroBarbeiro()
  );
}

function aplicarModoDispositivo(modo = "automatico") {
  const modoValido = ["automatico", "computador", "celular"].includes(modo)
    ? modo
    : "automatico";

  document.body.classList.toggle(
    "modo-celular-forcado",
    modoValido === "celular"
  );
  document.body.classList.toggle(
    "modo-computador-forcado",
    modoValido === "computador"
  );
  document.documentElement.dataset.modoDispositivo = modoValido;

  opcoesDispositivo.forEach((opcao) => {
    opcao.checked = opcao.value === modoValido;
  });
}

const modoDispositivoSalvo =
  localStorage.getItem("modoDispositivo") || "automatico";

aplicarModoDispositivo(modoDispositivoSalvo);

opcoesDispositivo.forEach((opcao) => {
  opcao.addEventListener("change", () => {
    if (!opcao.checked) return;

    localStorage.setItem("modoDispositivo", opcao.value);
    aplicarModoDispositivo(opcao.value);

    if (mensagemDispositivo) {
      mensagemDispositivo.textContent =
        opcao.value === "automatico"
          ? "O aplicativo agora se adapta automaticamente à tela."
          : `Experiência de ${opcao.value} ativada neste aparelho.`;

      window.setTimeout(() => {
        mensagemDispositivo.textContent = "";
      }, 3200);
    }
  });
});

function adicionarLinhaProdutoVendidoBarbeiro(produtoId = "") {
  if (!containerProdutosVendidosBarbeiro) return;

  const linha = document.createElement("div");
  linha.className = "linha-selecao-atendimento";

  const select = document.createElement("select");
  select.className = "select-produto-vendido-barbeiro";
  select.innerHTML = `<option value="">Selecione o produto</option>`;

  produtos.forEach((produto) => {
    const opcao = document.createElement("option");
    opcao.value = produto.id;
    opcao.textContent = `${produto.nome} — ${formatarValorEmReal(produto.valor)}`;
    select.appendChild(opcao);
  });

  select.value = produtoId;
  select.addEventListener("change", atualizarValorProdutosVendidosBarbeiro);
  linha.appendChild(select);

  const remover = document.createElement("button");
  remover.type = "button";
  remover.className = "botao-remover-item-atendimento";
  remover.textContent = "×";
  remover.addEventListener("click", () => {
    linha.remove();
    atualizarValorProdutosVendidosBarbeiro();
  });
  linha.appendChild(remover);

  containerProdutosVendidosBarbeiro.appendChild(linha);
  atualizarValorProdutosVendidosBarbeiro();
}

async function abrirFormularioRegistroServicosBarbeiro() {
  if (!usuarioPodeRegistrarServicos(agendamentoSelecionado)) return;

  if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
    alert(mensagemDataPermitidaDoAgendamento(agendamentoSelecionado));
    return;
  }

  try {
    await Promise.all([carregarServicos(), carregarProdutos()]);
  } catch (erro) {
    alert("Não foi possível carregar os serviços.");
    return;
  }

  containerServicosProduzidos.innerHTML = "";
  if (containerProdutosVendidosBarbeiro) {
    containerProdutosVendidosBarbeiro.innerHTML = "";
  }
  mensagemServicosProduzidos.textContent = "";
  subtotalServicosProduzidosEditado = false;
  valorTotalRegistroBarbeiroEditado = false;

  const produtosRegistradosSalvos = Array.isArray(
    agendamentoSelecionado.produtosVendidosBarbeiroIds
  )
    ? agendamentoSelecionado.produtosVendidosBarbeiroIds
    : [];

  if (produtosRegistradosSalvos.length > 0) {
    produtosRegistradosSalvos.forEach(adicionarLinhaProdutoVendidoBarbeiro);
  } else {
    adicionarLinhaProdutoVendidoBarbeiro();
  }
  atualizarValorProdutosVendidosBarbeiro();

  const idsRegistradosSalvos = Array.isArray(
    agendamentoSelecionado.servicosProduzidosIds
  )
    ? agendamentoSelecionado.servicosProduzidosIds
    : [];

  const normalizarNomeServico = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");

  const servicoDoPlano = usarPlanoEscolhidoServicosBarbeiro
    ? servicos.find(
        (servico) =>
          servico.id === planoEscolhidoServicosBarbeiro?.servicoId
      ) ||
      servicos.find(
        (servico) =>
          normalizarNomeServico(servico.nome) ===
          normalizarNomeServico(
            planoEscolhidoServicosBarbeiro?.servicoNome ||
              planoEscolhidoServicosBarbeiro?.nome
          )
      )
    : null;

  const servicoDoPlanoId = servicoDoPlano?.id || "";

  const idsRegistrados = servicoDoPlanoId
    ? [
        servicoDoPlanoId,
        ...idsRegistradosSalvos.filter((id) => id !== servicoDoPlanoId)
      ]
    : idsRegistradosSalvos;

  if (idsRegistrados.length > 0) {
    idsRegistrados.forEach(adicionarLinhaServicoProduzido);
  } else {
    adicionarLinhaServicoProduzido();
  }

  if (servicoDoPlanoId) {
    const primeiroCampoServico =
      containerServicosProduzidos.querySelector(".select-servico-produzido");

    if (primeiroCampoServico) {
      primeiroCampoServico.value = servicoDoPlanoId;
    }

    subtotalServicosProduzidosEditado = false;
    atualizarSubtotalServicosProduzidos();
  }

  const subtotalSalvo = Number(
    agendamentoSelecionado.valorServicosProduzidos
  ) || 0;
  const escolhaSalvaCompativel = usarPlanoEscolhidoServicosBarbeiro
    ? agendamentoSelecionado.atendimentoPeloPlanoInformadoBarbeiro === true &&
      agendamentoSelecionado.planoInformadoBarbeiroId ===
        planoEscolhidoServicosBarbeiro?.id
    : agendamentoSelecionado.atendimentoPeloPlanoInformadoBarbeiro !== true;

  if (subtotalServicosProduzidos) {
    subtotalServicosProduzidos.value = formatarValorEmReal(
      subtotalSalvo > 0 && escolhaSalvaCompativel
        ? subtotalSalvo
        : calcularSubtotalServicosProduzidos()
    );
  }

  if (valorTotalRegistroBarbeiro) {
    const totalSalvo = Number(
      agendamentoSelecionado.valorTotalInformadoBarbeiro
    ) || 0;

    valorTotalRegistroBarbeiro.value = formatarValorEmReal(
      totalSalvo > 0 && escolhaSalvaCompativel
        ? totalSalvo
        : calcularValorTotalRegistroBarbeiro()
    );
    valorTotalRegistroBarbeiroEditado = totalSalvo > 0 && escolhaSalvaCompativel;
  }

  fecharModal("modal-detalhes");
  fecharModal("modal-verificar-plano");
  modalRegistrarServicos.classList.remove("escondido");
}

async function abrirRegistroServicosBarbeiro() {
  if (!usuarioPodeRegistrarServicos(agendamentoSelecionado)) return;

  if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
    alert(mensagemDataPermitidaDoAgendamento(agendamentoSelecionado));
    return;
  }

  planosDisponiveisServicosBarbeiro = [];
  planoEscolhidoServicosBarbeiro = null;
  usarPlanoEscolhidoServicosBarbeiro = false;

  await iniciarConclusaoComPlano(true);
}

botaoRegistrarServicosBarbeiro?.addEventListener(
  "click",
  abrirRegistroServicosBarbeiro
);

botaoAdicionarServicoProduzido?.addEventListener("click", () => {
  adicionarLinhaServicoProduzido();
});

botaoAdicionarProdutoVendidoBarbeiro?.addEventListener("click", () => {
  adicionarLinhaProdutoVendidoBarbeiro();
});

subtotalServicosProduzidos?.addEventListener("input", () => {
  subtotalServicosProduzidosEditado = true;
  formatarCampoValor(subtotalServicosProduzidos);
});

valorTotalRegistroBarbeiro?.addEventListener("input", () => {
  valorTotalRegistroBarbeiroEditado = true;
  formatarCampoValor(valorTotalRegistroBarbeiro);
});

formRegistrarServicos?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!usuarioPodeRegistrarServicos(agendamentoSelecionado)) return;

  const ids = Array.from(
    containerServicosProduzidos.querySelectorAll(".select-servico-produzido")
  )
    .map((select) => select.value)
    .filter(Boolean);

  const idsUnicos = [...new Set(ids)];
  const selecionados = idsUnicos
    .map((id) => servicos.find((servico) => servico.id === id))
    .filter(Boolean);

  const produtosVendidos = obterProdutosVendidosPeloBarbeiro();

  if (selecionados.length === 0) {
    mensagemServicosProduzidos.textContent =
      "Selecione pelo menos um serviço realizado.";
    return;
  }

  const subtotalCalculado = selecionados.reduce(
    (total, servico) => total + (Number(servico.valor) || 0),
    0
  );
  const totalProdutos = produtosVendidos.reduce(
    (total, produto) => total + (Number(produto.valor) || 0),
    0
  );
  const totalInformado = valorTotalRegistroBarbeiro
    ? converterValorParaNumero(valorTotalRegistroBarbeiro.value)
    : subtotalCalculado + totalProdutos;
  const subtotalInformado = Math.max(0, totalInformado - totalProdutos);
  // O modal do barbeiro não exibe um campo de subtotal. Nesse fluxo,
  // usa diretamente a soma dos serviços selecionados. Mantém a leitura
  // do campo para telas antigas que ainda o possuam.
  if (totalInformado <= 0) {
    mensagemServicosProduzidos.textContent =
      "Informe um valor total válido para o atendimento.";
    valorTotalRegistroBarbeiro?.focus();
    return;
  }

  const clientePossuiPlano = planosDisponiveisServicosBarbeiro.length > 0;
  const vaiUsarPlano =
    clientePossuiPlano && usarPlanoEscolhidoServicosBarbeiro;
  const planoInformado = vaiUsarPlano
    ? planoEscolhidoServicosBarbeiro
    : null;

  const somentePlanoSemExtras = Boolean(
    vaiUsarPlano &&
    planoInformado &&
    produtosVendidos.length === 0 &&
    selecionados.length === 1 &&
    (
      selecionados[0].id === planoInformado.servicoId ||
      String(selecionados[0].nome || "").trim().toLocaleLowerCase("pt-BR") ===
        String(planoInformado.servicoNome || "").trim().toLocaleLowerCase("pt-BR")
    )
  );

  try {
    await updateDoc(doc(db, "agendamentos", agendamentoSelecionado.id), {
      servicosProduzidosIds: selecionados.map((servico) => servico.id),
      servicosProduzidos: selecionados.map((servico) => ({
        id: servico.id,
        nome: servico.nome,
        valor: Number(servico.valor) || 0
      })),
      valorServicosProduzidos: subtotalInformado,
      valorServicosProduzidosTabela: subtotalCalculado,
      valorServicosProduzidosEditado:
        Math.abs(subtotalInformado - subtotalCalculado) > 0.009,
      valorTotalInformadoBarbeiro: totalInformado,
      valorTotalInformadoBarbeiroEditado:
        Math.abs(totalInformado - (subtotalCalculado + totalProdutos)) > 0.009,
      produtosVendidosBarbeiroIds: produtosVendidos.map((produto) => produto.id),
      produtosVendidosBarbeiro: produtosVendidos.map((produto) => ({
        id: produto.id,
        nome: produto.nome,
        valor: Number(produto.valor) || 0
      })),
      valorProdutosVendidosBarbeiro: totalProdutos,
      planoConsultadoPeloBarbeiro: clientePossuiPlano,
      atendimentoPeloPlanoInformadoBarbeiro: vaiUsarPlano,
      planoInformadoBarbeiroId: planoInformado?.id || "",
      planoInformadoBarbeiroNome: planoInformado?.nome || "",
      servicoPlanoInformadoBarbeiroId: planoInformado?.servicoId || "",
      servicoPlanoInformadoBarbeiro: planoInformado?.servicoNome || "",
      aguardandoPagamento: true,
      servicosRegistradosPor: nomeUsuario,
      dataRegistroServicos: Date.now()
    });

    /*
      Quando o atendimento usa somente o plano, não há valor extra
      para a recepção confirmar. O próprio registro do barbeiro já
      conclui o agendamento e contabiliza o uso do plano.
    */
    if (somentePlanoSemExtras) {
      const cliente = await obterClienteDoAgendamento();

      if (!cliente) {
        throw new Error("CLIENTE_PLANO_NAO_LOCALIZADO");
      }

      const agendamentoAtual = { ...agendamentoSelecionado };
      const valorServicoPlano = Number(selecionados[0].valor) || 0;
      const usoPlano = await registrarUsoDoPlano(
        planoInformado,
        agendamentoAtual,
        cliente.id
      );

      await registrarSaidaDoUsoPlano(
        planoInformado,
        agendamentoAtual,
        usoPlano
      );

      await updateDoc(doc(db, "agendamentos", agendamentoAtual.id), {
        status: "concluido",
        aguardandoPagamento: false,
        servicosIds: [selecionados[0].id],
        servicos: [{
          id: selecionados[0].id,
          nome: selecionados[0].nome,
          valor: 0,
          valorOriginal: Number(selecionados[0].valor) || 0,
          peloPlano: true
        }],
        servicoId: selecionados[0].id,
        servico: selecionados[0].nome,
        valorServico: valorServicoPlano,
        produtosIds: [],
        produtos: [],
        produtoId: "",
        produto: "",
        valorProduto: 0,
        valorTotal: 0,
        valorTotalBruto: 0,
        valorLiquido: 0,
        teveDesconto: false,
        valorDesconto: 0,
        formaPagamento: "Plano",
        atendimentoPeloPlano: true,
        planoId: planoInformado.id,
        planoNome: planoInformado.nome,
        servicoPlanoId: planoInformado.servicoId,
        servicoPlano: planoInformado.servicoNome,
        teveExtras: false,
        concluidoPor: nomeUsuario,
        tipoUsuarioConclusao: tipoUsuario,
        dataConclusao: Date.now()
      });

      await deleteDoc(
        doc(db, "movimentacoesFinanceiras", `desconto_${agendamentoAtual.id}`)
      );
    }

    fecharModal("modal-registrar-servicos");
    agendamentoSelecionado = null;
    await atualizarAgenda();
  } catch (erro) {
    console.log("Erro ao registrar serviços:", erro);
    mensagemServicosProduzidos.textContent =
      erro?.message === "LIMITE_PLANO_ATINGIDO"
        ? "O limite mensal deste plano já foi atingido."
        : "Não foi possível salvar os serviços.";
  }
});

function fecharModal(
  idModal
) {
  const modal =
    document.querySelector(
      `#${idModal}`
    );

  if (modal) {
    modal.classList.add(
      "escondido"
    );
  }
}

async function atualizarAgenda() {
  await carregarAgendamentos();

  mostrarAgenda();
}

/* =========================================================
   SALVAR AGENDAMENTO
========================================================= */

formAgendamento.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!barbeiroAtual) {
      alert(
        "Escolha um profissional antes de salvar o agendamento."
      );

      return;
    }

    if (!clienteSelecionado) {
      alert(
        "Escolha um cliente."
      );

      return;
    }

    const tipoEscolhido =
      document.querySelector(
        'input[name="tipo-agendamento"]:checked'
      );

    if (!tipoEscolhido) {
      alert(
        "Escolha o tipo do atendimento."
      );

      return;
    }

    const minutosInicio =
      minutosDoHorario(
        horaAgendamento.value
      );

    const minutosFim =
      minutosDoHorario(
        horaFimAgendamento.value
      );

    if (
      !horaAgendamento.value ||
      !horaFimAgendamento.value
    ) {
      alert(
        "Informe a hora de início e a hora de término."
      );

      return;
    }

    if (
      minutosFim <=
      minutosInicio
    ) {
      alert(
        "A hora de término precisa ser depois da hora de início."
      );

      horaFimAgendamento.focus();

      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "agendamentos"
        ),
        {
          barbeiro:
            barbeiroAtual,

          cliente:
            clienteSelecionado.nome,

          clienteId:
            clienteSelecionado.id,

          tipo:
            tipoEscolhido.value,

          status:
            "pendente",

          data:
            dataAgendamento.value,

          hora:
            horaAgendamento.value,

          horaFim:
            horaFimAgendamento.value,

          dataCadastro:
            Date.now()
        }
      );

      fecharModal(
        "modal-novo"
      );

      await atualizarAgenda();
    } catch (erro) {
      console.log(
        "Erro ao salvar agendamento:",
        erro
      );

      alert(
        "Não foi possível salvar o agendamento."
      );
    }
  }
);

/* =========================================================
   CONCLUSÃO DO ATENDIMENTO
========================================================= */

async function obterClienteDoAgendamento() {
  await carregarClientes();

  if (agendamentoSelecionado?.clienteId) {
    const porId = clientes.find(
      (cliente) => cliente.id === agendamentoSelecionado.clienteId
    );

    if (porId) {
      return porId;
    }
  }

  return clientes.find(
    (cliente) =>
      String(cliente.nome || "").trim().toLowerCase() ===
      String(agendamentoSelecionado?.cliente || "").trim().toLowerCase()
  ) || null;
}

async function planosAtivosDoCliente(clienteId) {
  await Promise.all([
    carregarPlanos(),
    carregarUsosPlanos()
  ]);

  return planos.filter((plano) => {
    return plano.ativo !== false && Boolean(vinculoDoCliente(plano, clienteId));
  });
}

function criarBotaoModalPlano(texto, classe, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", acao);
  return botao;
}

async function iniciarConclusaoComPlano(modoBarbeiro = false) {
  if (
    modoBarbeiro
      ? !usuarioPodeRegistrarServicos(agendamentoSelecionado)
      : !usuarioPodeFinalizarAtendimento()
  ) return;

  if (!agendamentoSelecionado) {
    return;
  }

  if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
    alert(mensagemDataPermitidaDoAgendamento(agendamentoSelecionado));
    return;
  }

  if (verificacaoPlanoEmAndamento) return;
  verificacaoPlanoEmAndamento = true;

  atendimentoPeloPlano = false;
  atendimentoPlanoComExtras = false;
  planoAtendimentoSelecionado = null;
  mensagemVerificarPlano.textContent = "";
  botoesVerificarPlano.innerHTML = "";

  try {
    const cliente = await obterClienteDoAgendamento();

    if (!cliente) {
      if (modoBarbeiro) {
        await abrirFormularioRegistroServicosBarbeiro();
        return;
      }

      tituloVerificarPlano.textContent = "Plano do cliente";
      conteudoVerificarPlano.innerHTML = `
        <p>Não foi possível localizar este cliente no cadastro.</p>
      `;

      botoesVerificarPlano.appendChild(
        criarBotaoModalPlano(
          "Continuar normalmente",
          "botao-principal",
          async () => {
            fecharModal("modal-verificar-plano");
            await abrirConclusaoAtendimento(false);
          }
        )
      );

      fecharModal("modal-detalhes");
      modalVerificarPlano.classList.remove("escondido");
      return;
    }

    const planosCliente = await planosAtivosDoCliente(cliente.id);

    if (planosCliente.length === 0) {
      if (modoBarbeiro) {
        await abrirFormularioRegistroServicosBarbeiro();
        return;
      }

      tituloVerificarPlano.textContent = "Cliente sem plano";
      conteudoVerificarPlano.innerHTML = `
        <p><strong>${cliente.nome}</strong> não possui plano ativo.</p>
        <p>O atendimento seguirá com a cobrança normal.</p>
      `;

      botoesVerificarPlano.appendChild(
        criarBotaoModalPlano(
          "Continuar",
          "botao-principal",
          async () => {
            fecharModal("modal-verificar-plano");
            await abrirConclusaoAtendimento(false);
          }
        )
      );
    } else {
      tituloVerificarPlano.textContent = "Cliente possui plano";

      const opcoes = planosCliente.map((plano) => {
        const ciclo = cicloIndividualDoCliente(
          plano,
          cliente.id,
          agendamentoSelecionado.data
        );
        const usados = usosDoClienteNoCicloIndividual(
          plano,
          cliente.id,
          agendamentoSelecionado.data
        );
        const limite = Number(plano.usosMensais) || 0;
        const restante = ciclo ? Math.max(0, limite - usados) : 0;

        return {
          plano,
          ciclo,
          usados,
          limite,
          restante
        };
      });

      if (modoBarbeiro) {
        planosDisponiveisServicosBarbeiro = planosCliente;
      }

      const planoInformadoPeloBarbeiro = opcoes.find(
        (item) =>
          item.plano.id === agendamentoSelecionado.planoInformadoBarbeiroId
      );
      const primeiroDisponivel = planoInformadoPeloBarbeiro
        || opcoes.find((item) => item.restante > 0)
        || opcoes[0];
      planoAtendimentoSelecionado = primeiroDisponivel.plano;

      const informacaoDoBarbeiro =
        agendamentoSelecionado.planoConsultadoPeloBarbeiro === true
          ? agendamentoSelecionado.atendimentoPeloPlanoInformadoBarbeiro === true
            ? `<p><strong>Informação do barbeiro:</strong> utilizar o plano${agendamentoSelecionado.planoInformadoBarbeiroNome ? ` ${agendamentoSelecionado.planoInformadoBarbeiroNome}` : ""}.</p>`
            : `<p><strong>Informação do barbeiro:</strong> cobrar este atendimento normalmente, sem utilizar o plano.</p>`
          : "";

      const opcoesHtml = opcoes.map((item) => {
        const limiteTexto = item.restante > 0
          ? `${item.usados} de ${item.limite} usados`
          : `limite atingido (${item.usados}/${item.limite})`;

        return `<option value="${item.plano.id}">${item.plano.nome} — ${item.plano.servicoNome} — ${limiteTexto}</option>`;
      }).join("");

      conteudoVerificarPlano.innerHTML = `
        <p><strong>${cliente.nome}</strong> possui plano.</p>
        ${informacaoDoBarbeiro}
        <p>Este atendimento foi realizado pelo plano?</p>
        <select id="plano-atendimento-escolha" class="seletor-plano-atendimento">
          ${opcoesHtml}
        </select>
        <p id="detalhe-plano-atendimento"></p>
      `;

      const selectPlano = conteudoVerificarPlano.querySelector(
        "#plano-atendimento-escolha"
      );
      const detalhe = conteudoVerificarPlano.querySelector(
        "#detalhe-plano-atendimento"
      );

      selectPlano.value = primeiroDisponivel.plano.id;

      const atualizarDetalhe = () => {
        const item = opcoes.find((opcao) => opcao.plano.id === selectPlano.value);
        if (!item) return;

        planoAtendimentoSelecionado = item.plano;
        detalhe.innerHTML = item.restante > 0
          ? `<strong>${item.plano.servicoNome}</strong> • restam ${item.restante} uso(s) no ciclo de ${item.ciclo.inicio.split("-").reverse().join("/")} a ${item.ciclo.fim.split("-").reverse().join("/")}.`
          : item.ciclo
            ? `<span class="aviso-limite-plano">O limite deste ciclo já foi atingido.</span>`
            : `<span class="aviso-limite-plano">O ciclo deste cliente ainda não começou.</span>`;
      };

      selectPlano.addEventListener("change", atualizarDetalhe);
      atualizarDetalhe();

      botoesVerificarPlano.append(
        criarBotaoModalPlano(
          "Não",
          "botao-secundario",
          async () => {
            if (modoBarbeiro) {
              usarPlanoEscolhidoServicosBarbeiro = false;
              planoEscolhidoServicosBarbeiro = null;
              fecharModal("modal-verificar-plano");
              await abrirFormularioRegistroServicosBarbeiro();
              return;
            }

            atendimentoPeloPlano = false;
            planoAtendimentoSelecionado = null;
            fecharModal("modal-verificar-plano");
            await abrirConclusaoAtendimento(false);
          }
        ),
        criarBotaoModalPlano(
          "Sim, usar plano",
          "botao-principal",
          async () => {
            const item = opcoes.find(
              (opcao) => opcao.plano.id === selectPlano.value
            );

            if (!item) return;

            planoAtendimentoSelecionado = item.plano;

            if (modoBarbeiro) {
              usarPlanoEscolhidoServicosBarbeiro = true;
              planoEscolhidoServicosBarbeiro = item.plano;
              fecharModal("modal-verificar-plano");
              perguntaExtrasPlanoAbertaPeloBarbeiro = true;
              textoExtrasPlano.textContent =
                `${item.plano.servicoNome} será contabilizado no plano ${item.plano.nome}.`;
              mensagemExtrasPlano.textContent = "";
              modalExtrasPlano.classList.remove("escondido");
              return;
            }

            atendimentoPeloPlano = true;
            fecharModal("modal-verificar-plano");

            textoExtrasPlano.textContent =
              `${item.plano.servicoNome} será contabilizado no plano ${item.plano.nome}.`;
            mensagemExtrasPlano.textContent = "";
            modalExtrasPlano.classList.remove("escondido");
          }
        )
      );
    }

    fecharModal("modal-detalhes");
    modalVerificarPlano.classList.remove("escondido");
  } catch (erro) {
    console.log("Erro ao verificar plano do cliente:", erro);
    alert("Não foi possível verificar o plano do cliente.");
  } finally {
    verificacaoPlanoEmAndamento = false;
  }
}

async function registrarUsoDoPlano(plano, agendamento, clienteId) {
  if (!plano || !agendamento || !clienteId) {
    throw new Error("Dados insuficientes para registrar o uso do plano.");
  }

  await carregarUsosPlanos();

  const ciclo = cicloIndividualDoCliente(plano, clienteId, agendamento.data);
  if (!ciclo) {
    throw new Error("CICLO_PLANO_NAO_INICIADO");
  }
  const usados = usosDoClienteNoCicloIndividual(plano, clienteId, agendamento.data);
  const limite = Number(plano.usosMensais) || 0;

  const usoJaRegistrado = usosPlanos.some(
    (uso) => uso.agendamentoId === agendamento.id && uso.cancelado !== true
  );

  if (usoJaRegistrado) {
    return usosPlanos.find(
      (uso) => uso.agendamentoId === agendamento.id && uso.cancelado !== true
    );
  }

  const novoUso = {
    planoId: plano.id,
    planoNome: plano.nome,
    clienteId,
    cliente: agendamento.cliente,
    agendamentoId: agendamento.id,
    servicoId: plano.servicoId,
    servico: plano.servicoNome,
    ciclo: ciclo.chave,
    cicloInicio: ciclo.inicio,
    cicloFim: ciclo.fim,
    numeroUsoCiclo: usados + 1,
    data: agendamento.data,
    hora: agendamento.hora,
    barbeiro: agendamento.barbeiro,
    registradoPor: nomeUsuario,
    dataCadastro: Date.now()
  };

  await setDoc(
    doc(db, "usosPlanos", `uso_${agendamento.id}`),
    novoUso,
    { merge: true }
  );

  await carregarUsosPlanos();
  return novoUso;
}

function nomeDoMesAno(dataTexto) {
  return dataPorTexto(dataTexto).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

async function registrarSaidaDoUsoPlano(plano, agendamento, uso) {
  if (!plano || !agendamento || !uso) return;

  if (servicos.length === 0) {
    await carregarServicos();
  }

  const normalizarNome = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const servicoDoPlano = servicos.find(
    (servico) => servico.id === plano.servicoId
  ) || servicos.find(
    (servico) =>
      normalizarNome(servico.nome) === normalizarNome(plano.servicoNome || plano.nome)
  );
  const valorServicoPlano = Number(servicoDoPlano?.valor) || 0;

  if (valorServicoPlano <= 0) {
    throw new Error("VALOR_SERVICO_PLANO_NAO_ENCONTRADO");
  }

  const numeroUso = Number(uso.numeroUsoCiclo) || 1;
  const cicloTexto = nomeDoMesAno(uso.cicloInicio || agendamento.data);

  await setDoc(
    doc(db, "movimentacoesFinanceiras", `uso_plano_${agendamento.id}`),
    {
      tipo: "saida",
      origem: "uso_plano",
      categoria: "plano",
      descricao: `${numeroUso}º ${plano.servicoNome} do plano ${plano.nome} - ${cicloTexto}`,
      valor: valorServicoPlano,
      data: agendamento.data,
      hora: agendamento.hora,
      barbeiro: agendamento.barbeiro,
      cliente: agendamento.cliente,
      planoId: plano.id,
      planoNome: plano.nome,
      servicoId: plano.servicoId,
      servico: plano.servicoNome,
      ciclo: uso.ciclo,
      cicloInicio: uso.cicloInicio,
      cicloFim: uso.cicloFim,
      numeroUsoCiclo: numeroUso,
      agendamentoId: agendamento.id,
      prioridadeHistorico: 2,
      criadoPor: nomeUsuario,
      usuarioId,
      dataCadastro: Date.now()
    },
    { merge: true }
  );
}

function timestampDaMovimentacao(movimentacao) {
  const data = dataPorTexto(movimentacao.data);
  const partesHora = String(movimentacao.hora || "00:00")
    .split(":")
    .map((parte) => Number(parte) || 0);

  data.setHours(
    partesHora[0] || 0,
    partesHora[1] || 0,
    partesHora[2] || 0,
    0
  );

  return data.getTime();
}

function ordenarMovimentacoesMaisRecentes(a, b) {
  const diferencaDataHora =
    timestampDaMovimentacao(b) - timestampDaMovimentacao(a);

  if (diferencaDataHora !== 0) return diferencaDataHora;

  const diferencaCadastro =
    (Number(b.dataCadastro) || 0) - (Number(a.dataCadastro) || 0);

  if (diferencaCadastro !== 0) return diferencaCadastro;

  return (
    (Number(b.prioridadeHistorico) || 0) -
    (Number(a.prioridadeHistorico) || 0)
  );
}

async function finalizarAtendimentoSomentePlano() {
  if (!usuarioPodeFinalizarAtendimento()) return;

  if (!agendamentoSelecionado || !planoAtendimentoSelecionado) {
    return;
  }

  if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
    mensagemExtrasPlano.textContent =
      mensagemDataPermitidaDoAgendamento(agendamentoSelecionado);
    return;
  }

  mensagemExtrasPlano.textContent = "";

  try {
    /* Esta tela pode ser aberta sem que o catálogo tenha sido carregado. */
    await carregarServicos();

    const cliente = await obterClienteDoAgendamento();

    if (!cliente) {
      mensagemExtrasPlano.textContent = "Cliente não localizado.";
      return;
    }

    const agendamentoAtual = { ...agendamentoSelecionado };
    const plano = planoAtendimentoSelecionado;
    const servicoDoPlano = servicos.find(
      (servico) => servico.id === plano.servicoId
    );
    const valorServicoPlano = Number(servicoDoPlano?.valor) || 0;

    const usoPlano = await registrarUsoDoPlano(
      plano,
      agendamentoAtual,
      cliente.id
    );
    await registrarSaidaDoUsoPlano(plano, agendamentoAtual, usoPlano);

    await updateDoc(
      doc(db, "agendamentos", agendamentoAtual.id),
      {
        status: "concluido",
        aguardandoPagamento: false,
        servicosIds: [plano.servicoId],
        servicos: [{
          id: plano.servicoId,
            nome: plano.servicoNome,
            valor: 0,
            valorOriginal: valorServicoPlano,
          peloPlano: true
        }],
        servicoId: plano.servicoId,
        servico: plano.servicoNome,
        valorServico: valorServicoPlano,
        produtosIds: [],
        produtos: [],
        produtoId: "",
        produto: "",
        valorProduto: 0,
        valorTotal: 0,
        valorTotalBruto: 0,
        teveDesconto: false,
        valorDesconto: 0,
        valorLiquido: 0,
        formaPagamento: "Plano",
        atendimentoPeloPlano: true,
        planoId: plano.id,
        planoNome: plano.nome,
        servicoPlanoId: plano.servicoId,
        servicoPlano: plano.servicoNome,
        teveExtras: false,
        concluidoPor: nomeUsuario,
        tipoUsuarioConclusao: tipoUsuario,
        dataConclusao: Date.now()
      }
    );

    await deleteDoc(
      doc(db, "movimentacoesFinanceiras", `desconto_${agendamentoAtual.id}`)
    );

    fecharModal("modal-extras-plano");
    agendamentoSelecionado = null;
    planoAtendimentoSelecionado = null;
    atendimentoPeloPlano = false;
    atendimentoPlanoComExtras = false;

    await atualizarAgenda();
  } catch (erro) {
    console.log("Erro ao concluir atendimento pelo plano:", erro);
    mensagemExtrasPlano.textContent =
      erro?.message === "LIMITE_PLANO_ATINGIDO"
        ? "O limite mensal deste plano já foi atingido."
        : "Não foi possível concluir o atendimento pelo plano.";
  }
}

async function abrirConclusaoAtendimento(modoPlano = false) {
  if (!usuarioPodeFinalizarAtendimento()) return;

  if (!agendamentoSelecionado) {
    return;
  }

  if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
    alert(mensagemDataPermitidaDoAgendamento(agendamentoSelecionado));
    return;
  }

  mensagemConclusaoAtendimento.textContent = "";
  atendimentoPlanoComExtras = Boolean(modoPlano && planoAtendimentoSelecionado);

  if (tituloConclusaoAtendimento) {
    tituloConclusaoAtendimento.textContent = atendimentoPlanoComExtras
      ? "Extras do atendimento"
      : "Concluir atendimento";
  }

  if (descricaoConclusaoAtendimento) {
    descricaoConclusaoAtendimento.textContent = atendimentoPlanoComExtras
      ? `O serviço ${planoAtendimentoSelecionado?.servicoNome || "do plano"} já está incluído. Adicione somente serviços extras.`
      : "Informe o serviço realizado e a forma de pagamento.";
  }

  if (labelServicoAtendimento) {
    labelServicoAtendimento.textContent = atendimentoPlanoComExtras
      ? "Serviço extra"
      : "Serviço realizado";
  }

  try {
    await Promise.all([
      carregarProdutos(),
      carregarServicos()
    ]);
  } catch (erro) {
    console.log(erro);

    alert(
      "Não foi possível carregar os produtos e serviços."
    );

    return;
  }

  if (servicos.length === 0) {
    alert(
      "Cadastre pelo menos um serviço antes de concluir o atendimento."
    );

    return;
  }

  conclusaoCliente.textContent =
    agendamentoSelecionado.cliente;

  conclusaoBarbeiro.textContent =
    agendamentoSelecionado.barbeiro;

  const dataFormatada =
    dataPorTexto(
      agendamentoSelecionado.data
    ).toLocaleDateString(
      "pt-BR"
    );

  conclusaoDataHora.textContent =
    `${dataFormatada} às ${agendamentoSelecionado.hora}`;

  document
    .querySelectorAll("#container-servicos-atendimento .linha-selecao-atendimento")
    .forEach((linha, indice) => {
      if (indice > 0) linha.remove();
    });

  document
    .querySelectorAll("#container-produtos-atendimento .linha-selecao-atendimento")
    .forEach((linha, indice) => {
      if (indice > 0) linha.remove();
    });

  servicoAtendimento.innerHTML = atendimentoPlanoComExtras
    ? `<option value="">Nenhum serviço extra</option>`
    : `<option value="">Selecione o serviço</option>`;

  produtoAtendimento.innerHTML = `
    <option value="">Nenhum produto vendido</option>
  `;

  servicos.forEach(
    (servico) => {
      if (
        atendimentoPlanoComExtras &&
        servico.id === planoAtendimentoSelecionado?.servicoId
      ) {
        return;
      }
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        servico.id;

      opcao.textContent =
        `${servico.nome} — ${formatarValorEmReal(servico.valor)}`;

      servicoAtendimento.appendChild(
        opcao
      );
    }
  );

  if (produtos.length === 0) {
    const opcao =
      document.createElement(
        "option"
      );

    opcao.disabled = true;

    opcao.textContent =
      "Nenhum produto cadastrado";

    produtoAtendimento.appendChild(
      opcao
    );
  } else {
    produtos.forEach(
      (produto) => {
        const opcao =
          document.createElement(
            "option"
          );

        opcao.value =
          produto.id;

        opcao.textContent =
          `${produto.nome} — ${formatarValorEmReal(produto.valor)}`;

        produtoAtendimento.appendChild(
          opcao
        );
      }
    );
  }


  /* =========================================
     LIMPAR SELEÇÕES
  ========================================= */

  Array.from(
    servicoAtendimento.options
  ).forEach(
    (opcao) => {
      opcao.selected = false;
    }
  );

  Array.from(
    produtoAtendimento.options
  ).forEach(
    (opcao) => {
      opcao.selected = false;
    }
  );

  /* Serviços previamente informados pelo barbeiro já chegam selecionados. */
  const servicosProduzidosIds = Array.isArray(
    agendamentoSelecionado.servicosProduzidosIds
  )
    ? agendamentoSelecionado.servicosProduzidosIds
    : [];

  if (!atendimentoPlanoComExtras && servicosProduzidosIds.length > 0) {
    servicoAtendimento.value = servicosProduzidosIds[0];

    servicosProduzidosIds.slice(1).forEach((servicoId) => {
      adicionarCampoServico();
      const selects = document.querySelectorAll(".select-servico-atendimento");
      selects[selects.length - 1].value = servicoId;
    });
  }

  /* Produtos informados pelo barbeiro também chegam selecionados à recepção. */
  const produtosVendidosBarbeiroIds = Array.isArray(
    agendamentoSelecionado.produtosVendidosBarbeiroIds
  )
    ? agendamentoSelecionado.produtosVendidosBarbeiroIds
    : [];

  if (produtosVendidosBarbeiroIds.length > 0) {
    produtoAtendimento.value = produtosVendidosBarbeiroIds[0];

    produtosVendidosBarbeiroIds.slice(1).forEach((produtoId) => {
      adicionarCampoProduto();
      const selects = document.querySelectorAll(".select-produto-atendimento");
      selects[selects.length - 1].value = produtoId;
    });
  }

  const subtotalInformadoPeloBarbeiro = Number(
    agendamentoSelecionado.valorServicosProduzidos
  ) || 0;

  valorServicosInformadoBarbeiro =
    !atendimentoPlanoComExtras &&
    servicosProduzidosIds.length > 0 &&
    subtotalInformadoPeloBarbeiro > 0
      ? subtotalInformadoPeloBarbeiro
      : null;

  formaPagamentoAtendimento.value = "";
  tipoPagamentoAtendimento.value = "unico";
  pagamentoUnicoAtendimento?.classList.remove("escondida");
  pagamentoDivididoAtendimento?.classList.add("escondida");
  [valorPixAtendimento, valorDinheiroAtendimento, valorCartaoAtendimento].forEach((campo) => {
    if (campo) campo.value = "R$ 0,00";
  });
  descricaoDescontoAtendimento.value = "";
  descricaoDescontoAtendimento.required = false;


  /* =========================================
     DESCONTO
  ========================================= */

  if (teveDescontoAtendimento) {
    teveDescontoAtendimento.value =
      "nao";
  }

  if (valorDescontoAtendimento) {
    valorDescontoAtendimento.value =
      "";
  }

  if (areaDescontoAtendimento) {
    areaDescontoAtendimento.classList.add(
      "escondida"
    );
  }


  const totalInformadoPeloBarbeiro = Number(
    agendamentoSelecionado.valorTotalInformadoBarbeiro
  ) || 0;

  valorTotalAtendimentoEditado = totalInformadoPeloBarbeiro > 0;
  if (valorTotalAtendimentoEditado && valorTotalAtendimento) {
    valorTotalAtendimento.value = formatarValorEmReal(totalInformadoPeloBarbeiro);
  }
  atualizarValoresConclusao();

  fecharModal(
    "modal-detalhes"
  );

  modalConcluirAtendimento.classList.remove(
    "escondido"
  );
}

function atualizarValoresConclusao() {

  /* =========================================
     PEGAR TODOS OS SERVIÇOS SELECIONADOS
  ========================================= */

  const selectsServicos =
    document.querySelectorAll(
      ".select-servico-atendimento"
    );

  const servicosSelecionados = [];

  selectsServicos.forEach(
    (select) => {

      if (!select.value) {
        return;
      }

      const servico =
        servicos.find(
          (item) =>
            item.id === select.value
        );

      if (servico) {
        servicosSelecionados.push(
          servico
        );
      }
    }
  );


  /* =========================================
     PEGAR TODOS OS PRODUTOS SELECIONADOS
  ========================================= */

  const selectsProdutos =
    document.querySelectorAll(
      ".select-produto-atendimento"
    );

  const produtosSelecionados = [];

  selectsProdutos.forEach(
    (select) => {

      if (!select.value) {
        return;
      }

      const produto =
        produtos.find(
          (item) =>
            item.id === select.value
        );

      if (produto) {
        produtosSelecionados.push(
          produto
        );
      }
    }
  );


  /* =========================================
     SOMAR SERVIÇOS
  ========================================= */

  const valorServicoCalculado =
    servicosSelecionados.reduce(
      (total, servico) => {

        return (
          total +
          (
            Number(servico.valor) ||
            0
          )
        );
      },
      0
    );

  const valorServico = valorServicosInformadoBarbeiro ?? valorServicoCalculado;


  /* =========================================
     SOMAR PRODUTOS
  ========================================= */

  const valorProduto =
    produtosSelecionados.reduce(
      (total, produto) => {

        return (
          total +
          (
            Number(produto.valor) ||
            0
          )
        );
      },
      0
    );


  const valorBrutoCalculado =
    valorServico +
    valorProduto;

  const valorBruto = valorTotalAtendimentoEditado
    ? converterValorParaNumero(valorTotalAtendimento?.value || "")
    : valorBrutoCalculado;


  /* =========================================
     DESCONTO
  ========================================= */

  const temDesconto =
    teveDescontoAtendimento?.value ===
    "sim";

  let desconto = 0;

  if (
    temDesconto &&
    valorDescontoAtendimento
  ) {
    desconto =
      converterValorParaNumero(
        valorDescontoAtendimento.value
      );
  }

  if (desconto < 0) {
    desconto = 0;
  }


  const valorLiquido =
    Math.max(
      0,
      valorBruto - desconto
    );


  /* =========================================
     MOSTRAR VALORES
  ========================================= */

  valorServicoAtendimento.textContent =
    formatarValorEmReal(
      valorServico
    );

  valorProdutoAtendimento.textContent =
    formatarValorEmReal(
      valorProduto
    );

  if (valorTotalAtendimento && !valorTotalAtendimentoEditado) {
    valorTotalAtendimento.value = formatarValorEmReal(valorBrutoCalculado);
  }


  if (valorFinalAtendimento) {

    valorFinalAtendimento.textContent =
      formatarValorEmReal(
        valorLiquido
      );
  }

  atualizarResumoPagamentoDividido(valorLiquido);
}

function valoresDoPagamentoDividido() {
  return [
    { forma: "Pix", valor: converterValorParaNumero(valorPixAtendimento?.value || "") },
    { forma: "Dinheiro", valor: converterValorParaNumero(valorDinheiroAtendimento?.value || "") },
    { forma: "Cartão", valor: converterValorParaNumero(valorCartaoAtendimento?.value || "") }
  ].filter((pagamento) => pagamento.valor > 0);
}

function atualizarResumoPagamentoDividido(totalLiquidoInformado = null) {
  if (!resumoPagamentoDividido) return;
  const totalLiquido = totalLiquidoInformado ?? Math.max(
    0,
    converterValorParaNumero(valorTotalAtendimento?.value || "") -
      converterValorParaNumero(valorDescontoAtendimento?.value || "")
  );
  const totalInformado = valoresDoPagamentoDividido().reduce(
    (total, pagamento) => total + pagamento.valor,
    0
  );
  const diferenca = totalLiquido - totalInformado;
  resumoPagamentoDividido.innerHTML = `
    <span>Total informado: <strong>${formatarValorEmReal(totalInformado)}</strong></span>
    <span class="${Math.abs(diferenca) < 0.01 ? "pagamento-fechado" : ""}">
      ${diferenca >= 0 ? "Falta informar" : "Valor excedente"}:
      <strong>${formatarValorEmReal(Math.abs(diferenca))}</strong>
    </span>
  `;
}

tipoPagamentoAtendimento?.addEventListener("change", () => {
  const dividido = tipoPagamentoAtendimento.value === "dividido";
  pagamentoUnicoAtendimento?.classList.toggle("escondida", dividido);
  pagamentoDivididoAtendimento?.classList.toggle("escondida", !dividido);
  formaPagamentoAtendimento.required = !dividido;
  atualizarResumoPagamentoDividido();
});

[valorPixAtendimento, valorDinheiroAtendimento, valorCartaoAtendimento].forEach((campo) => {
  campo?.addEventListener("input", () => {
    formatarCampoValor(campo);
    atualizarResumoPagamentoDividido();
  });
});

valorTotalAtendimento?.addEventListener("input", () => {
  valorTotalAtendimentoEditado = true;
  formatarCampoValor(valorTotalAtendimento);
  atualizarValoresConclusao();
});

servicoAtendimento.addEventListener("change", () => {
  valorServicosInformadoBarbeiro = null;
  valorTotalAtendimentoEditado = false;
  atualizarValoresConclusao();
});

produtoAtendimento.addEventListener(
  "change",
  atualizarValoresConclusao
);

if (teveDescontoAtendimento) {
  teveDescontoAtendimento.addEventListener(
    "change",
    () => {
      const temDesconto =
        teveDescontoAtendimento.value ===
        "sim";

      if (areaDescontoAtendimento) {
        areaDescontoAtendimento.classList.toggle(
          "escondida",
          !temDesconto
        );
      }

      if (descricaoDescontoAtendimento) {
        descricaoDescontoAtendimento.required = temDesconto;
      }

      if (!temDesconto) {
        if (valorDescontoAtendimento) {
          valorDescontoAtendimento.value =
            "";
        }
        if (descricaoDescontoAtendimento) {
          descricaoDescontoAtendimento.value = "";
        }
      }

      atualizarValoresConclusao();
    }
  );
}

if (valorDescontoAtendimento) {
  valorDescontoAtendimento.addEventListener(
    "input",
    () => {
      formatarCampoValor(
        valorDescontoAtendimento
      );

      atualizarValoresConclusao();
    }
  );
}

botaoConcluirAgendamento.addEventListener(
  "click",
  () => iniciarConclusaoComPlano(false)
);

formConcluirAtendimento.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!usuarioPodeFinalizarAtendimento()) {
      mensagemConclusaoAtendimento.textContent =
        "Somente o administrador ou a recepção podem confirmar atendimentos.";
      return;
    }

    mensagemConclusaoAtendimento.textContent =
      "";

    if (!agendamentoSelecionado) {

      mensagemConclusaoAtendimento.textContent =
        "Nenhum agendamento foi selecionado.";

      return;
    }

    if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
      mensagemConclusaoAtendimento.textContent =
        mensagemDataPermitidaDoAgendamento(agendamentoSelecionado);
      return;
    }


    /* =========================================
       PEGAR TODOS OS SERVIÇOS
    ========================================= */

    const selectsServicos =
      document.querySelectorAll(
        ".select-servico-atendimento"
      );

    const servicosSelecionados = [];

    selectsServicos.forEach(
      (select) => {

        if (!select.value) {
          return;
        }

        const servico =
          servicos.find(
            (item) =>
              item.id === select.value
          );

        if (servico) {
          servicosSelecionados.push(
            servico
          );
        }
      }
    );


    /* =========================================
       PEGAR TODOS OS PRODUTOS
    ========================================= */

    const selectsProdutos =
      document.querySelectorAll(
        ".select-produto-atendimento"
      );

    const produtosSelecionados = [];

    selectsProdutos.forEach(
      (select) => {

        if (!select.value) {
          return;
        }

        const produto =
          produtos.find(
            (item) =>
              item.id === select.value
          );

        if (produto) {
          produtosSelecionados.push(
            produto
          );
        }
      }
    );


    const pagamentoDividido = tipoPagamentoAtendimento?.value === "dividido";
    const pagamentos = pagamentoDividido ? valoresDoPagamentoDividido() : [];
    const formaPagamento = pagamentoDividido
      ? "Dividido"
      : formaPagamentoAtendimento.value;

    const descricaoDesconto =
      descricaoDescontoAtendimento.value.trim();


    /* =========================================
       VALIDAÇÕES
    ========================================= */

    if (
      !atendimentoPlanoComExtras &&
      servicosSelecionados.length === 0
    ) {

      mensagemConclusaoAtendimento.textContent =
        "Selecione pelo menos um serviço realizado.";

      servicoAtendimento.focus();

      return;
    }

    if (
      atendimentoPlanoComExtras &&
      servicosSelecionados.length === 0 &&
      produtosSelecionados.length === 0
    ) {
      mensagemConclusaoAtendimento.textContent =
        "Adicione pelo menos um serviço extra.";
      return;
    }

    if (!pagamentoDividido && !formaPagamento) {

      mensagemConclusaoAtendimento.textContent =
        "Selecione a forma de pagamento.";

      formaPagamentoAtendimento.focus();

      return;
    }

    /* =========================================
       VALOR DOS SERVIÇOS
    ========================================= */

    const valorServicoCalculado =
      servicosSelecionados.reduce(
        (total, servico) => {

          return (
            total +
            (
              Number(servico.valor) ||
              0
            )
          );
        },
        0
      );

    const valorServicoExtras =
      valorServicosInformadoBarbeiro ?? valorServicoCalculado;
    const valorServicoPlano = atendimentoPlanoComExtras
      ? Number(
          servicos.find(
            (servico) => servico.id === planoAtendimentoSelecionado?.servicoId
          )?.valor
        ) || 0
      : 0;
    const valorServico = valorServicoPlano + valorServicoExtras;


    /* =========================================
       VALOR DOS PRODUTOS
    ========================================= */

    const valorProduto =
      produtosSelecionados.reduce(
        (total, produto) => {

          return (
            total +
            (
              Number(produto.valor) ||
              0
            )
          );
        },
        0
      );


    const valorTabela =
      valorServicoCalculado +
      valorProduto;

    const valorBruto = converterValorParaNumero(
      valorTotalAtendimento?.value || ""
    );

    if (valorBruto <= 0) {
      mensagemConclusaoAtendimento.textContent =
        "Informe um valor válido para o pagamento.";
      valorTotalAtendimento?.focus();
      return;
    }


    /* =========================================
       NOMES
    ========================================= */

    const nomesServicos =
      servicosSelecionados.map(
        (servico) =>
          servico.nome
      );

    const nomesProdutos =
      produtosSelecionados.map(
        (produto) =>
          produto.nome
      );


    const nomesServicosComPlano = atendimentoPlanoComExtras
      ? [planoAtendimentoSelecionado.servicoNome, ...nomesServicos]
      : nomesServicos;

    const textoServicos =
      nomesServicosComPlano.join(" + ");

    const textoProdutos =
      nomesProdutos.join(" + ");


    /* =========================================
       DESCONTO
    ========================================= */

    const temDesconto =
      teveDescontoAtendimento?.value ===
      "sim";

    let valorDesconto = 0;


    if (temDesconto) {

      valorDesconto =
        converterValorParaNumero(
          valorDescontoAtendimento?.value ||
          ""
        );
    }


    if (
      temDesconto &&
      valorDesconto <= 0
    ) {

      mensagemConclusaoAtendimento.textContent =
        "Informe um valor válido para o desconto.";

      valorDescontoAtendimento?.focus();

      return;
    }

    if (temDesconto && !descricaoDesconto) {
      mensagemConclusaoAtendimento.textContent =
        "Informe a descrição ou o motivo do desconto.";
      descricaoDescontoAtendimento.focus();
      return;
    }


    if (
      valorDesconto >
      valorBruto
    ) {

      mensagemConclusaoAtendimento.textContent =
        "O desconto não pode ser maior que o valor do atendimento.";

      valorDescontoAtendimento?.focus();

      return;
    }


    const valorLiquido =
      valorBruto -
      valorDesconto;

    if (pagamentoDividido) {
      const totalPagamentos = pagamentos.reduce(
        (total, pagamento) => total + pagamento.valor,
        0
      );

      if (pagamentos.length < 2) {
        mensagemConclusaoAtendimento.textContent =
          "Para dividir, informe valores em pelo menos duas formas de pagamento.";
        return;
      }

      if (Math.abs(totalPagamentos - valorLiquido) >= 0.01) {
        mensagemConclusaoAtendimento.textContent =
          `Os pagamentos precisam somar exatamente ${formatarValorEmReal(valorLiquido)}.`;
        return;
      }
    }


    /* =========================================
       DADOS DO AGENDAMENTO
    ========================================= */

    const agendamentoId =
      agendamentoSelecionado.id;

    const barbeiroAtendimento =
      agendamentoSelecionado.barbeiro;

    const clienteAtendimento =
      agendamentoSelecionado.cliente;

    const dataAtendimento =
      agendamentoSelecionado.data;

    const horaAtendimento =
      agendamentoSelecionado.hora;

    const clientePlano = atendimentoPlanoComExtras
      ? await obterClienteDoAgendamento()
      : null;

    if (atendimentoPlanoComExtras && !clientePlano) {
      mensagemConclusaoAtendimento.textContent =
        "Não foi possível localizar o cliente do plano.";
      return;
    }

    const servicosParaSalvar = atendimentoPlanoComExtras
      ? [
          {
            id: planoAtendimentoSelecionado.servicoId,
            nome: planoAtendimentoSelecionado.servicoNome,
            valor: 0,
            valorOriginal: Number(
              servicos.find((servico) =>
                servico.id === planoAtendimentoSelecionado.servicoId
              )?.valor
            ) || 0,
            peloPlano: true
          },
          ...servicosSelecionados.map((servico) => ({
            id: servico.id,
            nome: servico.nome,
            valor: Number(servico.valor) || 0,
            peloPlano: false
          }))
        ]
      : servicosSelecionados.map((servico) => ({
          id: servico.id,
          nome: servico.nome,
          valor: Number(servico.valor) || 0
        }));

    try {

      /* =========================================
         SALVAR ATENDIMENTO
      ========================================= */

      await updateDoc(
        doc(
          db,
          "agendamentos",
          agendamentoId
        ),
        {

          status:
            "concluido",


          /* ===============================
             SERVIÇOS
          =============================== */

          servicosIds:
            servicosParaSalvar.map(
              (servico) => servico.id
            ),

          servicos:
            servicosParaSalvar,


          /*
            Mantemos também esses campos
            para compatibilidade com outras
            partes do sistema.
          */

          servicoId:
            atendimentoPlanoComExtras
              ? planoAtendimentoSelecionado.servicoId
              : (servicosSelecionados[0]?.id || ""),

          servico:
            textoServicos,

          valorServico,


          /* ===============================
             PRODUTOS
          =============================== */

          produtosIds:
            produtosSelecionados.map(
              (produto) =>
                produto.id
            ),

          produtos:
            produtosSelecionados.map(
              (produto) => ({

                id:
                  produto.id,

                nome:
                  produto.nome,

                valor:
                  Number(
                    produto.valor
                  ) || 0

              })
            ),

          produtoId:
            produtosSelecionados[0]?.id ||
            "",

          produto:
            textoProdutos,

          valorProduto,


          /* ===============================
             VALORES
          =============================== */

          valorTotal:
            valorBruto,

          valorTotalBruto:
            valorBruto,

          valorTotalTabela:
            valorTabela,

          teveDesconto:
            temDesconto,

          valorDesconto:
            valorDesconto,

          valorLiquido:
            valorLiquido,

          formaPagamento,

          pagamentos: pagamentoDividido
            ? pagamentos
            : [{ forma: formaPagamento, valor: valorLiquido }],

          descricaoDesconto:
            temDesconto ? descricaoDesconto : "",

          atendimentoPeloPlano:
            atendimentoPlanoComExtras,

          planoId:
            atendimentoPlanoComExtras
              ? planoAtendimentoSelecionado.id
              : "",

          planoNome:
            atendimentoPlanoComExtras
              ? planoAtendimentoSelecionado.nome
              : "",

          servicoPlanoId:
            atendimentoPlanoComExtras
              ? planoAtendimentoSelecionado.servicoId
              : "",

          servicoPlano:
            atendimentoPlanoComExtras
              ? planoAtendimentoSelecionado.servicoNome
              : "",

          teveExtras:
            atendimentoPlanoComExtras,

          concluidoPor:
            nomeUsuario,

          tipoUsuarioConclusao:
            tipoUsuario,

          dataConclusao:
            Date.now()
        }
      );

      if (atendimentoPlanoComExtras) {
        const usoPlano = await registrarUsoDoPlano(
          planoAtendimentoSelecionado,
          agendamentoSelecionado,
          clientePlano.id
        );
        await registrarSaidaDoUsoPlano(
          planoAtendimentoSelecionado,
          agendamentoSelecionado,
          usoPlano
        );
      }


      /* =========================================
         MOVIMENTAÇÃO DO DESCONTO
      ========================================= */

      const documentoDesconto =
        doc(
          db,
          "movimentacoesFinanceiras",
          `desconto_${agendamentoId}`
        );


      if (
        temDesconto &&
        valorDesconto > 0
      ) {

        await setDoc(
          documentoDesconto,
          {

            tipo:
              "saida",

            origem:
              "desconto",

            categoria:
              "desconto",

            descricao:
              `Desconto: ${descricaoDesconto} - ${textoServicos}`,

            valor:
              valorDesconto,

            data:
              dataAtendimento,

            hora:
              horaAtendimento,

            barbeiro:
              "Barbearia",

            cliente:
              clienteAtendimento,

            servico:
              textoServicos,

            servicos:
              servicosSelecionados.map(
                (servico) => ({

                  id:
                    servico.id,

                  nome:
                    servico.nome,

                  valor:
                    Number(
                      servico.valor
                    ) || 0
                })
              ),

            produto:
              textoProdutos,

            produtos:
              produtosSelecionados.map(
                (produto) => ({

                  id:
                    produto.id,

                  nome:
                    produto.nome,

                  valor:
                    Number(
                      produto.valor
                    ) || 0
                })
              ),

            formaPagamento:
              formaPagamento,

            agendamentoId:
              agendamentoId,

            prioridadeHistorico:
              2,

            criadoPor:
              nomeUsuario,

            usuarioId:
              usuarioId,

            dataCadastro:
              Date.now()
          },
          {
            merge:
              true
          }
        );

      } else {

        await deleteDoc(
          documentoDesconto
        );
      }


      /* =========================================
         FECHAR / ATUALIZAR
      ========================================= */

      fecharModal(
        "modal-concluir-atendimento"
      );

      agendamentoSelecionado =
        null;

      planoAtendimentoSelecionado = null;
      atendimentoPeloPlano = false;
      atendimentoPlanoComExtras = false;

      await atualizarAgenda();


      if (
        conteudoRelatorioHistorico &&
        !conteudoRelatorioHistorico.classList.contains(
          "escondida"
        )
      ) {

        await atualizarHistoricoFinanceiro();
      }


    } catch (erro) {

      console.log(
        "Erro ao concluir atendimento:",
        erro
      );

      mensagemConclusaoAtendimento.textContent =
        "Não foi possível concluir o atendimento.";
    }
  }
);

/* =========================================================
   CANCELAR / NÃO REALIZADO
========================================================= */

botaoCancelarAgendamento.addEventListener(
  "click",
  async () => {
    if (!usuarioPodeCancelarAgendamento(agendamentoSelecionado)) return;

    if (!agendamentoSelecionado) {
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "agendamentos",
          agendamentoSelecionado.id
        ),
        {
          status:
            "cancelado"
        }
      );

      fecharModal(
        "modal-detalhes"
      );

      agendamentoSelecionado =
        null;

      await atualizarAgenda();
    } catch (erro) {
      console.log(
        erro
      );

      alert(
        "Não foi possível cancelar o agendamento."
      );
    }
  }
);

botaoNaoRealizadoAgendamento.addEventListener(
  "click",
  async () => {
    if (!usuarioPodeFinalizarAtendimento()) return;

    if (!agendamentoSelecionado) {
      return;
    }

    if (!agendamentoEstaMarcadoParaHoje(agendamentoSelecionado)) {
      alert(mensagemDataPermitidaDoAgendamento(agendamentoSelecionado));
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "agendamentos",
          agendamentoSelecionado.id
        ),
        {
          status:
            "nao_realizado"
        }
      );

      fecharModal(
        "modal-detalhes"
      );

      agendamentoSelecionado =
        null;

      await atualizarAgenda();
    } catch (erro) {
      console.log(
        erro
      );

      alert(
        "Não foi possível atualizar o agendamento."
      );
    }
  }
);

/* =========================================================
   BARBEIROS
========================================================= */

function mostrarListaDeBarbeiros() {
  const pesquisa =
    pesquisaBarbeiro.value
      .trim()
      .toLowerCase();

  const filtrados =
    barbeiros.filter(
      (barbeiro) =>
        barbeiro.nome
          .toLowerCase()
          .includes(
            pesquisa
          )
    );

  listaGerenciarBarbeiros.innerHTML =
    "";

  if (
    filtrados.length === 0
  ) {
    listaGerenciarBarbeiros.innerHTML = `
      <p class="lista-vazia">
        Nenhum barbeiro encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach(
    (barbeiro) => {
      const linha =
        document.createElement(
          "div"
        );

      linha.className =
        "item-lista";

      const informacoes =
        document.createElement(
          "div"
        );

      const nome =
        document.createElement(
          "strong"
        );

      nome.textContent =
        barbeiro.nome;

      const descricao =
        document.createElement(
          "small"
        );

      descricao.textContent =
        "Barbeiro cadastrado";

      informacoes.append(
        nome,
        descricao
      );

      linha.appendChild(
        informacoes
      );

      if (
        usuarioPodeGerenciarBarbeiros()
      ) {
        const botaoExcluir =
          document.createElement(
            "button"
          );

        botaoExcluir.type =
          "button";

        botaoExcluir.className =
          "botao-excluir";

        botaoExcluir.textContent =
          "Excluir";

        botaoExcluir.addEventListener(
          "click",
          async () => {
            const resposta =
              await getDocs(
                collection(
                  db,
                  "agendamentos"
                )
              );

            const temPendente =
              resposta.docs.some(
                (documento) => {
                  const agendamento =
                    documento.data();

                  return (
                    agendamento.barbeiro ===
                      barbeiro.nome &&
                    agendamento.status !==
                      "cancelado" &&
                    agendamento.status !==
                      "concluido" &&
                    agendamento.status !==
                      "nao_realizado"
                  );
                }
              );

            if (temPendente) {
              mensagemBarbeiro.textContent =
                "Não é possível excluir este barbeiro porque ele possui um horário pendente.";

              return;
            }

            if (
              !confirm(
                `Deseja excluir o barbeiro ${barbeiro.nome}?`
              )
            ) {
              return;
            }

            await deleteDoc(
              doc(
                db,
                "barbeiros",
                barbeiro.id
              )
            );

            mensagemBarbeiro.textContent =
              `${barbeiro.nome} foi excluído com sucesso.`;

            if (
              barbeiroAtual ===
              barbeiro.nome
            ) {
              barbeiroAtual =
                "";
            }

            await carregarBarbeiros();

            preencherSelectDeBarbeiros();

            mostrarListaDeBarbeiros();
          }
        );

        linha.appendChild(
          botaoExcluir
        );
      }

      listaGerenciarBarbeiros.appendChild(
        linha
      );
    }
  );
}

botaoMostrarCadastroBarbeiro.addEventListener(
  "click",
  () => {
    if (
      !usuarioPodeGerenciarBarbeiros()
    ) {
      mensagemBarbeiro.textContent =
        "Somente o administrador pode cadastrar barbeiros.";

      return;
    }

    formCadastroBarbeiro.classList.toggle(
      "escondida"
    );

    mensagemBarbeiro.textContent =
      "";

    if (
      !formCadastroBarbeiro.classList.contains(
        "escondida"
      )
    ) {
      formCadastroBarbeiro.reset();

      nomeNovoBarbeiro.focus();
    }
  }
);

formCadastroBarbeiro.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemBarbeiro.textContent =
      "";

    if (
      !usuarioPodeGerenciarBarbeiros()
    ) {
      return;
    }

    const nome =
      nomeNovoBarbeiro.value.trim();

    const senha =
      senhaNovoBarbeiro.value.trim();

    const confirmacao =
      confirmarSenhaNovoBarbeiro.value.trim();

    if (!nome) {
      mensagemBarbeiro.textContent =
        "Digite o nome do barbeiro.";

      return;
    }

    if (
      senha.length < 4
    ) {
      mensagemBarbeiro.textContent =
        "A senha precisa ter pelo menos 4 caracteres.";

      return;
    }

    if (
      senha !== confirmacao
    ) {
      mensagemBarbeiro.textContent =
        "As senhas digitadas não são iguais.";

      return;
    }

    const jaExiste =
      barbeiros.some(
        (barbeiro) =>
          barbeiro.nome.toLowerCase() ===
          nome.toLowerCase()
      );

    if (jaExiste) {
      mensagemBarbeiro.textContent =
        "Esse barbeiro já está cadastrado.";

      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "barbeiros"
        ),
        {
          nome,
          senha,
          ativo: true,
          dataCadastro:
            Date.now()
        }
      );

      formCadastroBarbeiro.reset();

      mensagemBarbeiro.textContent =
        `${nome} foi cadastrado com sucesso.`;

      await carregarBarbeiros();

      preencherSelectDeBarbeiros();

      mostrarListaDeBarbeiros();
    } catch (erro) {
      console.log(
        erro
      );

      mensagemBarbeiro.textContent =
        "Não foi possível cadastrar o barbeiro.";
    }
  }
);

/* =========================================================
   CLIENTES
========================================================= */

function criarLinkWhatsAppDoCliente(cliente) {
  const numero = String(cliente.celular || "")
    .replace(/\D/g, "");

  if (numero.length !== 10 && numero.length !== 11) {
    return "";
  }

  return `https://wa.me/55${numero}`;
}

function encerrarEdicaoCliente() {
  formCadastroCliente.reset();
  clienteIdEdicao.value = "";
  salvarCliente.textContent = "Salvar cliente";
  cancelarEdicaoCliente.classList.add("escondida");
  botaoMostrarCadastroCliente.textContent = "Cadastrar cliente";
}

function abrirEdicaoCliente(cliente) {
  clienteIdEdicao.value = cliente.id;
  nomeNovoCliente.value = cliente.nome || "";
  celularNovoCliente.value = cliente.celular || "";
  salvarCliente.textContent = "Salvar alterações";
  cancelarEdicaoCliente.classList.remove("escondida");
  botaoMostrarCadastroCliente.textContent = "Cadastrar novo cliente";
  formCadastroCliente.classList.remove("escondida");
  mensagemCliente.textContent = `Editando ${cliente.nome}.`;
  formCadastroCliente.scrollIntoView({ behavior: "smooth", block: "start" });
  nomeNovoCliente.focus();
}

function mostrarListaDeClientes() {
  const pesquisa =
    pesquisaCliente.value
      .trim()
      .toLowerCase();

  const filtrados =
    clientes.filter(
      (cliente) =>
        cliente.nome
          .toLowerCase()
          .includes(
            pesquisa
          ) ||
        cliente.celular.includes(
          pesquisa
        )
    );

  listaGerenciarClientes.innerHTML =
    "";

  if (
    filtrados.length === 0
  ) {
    listaGerenciarClientes.innerHTML = `
      <p class="lista-vazia">
        Nenhum cliente encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach(
    (cliente) => {
      const linha =
        document.createElement(
          "div"
        );

      linha.className =
        "item-lista";

      const informacoes =
        document.createElement(
          "div"
        );

      const nome =
        document.createElement(
          "strong"
        );

      nome.textContent =
        cliente.nome;

      const celular =
        document.createElement(
          "small"
        );

      celular.textContent =
        cliente.celular;

      informacoes.append(
        nome,
        celular
      );

      const acoes =
        document.createElement(
          "div"
        );

      acoes.className =
        "acoes-cliente";

      const botaoWhatsApp =
        document.createElement(
          "a"
        );

      botaoWhatsApp.className =
        "botao-whatsapp-cliente";

      botaoWhatsApp.textContent =
        "WhatsApp";

      botaoWhatsApp.href =
        criarLinkWhatsAppDoCliente(
          cliente
        );

      botaoWhatsApp.target =
        "_blank";

      botaoWhatsApp.rel =
        "noopener noreferrer";

      botaoWhatsApp.setAttribute(
        "aria-label",
        `Abrir conversa com ${cliente.nome} no WhatsApp`
      );

      const botaoEditar = document.createElement("button");
      botaoEditar.type = "button";
      botaoEditar.className = "botao-editar-cliente";
      botaoEditar.textContent = "Editar";
      botaoEditar.addEventListener("click", () => abrirEdicaoCliente(cliente));

      const botaoExcluir =
        document.createElement(
          "button"
        );

      botaoExcluir.type =
        "button";

      botaoExcluir.className =
        "botao-excluir";

      botaoExcluir.textContent =
        "Excluir";

      botaoExcluir.addEventListener(
        "click",
        async () => {
          const resposta =
            await getDocs(
              collection(
                db,
                "agendamentos"
              )
            );

          const temPendente =
            resposta.docs.some(
              (documento) => {
                const agendamento =
                  documento.data();

                const pertence =
                  agendamento.clienteId ===
                    cliente.id ||
                  agendamento.cliente ===
                    cliente.nome;

                const pendente =
                  agendamento.status !==
                    "cancelado" &&
                  agendamento.status !==
                    "concluido" &&
                  agendamento.status !==
                    "nao_realizado";

                return (
                  pertence &&
                  pendente
                );
              }
            );

          if (temPendente) {
            mensagemCliente.textContent =
              "Não é possível excluir este cliente porque ele possui um horário pendente.";

            return;
          }

          if (
            !confirm(
              `Deseja excluir o cliente ${cliente.nome}?`
            )
          ) {
            return;
          }

          await deleteDoc(
            doc(
              db,
              "clientes",
              cliente.id
            )
          );

          mensagemCliente.textContent =
            `${cliente.nome} foi excluído com sucesso.`;

          await carregarClientes();

          mostrarListaDeClientes();
        }
      );

      acoes.append(
        botaoWhatsApp,
        botaoEditar,
        botaoExcluir
      );

      linha.append(
        informacoes,
        acoes
      );

      listaGerenciarClientes.appendChild(
        linha
      );
    }
  );
}

botaoMostrarCadastroCliente.addEventListener(
  "click",
  () => {
    formCadastroCliente.classList.toggle(
      "escondida"
    );

    mensagemCliente.textContent =
      "";

    if (
      !formCadastroCliente.classList.contains(
        "escondida"
      )
    ) {
      encerrarEdicaoCliente();

      nomeNovoCliente.focus();
    }
  }
);

cancelarEdicaoCliente?.addEventListener("click", () => {
  encerrarEdicaoCliente();
  formCadastroCliente.classList.add("escondida");
  mensagemCliente.textContent = "";
});

function formatarCelular(valor) {
  const numeros =
    valor
      .replace(/\D/g, "")
      .slice(0, 11);

  if (
    numeros.length <= 2
  ) {
    return numeros;
  }

  if (
    numeros.length <= 7
  ) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

celularNovoCliente.addEventListener(
  "input",
  () => {
    celularNovoCliente.value =
      formatarCelular(
        celularNovoCliente.value
      );
  }
);

formCadastroCliente.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemCliente.textContent =
      "";

    const nome =
      nomeNovoCliente.value.trim();

    const celular =
      celularNovoCliente.value.trim();

    const somenteNumeros =
      celular.replace(
        /\D/g,
        ""
      );

    const idEmEdicao = clienteIdEdicao.value;

    if (!nome) {
      mensagemCliente.textContent =
        "Digite o nome do cliente.";

      return;
    }

    if (
      somenteNumeros.length !==
      11
    ) {
      mensagemCliente.textContent =
        "Digite um número de celular com 11 dígitos.";

      return;
    }

    const jaExiste =
      clientes.some(
        (cliente) => {
          if (cliente.id === idEmEdicao) return false;

          const celularCliente =
            cliente.celular.replace(
              /\D/g,
              ""
            );

          return (
            cliente.nome.toLowerCase() ===
              nome.toLowerCase() ||
            celularCliente ===
              somenteNumeros
          );
        }
      );

    if (jaExiste) {
      mensagemCliente.textContent =
        "Já existe um cliente com esse nome ou celular.";

      return;
    }

    try {
      if (idEmEdicao) {
        const clienteAnterior = clientes.find((cliente) => cliente.id === idEmEdicao);
        await updateDoc(doc(db, "clientes", idEmEdicao), {
          nome,
          celular,
          dataAtualizacao: Date.now()
        });

        if (clienteAnterior?.nome !== nome) {
          const respostaAgendamentos = await getDocs(collection(db, "agendamentos"));
          const lote = writeBatch(db);
          let houveAtualizacao = false;

          respostaAgendamentos.docs.forEach((documento) => {
            const agendamento = documento.data();
            const pendente = !["concluido", "cancelado", "nao_realizado"]
              .includes(agendamento.status);
            if (pendente && agendamento.clienteId === idEmEdicao) {
              lote.update(documento.ref, { cliente: nome });
              houveAtualizacao = true;
            }
          });

          if (houveAtualizacao) await lote.commit();
        }

        mensagemCliente.textContent = `${nome} foi atualizado com sucesso.`;
      } else {
        await addDoc(collection(db, "clientes"), {
          nome,
          celular,
          dataCadastro: Date.now()
        });
        mensagemCliente.textContent = `${nome} foi cadastrado com sucesso.`;
      }

      encerrarEdicaoCliente();
      formCadastroCliente.classList.add("escondida");

      await carregarClientes();

      mostrarListaDeClientes();
    } catch (erro) {
      console.log(
        erro
      );

      mensagemCliente.textContent =
        "Não foi possível cadastrar o cliente.";
    }
  }
);

/* =========================================================
   PRODUTOS
========================================================= */

function mostrarListaDeProdutos() {
  const pesquisa =
    pesquisaProduto.value
      .trim()
      .toLowerCase();

  const filtrados =
    produtos.filter(
      (produto) =>
        produto.nome
          .toLowerCase()
          .includes(
            pesquisa
          )
    );

  listaProdutos.innerHTML =
    "";

  if (
    filtrados.length === 0
  ) {
    listaProdutos.innerHTML = `
      <p class="lista-vazia">
        Nenhum produto encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach(
    (produto) => {
      const linha =
        document.createElement(
          "div"
        );

      linha.className =
        "item-lista";

      const informacoes =
        document.createElement(
          "div"
        );

      const nome =
        document.createElement(
          "strong"
        );

      nome.textContent =
        produto.nome;

      const valor =
        document.createElement(
          "small"
        );

      valor.textContent =
        formatarValorEmReal(
          produto.valor
        );

      informacoes.append(
        nome,
        valor
      );

      linha.appendChild(
        informacoes
      );

      if (
        usuarioPodeGerenciarCatalogo()
      ) {
        const botoes =
          document.createElement(
            "div"
          );

        botoes.className =
          "acoes-item-catalogo";

        const editar =
          document.createElement(
            "button"
          );

        editar.type =
          "button";

        editar.className =
          "botao-secundario";

        editar.textContent =
          "Editar";

        editar.addEventListener(
          "click",
          () => {
            abrirEdicaoCatalogo(
              "produto",
              produto
            );
          }
        );

        const excluir =
          document.createElement(
            "button"
          );

        excluir.type =
          "button";

        excluir.className =
          "botao-excluir";

        excluir.textContent =
          "Excluir";

        excluir.addEventListener(
          "click",
          async () => {
            if (
              !confirm(
                `Deseja excluir o produto ${produto.nome}?`
              )
            ) {
              return;
            }

            try {
              await deleteDoc(
                doc(
                  db,
                  "produtos",
                  produto.id
                )
              );

              mensagemProduto.textContent =
                `${produto.nome} foi excluído com sucesso.`;

              await carregarProdutos();

              mostrarListaDeProdutos();
            } catch (erro) {
              console.log(
                erro
              );

              mensagemProduto.textContent =
                "Não foi possível excluir o produto.";
            }
          }
        );

        botoes.append(
          editar,
          excluir
        );

        linha.appendChild(
          botoes
        );
      }

      listaProdutos.appendChild(
        linha
      );
    }
  );
}

botaoMostrarCadastroProduto.addEventListener(
  "click",
  () => {
    if (
      !usuarioPodeGerenciarCatalogo()
    ) {
      return;
    }

    formCadastroProduto.classList.toggle(
      "escondida"
    );

    mensagemProduto.textContent =
      "";

    if (
      !formCadastroProduto.classList.contains(
        "escondida"
      )
    ) {
      formCadastroProduto.reset();

      nomeNovoProduto.focus();
    }
  }
);

valorNovoProduto.addEventListener(
  "input",
  () =>
    formatarCampoValor(
      valorNovoProduto
    )
);

formCadastroProduto.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemProduto.textContent =
      "";

    if (
      !usuarioPodeGerenciarCatalogo()
    ) {
      return;
    }

    const nome =
      nomeNovoProduto.value.trim();

    const valor =
      converterValorParaNumero(
        valorNovoProduto.value
      );

    if (!nome) {
      mensagemProduto.textContent =
        "Digite o nome do produto.";

      return;
    }

    if (valor <= 0) {
      mensagemProduto.textContent =
        "Digite um valor válido para o produto.";

      return;
    }

    const jaExiste =
      produtos.some(
        (produto) =>
          produto.nome.toLowerCase() ===
          nome.toLowerCase()
      );

    if (jaExiste) {
      mensagemProduto.textContent =
        "Esse produto já está cadastrado.";

      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "produtos"
        ),
        {
          nome,
          valor,
          ativo: true,
          dataCadastro:
            Date.now()
        }
      );

      formCadastroProduto.reset();

      mensagemProduto.textContent =
        `${nome} foi cadastrado com sucesso.`;

      await carregarProdutos();

      mostrarListaDeProdutos();
    } catch (erro) {
      console.log(
        erro
      );

      mensagemProduto.textContent =
        "Não foi possível cadastrar o produto.";
    }
  }
);

/* =========================================================
   SERVIÇOS
========================================================= */

function mostrarListaDeServicos() {
  const pesquisa =
    pesquisaServico.value
      .trim()
      .toLowerCase();

  const filtrados =
    servicos.filter(
      (servico) =>
        servico.nome
          .toLowerCase()
          .includes(
            pesquisa
          )
    );

  listaServicos.innerHTML =
    "";

  if (
    filtrados.length === 0
  ) {
    listaServicos.innerHTML = `
      <p class="lista-vazia">
        Nenhum serviço encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach(
    (servico) => {
      const linha =
        document.createElement(
          "div"
        );

      linha.className =
        "item-lista";

      const informacoes =
        document.createElement(
          "div"
        );

      const nome =
        document.createElement(
          "strong"
        );

      nome.textContent =
        servico.nome;

      const valor =
        document.createElement(
          "small"
        );

      valor.textContent =
        formatarValorEmReal(
          servico.valor
        );

      informacoes.append(
        nome,
        valor
      );

      linha.appendChild(
        informacoes
      );

      if (
        usuarioPodeGerenciarCatalogo()
      ) {
        const botoes =
          document.createElement(
            "div"
          );

        botoes.className =
          "acoes-item-catalogo";

        const editar =
          document.createElement(
            "button"
          );

        editar.type =
          "button";

        editar.className =
          "botao-secundario";

        editar.textContent =
          "Editar";

        editar.addEventListener(
          "click",
          () => {
            abrirEdicaoCatalogo(
              "servico",
              servico
            );
          }
        );

        const excluir =
          document.createElement(
            "button"
          );

        excluir.type =
          "button";

        excluir.className =
          "botao-excluir";

        excluir.textContent =
          "Excluir";

        excluir.addEventListener(
          "click",
          async () => {
            if (
              !confirm(
                `Deseja excluir o serviço ${servico.nome}?`
              )
            ) {
              return;
            }

            try {
              await deleteDoc(
                doc(
                  db,
                  "servicos",
                  servico.id
                )
              );

              mensagemServico.textContent =
                `${servico.nome} foi excluído com sucesso.`;

              await carregarServicos();

              mostrarListaDeServicos();
            } catch (erro) {
              console.log(
                erro
              );

              mensagemServico.textContent =
                "Não foi possível excluir o serviço.";
            }
          }
        );

        botoes.append(
          editar,
          excluir
        );

        linha.appendChild(
          botoes
        );
      }

      listaServicos.appendChild(
        linha
      );
    }
  );
}

botaoMostrarCadastroServico.addEventListener(
  "click",
  () => {
    if (
      !usuarioPodeGerenciarCatalogo()
    ) {
      return;
    }

    formCadastroServico.classList.toggle(
      "escondida"
    );

    mensagemServico.textContent =
      "";

    if (
      !formCadastroServico.classList.contains(
        "escondida"
      )
    ) {
      formCadastroServico.reset();

      nomeNovoServico.focus();
    }
  }
);

valorNovoServico.addEventListener(
  "input",
  () =>
    formatarCampoValor(
      valorNovoServico
    )
);

formCadastroServico.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemServico.textContent =
      "";

    if (
      !usuarioPodeGerenciarCatalogo()
    ) {
      return;
    }

    const nome =
      nomeNovoServico.value.trim();

    const valor =
      converterValorParaNumero(
        valorNovoServico.value
      );

    if (!nome) {
      mensagemServico.textContent =
        "Digite o nome do serviço.";

      return;
    }

    if (valor <= 0) {
      mensagemServico.textContent =
        "Digite um valor válido para o serviço.";

      return;
    }

    const jaExiste =
      servicos.some(
        (servico) =>
          servico.nome.toLowerCase() ===
          nome.toLowerCase()
      );

    if (jaExiste) {
      mensagemServico.textContent =
        "Esse serviço já está cadastrado.";

      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "servicos"
        ),
        {
          nome,
          valor,
          ativo: true,
          dataCadastro:
            Date.now()
        }
      );

      formCadastroServico.reset();

      mensagemServico.textContent =
        `${nome} foi cadastrado com sucesso.`;

      await carregarServicos();

      mostrarListaDeServicos();
    } catch (erro) {
      console.log(
        erro
      );

      mensagemServico.textContent =
        "Não foi possível cadastrar o serviço.";
    }
  }
);

/* =========================================================
   EDITAR CATÁLOGO
========================================================= */

function abrirEdicaoCatalogo(
  tipo,
  item
) {
  if (
    !usuarioPodeGerenciarCatalogo()
  ) {
    return;
  }

  idEditarCatalogo.value =
    item.id;

  tipoEditarCatalogo.value =
    tipo;

  nomeEditarCatalogo.value =
    item.nome;

  valorEditarCatalogo.value =
    formatarValorEmReal(
      item.valor
    );

  tituloEditarCatalogo.textContent =
    tipo === "produto"
      ? "Editar produto"
      : "Editar serviço";

  mensagemEditarCatalogo.textContent =
    "";

  modalEditarCatalogo.classList.remove(
    "escondido"
  );
}

valorEditarCatalogo.addEventListener(
  "input",
  () =>
    formatarCampoValor(
      valorEditarCatalogo
    )
);

formEditarCatalogo.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemEditarCatalogo.textContent =
      "";

    if (
      !usuarioPodeGerenciarCatalogo()
    ) {
      return;
    }

    const id =
      idEditarCatalogo.value;

    const tipo =
      tipoEditarCatalogo.value;

    const nome =
      nomeEditarCatalogo.value.trim();

    const valor =
      converterValorParaNumero(
        valorEditarCatalogo.value
      );

    if (
      !id ||
      !tipo
    ) {
      mensagemEditarCatalogo.textContent =
        "Item não encontrado.";

      return;
    }

    if (!nome) {
      mensagemEditarCatalogo.textContent =
        "Digite o nome do item.";

      return;
    }

    if (valor <= 0) {
      mensagemEditarCatalogo.textContent =
        "Digite um valor válido.";

      return;
    }

    const nomeColecao =
      tipo === "produto"
        ? "produtos"
        : "servicos";

    try {
      await updateDoc(
        doc(
          db,
          nomeColecao,
          id
        ),
        {
          nome,
          valor,
          dataAtualizacao:
            Date.now()
        }
      );

      fecharModal(
        "modal-editar-catalogo"
      );

      if (
        tipo === "produto"
      ) {
        await carregarProdutos();

        mostrarListaDeProdutos();

        mensagemProduto.textContent =
          "Produto atualizado com sucesso.";
      } else {
        await carregarServicos();

        mostrarListaDeServicos();

        mensagemServico.textContent =
          "Serviço atualizado com sucesso.";
      }
    } catch (erro) {
      console.log(
        erro
      );

      mensagemEditarCatalogo.textContent =
        "Não foi possível salvar as alterações.";
    }
  }
);

/* =========================================================
   PESQUISAS
========================================================= */

pesquisaBarbeiro.addEventListener(
  "input",
  mostrarListaDeBarbeiros
);

pesquisaCliente.addEventListener(
  "input",
  mostrarListaDeClientes
);

pesquisaProduto.addEventListener(
  "input",
  mostrarListaDeProdutos
);

pesquisaServico.addEventListener(
  "input",
  mostrarListaDeServicos
);

pesquisaClienteAgendamento.addEventListener(
  "input",
  () => {
    clienteSelecionado =
      null;

    mostrarClientesNoAgendamento();
  }
);

/* =========================================================
   SELECIONAR BARBEIRO
========================================================= */

selectBarbeiro.addEventListener(
  "change",
  async () => {
    barbeiroAtual =
      selectBarbeiro.value;

    iniciarEscutaAgendamentosTempoReal();

    if (!barbeiroAtual) {
      textoAgenda.textContent =
        "Escolha um profissional para ver a agenda.";

      agendamentos = [];

      mostrarAgenda();

      return;
    }

    textoAgenda.textContent =
      `Profissional ${barbeiroAtual} vai atender.`;

    await atualizarAgenda();
  }
);

/* =========================================================
   ROLAGEM DA AGENDA
========================================================= */

agendaScroll.addEventListener(
  "scroll",
  () => {
    const chegouAoFim =
      agendaScroll.scrollLeft +
        agendaScroll.clientWidth >=
      agendaScroll.scrollWidth -
        300;

    if (!chegouAoFim) {
      return;
    }

    const horizontal =
      agendaScroll.scrollLeft;

    const vertical =
      agendaScroll.scrollTop;

    adicionarMaisDias();

    mostrarAgenda();

    agendaScroll.scrollLeft =
      horizontal;

    agendaScroll.scrollTop =
      vertical;
  }
);

/* =========================================================
   ABAS DO RELATÓRIO
========================================================= */

function desativarAbasRelatorio() {
  conteudoRelatorioDesempenho?.classList.add(
    "escondida"
  );

  conteudoRelatorioFinanceiro?.classList.add(
    "escondida"
  );

  conteudoRelatorioHistorico?.classList.add(
    "escondida"
  );

  conteudoRelatorioProdutosDiarios?.classList.add("escondida");

  abaRelatorioDesempenho?.classList.remove(
    "ativo"
  );

  abaRelatorioFinanceiro?.classList.remove(
    "ativo"
  );

  abaRelatorioHistorico?.classList.remove(
    "ativo"
  );

  abaRelatorioProdutosDiarios?.classList.remove("ativo");
}

function abrirRelatorioDesempenho() {
  desativarAbasRelatorio();

  conteudoRelatorioDesempenho.classList.remove(
    "escondida"
  );

  abaRelatorioDesempenho.classList.add(
    "ativo"
  );
}

async function abrirRelatorioFinanceiro() {
  if (
    !usuarioPodeVisualizarFinanceiro()
  ) {
    return;
  }

  desativarAbasRelatorio();

  conteudoRelatorioFinanceiro.classList.remove(
    "escondida"
  );

  abaRelatorioFinanceiro.classList.add(
    "ativo"
  );

  await atualizarFinanceiro();
}

async function abrirRelatorioHistorico() {
  if (
    !usuarioPodeVisualizarFinanceiro() ||
    !conteudoRelatorioHistorico
  ) {
    return;
  }

  desativarAbasRelatorio();

  conteudoRelatorioHistorico.classList.remove(
    "escondida"
  );

  abaRelatorioHistorico?.classList.add(
    "ativo"
  );

  dataHistorico = new Date();
  if (periodoRelatorioHistorico) periodoRelatorioHistorico.value = "diario";

  await atualizarHistoricoFinanceiro();
}

async function abrirRelatorioProdutosDiarios() {
  desativarAbasRelatorio();
  conteudoRelatorioProdutosDiarios?.classList.remove("escondida");
  abaRelatorioProdutosDiarios?.classList.add("ativo");
  dataProdutosRelatorio = new Date();
  await atualizarProdutosDiarios();
}

/* =========================================================
   ABRIR TELA RELATÓRIO
========================================================= */

async function abrirTelaRelatorio() {
  esconderTodasAsTelas();

  telaRelatorio.classList.remove(
    "escondida"
  );

  marcarBotaoAtivo(
    "Relatório"
  );

  limitarFinanceiroDaRecepcaoAoDiario();

  if (
    barbeiros.length === 0
  ) {
    await carregarBarbeiros();
  }

  if (filtroProdutosDiariosBarbeiro) {
    filtroProdutosDiariosBarbeiro.innerHTML = tipoUsuario === "barbeiro"
      ? `<option value="${nomeUsuario}">${nomeUsuario}</option>`
      : `<option value="todos">Todos os profissionais</option>
         <option value="recepcionista">Recepção</option>`;

    if (tipoUsuario !== "barbeiro") {
      barbeiros.forEach((barbeiro) => {
        const opcao = document.createElement("option");
        opcao.value = barbeiro.nome;
        opcao.textContent = barbeiro.nome;
        filtroProdutosDiariosBarbeiro.appendChild(opcao);
      });
    }
  }

  filtroRelatorioBarbeiro.innerHTML =
    "";

  if (
    usuarioPodeVisualizarRelatorioGeral()
  ) {
    filtroRelatorioBarbeiro.innerHTML = `
      <option value="todos">
        Barbearia inteira
      </option>
    `;

    barbeiros.forEach(
      (barbeiro) => {
        const opcao =
          document.createElement(
            "option"
          );

        opcao.value =
          barbeiro.nome;

        opcao.textContent =
          barbeiro.nome;

        filtroRelatorioBarbeiro.appendChild(
          opcao
        );
      }
    );
  } else {
    const opcao =
      document.createElement(
        "option"
      );

    opcao.value =
      nomeUsuario;

    opcao.textContent =
      nomeUsuario;

    filtroRelatorioBarbeiro.appendChild(
      opcao
    );
  }

  if (
    usuarioPodeVisualizarFinanceiro()
  ) {
    abaRelatorioFinanceiro?.classList.remove(
      "escondida"
    );

    abaRelatorioHistorico?.classList.remove(
      "escondida"
    );

    preencherFiltroFinanceiroBarbeiros();

    preencherFiltroHistoricoBarbeiros();

    preencherBarbeirosSaida();
  } else {
    abaRelatorioFinanceiro?.classList.add(
      "escondida"
    );

    abaRelatorioHistorico?.classList.add(
      "escondida"
    );
  }

  await atualizarRelatorio();

  abrirRelatorioDesempenho();
}

/* =========================================================
   RELATÓRIO DE DESEMPENHO
========================================================= */

function obterPeriodoRelatorio() {
  const inicio =
    new Date(
      mesRelatorio.getFullYear(),
      mesRelatorio.getMonth(),
      1
    );

  const fim =
    new Date(
      mesRelatorio.getFullYear(),
      mesRelatorio.getMonth() +
        1,
      0
    );

  return {
    inicio:
      formatarDataParaSalvar(
        inicio
      ),

    fim:
      formatarDataParaSalvar(
        fim
      )
  };
}

function contarPorData(
  lista
) {
  const resultado = {};

  lista.forEach(
    (agendamento) => {
      resultado[
        agendamento.data
      ] =
        (
          resultado[
            agendamento.data
          ] || 0
        ) + 1;
    }
  );

  return resultado;
}

function mostrarCalendario(
  concluidos
) {
  const ano =
    mesRelatorio.getFullYear();

  const mes =
    mesRelatorio.getMonth();

  const hoje =
    formatarDataParaSalvar(
      new Date()
    );

  const quantidadePorData =
    contarPorData(
      concluidos
    );

  const primeiroDia =
    new Date(
      ano,
      mes,
      1
    );

  const quantidadeDias =
    new Date(
      ano,
      mes + 1,
      0
    ).getDate();

  const espacos =
    (
      primeiroDia.getDay() +
      6
    ) % 7;

  tituloCalendario.textContent =
    primeiroDia.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric"
      }
    );

  calendarioRelatorio.innerHTML =
    "";

  for (
    let numero = 0;
    numero < espacos;
    numero++
  ) {
    const vazio =
      document.createElement(
        "div"
      );

    vazio.className =
      "dia-calendario-vazio";

    calendarioRelatorio.appendChild(
      vazio
    );
  }

  for (
    let dia = 1;
    dia <= quantidadeDias;
    dia++
  ) {
    const data =
      formatarDataParaSalvar(
        new Date(
          ano,
          mes,
          dia
        )
      );

    const quantidade =
      quantidadePorData[
        data
      ] || 0;

    const cartao =
      document.createElement(
        "div"
      );

    cartao.className =
      "dia-calendario";

    if (data === hoje) {
      cartao.classList.add(
        "hoje"
      );
    }

    if (quantidade > 0) {
      cartao.classList.add(
        "com-atendimentos"
      );
    }

    cartao.innerHTML = `
      <span class="numero-dia">
        ${dia}
      </span>

      <span class="quantidade-dia">
        ${quantidade} atendimento${quantidade === 1 ? "" : "s"}
      </span>
    `;

    calendarioRelatorio.appendChild(
      cartao
    );
  }
}

function maiorInformacao(
  lista,
  campo
) {
  const contagem = {};

  lista.forEach(
    (agendamento) => {
      const valor =
        agendamento[
          campo
        ];

      if (!valor) {
        return;
      }

      contagem[valor] =
        (
          contagem[
            valor
          ] || 0
        ) + 1;
    }
  );

  const maior =
    Object.keys(
      contagem
    ).sort(
      (a, b) =>
        contagem[b] -
        contagem[a]
    )[0];

  return maior || "—";
}

async function atualizarRelatorio() {
  const resposta =
    await getDocs(
      collection(
        db,
        "agendamentos"
      )
    );

  const periodo =
    obterPeriodoRelatorio();

  const barbeiro =
    filtroRelatorioBarbeiro.value;

  const lista =
    resposta.docs
      .map(
        (documento) =>
          documento.data()
      )
      .filter(
        (agendamento) => {
          const estaNoPeriodo =
            agendamento.data >=
              periodo.inicio &&
            agendamento.data <=
              periodo.fim;

          const estaNoBarbeiro =
            barbeiro ===
              "todos" ||
            agendamento.barbeiro ===
              barbeiro;

          return (
            estaNoPeriodo &&
            estaNoBarbeiro
          );
        }
      );

  const concluidos =
    lista.filter(
      (agendamento) =>
        agendamento.status ===
        "concluido"
    );

  document.querySelector(
    "#total-concluido"
  ).textContent =
    concluidos.length;

  document.querySelector(
    "#horario-mais-atendido"
  ).textContent =
    maiorInformacao(
      concluidos,
      "hora"
    );

  const diasSemana =
    concluidos.map(
      (agendamento) =>
        dataPorTexto(
          agendamento.data
        ).toLocaleDateString(
          "pt-BR",
          {
            weekday:
              "long"
          }
        )
    );

  const contagemDias =
    {};

  diasSemana.forEach(
    (dia) => {
      contagemDias[dia] =
        (
          contagemDias[
            dia
          ] || 0
        ) + 1;
    }
  );

  const diaMaisAtendido =
    Object.keys(
      contagemDias
    ).sort(
      (a, b) =>
        contagemDias[b] -
        contagemDias[a]
    )[0];

  document.querySelector(
    "#dia-mais-atendido"
  ).textContent =
    diaMaisAtendido ||
    "—";

  mostrarCalendario(
    concluidos
  );

  if (graficoStatus) {
    graficoStatus.destroy();
  }

  let labels = [];
  let dados = [];

  if (
    filtroSegundoGrafico.value ===
    "horario"
  ) {
    const porHorario =
      {};

    concluidos.forEach(
      (agendamento) => {
        porHorario[
          agendamento.hora
        ] =
          (
            porHorario[
              agendamento.hora
            ] || 0
          ) + 1;
      }
    );

    labels =
      Object.keys(
        porHorario
      ).sort();

    dados =
      labels.map(
        (horario) =>
          porHorario[
            horario
          ]
      );

    tituloSegundoGrafico.textContent =
      "Horário que mais atende";
  } else {
    const ordemDias = [
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
      "domingo"
    ];

    const porDia = {};

    concluidos.forEach(
      (agendamento) => {
        const dia =
          dataPorTexto(
            agendamento.data
          ).toLocaleDateString(
            "pt-BR",
            {
              weekday:
                "long"
            }
          );

        porDia[dia] =
          (
            porDia[
              dia
            ] || 0
          ) + 1;
      }
    );

    labels =
      ordemDias.filter(
        (dia) =>
          porDia[dia]
      );

    dados =
      labels.map(
        (dia) =>
          porDia[dia]
      );

    tituloSegundoGrafico.textContent =
      "Dia da semana que mais atende";
  }

  const temaClaro =
    document.body.classList.contains(
      "tema-claro"
    );

  graficoStatus =
    new Chart(
      document.querySelector(
        "#grafico-status"
      ),
      {
        type: "bar",

        data: {
          labels,

          datasets: [
            {
              label:
                "Atendimentos concluídos",

              data:
                dados,

              backgroundColor:
                "#d8ad5b",

              borderColor:
                "#e7c77f",

              borderWidth:
                1
            }
          ]
        },

        options: {
          responsive:
            true,

          scales: {
            y: {
              beginAtZero:
                true,

              ticks: {
                stepSize:
                  1,

                color:
                  temaClaro
                    ? "#2d2d2d"
                    : "#ffffff"
              },

              grid: {
                color:
                  temaClaro
                    ? "#d4c7ad"
                    : "#444444"
              }
            },

            x: {
              ticks: {
                color:
                  temaClaro
                    ? "#2d2d2d"
                    : "#ffffff"
              },

              grid: {
                color:
                  temaClaro
                    ? "#d4c7ad"
                    : "#444444"
              }
            }
          }
        }
      }
    );
}

/* =========================================================
   PERÍODO FINANCEIRO
========================================================= */

function obterPeriodoGenerico(
  tipoPeriodo,
  dataReferencia
) {
  let inicio;
  let fim;
  let titulo;

  if (
    tipoPeriodo ===
      "diario" ||
    tipoPeriodo ===
      "dia"
  ) {
    inicio =
      new Date(
        dataReferencia
      );

    fim =
      new Date(
        dataReferencia
      );

    inicio.setHours(
      0,
      0,
      0,
      0
    );

    fim.setHours(
      23,
      59,
      59,
      999
    );

    titulo =
      dataReferencia.toLocaleDateString(
        "pt-BR",
        {
          weekday:
            "long",

          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric"
        }
      );
  } else if (
    tipoPeriodo ===
      "semanal" ||
    tipoPeriodo ===
      "semana"
  ) {
    inicio =
      obterInicioDaSemana(
        dataReferencia
      );

    fim =
      obterFimDaSemana(
        dataReferencia
      );

    titulo =
      `${inicio.toLocaleDateString("pt-BR")} até ${fim.toLocaleDateString("pt-BR")}`;
  } else {
    inicio =
      new Date(
        dataReferencia.getFullYear(),
        dataReferencia.getMonth(),
        1
      );

    fim =
      new Date(
        dataReferencia.getFullYear(),
        dataReferencia.getMonth() +
          1,
        0
      );

    fim.setHours(
      23,
      59,
      59,
      999
    );

    titulo =
      dataReferencia.toLocaleDateString(
        "pt-BR",
        {
          month:
            "long",

          year:
            "numeric"
        }
      );
  }

  return {
    tipoPeriodo,

    inicio,

    fim,

    titulo,

    inicioTexto:
      formatarDataParaSalvar(
        inicio
      ),

    fimTexto:
      formatarDataParaSalvar(
        fim
      )
  };
}

function obterPeriodoFinanceiro() {
  const tipoPeriodo = (
    tipoUsuario === "recepcionista" ||
    tipoUsuario === "barbeiro"
  )
    ? "diario"
    : periodoRelatorioFinanceiro.value;

  return obterPeriodoGenerico(
    tipoPeriodo,
    dataFinanceiro
  );
}

function preencherFiltroFinanceiroBarbeiros() {
  if (
    !filtroFinanceiroBarbeiro
  ) {
    return;
  }

  if (tipoUsuario === "barbeiro") {
    filtroFinanceiroBarbeiro.innerHTML = `
      <option value="${nomeUsuario}">
        ${nomeUsuario}
      </option>
    `;
    filtroFinanceiroBarbeiro.value = nomeUsuario;
    return;
  }

  filtroFinanceiroBarbeiro.innerHTML = `
    <option value="todos">
      Barbearia inteira
    </option>
  `;

  barbeiros.forEach(
    (barbeiro) => {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        barbeiro.nome;

      opcao.textContent =
        barbeiro.nome;

      filtroFinanceiroBarbeiro.appendChild(
        opcao
      );
    }
  );
}

/* =========================================================
   GRÁFICO FINANCEIRO
========================================================= */

function criarDadosGraficoFinanceiro(
  lista,
  periodo
) {
  let labels = [];
  let dados = [];

  const valores = {};

  if (
    periodo.tipoPeriodo ===
      "diario" ||
    periodo.tipoPeriodo ===
      "dia"
  ) {
    labels =
      horarios;

    labels.forEach(
      (hora) => {
        valores[hora] =
          0;
      }
    );

    lista.forEach(
      (agendamento) => {
        if (
          valores[
            agendamento.hora
          ] !== undefined
        ) {
          valores[
            agendamento.hora
          ] +=
            Number(
              agendamento.valorTotal
            ) || 0;
        }
      }
    );

    dados =
      labels.map(
        (hora) =>
          valores[hora]
      );

    tituloGraficoFinanceiro.textContent =
      "Faturamento por horário";
  } else if (
    periodo.tipoPeriodo ===
      "semanal" ||
    periodo.tipoPeriodo ===
      "semana"
  ) {
    const nomesDias = [
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
      "Dom"
    ];

    labels =
      nomesDias;

    labels.forEach(
      (dia) => {
        valores[dia] =
          0;
      }
    );

    lista.forEach(
      (agendamento) => {
        const data =
          dataPorTexto(
            agendamento.data
          );

        const indice =
          (
            data.getDay() +
            6
          ) % 7;

        const nomeDia =
          nomesDias[
            indice
          ];

        valores[nomeDia] +=
          Number(
            agendamento.valorTotal
          ) || 0;
      }
    );

    dados =
      labels.map(
        (dia) =>
          valores[dia]
      );

    tituloGraficoFinanceiro.textContent =
      "Faturamento semanal";
  } else {
    const quantidadeDias =
      new Date(
        dataFinanceiro.getFullYear(),
        dataFinanceiro.getMonth() +
          1,
        0
      ).getDate();

    labels =
      Array.from(
        {
          length:
            quantidadeDias
        },
        (_, indice) =>
          String(
            indice + 1
          )
      );

    labels.forEach(
      (dia) => {
        valores[dia] =
          0;
      }
    );

    lista.forEach(
      (agendamento) => {
        const dia =
          String(
            Number(
              agendamento.data.split(
                "-"
              )[2]
            )
          );

        if (
          valores[
            dia
          ] !== undefined
        ) {
          valores[dia] +=
            Number(
              agendamento.valorTotal
            ) || 0;
        }
      }
    );

    dados =
      labels.map(
        (dia) =>
          valores[dia]
      );

    tituloGraficoFinanceiro.textContent =
      "Faturamento mensal";
  }

  return {
    labels,
    dados
  };
}

/* =========================================================
   RANKINGS
========================================================= */

function mostrarRankingFinanceiro(
  elemento,
  dados,
  mensagemVazia,
  mostrarValor
) {
  if (!elemento) {
    return;
  }

  elemento.innerHTML =
    "";

  const itens =
    Object.entries(
      dados
    )
      .sort(
        (a, b) =>
          b[1].valor -
          a[1].valor
      )
      .slice(
        0,
        10
      );

  if (
    itens.length === 0
  ) {
    elemento.innerHTML = `
      <p class="lista-vazia">
        ${mensagemVazia}
      </p>
    `;

    return;
  }

  itens.forEach(
    (
      [
        nome,
        informacoes
      ],
      indice
    ) => {
      const linha =
        document.createElement(
          "div"
        );

      linha.className =
        "item-ranking-financeiro";

      const nomeElemento =
        document.createElement(
          "strong"
        );

      nomeElemento.textContent =
        `${indice + 1}. ${nome}`;

      const resultado =
        document.createElement(
          "span"
        );

      resultado.textContent =
        mostrarValor
          ? `${formatarValorEmReal(informacoes.valor)} · ${informacoes.quantidade}`
          : `${informacoes.quantidade} vez${informacoes.quantidade === 1 ? "" : "es"}`;

      linha.append(
        nomeElemento,
        resultado
      );

      const produtosDoBarbeiro = Object.entries(informacoes.produtos || {});
      if (produtosDoBarbeiro.length > 0) {
        const resumoProdutos = document.createElement("small");
        resumoProdutos.style.display = "block";
        resumoProdutos.style.width = "100%";
        resumoProdutos.style.marginTop = "6px";
        resumoProdutos.textContent = `Produtos vendidos: ${produtosDoBarbeiro
          .sort((a, b) => b[1] - a[1])
          .map(([produto, quantidade]) => `${quantidade}x ${produto}`)
          .join(", ")}`;
        linha.appendChild(resumoProdutos);
      }

      elemento.appendChild(
        linha
      );
    }
  );
}

/* =========================================================
   ATUALIZAR FINANCEIRO
========================================================= */

async function atualizarFinanceiro() {
  if (
    !usuarioPodeVisualizarFinanceiro()
  ) {
    return;
  }

  const [resposta, respostaMovimentacoes] = await Promise.all([
    getDocs(collection(db, "agendamentos")),
    getDocs(collection(db, "movimentacoesFinanceiras"))
  ]);

  const periodo =
    obterPeriodoFinanceiro();

  const barbeiroSelecionado =
    filtroFinanceiroBarbeiro?.value ||
    "todos";

  tituloPeriodoFinanceiro.textContent =
    periodo.titulo;

  const concluidos =
    resposta.docs
      .map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      )
      .filter(
        (agendamento) =>
          agendamento.status ===
            "concluido" &&
          agendamento.ocultarNoHistoricoFinanceiro !== true &&
          agendamento.data >=
            periodo.inicioTexto &&
          agendamento.data <=
            periodo.fimTexto &&
          (
            barbeiroSelecionado ===
              "todos" ||
            agendamento.barbeiro ===
              barbeiroSelecionado
          )
      );

  const assinaturasPlanos = respostaMovimentacoes.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .filter((movimentacao) =>
      movimentacao.tipo === "entrada" &&
      movimentacao.origem === "plano" &&
      movimentacao.data >= periodo.inicioTexto &&
      movimentacao.data <= periodo.fimTexto &&
      barbeiroSelecionado === "todos"
    )
    .map((movimentacao) => ({
      id: movimentacao.id,
      tipoRegistro: "assinatura_plano",
      data: movimentacao.data,
      hora: movimentacao.hora || "00:00",
      formaPagamento: movimentacao.formaPagamento || "",
      valorTotal: Number(movimentacao.valor) || 0,
      servicos: [{
        id: movimentacao.planoId || "",
        nome: `${movimentacao.planoNome || "Plano"} (Plano)`,
        valor: Number(movimentacao.valor) || 0
      }],
      produtos: []
    }));

  const vendasProdutos = respostaMovimentacoes.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .filter((movimentacao) =>
      tipoUsuario !== "barbeiro" &&
      movimentacao.tipo === "entrada" &&
      movimentacao.origem === "venda_produtos" &&
      movimentacao.data >= periodo.inicioTexto &&
      movimentacao.data <= periodo.fimTexto &&
      (
        barbeiroSelecionado === "todos" ||
        (movimentacao.barbeiro || "Barbearia") === barbeiroSelecionado
      )
    )
    .map((movimentacao) => ({
      id: movimentacao.id,
      tipoRegistro: "venda_produtos",
      data: movimentacao.data,
      hora: movimentacao.hora || "00:00",
      barbeiro: movimentacao.barbeiro || "Barbearia",
      formaPagamento: movimentacao.formaPagamento || "",
      valorTotal:
        Number(movimentacao.valorLiquido) ||
        Number(movimentacao.valor) ||
        Number(movimentacao.valorTotal) ||
        0,
      servicos: [],
      produtos: (Array.isArray(movimentacao.itens)
        ? movimentacao.itens
        : Array.isArray(movimentacao.produtos)
          ? movimentacao.produtos
          : []
      ).map((produto) => ({
        id: produto.id || "",
        nome: produto.nome || "Produto",
        quantidade: Math.max(1, Number(produto.quantidade) || 1),
        valorUnitario: Number(produto.valorUnitario) || Number(produto.valor) || 0,
        subtotal:
          Number(produto.subtotal) ||
          (Number(produto.valorUnitario) || Number(produto.valor) || 0) *
            Math.max(1, Number(produto.quantidade) || 1)
      }))
    }));

  const registrosFinanceiros = [
    ...concluidos,
    ...assinaturasPlanos,
    ...vendasProdutos
  ];

  let faturamentoTotal = 0;
  let totalServicos = 0;
  let totalProdutos = 0;

  let pix = 0;
  let dinheiro = 0;
  let cartao = 0;

  let quantidadePix = 0;
  let quantidadeDinheiro = 0;
  let quantidadeCartao = 0;
  
  let quantidadeServicos = 0;
  let quantidadeProdutos = 0;

  const rankingBarbeiros = {};
  const rankingServicos = {};
  const rankingProdutos = {};

registrosFinanceiros.forEach(
  (agendamento) => {

    /* =========================================
       SERVIÇOS DO ATENDIMENTO
    ========================================= */

    let servicosDoAtendimento = [];

    if (
      Array.isArray(agendamento.servicos) &&
      agendamento.servicos.length > 0
    ) {
      servicosDoAtendimento =
        agendamento.servicos;
    } else if (agendamento.servico) {

      /*
        Compatibilidade com atendimentos antigos
        que possuem apenas um serviço.
      */

      servicosDoAtendimento = [
        {
          id:
            agendamento.servicoId ||
            "",

          nome:
            agendamento.servico,

          valor:
            Number(
              agendamento.valorServico
            ) || 0
        }
      ];
    }


    /* =========================================
       PRODUTOS DO ATENDIMENTO
    ========================================= */

    let produtosDoAtendimento = [];

    if (
      Array.isArray(agendamento.produtos) &&
      agendamento.produtos.length > 0
    ) {
      produtosDoAtendimento =
        agendamento.produtos;
    } else if (agendamento.produto) {

      /*
        Compatibilidade com atendimentos antigos.
      */

      produtosDoAtendimento = [
        {
          id:
            agendamento.produtoId ||
            "",

          nome:
            agendamento.produto,

          valor:
            Number(
              agendamento.valorProduto
            ) || 0
        }
      ];
    }

    if (tipoUsuario === "barbeiro") {
      produtosDoAtendimento = [];
    }


    /* =========================================
       VALORES
    ========================================= */

    const valorServico =
      servicosDoAtendimento.reduce(
        (total, servico) => {
          return (
            total +
            (
              Number(servico.valor) ||
              0
            )
          );
        },
        0
      );


    const quantidadeDoProduto = (produto) =>
      Math.max(1, Number(produto.quantidade) || 1);

    const valorTotalDoProduto = (produto) =>
      Number(produto.subtotal) ||
      ((Number(produto.valorUnitario) || 0) * quantidadeDoProduto(produto)) ||
      Number(produto.valor) ||
      0;

    const valorProduto =
      produtosDoAtendimento.reduce(
        (total, produto) => {
          return total + valorTotalDoProduto(produto);
        },
        0
      );

    const valorServicoParaRepasse = servicosDoAtendimento.reduce(
      (total, servico) =>
        total + (
          Number(servico.valorOriginal) ||
          Number(servico.valor) ||
          0
        ),
      0
    );


    const valorTotal =
      tipoUsuario === "barbeiro"
        ? valorServico
        : (
          Number(agendamento.valorTotal) ||
          valorServico + valorProduto
        );


    faturamentoTotal +=
      valorTotal;

    totalServicos +=
      valorServico;

    totalProdutos +=
      valorProduto;


    /* =========================================
       QUANTIDADES
    ========================================= */

    quantidadeServicos +=
      servicosDoAtendimento.length;

    quantidadeProdutos += produtosDoAtendimento.reduce(
      (total, produto) => total + quantidadeDoProduto(produto),
      0
    );


    /* =========================================
       FORMA DE PAGAMENTO
    ========================================= */

    const pagamentosRegistro = Array.isArray(agendamento.pagamentos) && agendamento.pagamentos.length > 0
      ? agendamento.pagamentos
      : [{ forma: agendamento.formaPagamento, valor: valorTotal }];

    pagamentosRegistro.forEach((pagamento) => {
      const valorPagamento = Math.max(0, Number(pagamento.valor) || 0);
      if (pagamento.forma === "Pix") {
        pix += valorPagamento;
        quantidadePix++;
      }
      if (pagamento.forma === "Dinheiro") {
        dinheiro += valorPagamento;
        quantidadeDinheiro++;
      }
      if (pagamento.forma === "Cartão") {
        cartao += valorPagamento;
        quantidadeCartao++;
      }
    });


    /* =========================================
       RANKING DOS BARBEIROS
    ========================================= */

    const nomeBarbeiro =
      agendamento.barbeiro ||
      "Não informado";

    if (agendamento.tipoRegistro !== "assinatura_plano") {
      if (!rankingBarbeiros[nomeBarbeiro]) {
        rankingBarbeiros[nomeBarbeiro] = {
          valor: 0,
          quantidade: 0,
          produtos: {}
        };
      }

      /*
        O repasse do barbeiro corresponde a 50% do valor original
        dos serviços. Descontos reduzem somente a parte da barbearia.
        Produtos não entram no cálculo do repasse.
      */
      rankingBarbeiros[nomeBarbeiro].valor += valorServicoParaRepasse * 0.5;
      if (agendamento.tipoRegistro !== "venda_produtos") {
        rankingBarbeiros[nomeBarbeiro].quantidade++;
      }

      produtosDoAtendimento.forEach((produto) => {
        const nomeProduto = produto.nome || "Não informado";
        rankingBarbeiros[nomeBarbeiro].produtos[nomeProduto] =
          (rankingBarbeiros[nomeBarbeiro].produtos[nomeProduto] || 0) +
          quantidadeDoProduto(produto);
      });
    }


    /* =========================================
       RANKING DOS SERVIÇOS
    ========================================= */

    servicosDoAtendimento.forEach(
      (servico) => {

        const nomeServico =
          servico.nome ||
          "Não informado";


        if (
          !rankingServicos[
            nomeServico
          ]
        ) {
          rankingServicos[
            nomeServico
          ] = {
            valor: 0,
            quantidade: 0
          };
        }


        rankingServicos[
          nomeServico
        ].valor +=
          Number(
            servico.valor
          ) || 0;


        rankingServicos[
          nomeServico
        ].quantidade++;
      }
    );


    /* =========================================
       RANKING DOS PRODUTOS
    ========================================= */

    produtosDoAtendimento.forEach(
      (produto) => {

        const nomeProduto =
          produto.nome ||
          "Não informado";


        if (
          !rankingProdutos[
            nomeProduto
          ]
        ) {
          rankingProdutos[
            nomeProduto
          ] = {
            valor: 0,
            quantidade: 0
          };
        }


        rankingProdutos[
          nomeProduto
        ].valor += valorTotalDoProduto(produto);


        rankingProdutos[
          nomeProduto
        ].quantidade += quantidadeDoProduto(produto);
      }
    );
  }
);

  document.querySelector(
    "#financeiro-faturamento-total"
  ).textContent =
    formatarValorEmReal(
      faturamentoTotal
    );

  document.querySelector(
    "#financeiro-total-servicos"
  ).textContent =
    formatarValorEmReal(
      totalServicos
    );

  document.querySelector(
    "#financeiro-total-produtos"
  ).textContent =
    formatarValorEmReal(
      totalProdutos
    );

  const numeroAtendimentos =
    document.querySelector(
      "#financeiro-total-atendimentos-numero"
    );

  if (numeroAtendimentos) {
    numeroAtendimentos.textContent =
      concluidos.length;
  }

  document.querySelector(
    "#financeiro-total-atendimentos"
  ).textContent =
    `${concluidos.length} atendimento${concluidos.length === 1 ? "" : "s"} no período`;

  document.querySelector(
  "#financeiro-quantidade-servicos"
  ).textContent =
  `${quantidadeServicos} serviço${quantidadeServicos === 1 ? "" : "s"} realizado${quantidadeServicos === 1 ? "" : "s"}`;

  document.querySelector(
    "#financeiro-quantidade-produtos"
  ).textContent =
    `${quantidadeProdutos} produto${quantidadeProdutos === 1 ? "" : "s"} vendido${quantidadeProdutos === 1 ? "" : "s"}`;

  document.querySelector(
    "#financeiro-total-pix"
  ).textContent =
    formatarValorEmReal(
      pix
    );

  document.querySelector(
    "#financeiro-total-dinheiro"
  ).textContent =
    formatarValorEmReal(
      dinheiro
    );

  document.querySelector(
    "#financeiro-total-cartao"
  ).textContent =
    formatarValorEmReal(
      cartao
    );

  document.querySelector(
    "#financeiro-quantidade-pix"
  ).textContent =
    `${quantidadePix} pagamento${quantidadePix === 1 ? "" : "s"}`;

  document.querySelector(
    "#financeiro-quantidade-dinheiro"
  ).textContent =
    `${quantidadeDinheiro} pagamento${quantidadeDinheiro === 1 ? "" : "s"}`;

  document.querySelector(
    "#financeiro-quantidade-cartao"
  ).textContent =
    `${quantidadeCartao} pagamento${quantidadeCartao === 1 ? "" : "s"}`;

  totalGraficoFinanceiro.textContent =
    formatarValorEmReal(
      faturamentoTotal
    );

  mostrarRankingFinanceiro(
    rankingFinanceiroBarbeiros,
    rankingBarbeiros,
    "Nenhum atendimento concluído no período.",
    true
  );

  mostrarRankingFinanceiro(
    rankingFinanceiroServicos,
    rankingServicos,
    "Nenhum serviço registrado no período.",
    false
  );

  mostrarRankingFinanceiro(
    rankingFinanceiroProdutos,
    rankingProdutos,
    "Nenhum produto vendido no período.",
    false
  );

  const dadosGrafico =
    criarDadosGraficoFinanceiro(
      registrosFinanceiros,
      periodo
    );

  if (
    graficoFinanceiro
  ) {
    graficoFinanceiro.destroy();
  }

  const temaClaro =
    document.body.classList.contains(
      "tema-claro"
    );

  graficoFinanceiro =
    new Chart(
      document.querySelector(
        "#grafico-financeiro"
      ),
      {
        type: "line",

        data: {
          labels:
            dadosGrafico.labels,

          datasets: [
            {
              label:
                "Faturamento",

              data:
                dadosGrafico.dados,

              fill:
                true,

              tension:
                0.35,

              borderWidth:
                3,

              borderColor:
                "#d4af37",

              backgroundColor:
                "rgba(212, 175, 55, 0.16)",

              pointBackgroundColor:
                "#d4af37",

              pointBorderColor:
                "#f3d98f",

              pointRadius:
                3,

              pointHoverRadius:
                6
            }
          ]
        },

        options: {
          responsive:
            true,

          maintainAspectRatio:
            false,

          interaction: {
            intersect:
              false,

            mode:
              "index"
          },

          plugins: {
            legend: {
              display:
                false
            },

            tooltip: {
              callbacks: {
                label(contexto) {
                  return formatarValorEmReal(
                    contexto.parsed.y
                  );
                }
              }
            }
          },

          scales: {
            y: {
              beginAtZero:
                true,

              ticks: {
                color:
                  temaClaro
                    ? "#3b3327"
                    : "#bdbdbd",

                callback(valor) {
                  return formatarValorEmReal(
                    valor
                  );
                }
              },

              grid: {
                color:
                  temaClaro
                    ? "#ded4c0"
                    : "#303030"
              }
            },

            x: {
              ticks: {
                color:
                  temaClaro
                    ? "#3b3327"
                    : "#bdbdbd"
              },

              grid: {
                display:
                  false
              }
            }
          }
        }
      }
    );
}

/* =========================================================
   CARREGAR BIBLIOTECAS DO PDF
========================================================= */

function carregarScriptPdf(src) {
  return new Promise((resolve, reject) => {
    const existente =
      document.querySelector(
        `script[src="${src}"]`
      );

    if (existente) {
      if (
        window.jspdf ||
        src.includes("autotable")
      ) {
        resolve();
        return;
      }

      existente.addEventListener(
        "load",
        resolve,
        { once: true }
      );

      existente.addEventListener(
        "error",
        reject,
        { once: true }
      );

      return;
    }

    const script =
      document.createElement(
        "script"
      );

    script.src = src;

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(
      script
    );
  });
}

async function garantirBibliotecasPdf() {
  if (!window.jspdf) {
    await carregarScriptPdf(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );
  }

  const {
    jsPDF
  } = window.jspdf;

  /*
    Só carrega AutoTable se ainda
    não estiver disponível.
  */
  const documentoTeste =
    new jsPDF();

  if (
    typeof documentoTeste.autoTable !==
    "function"
  ) {
    await carregarScriptPdf(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
    );
  }
}

/* =========================================================
   DADOS DO PDF FINANCEIRO
========================================================= */

async function obterDadosPdfFinanceiro() {
  const periodo =
    obterPeriodoFinanceiro();

  const barbeiroSelecionado =
    filtroFinanceiroBarbeiro?.value ||
    "todos";

  const [
    respostaAgendamentos,
    respostaMovimentacoes
  ] = await Promise.all([
    getDocs(
      collection(
        db,
        "agendamentos"
      )
    ),

    getDocs(
      collection(
        db,
        "movimentacoesFinanceiras"
      )
    )
  ]);

  const atendimentos =
    respostaAgendamentos.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }))
      .filter((agendamento) => {
        const concluido =
          agendamento.status ===
            "concluido" &&
          agendamento.ocultarNoHistoricoFinanceiro !== true;

        const dentroPeriodo =
          agendamento.data >=
            periodo.inicioTexto &&
          agendamento.data <=
            periodo.fimTexto;

        const barbeiroCorreto =
          barbeiroSelecionado ===
            "todos" ||
          agendamento.barbeiro ===
            barbeiroSelecionado;

        return (
          concluido &&
          dentroPeriodo &&
          barbeiroCorreto
        );
      })
      .sort((a, b) => {
        return (
          criarDataHora(
            a.data,
            a.hora || "00:00"
          ) -
          criarDataHora(
            b.data,
            b.hora || "00:00"
          )
        );
      });

  const saidasOperacionais =
    respostaMovimentacoes.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }))
      .filter((movimentacao) => {
        const saidaOperacional =
          movimentacao.tipo === "saida" &&
          ["desconto", "uso_plano"].includes(movimentacao.origem) &&
          !(
            tipoUsuario === "barbeiro" &&
            movimentacao.origem === "uso_plano"
          );

        const dentroPeriodo =
          movimentacao.data >=
            periodo.inicioTexto &&
          movimentacao.data <=
            periodo.fimTexto;

        const barbeiroCorreto =
          barbeiroSelecionado ===
            "todos" ||
          movimentacao.barbeiro ===
            barbeiroSelecionado;

        return (
          saidaOperacional &&
          dentroPeriodo &&
          barbeiroCorreto
        );
      });

  const assinaturasPlanos = respostaMovimentacoes.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .filter((movimentacao) =>
      movimentacao.tipo === "entrada" &&
      movimentacao.origem === "plano" &&
      movimentacao.data >= periodo.inicioTexto &&
      movimentacao.data <= periodo.fimTexto &&
      barbeiroSelecionado === "todos"
    );

  let faturamentoBruto = 0;
  let totalServicos = 0;
  let totalProdutos = 0;

  let totalPix = 0;
  let totalDinheiro = 0;
  let totalCartao = 0;

  let quantidadePix = 0;
  let quantidadeDinheiro = 0;
  let quantidadeCartao = 0;
  let quantidadeProdutos = 0;

  const rankingBarbeiros = {};
  const rankingServicos = {};
  const rankingProdutos = {};

  atendimentos.forEach(
    (agendamento) => {
      const valorServico =
        Number(
          agendamento.valorServico
        ) || 0;

      const valorProduto =
        Number(
          agendamento.valorProduto
        ) || 0;

      const valorTotal =
        Number(
          agendamento.valorTotalBruto
        ) ||
        Number(
          agendamento.valorTotal
        ) ||
        valorServico +
          valorProduto;

      faturamentoBruto +=
        valorTotal;

      totalServicos +=
        valorServico;

      totalProdutos +=
        valorProduto;

      if (agendamento.produto) {
        quantidadeProdutos++;
      }

      const pagamentosAtendimento = Array.isArray(agendamento.pagamentos) && agendamento.pagamentos.length > 0
        ? agendamento.pagamentos
        : [{ forma: agendamento.formaPagamento, valor: valorTotal }];

      pagamentosAtendimento.forEach((pagamento) => {
        const valorPagamento = Math.max(0, Number(pagamento.valor) || 0);
        if (pagamento.forma === "Pix") {
          totalPix += valorPagamento;
          quantidadePix++;
        }
        if (pagamento.forma === "Dinheiro") {
          totalDinheiro += valorPagamento;
          quantidadeDinheiro++;
        }
        if (pagamento.forma === "Cartão") {
          totalCartao += valorPagamento;
          quantidadeCartao++;
        }
      });

      const barbeiro =
        agendamento.barbeiro ||
        "Não informado";

      if (!rankingBarbeiros[barbeiro]) {
        rankingBarbeiros[barbeiro] = {
          valor: 0,
          quantidade: 0
        };
      }

      rankingBarbeiros[
        barbeiro
      ].valor += valorTotal;

      rankingBarbeiros[
        barbeiro
      ].quantidade++;

      if (agendamento.servico) {
        if (
          !rankingServicos[
            agendamento.servico
          ]
        ) {
          rankingServicos[
            agendamento.servico
          ] = {
            valor: 0,
            quantidade: 0
          };
        }

        rankingServicos[
          agendamento.servico
        ].valor += valorServico;

        rankingServicos[
          agendamento.servico
        ].quantidade++;
      }

      if (agendamento.produto) {
        if (
          !rankingProdutos[
            agendamento.produto
          ]
        ) {
          rankingProdutos[
            agendamento.produto
          ] = {
            valor: 0,
            quantidade: 0
          };
        }

        rankingProdutos[
          agendamento.produto
        ].valor += valorProduto;

        rankingProdutos[
          agendamento.produto
        ].quantidade++;
      }
    }
  );

  assinaturasPlanos.forEach((assinatura) => {
    const valorPlano = Number(assinatura.valor) || 0;
    const nomePlano = `${assinatura.planoNome || "Plano"} (Plano)`;

    faturamentoBruto += valorPlano;
    totalServicos += valorPlano;

    if (assinatura.formaPagamento === "Pix") {
      totalPix += valorPlano;
      quantidadePix++;
    }

    if (assinatura.formaPagamento === "Dinheiro") {
      totalDinheiro += valorPlano;
      quantidadeDinheiro++;
    }

    if (assinatura.formaPagamento === "Cartão") {
      totalCartao += valorPlano;
      quantidadeCartao++;
    }

    if (!rankingServicos[nomePlano]) {
      rankingServicos[nomePlano] = {
        valor: 0,
        quantidade: 0
      };
    }

    rankingServicos[nomePlano].valor += valorPlano;
    rankingServicos[nomePlano].quantidade++;
  });

  const totalSaidasOperacionais =
    saidasOperacionais.reduce(
      (total, saida) => {
        return (
          total +
          (
            Number(
              saida.valor
            ) || 0
          )
        );
      },
      0
    );

  const faturamentoLiquido =
    faturamentoBruto -
    totalSaidasOperacionais;

  return {
    periodo,
    barbeiroSelecionado,
    atendimentos,
    saidasOperacionais,

    faturamentoBruto,
    faturamentoLiquido,
    totalSaidasOperacionais,

    totalServicos,
    totalProdutos,

    totalPix,
    totalDinheiro,
    totalCartao,

    quantidadePix,
    quantidadeDinheiro,
    quantidadeCartao,
    quantidadeProdutos,

    rankingBarbeiros,
    rankingServicos,
    rankingProdutos
  };
}

/* =========================================================
   RANKING PARA PDF
========================================================= */

function transformarRankingParaPdf(
  ranking
) {
  return Object.entries(
    ranking
  )
    .sort(
      (a, b) =>
        b[1].valor -
        a[1].valor
    )
    .map(
      (
        [
          nome,
          dados
        ],
        indice
      ) => [
        indice + 1,
        nome,
        dados.quantidade,
        formatarValorEmReal(
          dados.valor
        )
      ]
    );
}

/* =========================================================
   GERAR PDF FINANCEIRO
========================================================= */

async function gerarPdfFinanceiro() {
  if (
    !usuarioPodeVisualizarFinanceiro()
  ) {
    alert(
      "Você não tem permissão para gerar este relatório."
    );

    return;
  }

  if (botaoGerarPdfFinanceiro) {
    botaoGerarPdfFinanceiro.disabled =
      true;

    botaoGerarPdfFinanceiro.textContent =
      "Gerando PDF...";
  }

  try {
    await garantirBibliotecasPdf();

    const {
      jsPDF
    } = window.jspdf;

    const dados =
      await obterDadosPdfFinanceiro();

    const pdf =
      new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

    const larguraPagina =
      pdf.internal.pageSize.getWidth();

    const margem = 14;

    /*
      ========================================================
      CABEÇALHO
      ========================================================
    */

    pdf.setFillColor(
      18,
      18,
      18
    );

    pdf.rect(
      0,
      0,
      larguraPagina,
      37,
      "F"
    );

    pdf.setTextColor(
      212,
      175,
      55
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(18);

    pdf.text(
      "TRADIÇÃO BARBEARIA",
      margem,
      15
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFontSize(12);

    pdf.text(
      "Relatório Financeiro",
      margem,
      24
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(9);

    const barbeiroTexto =
      dados.barbeiroSelecionado ===
      "todos"
        ? "Barbearia inteira"
        : dados.barbeiroSelecionado;

    pdf.text(
      `${dados.periodo.titulo} | ${barbeiroTexto}`,
      margem,
      31
    );

    /*
      ========================================================
      RESUMO
      ========================================================
    */

    let y = 48;

    pdf.setTextColor(
      30,
      30,
      30
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(13);

    pdf.text(
      "Resumo financeiro",
      margem,
      y
    );

    y += 5;

    pdf.autoTable({
      startY: y,

      head: [[
        "Faturamento bruto",
        "Saídas operacionais",
        "Faturamento líquido",
        "Atendimentos"
      ]],

      body: [[
        formatarValorEmReal(
          dados.faturamentoBruto
        ),

        formatarValorEmReal(
          dados.totalSaidasOperacionais
        ),

        formatarValorEmReal(
          dados.faturamentoLiquido
        ),

        String(
          dados.atendimentos.length
        )
      ]],

      theme: "grid",

      headStyles: {
        fillColor: [
          35,
          35,
          35
        ],

        textColor: [
          240,
          210,
          130
        ]
      },

      styles: {
        fontSize: 8,
        cellPadding: 3
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    y =
      pdf.lastAutoTable.finalY +
      8;

    /*
      ========================================================
      SERVIÇOS / PRODUTOS
      ========================================================
    */

    pdf.setFontSize(12);

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.text(
      "Origem do faturamento",
      margem,
      y
    );

    y += 4;

    pdf.autoTable({
      startY: y,

      head: [[
        "Descrição",
        "Quantidade",
        "Valor"
      ]],

      body: [
        [
          "Serviços",
          dados.atendimentos.length,
          formatarValorEmReal(
            dados.totalServicos
          )
        ],

        [
          "Produtos",
          dados.quantidadeProdutos,
          formatarValorEmReal(
            dados.totalProdutos
          )
        ]
      ],

      theme: "striped",

      headStyles: {
        fillColor: [
          212,
          175,
          55
        ],

        textColor: [
          25,
          25,
          25
        ]
      },

      styles: {
        fontSize: 9
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    y =
      pdf.lastAutoTable.finalY +
      8;

    /*
      ========================================================
      FORMAS DE PAGAMENTO
      ========================================================
    */

    pdf.setFontSize(12);

    pdf.text(
      "Formas de pagamento",
      margem,
      y
    );

    y += 4;

    pdf.autoTable({
      startY: y,

      head: [[
        "Forma",
        "Pagamentos",
        "Valor bruto"
      ]],

      body: [
        [
          "Pix",
          dados.quantidadePix,
          formatarValorEmReal(
            dados.totalPix
          )
        ],

        [
          "Dinheiro",
          dados.quantidadeDinheiro,
          formatarValorEmReal(
            dados.totalDinheiro
          )
        ],

        [
          "Cartão",
          dados.quantidadeCartao,
          formatarValorEmReal(
            dados.totalCartao
          )
        ]
      ],

      theme: "striped",

      headStyles: {
        fillColor: [
          212,
          175,
          55
        ],

        textColor: [
          25,
          25,
          25
        ]
      },

      styles: {
        fontSize: 9
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    /*
      ========================================================
      NOVA PÁGINA — ATENDIMENTOS
      ========================================================
    */

    pdf.addPage();

    pdf.setTextColor(
      30,
      30,
      30
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(14);

    pdf.text(
      "Atendimentos concluídos",
      margem,
      18
    );

    const linhasAtendimentos =
      dados.atendimentos.map(
        (agendamento) => {
          const data =
            dataPorTexto(
              agendamento.data
            ).toLocaleDateString(
              "pt-BR"
            );

          const valorBruto =
            Number(
              agendamento.valorTotalBruto
            ) ||
            Number(
              agendamento.valorTotal
            ) ||
            0;

          const desconto =
            Number(
              agendamento.valorDesconto
            ) || 0;

          const liquido =
            valorBruto -
            desconto;

          let servico =
            agendamento.servico ||
            "Atendimento";

          if (
            agendamento.produto
          ) {
            servico +=
              ` + ${agendamento.produto}`;
          }

          return [
            `${data} ${agendamento.hora || ""}`,

            agendamento.barbeiro ||
              "—",

            servico,

            agendamento.formaPagamento ||
              "—",

            formatarValorEmReal(
              valorBruto
            ),

            desconto > 0
              ? formatarValorEmReal(
                  desconto
                )
              : "—",

            formatarValorEmReal(
              liquido
            )
          ];
        }
      );

    if (
      linhasAtendimentos.length ===
      0
    ) {
      linhasAtendimentos.push([
        "—",
        "—",
        "Nenhum atendimento",
        "—",
        "—",
        "—",
        "—"
      ]);
    }

    pdf.autoTable({
      startY: 24,

      head: [[
        "Data",
        "Barbeiro",
        "Serviço",
        "Pagamento",
        "Bruto",
        "Desconto",
        "Líquido"
      ]],

      body:
        linhasAtendimentos,

      theme: "grid",

      headStyles: {
        fillColor: [
          35,
          35,
          35
        ],

        textColor: [
          240,
          210,
          130
        ]
      },

      styles: {
        fontSize: 7,
        cellPadding: 2
      },

      columnStyles: {
        0: {
          cellWidth: 25
        },

        1: {
          cellWidth: 23
        },

        2: {
          cellWidth: 42
        },

        3: {
          cellWidth: 23
        },

        4: {
          cellWidth: 22
        },

        5: {
          cellWidth: 22
        },

        6: {
          cellWidth: 22
        }
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    /*
      ========================================================
      RANKINGS
      ========================================================
    */

    pdf.addPage();

    pdf.setFontSize(14);

    pdf.text(
      "Rankings do período",
      margem,
      18
    );

    const rankingBarbeiros =
      transformarRankingParaPdf(
        dados.rankingBarbeiros
      );

    pdf.autoTable({
      startY: 24,

      head: [[
        "#",
        "Barbeiro",
        "Atendimentos",
        "Faturamento"
      ]],

      body:
        rankingBarbeiros.length
          ? rankingBarbeiros
          : [[
              "—",
              "Nenhum registro",
              "0",
              "R$ 0,00"
            ]],

      theme: "striped",

      headStyles: {
        fillColor: [
          212,
          175,
          55
        ],

        textColor: [
          25,
          25,
          25
        ]
      },

      styles: {
        fontSize: 9
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    y =
      pdf.lastAutoTable.finalY +
      8;

    const rankingServicos =
      transformarRankingParaPdf(
        dados.rankingServicos
      );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.text(
      "Serviços mais realizados",
      margem,
      y
    );

    pdf.autoTable({
      startY: y + 4,

      head: [[
        "#",
        "Serviço",
        "Quantidade",
        "Valor"
      ]],

      body:
        rankingServicos.length
          ? rankingServicos
          : [[
              "—",
              "Nenhum registro",
              "0",
              "R$ 0,00"
            ]],

      theme: "striped",

      headStyles: {
        fillColor: [
          35,
          35,
          35
        ],

        textColor: [
          240,
          210,
          130
        ]
      },

      styles: {
        fontSize: 9
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    y =
      pdf.lastAutoTable.finalY +
      8;

    const rankingProdutos =
      transformarRankingParaPdf(
        dados.rankingProdutos
      );

    if (y > 240) {
      pdf.addPage();
      y = 18;
    }

    pdf.setFontSize(12);

    pdf.text(
      "Produtos mais vendidos",
      margem,
      y
    );

    pdf.autoTable({
      startY: y + 4,

      head: [[
        "#",
        "Produto",
        "Quantidade",
        "Valor"
      ]],

      body:
        rankingProdutos.length
          ? rankingProdutos
          : [[
              "—",
              "Nenhum registro",
              "0",
              "R$ 0,00"
            ]],

      theme: "striped",

      headStyles: {
        fillColor: [
          35,
          35,
          35
        ],

        textColor: [
          240,
          210,
          130
        ]
      },

      styles: {
        fontSize: 9
      },

      margin: {
        left: margem,
        right: margem
      }
    });

    /*
      ========================================================
      RODAPÉ EM TODAS AS PÁGINAS
      ========================================================
    */

    const totalPaginas =
      pdf.getNumberOfPages();

    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {
      pdf.setPage(pagina);

      const alturaPagina =
        pdf.internal.pageSize.getHeight();

      pdf.setDrawColor(
        210,
        210,
        210
      );

      pdf.line(
        margem,
        alturaPagina - 13,
        larguraPagina - margem,
        alturaPagina - 13
      );

      pdf.setTextColor(
        110,
        110,
        110
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(7);

      pdf.text(
        `Tradição Barbearia | Gerado em ${new Date().toLocaleString("pt-BR")}`,
        margem,
        alturaPagina - 7
      );

      pdf.text(
        `Página ${pagina} de ${totalPaginas}`,
        larguraPagina - margem,
        alturaPagina - 7,
        {
          align: "right"
        }
      );
    }

    /*
      ========================================================
      NOME DO ARQUIVO
      ========================================================
    */

    const periodoArquivo =
      dados.periodo.inicioTexto ===
      dados.periodo.fimTexto
        ? dados.periodo.inicioTexto
        : `${dados.periodo.inicioTexto}_${dados.periodo.fimTexto}`;

    const barbeiroArquivo =
      barbeiroTexto
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^a-zA-Z0-9]+/g,
          "_"
        )
        .replace(
          /^_|_$/g,
          ""
        );

    pdf.save(
      `relatorio_financeiro_${barbeiroArquivo}_${periodoArquivo}.pdf`
    );
  } catch (erro) {
    console.log(
      "Erro ao gerar PDF financeiro:",
      erro
    );

    alert(
      "Não foi possível gerar o PDF financeiro."
    );
  } finally {
    if (botaoGerarPdfFinanceiro) {
      botaoGerarPdfFinanceiro.disabled =
        false;

      botaoGerarPdfFinanceiro.textContent =
        "Gerar PDF";
    }
  }
}

/* =========================================================
   HISTÓRICO — FILTROS
========================================================= */

function preencherFiltroHistoricoBarbeiros() {
  if (
    !filtroHistoricoBarbeiro
  ) {
    return;
  }

  if (tipoUsuario === "barbeiro") {
    filtroHistoricoBarbeiro.innerHTML = `
      <option value="${nomeUsuario}">
        ${nomeUsuario}
      </option>
    `;
    filtroHistoricoBarbeiro.value = nomeUsuario;
    return;
  }

  filtroHistoricoBarbeiro.innerHTML = `
    <option value="todos">
      Barbearia inteira
    </option>
  `;

  barbeiros.forEach(
    (barbeiro) => {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        barbeiro.nome;

      opcao.textContent =
        barbeiro.nome;

      filtroHistoricoBarbeiro.appendChild(
        opcao
      );
    }
  );
}

function preencherBarbeirosSaida() {
  if (!barbeiroSaida) {
    return;
  }

  barbeiroSaida.innerHTML = `
    <option value="Barbearia">
      Barbearia
    </option>
  `;

  barbeiros.forEach(
    (barbeiro) => {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        barbeiro.nome;

      opcao.textContent =
        barbeiro.nome;

      barbeiroSaida.appendChild(
        opcao
      );
    }
  );
}

function obterPeriodoHistorico() {
  const tipo = (
    tipoUsuario === "recepcionista" ||
    tipoUsuario === "barbeiro"
  )
    ? "diario"
    : (periodoRelatorioHistorico?.value || "mensal");

  return obterPeriodoGenerico(
    tipo,
    dataHistorico
  );
}

/* =========================================================
   HISTÓRICO — MONTAR ENTRADAS
========================================================= */

function transformarAtendimentoEmEntrada(
  agendamento
) {
  const valorServicoSalvo = Number(agendamento.valorServico) || 0;
  const valorServicosRegistrados = Array.isArray(agendamento.servicos)
    ? agendamento.servicos.reduce(
        (total, servico) =>
          total +
          (Number(servico.valorOriginal) || Number(servico.valor) || 0),
        0
      )
    : 0;
  const valorServico = agendamento.atendimentoPeloPlano === true
    ? Math.max(valorServicoSalvo, valorServicosRegistrados)
    : valorServicoSalvo;

  const valorProduto =
    Number(
      agendamento.valorProduto
    ) || 0;

  const idsProdutosInformadosPeloBarbeiro = new Set(
    Array.isArray(agendamento.produtosVendidosBarbeiroIds)
      ? agendamento.produtosVendidosBarbeiroIds
      : []
  );

  const produtosConcluidos = Array.isArray(agendamento.produtos)
    ? agendamento.produtos
    : [];

  const produtosBarbeiroDetalhados = produtosConcluidos.filter(
    (produto) => idsProdutosInformadosPeloBarbeiro.has(produto.id)
  );

  const produtosBarbeariaDetalhados = produtosConcluidos.filter(
    (produto) => !idsProdutosInformadosPeloBarbeiro.has(produto.id)
  );

  // O vendedor continua identificado nos detalhes, mas toda receita de
  // produtos pertence à barbearia e nunca compõe o ganho do barbeiro.
  const valorProdutoBarbeiro = 0;
  const valorProdutoBarbearia = valorProduto;

  const valorBruto =
    Number(
      agendamento.valorTotalBruto
    ) ||
    Number(
      agendamento.valorTotal
    ) ||
    valorServico +
      valorProduto;

  const valorDesconto =
    Number(agendamento.valorDesconto) || 0;

  const valorLiquido =
    Number.isFinite(Number(agendamento.valorLiquido))
      ? Number(agendamento.valorLiquido)
      : Math.max(0, valorBruto - valorDesconto);

  let descricao =
    agendamento.servico ||
    "Atendimento";

  if (
    agendamento.produto &&
    tipoUsuario !== "barbeiro"
  ) {
    descricao +=
      ` + ${agendamento.produto}`;
  }

  return {
    id:
      agendamento.id,

    origem:
      "atendimento",

    tipo:
      "entrada",

    descricao,

    descricaoSomenteServico:
      agendamento.servico || "Atendimento",

    /* No histórico, mostramos somente o valor que realmente entrou. */
    valor: tipoUsuario === "barbeiro"
      ? agendamento.atendimentoPeloPlano === true
        ? valorServico
        : Math.max(0, valorLiquido - valorProdutoBarbearia)
      : valorLiquido,

    valorServico,

    valorSomenteServico:
      valorServico,

    valorProduto:
      tipoUsuario === "barbeiro" ? 0 : valorProduto,

    valorProdutoBarbeiro:
      valorProdutoBarbeiro,

    valorProdutoBarbearia:
      tipoUsuario === "barbeiro" ? 0 : valorProdutoBarbearia,

    produtosBarbeiroDetalhados,

    produtosBarbeariaDetalhados,

    valorBruto: tipoUsuario === "barbeiro"
      ? agendamento.atendimentoPeloPlano === true
        ? valorServico
        : Math.max(0, valorBruto - valorProdutoBarbearia)
      : valorBruto,

    valorDesconto,

    teveDesconto:
      agendamento.teveDesconto === true || valorDesconto > 0,

    descricaoDesconto:
      agendamento.descricaoDesconto || "",

    data:
      agendamento.data,

    hora:
      agendamento.hora ||
      "00:00",

    barbeiro:
      agendamento.barbeiro ||
      "",

    cliente:
      agendamento.cliente ||
      "",

    formaPagamento:
      agendamento.formaPagamento ||
      "",

    pagamentos: Array.isArray(agendamento.pagamentos)
      ? agendamento.pagamentos
      : [],

    prioridadeHistorico:
      1
  };
}

/* =========================================================
   HISTÓRICO — ATUALIZAR
========================================================= */

async function atualizarHistoricoFinanceiro() {
  if (
    !usuarioPodeVisualizarFinanceiro() ||
    !listaHistoricoFinanceiro
  ) {
    return;
  }

  const periodo =
    obterPeriodoHistorico();

  if (tituloPeriodoHistorico) {
    tituloPeriodoHistorico.textContent =
      periodo.titulo;
  }

  try {
    const [
      respostaAgendamentos,
      respostaMovimentacoes
    ] = await Promise.all([
      getDocs(
        collection(
          db,
          "agendamentos"
        )
      ),

      getDocs(
        collection(
          db,
          "movimentacoesFinanceiras"
        )
      )
    ]);

    /* ===============================
       ENTRADAS
    =============================== */

    const entradas =
      respostaAgendamentos.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data()
        }))
        .filter((agendamento) => {
          return (
            agendamento.status ===
            "concluido" &&
            agendamento.ocultarNoHistoricoFinanceiro !== true
          );
        })
        .map(
          transformarAtendimentoEmEntrada
        );

    const movimentacoesSalvasHistorico = respostaMovimentacoes.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    const entradasPlanos = movimentacoesSalvasHistorico
      .filter((movimentacao) =>
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "plano"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "",
        prioridadeHistorico: 1
      }));

    const entradasManuais = movimentacoesSalvasHistorico
      .filter((movimentacao) =>
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "manual"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "Barbearia",
        cliente: "",
        prioridadeHistorico: 2
      }));

    const entradasVendasProdutos = movimentacoesSalvasHistorico
      .filter((movimentacao) =>
        tipoUsuario !== "barbeiro" &&
        movimentacao.tipo === "entrada" &&
        movimentacao.origem === "venda_produtos"
      )
      .map((movimentacao) => ({
        ...movimentacao,
        barbeiro: movimentacao.barbeiro || "Barbearia",
        prioridadeHistorico: 2
      }));

    /* ===============================
       SAÍDAS
    =============================== */

    const saidasTodas =
      movimentacoesSalvasHistorico
        .map((movimentacao) => ({
          origem: "manual",
          ...movimentacao,
          /* Corrige também descontos registrados antes desta atualização. */
          barbeiro: (
            movimentacao.origem === "desconto" ||
            movimentacao.categoria === "desconto" ||
            String(movimentacao.id || "").startsWith("desconto_")
          )
            ? "Barbearia"
            : (movimentacao.barbeiro || "Barbearia")
        }))
        .filter((movimentacao) => {
          return (
            movimentacao.tipo ===
              "saida" &&
            !(
              tipoUsuario === "barbeiro" &&
              movimentacao.origem === "uso_plano"
            )
          );
        });

    /* Descontos entram nos totais, mas não viram linhas separadas. */
    const saidas = saidasTodas.filter((movimentacao) => {
      return !(
        movimentacao.origem === "desconto" ||
        movimentacao.categoria === "desconto" ||
        String(movimentacao.id || "").startsWith("desconto_")
      );
    });

    const todasMovimentacoes = [
      ...entradas,
      ...entradasPlanos,
      ...entradasManuais,
      ...entradasVendasProdutos,
      ...saidas
    ];

    const barbeiroSelecionado =
      filtroHistoricoBarbeiro?.value ||
      "todos";

    const mostrandoSomenteUmBarbeiro =
      tipoUsuario === "barbeiro" ||
      (
        barbeiroSelecionado !== "todos" &&
        barbeiroSelecionado !== "Barbearia"
      );

    const tipoSelecionado =
      filtroHistoricoTipo?.value ||
      "todos";

    const pagamentoSelecionado =
      filtroHistoricoPagamento?.value ||
      "todos";

    /* ===============================
       MOVIMENTAÇÕES DO PERÍODO
       usado nos cards
    =============================== */

    const movimentacoesPeriodo =
      todasMovimentacoes.filter(
        (movimentacao) => {
          const dentroPeriodo =
            movimentacao.data >=
              periodo.inicioTexto &&
            movimentacao.data <=
              periodo.fimTexto;

          const barbeiroCorreto =
            barbeiroSelecionado ===
              "todos" ||
            movimentacao.barbeiro ===
              barbeiroSelecionado;

          return (
            dentroPeriodo &&
            barbeiroCorreto &&
            !(
              mostrandoSomenteUmBarbeiro &&
              movimentacao.origem === "venda_produtos"
            )
          );
        }
      ).map((movimentacao) => {
        if (
          !mostrandoSomenteUmBarbeiro ||
          movimentacao.origem !== "atendimento"
        ) {
          return movimentacao;
        }

        return {
          ...movimentacao,
          descricao:
            movimentacao.descricaoSomenteServico || movimentacao.descricao,
          valor: Number(movimentacao.valorSomenteServico) || 0,
          valorBruto: Number(movimentacao.valorSomenteServico) || 0,
          valorProduto: 0,
          valorProdutoBarbeiro: 0,
          valorProdutoBarbearia: 0
        };
      });

    const descontosPeriodo = saidasTodas.filter((movimentacao) => {
      const ehDesconto =
        movimentacao.origem === "desconto" ||
        movimentacao.categoria === "desconto" ||
        String(movimentacao.id || "").startsWith("desconto_");

      const dentroPeriodo =
        movimentacao.data >= periodo.inicioTexto &&
        movimentacao.data <= periodo.fimTexto;

      const barbeiroCorreto =
        barbeiroSelecionado === "todos" ||
        movimentacao.barbeiro === barbeiroSelecionado;

      return ehDesconto && dentroPeriodo && barbeiroCorreto;
    });

    /* ===============================
       FILTRO DA LISTA
    =============================== */

    const movimentacoes =
      movimentacoesPeriodo
        .filter((movimentacao) => {
          const tipoCorreto =
            tipoSelecionado ===
              "todos" ||
            tipoSelecionado ===
              "todas" ||
            movimentacao.tipo ===
              tipoSelecionado;

          const pagamentoCorreto =
            pagamentoSelecionado === "todos" ||
            String(movimentacao.formaPagamento || "")
              .trim()
              .toLocaleLowerCase("pt-BR") ===
              pagamentoSelecionado.toLocaleLowerCase("pt-BR");

          return tipoCorreto && pagamentoCorreto;
        })
        .sort(ordenarMovimentacoesMaisRecentes);

    /* ===============================
       TOTAIS
    =============================== */

    const entradasPeriodo =
      movimentacoesPeriodo.filter(
        (movimentacao) => {
          return (
            movimentacao.tipo ===
            "entrada"
          );
        }
      );

    const saidasPeriodo = [
      ...movimentacoesPeriodo.filter(
        (movimentacao) => {
          return (
            movimentacao.tipo ===
            "saida"
          );
        }
      ),
      ...descontosPeriodo
    ];

    const totalEntradas =
      entradasPeriodo.reduce(
        (total, movimentacao) => {
          return (
            total +
            (
              Number(movimentacao.valorBruto) ||
              Number(movimentacao.valorTotalBruto) ||
              Number(movimentacao.valor) ||
              0
            )
          );
        },
        0
      );

    const totalSaidas =
      saidasPeriodo.reduce(
        (total, movimentacao) => {
          return (
            total +
            (
              Number(
                movimentacao.valor
              ) || 0
            )
          );
        },
        0
      );

    const saldo =
      totalEntradas -
      totalSaidas;

    if (historicoTotalEntradas) {
      historicoTotalEntradas.textContent =
        formatarValorEmReal(
          totalEntradas
        );
    }

    if (historicoTotalSaidas) {
      historicoTotalSaidas.textContent =
        formatarValorEmReal(
          totalSaidas
        );
    }

    if (historicoSaldo) {
      historicoSaldo.textContent =
        formatarValorEmReal(
          saldo
        );
    }

    if (historicoQuantidadeEntradas) {
      historicoQuantidadeEntradas.textContent =
        `${entradasPeriodo.length} movimentação${
          entradasPeriodo.length === 1
            ? ""
            : "ões"
        }`;
    }

    if (historicoQuantidadeSaidas) {
      historicoQuantidadeSaidas.textContent =
        `${saidasPeriodo.length} movimentação${
          saidasPeriodo.length === 1
            ? ""
            : "ões"
        }`;
    }

    if (
      quantidadeMovimentacoesHistorico
    ) {
      quantidadeMovimentacoesHistorico.textContent =
        `${movimentacoes.length} movimentação${
          movimentacoes.length === 1
            ? ""
            : "ões"
        }`;
    }

    /* ===============================
       CRIAR LISTA
    =============================== */

    listaHistoricoFinanceiro.innerHTML =
      "";

    if (
      movimentacoes.length === 0
    ) {
      listaHistoricoFinanceiro.innerHTML = `
        <div class="historico-vazio">
          Nenhuma movimentação encontrada neste período.
        </div>
      `;

      return;
    }

    /* ===============================
       CABEÇALHO DA TABELA
    =============================== */

    const cabecalho =
      document.createElement(
        "div"
      );

    cabecalho.className =
      "cabecalho-tabela-historico";

    cabecalho.innerHTML = `
      <div>Data e hora</div>
      <div>Movimentação</div>
      <div>Barbeiro</div>
      <div>Cliente</div>
      <div>Pagamento</div>
      <div>Valor</div>
      <div aria-label="Mais informações"></div>
    `;

    listaHistoricoFinanceiro.appendChild(
      cabecalho
    );

    /* ===============================
       LINHAS
    =============================== */

    movimentacoes.forEach(
      (movimentacao) => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          "item-historico-financeiro";

        const linha =
          document.createElement(
            "div"
          );

        linha.className =
          `linha-historico ${movimentacao.tipo}`;

        const dataFormatada =
          dataPorTexto(
            movimentacao.data
          ).toLocaleDateString(
            "pt-BR"
          );

        const hora =
          movimentacao.hora ||
          "00:00";

        const descricaoOriginal =
          movimentacao.descricao ||
          (
            movimentacao.tipo ===
            "entrada"
              ? "Atendimento"
              : "Saída"
          );

        const descricao = String(descricaoOriginal)
          .replace(/^Venda de produtos:\s*/i, "")
          .replace(
            /\s*-\s*ciclo de\s+/i,
            " - "
          );

        const barbeiro =
          movimentacao.barbeiro ||
          "Barbearia";

        const cliente =
          movimentacao.cliente ||
          "—";

        const pagamento =
          movimentacao.formaPagamento ||
          "—";

        const valor =
          Number(
            movimentacao.valor
          ) || 0;

        const sinal =
          movimentacao.tipo ===
          "saida"
            ? "-"
            : "+";

        const textoTipo =
          movimentacao.tipo === "saida"
            ? "Saída"
            : movimentacao.origem === "manual"
              ? "Entrada manual"
              : movimentacao.origem === "venda_produtos"
                ? "Venda de produtos"
                : "Entrada de atendimento";

        const registradoPor =
          movimentacao.criadoPor ||
          movimentacao.concluidoPor ||
          movimentacao.registradoPor ||
          (movimentacao.origem === "atendimento" ? "Atendimento" : "Não informado");

        const valorDesconto =
          Number(movimentacao.valorDesconto) || 0;

        const descontoHtml =
          movimentacao.origem === "manual"
            ? `<span class="sem-desconto-historico">N\u00e3o se aplica</span>`
            : movimentacao.tipo === "entrada" && valorDesconto > 0
            ? `<strong class="valor-desconto-historico">- ${formatarValorEmReal(valorDesconto)}</strong>`
            : movimentacao.tipo === "entrada"
              ? `<span class="sem-desconto-historico">Sem desconto</span>`
              : `<span class="sem-desconto-historico">N\u00e3o se aplica</span>`;

        const motivoMovimentacao =
          movimentacao.origem === "manual"
            ? movimentacao.motivo || movimentacao.descricao || "Motivo não informado"
            : movimentacao.tipo === "entrada" && valorDesconto > 0
            ? movimentacao.descricaoDesconto || "Motivo n\u00e3o informado"
            : "N\u00e3o se aplica";

        linha.innerHTML = `
          <div class="coluna-historico coluna-data-historico">
            <strong>
              ${dataFormatada}
            </strong>

            <span>
              ${hora}
            </span>
          </div>

          <div class="coluna-historico coluna-movimentacao-historico">
            <strong>
              ${descricao}
            </strong>
          </div>

          <div class="coluna-historico">
            <span>
              ${barbeiro}
            </span>
          </div>

          <div class="coluna-historico coluna-cliente-historico">
            <span>
              ${cliente}
            </span>
          </div>

          <div class="coluna-historico">
            <span>
              ${pagamento}
            </span>
          </div>

          <div class="coluna-historico coluna-valor-historico">
            <strong>
              ${sinal}
              ${formatarValorEmReal(valor)}
            </strong>
          </div>

          <div class="coluna-historico coluna-expandir-historico">
            <button
              class="botao-expandir-historico"
              type="button"
              aria-expanded="false"
              aria-label="Mostrar mais informações desta movimentação"
            >+</button>
          </div>
        `;

        const detalhes = document.createElement("div");
        detalhes.className = "painel-detalhes-movimentacao escondida";
        detalhes.innerHTML = `
          <div class="detalhe-historico detalhe-tipo-historico">
            <small>Tipo</small>
            <strong class="texto-tipo-historico ${movimentacao.tipo}">
              ${textoTipo}
            </strong>
          </div>
          <div class="detalhe-historico">
            <small>Registrado por</small>
            <strong>${registradoPor}</strong>
          </div>
          <div class="detalhe-historico">
            <small>Desconto</small>
            <div>${descontoHtml}</div>
          </div>
          <div class="detalhe-historico detalhe-motivo-historico">
            <small>Motivo do desconto / observação</small>
            <span>${motivoMovimentacao}</span>
          </div>
        `;

        const botaoExpandir = linha.querySelector(
          ".botao-expandir-historico"
        );
        botaoExpandir.addEventListener("click", () => {
          const vaiAbrir = detalhes.classList.contains("escondida");
          detalhes.classList.toggle("escondida", !vaiAbrir);
          item.classList.toggle("expandido", vaiAbrir);
          botaoExpandir.textContent = vaiAbrir ? "−" : "+";
          botaoExpandir.setAttribute("aria-expanded", String(vaiAbrir));
          botaoExpandir.setAttribute(
            "aria-label",
            vaiAbrir
              ? "Ocultar informações desta movimentação"
              : "Mostrar mais informações desta movimentação"
          );
        });

        item.append(linha, detalhes);
        listaHistoricoFinanceiro.appendChild(
          item
        );
      }
    );
  } catch (erro) {
    console.log(
      "Erro ao carregar histórico financeiro:",
      erro
    );

    listaHistoricoFinanceiro.innerHTML = `
      <div class="historico-vazio">
        Não foi possível carregar o histórico financeiro.
      </div>
    `;
  }
}

/* =========================================================
   REGISTRAR SAÍDA
========================================================= */

function abrirModalRegistrarSaida() {
  if (
    !usuarioPodeVisualizarFinanceiro() ||
    !modalRegistrarSaida
  ) {
    return;
  }

  formRegistrarSaida?.reset();

  if (mensagemSaida) {
    mensagemSaida.textContent =
      "";
  }

  const agora =
    new Date();

  if (dataSaida) {
    dataSaida.value =
      formatarDataParaSalvar(
        agora
      );
  }

  if (horaSaida) {
    horaSaida.value =
      `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  }

  preencherBarbeirosSaida();

  modalRegistrarSaida.classList.remove(
    "escondido"
  );
}

function criarLinhaVendaProduto() {
  if (!itensVendaProdutos) return;

  const linha = document.createElement("div");
  linha.className = "item-venda-produtos";

  const select = document.createElement("select");
  select.className = "produto-item-venda";
  select.required = true;
  select.innerHTML = `<option value="">Selecione o produto</option>`;

  produtos.forEach((produto) => {
    const opcao = document.createElement("option");
    opcao.value = produto.id;
    opcao.textContent = `${produto.nome} — ${formatarValorEmReal(produto.valor)}`;
    select.appendChild(opcao);
  });

  const quantidade = document.createElement("input");
  quantidade.className = "quantidade-venda-produto";
  quantidade.type = "number";
  quantidade.min = "1";
  quantidade.step = "1";
  quantidade.value = "1";
  quantidade.required = true;
  quantidade.setAttribute("aria-label", "Quantidade");

  const valor = document.createElement("strong");
  valor.className = "valor-item-venda-produto";
  valor.textContent = formatarValorEmReal(0);

  const remover = document.createElement("button");
  remover.className = "remover-item-venda-produto";
  remover.type = "button";
  remover.textContent = "×";
  remover.setAttribute("aria-label", "Remover produto");

  const atualizar = () => atualizarTotaisVendaProdutos();
  select.addEventListener("change", atualizar);
  quantidade.addEventListener("input", atualizar);
  remover.addEventListener("click", () => {
    if (itensVendaProdutos.children.length > 1) linha.remove();
    else {
      select.value = "";
      quantidade.value = "1";
    }
    atualizarTotaisVendaProdutos();
  });

  linha.append(select, quantidade, valor, remover);
  itensVendaProdutos.appendChild(linha);
}

function obterItensVendaProdutos() {
  if (!itensVendaProdutos) return [];

  const itensAgrupados = new Map();
  itensVendaProdutos.querySelectorAll(".item-venda-produtos").forEach((linha) => {
    const produtoId = linha.querySelector(".produto-item-venda")?.value || "";
    const quantidade = Math.max(1, Math.floor(Number(
      linha.querySelector(".quantidade-venda-produto")?.value
    ) || 1));
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto) return;

    const existente = itensAgrupados.get(produto.id);
    if (existente) existente.quantidade += quantidade;
    else {
      itensAgrupados.set(produto.id, {
        id: produto.id,
        nome: produto.nome,
        quantidade,
        valorUnitario: Number(produto.valor) || 0
      });
    }
  });

  return Array.from(itensAgrupados.values()).map((item) => ({
    ...item,
    subtotal: item.quantidade * item.valorUnitario
  }));
}

function atualizarTotaisVendaProdutos() {
  if (!itensVendaProdutos) return;

  itensVendaProdutos.querySelectorAll(".item-venda-produtos").forEach((linha) => {
    const produtoId = linha.querySelector(".produto-item-venda")?.value || "";
    const quantidade = Math.max(1, Math.floor(Number(
      linha.querySelector(".quantidade-venda-produto")?.value
    ) || 1));
    const produto = produtos.find((item) => item.id === produtoId);
    const subtotal = (Number(produto?.valor) || 0) * quantidade;
    const campoValor = linha.querySelector(".valor-item-venda-produto");
    if (campoValor) campoValor.textContent = formatarValorEmReal(subtotal);
  });

  const subtotal = obterItensVendaProdutos().reduce(
    (total, item) => total + item.subtotal,
    0
  );
  const desconto = temDescontoVendaProdutos?.value === "sim"
    ? converterValorParaNumero(descontoVendaProdutos?.value || "")
    : 0;

  if (subtotalVendaProdutos) subtotalVendaProdutos.textContent = formatarValorEmReal(subtotal);
  if (totalVendaProdutos) {
    totalVendaProdutos.textContent = formatarValorEmReal(Math.max(0, subtotal - desconto));
  }
}

async function abrirModalVendaProdutos() {
  if (!modalVendaProdutos) return;

  if (mensagemVendaProdutos) mensagemVendaProdutos.textContent = "";

  try {
    await Promise.all([carregarClientes(), carregarProdutos()]);
  } catch (erro) {
    console.log("Erro ao preparar venda de produtos:", erro);
    alert("Não foi possível carregar clientes e produtos.");
    return;
  }

  if (clientes.length === 0) {
    alert("Cadastre pelo menos um cliente antes de registrar uma venda.");
    return;
  }
  if (produtos.length === 0) {
    alert("Cadastre pelo menos um produto antes de registrar uma venda.");
    return;
  }

  formVendaProdutos?.reset();
  clienteVendaProdutos.innerHTML = `<option value="">Selecione o cliente</option>`;
  clientes.forEach((cliente) => {
    const opcao = document.createElement("option");
    opcao.value = cliente.id;
    opcao.textContent = cliente.nome;
    clienteVendaProdutos.appendChild(opcao);
  });

  itensVendaProdutos.innerHTML = "";
  criarLinhaVendaProduto();

  const agora = new Date();
  dataVendaProdutos.value = formatarDataParaSalvar(agora);
  horaVendaProdutos.value = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  camposDescontoVendaProdutos?.classList.add("escondida");
  atualizarTotaisVendaProdutos();
  modalVendaProdutos.classList.remove("escondido");
}

botaoVenderProdutos?.addEventListener("click", abrirModalVendaProdutos);
botaoAdicionarItemVenda?.addEventListener("click", criarLinhaVendaProduto);
descontoVendaProdutos?.addEventListener("input", () => {
  formatarCampoValor(descontoVendaProdutos);
  atualizarTotaisVendaProdutos();
});
temDescontoVendaProdutos?.addEventListener("change", () => {
  const temDesconto = temDescontoVendaProdutos.value === "sim";
  camposDescontoVendaProdutos?.classList.toggle("escondida", !temDesconto);
  descontoVendaProdutos.required = temDesconto;
  if (!temDesconto) {
    descontoVendaProdutos.value = "";
  }
  atualizarTotaisVendaProdutos();
});

formVendaProdutos?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (mensagemVendaProdutos) mensagemVendaProdutos.textContent = "";

  const clienteId = clienteVendaProdutos?.value || "";
  const cliente = clientes.find((item) => item.id === clienteId);
  const itens = obterItensVendaProdutos();
  const valorBruto = itens.reduce((total, item) => total + item.subtotal, 0);
  const temDesconto = temDescontoVendaProdutos?.value === "sim";
  const valorDesconto = temDesconto
    ? converterValorParaNumero(descontoVendaProdutos?.value || "")
    : 0;
  const formaPagamento = pagamentoVendaProdutos?.value || "";

  if (!cliente) {
    mensagemVendaProdutos.textContent = "Selecione o cliente que realizou a compra.";
    clienteVendaProdutos?.focus();
    return;
  }
  if (itens.length === 0 || valorBruto <= 0) {
    mensagemVendaProdutos.textContent = "Adicione pelo menos um produto à venda.";
    return;
  }
  if (temDesconto && valorDesconto <= 0) {
    mensagemVendaProdutos.textContent = "Informe um valor válido para o desconto.";
    descontoVendaProdutos?.focus();
    return;
  }
  if (valorDesconto > valorBruto) {
    mensagemVendaProdutos.textContent = "O desconto não pode ser maior que o total da venda.";
    descontoVendaProdutos?.focus();
    return;
  }
  if (!formaPagamento) {
    mensagemVendaProdutos.textContent = "Selecione a forma de pagamento.";
    pagamentoVendaProdutos?.focus();
    return;
  }

  const valorLiquido = valorBruto - valorDesconto;
  const descricaoItens = itens.map((item) => `${item.quantidade}x ${item.nome}`).join(" + ");
  const vendedorVenda = tipoUsuario === "barbeiro" ? nomeUsuario : "";
  const responsavelVenda = "Barbearia";

  try {
    const vendaRef = await addDoc(collection(db, "movimentacoesFinanceiras"), {
      tipo: "entrada",
      origem: "venda_produtos",
      categoria: "venda_produtos",
      descricao: descricaoItens,
      clienteId: cliente.id,
      cliente: cliente.nome,
      itens,
      produtosIds: itens.map((item) => item.id),
      produtos: itens,
      produto: descricaoItens,
      valorProduto: valorBruto,
      valor: valorLiquido,
      valorTotal: valorBruto,
      valorTotalBruto: valorBruto,
      valorDesconto,
      valorLiquido,
      teveDesconto: temDesconto,
      descricaoDesconto: temDesconto ? "Desconto em venda de produtos" : "",
      formaPagamento,
      data: dataVendaProdutos?.value || formatarDataParaSalvar(new Date()),
      hora: horaVendaProdutos?.value || "00:00",
      barbeiro: responsavelVenda,
      vendedor: vendedorVenda,
      criadoPor: nomeUsuario || "Usuário atual",
      usuarioId: usuarioId || null,
      dataCadastro: Date.now()
    });

    if (temDesconto && valorDesconto > 0) {
      await setDoc(doc(db, "movimentacoesFinanceiras", `desconto_venda_${vendaRef.id}`), {
        tipo: "saida",
        origem: "desconto",
        categoria: "desconto",
        vendaId: vendaRef.id,
        descricao: "Desconto em venda de produtos",
        valor: valorDesconto,
        data: dataVendaProdutos?.value || formatarDataParaSalvar(new Date()),
        hora: horaVendaProdutos?.value || "00:00",
        barbeiro: responsavelVenda,
        vendedor: vendedorVenda,
        cliente: cliente.nome,
        formaPagamento,
        criadoPor: nomeUsuario,
        usuarioId,
        dataCadastro: Date.now()
      });
    }

    modalVendaProdutos?.classList.add("escondido");
    formVendaProdutos.reset();
    await atualizarHistoricoFinanceiro();
  } catch (erro) {
    console.log("Erro ao registrar venda de produtos:", erro);
    mensagemVendaProdutos.textContent = "Não foi possível registrar a venda.";
  }
});

function abrirModalRegistrarEntrada() {
  if (!usuarioPodeVisualizarFinanceiro() || !modalRegistrarEntrada) return;

  formRegistrarEntrada?.reset();
  if (mensagemEntrada) mensagemEntrada.textContent = "";

  if (registradoPorEntrada) {
    registradoPorEntrada.value = nomeUsuario || "Usuário atual";
    registradoPorEntrada.readOnly = true;
  }

  const agora = new Date();
  if (dataEntrada) dataEntrada.value = formatarDataParaSalvar(agora);
  if (horaEntrada) {
    horaEntrada.value = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  }
  modalRegistrarEntrada.classList.remove("escondido");
}

valorEntrada?.addEventListener("input", () => formatarCampoValor(valorEntrada));
botaoRegistrarEntrada?.addEventListener("click", abrirModalRegistrarEntrada);

formRegistrarEntrada?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usuarioPodeVisualizarFinanceiro()) return;
  if (mensagemEntrada) mensagemEntrada.textContent = "";

  const motivo = motivoEntrada?.value.trim() || "";
  const valor = converterValorParaNumero(valorEntrada?.value || "");
  const formaPagamento = formaPagamentoEntrada?.value || "";

  if (!motivo) {
    if (mensagemEntrada) mensagemEntrada.textContent = "Digite o motivo da entrada.";
    motivoEntrada?.focus();
    return;
  }
  if (valor <= 0) {
    if (mensagemEntrada) mensagemEntrada.textContent = "Digite um valor válido para a entrada.";
    valorEntrada?.focus();
    return;
  }
  if (!formaPagamento) {
    if (mensagemEntrada) mensagemEntrada.textContent = "Selecione a forma de entrada.";
    formaPagamentoEntrada?.focus();
    return;
  }
  try {
    await addDoc(collection(db, "movimentacoesFinanceiras"), {
      tipo: "entrada",
      origem: "manual",
      categoria: "entrada_manual",
      descricao: "Entrada manual",
      motivo,
      valor,
      formaPagamento,
      data: dataEntrada?.value || formatarDataParaSalvar(new Date()),
      hora: horaEntrada?.value || "00:00",
      barbeiro: "Barbearia",
      criadoPor: nomeUsuario || "Usuário atual",
      usuarioId: usuarioId || null,
      dataCadastro: Date.now()
    });

    modalRegistrarEntrada?.classList.add("escondido");
    formRegistrarEntrada.reset();
    await atualizarHistoricoFinanceiro();
  } catch (erro) {
    console.log("Erro ao registrar entrada manual:", erro);
    if (mensagemEntrada) mensagemEntrada.textContent = "Não foi possível registrar a entrada.";
  }
});

if (valorSaida) {
  valorSaida.addEventListener(
    "input",
    () => {
      formatarCampoValor(
        valorSaida
      );
    }
  );
}

if (
  botaoRegistrarSaida
) {
  botaoRegistrarSaida.addEventListener(
    "click",
    abrirModalRegistrarSaida
  );
}

if (
  formRegistrarSaida
) {
  formRegistrarSaida.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !usuarioPodeVisualizarFinanceiro()
      ) {
        return;
      }

      if (mensagemSaida) {
        mensagemSaida.textContent =
          "";
      }

      const descricao =
        descricaoSaida?.value
          .trim() || "";

      const valor =
        converterValorParaNumero(
          valorSaida?.value ||
          ""
        );

      const data =
        dataSaida?.value ||
        formatarDataParaSalvar(
          new Date()
        );

      const hora =
        horaSaida?.value ||
        "00:00";

      const barbeiro =
        barbeiroSaida?.value ||
        "Barbearia";

      const formaPagamento = formaPagamentoSaida?.value || "";

      if (!descricao) {
        if (mensagemSaida) {
          mensagemSaida.textContent =
            "Digite uma descrição para a saída.";
        }

        descricaoSaida?.focus();

        return;
      }

      if (valor <= 0) {
        if (mensagemSaida) {
          mensagemSaida.textContent =
            "Digite um valor válido para a saída.";
        }

        valorSaida?.focus();

        return;
      }

      try {
        await addDoc(
          collection(
            db,
            "movimentacoesFinanceiras"
          ),
          {
            tipo:
              "saida",

            origem:
              "manual",

            descricao,

            valor,

            data,

            hora,

            barbeiro,

            formaPagamento,

            criadoPor:
              nomeUsuario,

            usuarioId,

            dataCadastro:
              Date.now()
          }
        );

        if (
          modalRegistrarSaida
        ) {
          modalRegistrarSaida.classList.add(
            "escondido"
          );
        }

        formRegistrarSaida.reset();

        await atualizarHistoricoFinanceiro();
      } catch (erro) {
        console.log(
          "Erro ao registrar saída:",
          erro
        );

        if (mensagemSaida) {
          mensagemSaida.textContent =
            "Não foi possível registrar a saída.";
        }
      }
    }
  );
}

/* =========================================================
   NAVEGAÇÃO DO DESEMPENHO
========================================================= */

botaoMesAnterior.addEventListener(
  "click",
  () => {
    mesRelatorio.setMonth(
      mesRelatorio.getMonth() -
        1
    );

    atualizarRelatorio();
  }
);

botaoProximoMes.addEventListener(
  "click",
  () => {
    mesRelatorio.setMonth(
      mesRelatorio.getMonth() +
        1
    );

    atualizarRelatorio();
  }
);

filtroRelatorioBarbeiro.addEventListener(
  "change",
  atualizarRelatorio
);

filtroSegundoGrafico.addEventListener(
  "change",
  atualizarRelatorio
);

/* =========================================================
   NAVEGAÇÃO FINANCEIRA
========================================================= */

if (
  periodoRelatorioFinanceiro
) {
  periodoRelatorioFinanceiro.addEventListener(
    "change",
    async () => {
      dataFinanceiro =
        new Date();

      await atualizarFinanceiro();
    }
  );
}

if (
  filtroFinanceiroBarbeiro
) {
  filtroFinanceiroBarbeiro.addEventListener(
    "change",
    atualizarFinanceiro
  );
}

if (
  botaoPeriodoFinanceiroAnterior
) {
  botaoPeriodoFinanceiroAnterior.addEventListener(
    "click",
    async () => {
      const periodo =
        periodoRelatorioFinanceiro.value;

      if (
        periodo === "diario"
      ) {
        dataFinanceiro.setDate(
          dataFinanceiro.getDate() -
            1
        );
      } else if (
        periodo === "semanal"
      ) {
        dataFinanceiro.setDate(
          dataFinanceiro.getDate() -
            7
        );
      } else {
        dataFinanceiro.setMonth(
          dataFinanceiro.getMonth() -
            1
        );
      }

      await atualizarFinanceiro();
    }
  );
}

if (
  botaoPeriodoFinanceiroProximo
) {
  botaoPeriodoFinanceiroProximo.addEventListener(
    "click",
    async () => {
      const periodo =
        periodoRelatorioFinanceiro.value;

      if (
        periodo === "diario"
      ) {
        dataFinanceiro.setDate(
          dataFinanceiro.getDate() +
            1
        );
      } else if (
        periodo === "semanal"
      ) {
        dataFinanceiro.setDate(
          dataFinanceiro.getDate() +
            7
        );
      } else {
        dataFinanceiro.setMonth(
          dataFinanceiro.getMonth() +
            1
        );
      }

      await atualizarFinanceiro();
    }
  );
}

/* =========================================================
   NAVEGAÇÃO DO HISTÓRICO
========================================================= */

if (
  periodoRelatorioHistorico
) {
  periodoRelatorioHistorico.addEventListener(
    "change",
    async () => {
      dataHistorico =
        new Date();

      await atualizarHistoricoFinanceiro();
    }
  );
}

if (
  filtroHistoricoBarbeiro
) {
  filtroHistoricoBarbeiro.addEventListener(
    "change",
    atualizarHistoricoFinanceiro
  );
}

if (
  filtroHistoricoTipo
) {
  filtroHistoricoTipo.addEventListener(
    "change",
    atualizarHistoricoFinanceiro
  );
}

if (
  filtroHistoricoPagamento
) {
  filtroHistoricoPagamento.addEventListener(
    "change",
    atualizarHistoricoFinanceiro
  );
}

if (
  botaoPeriodoHistoricoAnterior
) {
  botaoPeriodoHistoricoAnterior.addEventListener(
    "click",
    async () => {
      const periodo =
        periodoRelatorioHistorico?.value ||
        "mensal";

      if (
        periodo === "diario" ||
        periodo === "dia"
      ) {
        dataHistorico.setDate(
          dataHistorico.getDate() -
            1
        );
      } else if (
        periodo === "semanal" ||
        periodo === "semana"
      ) {
        dataHistorico.setDate(
          dataHistorico.getDate() -
            7
        );
      } else {
        dataHistorico.setMonth(
          dataHistorico.getMonth() -
            1
        );
      }

      await atualizarHistoricoFinanceiro();
    }
  );
}

if (
  botaoPeriodoHistoricoProximo
) {
  botaoPeriodoHistoricoProximo.addEventListener(
    "click",
    async () => {
      const periodo =
        periodoRelatorioHistorico?.value ||
        "mensal";

      if (
        periodo === "diario" ||
        periodo === "dia"
      ) {
        dataHistorico.setDate(
          dataHistorico.getDate() +
            1
        );
      } else if (
        periodo === "semanal" ||
        periodo === "semana"
      ) {
        dataHistorico.setDate(
          dataHistorico.getDate() +
            7
        );
      } else {
        dataHistorico.setMonth(
          dataHistorico.getMonth() +
            1
        );
      }

      await atualizarHistoricoFinanceiro();
    }
  );
}

/* =========================================================
   BOTÕES DAS ABAS
========================================================= */

async function atualizarProdutosDiariosLegado() {
  if (!listaProdutosDiarios) return;

  const dataSelecionada = formatarDataParaSalvar(new Date());
  const barbeiroSelecionado = filtroProdutosDiariosBarbeiro?.value ||
    (tipoUsuario === "barbeiro" ? nomeUsuario : "todos");

  listaProdutosDiarios.innerHTML = `<p class="lista-vazia">Carregando produtos...</p>`;

  try {
    const [respostaAgendamentos, respostaMovimentacoes] = await Promise.all([
      getDocs(collection(db, "agendamentos")),
      getDocs(collection(db, "movimentacoesFinanceiras"))
    ]);

    const vendas = [];

    respostaAgendamentos.docs.forEach((documento) => {
      const agendamento = { id: documento.id, ...documento.data() };
      if (agendamento.data !== dataSelecionada) return;
      if (barbeiroSelecionado !== "todos" && agendamento.barbeiro !== barbeiroSelecionado) return;

      // Depois da conclusão, os produtos definitivos ficam em `produtos`.
      // Antes disso, mostra o que o barbeiro já registrou, sem contar duas vezes.
      const produtosConcluidos = Array.isArray(agendamento.produtos)
        ? agendamento.produtos
        : [];
      const produtosInformadosPeloBarbeiro = Array.isArray(
        agendamento.produtosVendidosBarbeiro
      )
        ? agendamento.produtosVendidosBarbeiro
        : [];
      const itens = agendamento.status === "concluido"
        ? produtosConcluidos
        : produtosInformadosPeloBarbeiro;

      itens.forEach((produto) => vendas.push({
        produto: produto.nome || "Produto",
        quantidade: Math.max(1, Number(produto.quantidade) || 1),
        valor: Number(produto.subtotal) || Number(produto.valor) || 0,
        barbeiro: agendamento.barbeiro || "Não informado",
        cliente: agendamento.cliente || "Não informado",
        hora: agendamento.hora || "00:00"
      }));
    });

    respostaMovimentacoes.docs.forEach((documento) => {
      const movimentacao = { id: documento.id, ...documento.data() };
      const barbeiro = movimentacao.vendedor || movimentacao.barbeiro || "Barbearia";
      if (
        movimentacao.tipo !== "entrada" ||
        movimentacao.origem !== "venda_produtos" ||
        movimentacao.data !== dataSelecionada ||
        barbeiro === "Barbearia" ||
        (barbeiroSelecionado !== "todos" && barbeiro !== barbeiroSelecionado)
      ) return;

      const itens = Array.isArray(movimentacao.itens)
        ? movimentacao.itens
        : (Array.isArray(movimentacao.produtos) ? movimentacao.produtos : []);

      itens.forEach((produto) => vendas.push({
        produto: produto.nome || "Produto",
        quantidade: Math.max(1, Number(produto.quantidade) || 1),
        valor: Number(produto.subtotal) ||
          (Number(produto.valorUnitario) || Number(produto.valor) || 0) *
            Math.max(1, Number(produto.quantidade) || 1),
        barbeiro,
        cliente: movimentacao.cliente || "Não informado",
        hora: movimentacao.hora || "00:00"
      }));
    });

    vendas.sort((a, b) => b.hora.localeCompare(a.hora));
    const quantidadeTotal = vendas.reduce((total, venda) => total + venda.quantidade, 0);
    const valorTotal = vendas.reduce((total, venda) => total + venda.valor, 0);

    if (resumoProdutosDiarios) {
      resumoProdutosDiarios.innerHTML = `
        <div class="cartao-financeiro">
          <span>Produtos vendidos</span>
          <strong>${quantidadeTotal}</strong>
          <small>Não entra no ganho do barbeiro</small>
        </div>
        <div class="cartao-financeiro">
          <span>Valor em produtos</span>
          <strong>${formatarValorEmReal(valorTotal)}</strong>
          <small>Valor destinado à barbearia</small>
        </div>
      `;
    }

    listaProdutosDiarios.innerHTML = "";
    if (vendas.length === 0) {
      listaProdutosDiarios.innerHTML = `<p class="lista-vazia">Nenhum produto vendido nesta data.</p>`;
      return;
    }

    vendas.forEach((venda) => {
      const linha = document.createElement("div");
      linha.className = "item-historico-financeiro";
      linha.style.display = "grid";
      linha.style.gridTemplateColumns = "90px minmax(180px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) 120px";
      linha.style.gap = "16px";
      linha.style.alignItems = "center";
      linha.style.padding = "16px";

      [
        venda.hora,
        `${venda.quantidade}x ${venda.produto}`,
        venda.barbeiro,
        venda.cliente,
        formatarValorEmReal(venda.valor)
      ].forEach((texto, indice) => {
        const campo = document.createElement(indice === 1 ? "strong" : "span");
        campo.textContent = texto;
        linha.appendChild(campo);
      });

      listaProdutosDiarios.appendChild(linha);
    });
  } catch (erro) {
    console.log("Erro ao carregar produtos diários:", erro);
    listaProdutosDiarios.innerHTML = `<p class="lista-vazia">Não foi possível carregar os produtos vendidos.</p>`;
  }
}

async function atualizarProdutosDiarios() {
  if (!listaProdutosDiarios) return;

  const tipoPeriodo = periodoRelatorioProdutos?.value || "diario";
  const periodo = obterPeriodoGenerico(tipoPeriodo, dataProdutosRelatorio);
  const profissionalSelecionado = filtroProdutosDiariosBarbeiro?.value ||
    (tipoUsuario === "barbeiro" ? nomeUsuario : "todos");

  if (tituloPeriodoProdutos) {
    tituloPeriodoProdutos.textContent = periodo.titulo;
  }

  listaProdutosDiarios.innerHTML =
    `<p class="lista-vazia">Carregando produtos...</p>`;

  try {
    const [respostaAgendamentos, respostaMovimentacoes] = await Promise.all([
      getDocs(collection(db, "agendamentos")),
      getDocs(collection(db, "movimentacoesFinanceiras"))
    ]);

    const vendas = [];
    const nomesProfissionais = new Set(
      barbeiros.map((profissional) => profissional.nome)
    );

    const profissionalCompativel = (venda) =>
      profissionalSelecionado === "todos" ||
      venda.profissionalChave === profissionalSelecionado;

    const dentroDoPeriodo = (data) =>
      data >= periodo.inicioTexto && data <= periodo.fimTexto;

    respostaAgendamentos.docs.forEach((documento) => {
      const agendamento = { id: documento.id, ...documento.data() };
      if (
        agendamento.status !== "concluido" ||
        !dentroDoPeriodo(agendamento.data)
      ) return;

      const produtosConcluidos = Array.isArray(agendamento.produtos)
        ? agendamento.produtos
        : [];
      const idsVendidosPeloProfissional = new Set(
        Array.isArray(agendamento.produtosVendidosBarbeiroIds)
          ? agendamento.produtosVendidosBarbeiroIds
          : []
      );

      produtosConcluidos.forEach((produto) => {
        const vendidoPeloProfissional =
          idsVendidosPeloProfissional.has(produto.id);
        const profissionalChave = vendidoPeloProfissional
          ? (agendamento.barbeiro || "recepcionista")
          : "recepcionista";
        const profissional = vendidoPeloProfissional
          ? (agendamento.barbeiro || "Profissional")
          : "Recepção";
        const quantidade = Math.max(1, Number(produto.quantidade) || 1);
        const venda = {
          produto: produto.nome || "Produto",
          quantidade,
          valor: Number(produto.subtotal) ||
            (Number(produto.valorUnitario) || Number(produto.valor) || 0) * quantidade,
          profissional,
          profissionalChave,
          cliente: agendamento.cliente || "Não informado",
          data: agendamento.data,
          hora: agendamento.hora || "00:00"
        };

        if (profissionalCompativel(venda)) vendas.push(venda);
      });
    });

    respostaMovimentacoes.docs.forEach((documento) => {
      const movimentacao = { id: documento.id, ...documento.data() };
      if (
        movimentacao.tipo !== "entrada" ||
        movimentacao.origem !== "venda_produtos" ||
        !dentroDoPeriodo(movimentacao.data)
      ) return;

      const profissionalSalvo =
        movimentacao.vendedor || movimentacao.criadoPor || "";
      const vendidoPorProfissional =
        movimentacao.tipoVendedor === "barbeiro" ||
        nomesProfissionais.has(profissionalSalvo);
      const profissionalChave = vendidoPorProfissional
        ? profissionalSalvo
        : "recepcionista";
      const profissional = vendidoPorProfissional
        ? profissionalSalvo
        : "Recepção";
      const itens = Array.isArray(movimentacao.itens)
        ? movimentacao.itens
        : (Array.isArray(movimentacao.produtos) ? movimentacao.produtos : []);

      itens.forEach((produto) => {
        const quantidade = Math.max(1, Number(produto.quantidade) || 1);
        const venda = {
          produto: produto.nome || "Produto",
          quantidade,
          valor: Number(produto.subtotal) ||
            (Number(produto.valorUnitario) || Number(produto.valor) || 0) * quantidade,
          profissional,
          profissionalChave,
          cliente: movimentacao.cliente || "Não informado",
          data: movimentacao.data,
          hora: movimentacao.hora || "00:00"
        };

        if (profissionalCompativel(venda)) vendas.push(venda);
      });
    });

    vendas.sort((a, b) =>
      `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`)
    );

    const quantidadeTotal = vendas.reduce(
      (total, venda) => total + venda.quantidade,
      0
    );
    const valorTotal = vendas.reduce(
      (total, venda) => total + venda.valor,
      0
    );

    if (resumoProdutosDiarios) {
      resumoProdutosDiarios.innerHTML = `
        <div class="cartao-financeiro">
          <span>Produtos vendidos</span>
          <strong>${quantidadeTotal}</strong>
          <small>Quantidade no período</small>
        </div>
        <div class="cartao-financeiro">
          <span>Valor em produtos</span>
          <strong>${formatarValorEmReal(valorTotal)}</strong>
          <small>Valor destinado ao estabelecimento</small>
        </div>
      `;
    }

    if (quantidadeVendasProdutos) {
      quantidadeVendasProdutos.textContent =
        `${vendas.length} venda${vendas.length === 1 ? "" : "s"}`;
    }

    listaProdutosDiarios.innerHTML = "";

    if (vendas.length === 0) {
      listaProdutosDiarios.innerHTML =
        `<p class="lista-vazia">Nenhum produto vendido neste período.</p>`;
      return;
    }

    vendas.forEach((venda) => {
      const linha = document.createElement("div");
      linha.className = "linha-produto-relatorio";
      const dataFormatada =
        dataPorTexto(venda.data).toLocaleDateString("pt-BR");
      const campos = [
        { texto: `${dataFormatada} • ${venda.hora}`, classe: "data-venda-relatorio" },
        { texto: `${venda.quantidade}x ${venda.produto}`, classe: "produto-venda-relatorio" },
        { texto: venda.profissional, classe: "vendedor-venda-relatorio" },
        { texto: venda.cliente, classe: "cliente-venda-relatorio" },
        { texto: formatarValorEmReal(venda.valor), classe: "valor-venda-relatorio" }
      ];

      campos.forEach(({ texto, classe }) => {
        const campo = document.createElement("span");
        campo.className = classe;
        campo.textContent = texto;
        linha.appendChild(campo);
      });

      listaProdutosDiarios.appendChild(linha);
    });
  } catch (erro) {
    console.log("Erro ao carregar relatório de produtos:", erro);
    listaProdutosDiarios.innerHTML =
      `<p class="lista-vazia">Não foi possível carregar os produtos vendidos.</p>`;
  }
}

abaRelatorioDesempenho?.addEventListener(
  "click",
  abrirRelatorioDesempenho
);

abaRelatorioFinanceiro?.addEventListener(
  "click",
  abrirRelatorioFinanceiro
);

abaRelatorioHistorico?.addEventListener(
  "click",
  abrirRelatorioHistorico
);

abaRelatorioProdutosDiarios?.addEventListener("click", abrirRelatorioProdutosDiarios);
filtroProdutosDiariosBarbeiro?.addEventListener("change", atualizarProdutosDiarios);
periodoRelatorioProdutos?.addEventListener("change", () => {
  dataProdutosRelatorio = new Date();
  atualizarProdutosDiarios();
});

function navegarPeriodoProdutos(direcao) {
  const tipoPeriodo = periodoRelatorioProdutos?.value || "diario";
  const novaData = new Date(dataProdutosRelatorio);

  if (tipoPeriodo === "mensal") {
    novaData.setMonth(novaData.getMonth() + direcao);
  } else {
    novaData.setDate(
      novaData.getDate() + direcao * (tipoPeriodo === "semanal" ? 7 : 1)
    );
  }

  dataProdutosRelatorio = novaData;
  atualizarProdutosDiarios();
}

periodoProdutosAnterior?.addEventListener(
  "click",
  () => navegarPeriodoProdutos(-1)
);
periodoProdutosProximo?.addEventListener(
  "click",
  () => navegarPeriodoProdutos(1)
);

/* =========================================================
   APAGAR HISTÓRICO FINANCEIRO
========================================================= */

const colecoesOperacionais = [
  "movimentacoesFinanceiras"
];

async function esvaziarColecaoOperacional(nomeColecao) {
  let quantidadeRemovida = 0;

  while (true) {
    const documentos = await getDocs(
      query(collection(db, nomeColecao), limit(400))
    );

    if (documentos.empty) return quantidadeRemovida;

    const lote = writeBatch(db);
    documentos.docs.forEach((documento) => lote.delete(documento.ref));
    await lote.commit();
    quantidadeRemovida += documentos.size;
  }
}

async function ocultarAtendimentosDoHistoricoFinanceiro() {
  const documentos = await getDocs(collection(db, "agendamentos"));
  const atendimentosVisiveis = documentos.docs.filter((documento) => {
    const agendamento = documento.data();
    return (
      agendamento.status === "concluido" &&
      agendamento.ocultarNoHistoricoFinanceiro !== true
    );
  });

  for (let inicio = 0; inicio < atendimentosVisiveis.length; inicio += 400) {
    const lote = writeBatch(db);
    atendimentosVisiveis
      .slice(inicio, inicio + 400)
      .forEach((documento) => {
        lote.update(documento.ref, {
          ocultarNoHistoricoFinanceiro: true
        });
      });
    await lote.commit();
  }

  return atendimentosVisiveis.length;
}

botaoApagarDados?.addEventListener("click", async () => {
  if (tipoUsuario !== "administrador") {
    mensagemApagarDados.textContent =
      "Somente o administrador pode apagar os dados.";
    return;
  }

  const senhaInformada = senhaAdministradorApagarDados.value;
  if (!senhaInformada) {
    mensagemApagarDados.textContent =
      "Digite a senha atual do administrador.";
    senhaAdministradorApagarDados.focus();
    return;
  }

  try {
    const documentoConfiguracao = await getDoc(configuracaoGeral);
    const configuracoes = documentoConfiguracao.exists()
      ? documentoConfiguracao.data()
      : {};
    const senhaAdministradorAtual =
      configuracoes.senhaAdministrador ||
      configuracoes.senha ||
      "tradicao123";

    if (senhaInformada !== senhaAdministradorAtual) {
      mensagemApagarDados.textContent =
        "Senha do administrador incorreta.";
      senhaAdministradorApagarDados.value = "";
      senhaAdministradorApagarDados.focus();
      return;
    }
  } catch (erro) {
    console.log("Erro ao validar senha do administrador:", erro);
    mensagemApagarDados.textContent =
      "Não foi possível validar a senha do administrador.";
    return;
  }

  const confirmou = confirm(
    "Confirma a exclusão permanente de todo o histórico financeiro? Os demais dados serão preservados."
  );
  if (!confirmou) return;

  botaoApagarDados.disabled = true;
  senhaAdministradorApagarDados.disabled = true;
  mensagemApagarDados.textContent = "Iniciando limpeza...";

  try {
    const resumo = [];

    for (const nomeColecao of colecoesOperacionais) {
      mensagemApagarDados.textContent = `Limpando ${nomeColecao}...`;
      const quantidade = await esvaziarColecaoOperacional(nomeColecao);
      resumo.push(`${nomeColecao}: ${quantidade}`);
    }

    mensagemApagarDados.textContent = "Limpando atendimentos do histórico...";
    const quantidadeAtendimentos =
      await ocultarAtendimentosDoHistoricoFinanceiro();
    resumo.push(`atendimentos no histórico: ${quantidadeAtendimentos}`);

    mensagemApagarDados.textContent =
      `Limpeza concluída. Registros apagados — ${resumo.join("; ")}. ` +
      "Os demais dados foram preservados. Atualize a página para continuar.";
    senhaAdministradorApagarDados.value = "";
  } catch (erro) {
    console.log("Erro ao apagar histórico financeiro:", erro);
    mensagemApagarDados.textContent =
      "A limpeza foi interrompida. Tente novamente para concluir os dados restantes.";
    botaoApagarDados.disabled = false;
    senhaAdministradorApagarDados.disabled = false;
  }
});

/* =========================================================
   TEMA
========================================================= */

opcoesTema.forEach(
  (opcao) => {
    opcao.addEventListener(
      "change",
      async () => {
        aplicarTema(opcao.value);
        localStorage.setItem(
          "temaSistema",
          opcao.value
        );

        try {
          await setDoc(
            configuracaoGeral,
            {
              tema:
                opcao.value
            },
            {
              merge:
                true
            }
          );

          mensagemTema.textContent =
            "Tema atualizado com sucesso.";
        } catch (erro) {
          console.log(
            erro
          );

          mensagemTema.textContent =
            "Não foi possível salvar o tema.";
        }
      }
    );
  }
);

/* =========================================================
   ALTERAR SENHA
========================================================= */

formAlterarSenha.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    mensagemSenha.textContent =
      "";

    const selecionado =
      usuarioAlterarSenha.value;

    const senha =
      novaSenha.value.trim();

    const confirmacao =
      confirmarNovaSenha.value.trim();

    if (!selecionado) {
      mensagemSenha.textContent =
        "Selecione o usuário.";

      return;
    }

    if (
      senha.length < 4
    ) {
      mensagemSenha.textContent =
        "A senha precisa ter pelo menos 4 caracteres.";

      return;
    }

    if (
      senha !== confirmacao
    ) {
      mensagemSenha.textContent =
        "As duas senhas não são iguais.";

      return;
    }

    if (
      tipoUsuario !==
        "administrador" &&
      selecionado !==
        usuarioId
    ) {
      mensagemSenha.textContent =
        "Você só pode alterar a sua própria senha.";

      return;
    }

    try {
      if (
        selecionado ===
        "administrador"
      ) {
        if (
          tipoUsuario !==
          "administrador"
        ) {
          return;
        }

        await setDoc(
          configuracaoGeral,
          {
            senhaAdministrador:
              senha
          },
          {
            merge:
              true
          }
        );

        mensagemSenha.textContent =
          "Senha do administrador alterada com sucesso.";
      } else if (
        selecionado ===
        "recepcionista"
      ) {
        if (
          tipoUsuario !==
            "administrador" &&
          tipoUsuario !==
            "recepcionista"
        ) {
          return;
        }

        await setDoc(
          configuracaoGeral,
          {
            senhaRecepcionista:
              senha
          },
          {
            merge:
              true
          }
        );

        mensagemSenha.textContent =
          "Senha da recepcionista alterada com sucesso.";
      } else {
        const barbeiro =
          barbeiros.find(
            (item) =>
              item.id ===
              selecionado
          );

        if (!barbeiro) {
          mensagemSenha.textContent =
            "Profissional não encontrado.";

          return;
        }

        if (
          tipoUsuario !==
            "administrador" &&
          usuarioId !==
            barbeiro.id
        ) {
          mensagemSenha.textContent =
            "Você só pode alterar a sua própria senha.";

          return;
        }

        await updateDoc(
          doc(
            db,
            "barbeiros",
            barbeiro.id
          ),
          {
            senha
          }
        );

        barbeiro.senha = senha;

        mensagemSenha.textContent =
          `Senha de ${barbeiro.nome} alterada com sucesso.`;
      }

      if (senhaAtualUsuario) {
        senhaAtualUsuario.value = senha;
      }

      novaSenha.value =
        "";

      confirmarNovaSenha.value =
        "";

      if (
        tipoUsuario ===
        "administrador"
      ) {
        usuarioAlterarSenha.value =
          "";

        if (senhaAtualUsuario) {
          senhaAtualUsuario.value = "";
          senhaAtualUsuario.placeholder = "Selecione um usuário";
        }
      }
    } catch (erro) {
      console.log(
        erro
      );

      mensagemSenha.textContent =
        "Não foi possível alterar a senha.";
    }
  }
);

/* =========================================================
   WHATSAPP
========================================================= */

const botaoAdicionarMensagemWhatsApp = document.querySelector("#botao-adicionar-mensagem-whatsapp");
const camposMensagensWhatsApp = document.querySelector("#campos-mensagens-whatsapp");
let agendamentosWhatsApp = [];
let contadorCamposWhatsApp = 0;
const MENSAGEM_PADRAO_WHATSAPP =
  "Olá, {cliente}! Tudo bem? Aqui é da Tradição Barber Shop.";

botaoAdicionarMensagemWhatsApp?.remove();
camposMensagensWhatsApp.classList.add("escondida");

const painelClientesWhatsApp = document.createElement("section");
painelClientesWhatsApp.className = "painel-clientes-whatsapp";
painelClientesWhatsApp.innerHTML = `
  <div class="topo-clientes-whatsapp">
    <div>
      <p class="texto-pequeno">Central de mensagens</p>
      <h3>WhatsApp dos clientes</h3>
    </div>
  </div>
  <div class="controles-rapidos-whatsapp">
    <div class="grupo-controle-whatsapp">
      <label for="filtro-rapido-whatsapp">Filtrar clientes por</label>
      <select id="filtro-rapido-whatsapp">
        <option value="todos">Todos os clientes</option>
        <option value="cadastrados_hoje">Clientes cadastrados hoje</option>
        <option value="agendados_hoje">Clientes com horário hoje</option>
        <option value="agendados_amanha">Clientes com horário amanhã</option>
        <option value="pagamento_pendente">Clientes com pagamento do plano pendente</option>
        <option value="manual">Mensagem personalizada</option>
      </select>
    </div>
    <div class="grupo-controle-whatsapp">
      <label for="pesquisa-rapida-whatsapp">Pesquisar</label>
      <input
        id="pesquisa-rapida-whatsapp"
        type="search"
        placeholder="Digite o nome ou celular..."
        autocomplete="off"
      />
    </div>
  </div>
  <div class="mensagem-rapida-whatsapp">
    <label for="texto-rapido-whatsapp">Mensagem</label>
    <textarea id="texto-rapido-whatsapp" rows="4" maxlength="900">${MENSAGEM_PADRAO_WHATSAPP}</textarea>
    <p>Use: <strong>{cliente}</strong>, <strong>{barbeiro}</strong>, <strong>{horario}</strong>, <strong>{data}</strong>, <strong>{plano}</strong> e <strong>{vencimento}</strong>.</p>
  </div>
  <div id="resumo-rapido-whatsapp" class="resumo-rapido-whatsapp"></div>
  <div id="lista-rapida-whatsapp" class="lista-rapida-whatsapp"></div>
`;
camposMensagensWhatsApp.before(painelClientesWhatsApp);

const pesquisaRapidaWhatsApp = painelClientesWhatsApp.querySelector(
  "#pesquisa-rapida-whatsapp"
);
const listaRapidaWhatsApp = painelClientesWhatsApp.querySelector(
  "#lista-rapida-whatsapp"
);
const filtroRapidoWhatsApp = painelClientesWhatsApp.querySelector(
  "#filtro-rapido-whatsapp"
);
const textoRapidoWhatsApp = painelClientesWhatsApp.querySelector(
  "#texto-rapido-whatsapp"
);
const resumoRapidoWhatsApp = painelClientesWhatsApp.querySelector(
  "#resumo-rapido-whatsapp"
);

function linkWhatsAppComMensagem(cliente, mensagem) {
  const linkBase = criarLinkWhatsAppDoCliente(cliente);
  if (!linkBase) return "";

  const texto = String(mensagem || "")
    .replace(/\{cliente\}/gi, cliente.nome || "cliente")
    .replace(/\{barbeiro\}/gi, cliente.barbeiro || "barbeiro")
    .replace(/\{horario\}/gi, cliente.horario || "horário não informado")
    .replace(/\{data\}/gi, cliente.dataMensagem || "data não informada")
    .replace(/\{plano\}/gi, cliente.plano || "plano")
    .replace(/\{vencimento\}/gi, cliente.vencimento || "data não informada");

  return texto
    ? `${linkBase}?text=${encodeURIComponent(texto)}`
    : linkBase;
}

function mostrarListaRapidaWhatsApp() {
  const termo = pesquisaRapidaWhatsApp.value.trim().toLowerCase();
  const disponiveis = clientesDoFiltroRapidoWhatsApp();
  const filtrados = disponiveis.filter((cliente) =>
    !termo ||
    String(cliente.nome || "").toLowerCase().includes(termo) ||
    String(cliente.celular || "").includes(termo)
  );

  listaRapidaWhatsApp.innerHTML = "";
  resumoRapidoWhatsApp.textContent =
    `${filtrados.length} ${filtrados.length === 1 ? "cliente encontrado" : "clientes encontrados"}`;

  if (!filtrados.length) {
    listaRapidaWhatsApp.innerHTML =
      '<p class="estado-vazio-whatsapp">Nenhum cliente encontrado.</p>';
    return;
  }

  filtrados.forEach((cliente) => {
    const linha = document.createElement("div");
    linha.className = "cliente-rapido-whatsapp";

    const dados = document.createElement("div");
    const nome = document.createElement("strong");
    const celular = document.createElement("small");
    nome.textContent = cliente.nome;
    celular.textContent = cliente.celular || "Sem celular cadastrado";
    dados.append(nome, celular);

    const botao = document.createElement("a");
    const link = linkWhatsAppComMensagem(
      cliente,
      textoRapidoWhatsApp.value.trim()
    );
    botao.className = `botao-whatsapp-rapido${link ? "" : " desativado"}`;
    botao.textContent = "Abrir WhatsApp";
    botao.href = link || "#";
    botao.target = "_blank";
    botao.rel = "noopener noreferrer";
    botao.setAttribute(
      "aria-label",
      `Abrir WhatsApp de ${cliente.nome} com mensagem pronta`
    );
    if (!link) {
      botao.addEventListener("click", (event) => event.preventDefault());
    }

    linha.append(dados, botao);
    listaRapidaWhatsApp.appendChild(linha);
  });
}

pesquisaRapidaWhatsApp.addEventListener("input", mostrarListaRapidaWhatsApp);
textoRapidoWhatsApp.addEventListener("input", mostrarListaRapidaWhatsApp);
filtroRapidoWhatsApp.addEventListener("change", () => {
  textoRapidoWhatsApp.value =
    MENSAGENS_DOS_FILTROS_WHATSAPP[filtroRapidoWhatsApp.value] ||
    MENSAGEM_PADRAO_WHATSAPP;
  pesquisaRapidaWhatsApp.value = "";
  mostrarListaRapidaWhatsApp();
});

function clienteCadastradoHoje(cliente) {
  const cadastro = Number(cliente.dataCadastro || cliente.criadoEm || 0);
  if (!cadastro) return false;
  return formatarDataParaSalvar(new Date(cadastro)) === formatarDataParaSalvar(new Date());
}

const MENSAGENS_DOS_FILTROS_WHATSAPP = {
  todos: MENSAGEM_PADRAO_WHATSAPP,
  cadastrados_hoje:
    "Olá, {cliente}! Seja bem-vindo à Tradição Barber Shop. Ficamos felizes em ter você como cliente!",
  agendados_hoje:
    "Olá, {cliente}! Lembrando que você tem um horário marcado hoje, às {horario}, com o barbeiro {barbeiro}.",
  agendados_amanha:
    "Olá, {cliente}! Passando para confirmar seu horário amanhã, às {horario}, com o barbeiro {barbeiro}.",
  pagamento_pendente:
    "Olá, {cliente}! O pagamento do seu plano {plano} está pendente desde {vencimento}. Entre em contato conosco para regularizar.",
  manual: MENSAGEM_PADRAO_WHATSAPP
};

function dataDeAmanhaWhatsApp() {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  return formatarDataParaSalvar(amanha);
}

function clientesAgendadosNaDataWhatsApp(data) {
  const resultados = [];
  const adicionados = new Set();

  agendamentosWhatsApp
    .filter((item) => item.data === data)
    .filter((item) =>
      item.status !== "cancelado" && item.status !== "nao_realizado"
    )
    .forEach((agendamento) => {
      const cliente = clientes.find((item) =>
        item.id === agendamento.clienteId ||
        String(item.nome || "").trim().toLowerCase() ===
          String(agendamento.cliente || "").trim().toLowerCase()
      );

      if (!cliente || adicionados.has(cliente.id)) return;
      adicionados.add(cliente.id);
      resultados.push({
        ...cliente,
        barbeiro: agendamento.barbeiro || "barbeiro",
        horario: agendamento.hora || "horário não informado",
        dataMensagem: data.split("-").reverse().join("/")
      });
    });

  return resultados;
}

function clientesComPagamentoPendenteWhatsApp() {
  const resultados = [];

  clientes.forEach((cliente) => {
    const planoPendente = planos.find((plano) => {
      if (plano.ativo === false) return false;
      const ciclo = cicloIndividualDoCliente(plano, cliente.id);
      return ciclo && !cicloDoClienteEstaPago(ciclo);
    });

    if (!planoPendente) return;
    const ciclo = cicloIndividualDoCliente(planoPendente, cliente.id);
    resultados.push({
      ...cliente,
      plano: planoPendente.nome || "plano",
      vencimento: ciclo.inicio.split("-").reverse().join("/")
    });
  });

  return resultados;
}

function clientesDoFiltroRapidoWhatsApp() {
  const filtro = filtroRapidoWhatsApp.value || "todos";

  if (filtro === "cadastrados_hoje") {
    return clientes.filter(clienteCadastradoHoje);
  }
  if (filtro === "agendados_hoje") {
    return clientesAgendadosNaDataWhatsApp(
      formatarDataParaSalvar(new Date())
    );
  }
  if (filtro === "agendados_amanha") {
    return clientesAgendadosNaDataWhatsApp(dataDeAmanhaWhatsApp());
  }
  if (filtro === "pagamento_pendente") {
    return clientesComPagamentoPendenteWhatsApp();
  }

  return clientes;
}

function criarCampoMensagemWhatsApp() {
  contadorCamposWhatsApp += 1;
  const selecionados = new Set();
  const campo = document.createElement("article");
  campo.className = "campo-mensagem-whatsapp";
  campo.dataset.campoId = String(contadorCamposWhatsApp);
  campo.innerHTML = `
    <div class="topo-campo-whatsapp">
      <input
        class="titulo-campo-whatsapp"
        type="text"
        maxlength="80"
        placeholder="Digite o título desta área..."
        aria-label="Título da área de mensagem"
      />
      <button class="botao-remover-campo-whatsapp" type="button" aria-label="Remover campo">×</button>
    </div>
    <label class="rotulo-whatsapp" for="filtro-whatsapp-${contadorCamposWhatsApp}">Filtrar clientes por</label>
    <select id="filtro-whatsapp-${contadorCamposWhatsApp}" class="filtro-clientes-whatsapp">
      <option value="todos">Todos os clientes</option>
      <option value="cadastrados_hoje">Clientes cadastrados hoje</option>
      <option value="agendados_hoje">Clientes com horário hoje</option>
      <option value="agendados_amanha">Clientes com horário amanhã</option>
      <option value="pagamento_pendente">Clientes com pagamento do plano pendente</option>
      <option value="manual">Selecionar manualmente</option>
    </select>
    <div class="selecao-manual-whatsapp">
      <input class="pesquisa-clientes-whatsapp" type="search" placeholder="Pesquisar cliente por nome ou celular..." autocomplete="off" />
      <div class="lista-clientes-manual-whatsapp"></div>
    </div>
    <div class="resumo-filtro-whatsapp"></div>
    <label class="rotulo-whatsapp">Mensagem</label>
    <textarea class="texto-campo-whatsapp" rows="6" maxlength="900" placeholder="Digite a mensagem que será enviada para esses clientes...">${MENSAGENS_DOS_FILTROS_WHATSAPP.todos}</textarea>
    <p class="ajuda-whatsapp">Campos disponíveis: <strong>{cliente}</strong>, <strong>{barbeiro}</strong>, <strong>{horario}</strong>, <strong>{data}</strong>, <strong>{plano}</strong> e <strong>{vencimento}</strong>.</p>
    <div class="rodape-campo-whatsapp">
      <span class="status-campo-whatsapp"></span>
      <button class="botao-principal enviar-campo-whatsapp" type="button">Enviar mensagem</button>
    </div>
  `;

  const seletorFiltro = campo.querySelector(".filtro-clientes-whatsapp");
  const areaManual = campo.querySelector(".selecao-manual-whatsapp");
  const pesquisa = campo.querySelector(".pesquisa-clientes-whatsapp");
  const listaManual = campo.querySelector(".lista-clientes-manual-whatsapp");
  const resumo = campo.querySelector(".resumo-filtro-whatsapp");
  const status = campo.querySelector(".status-campo-whatsapp");
  const textoMensagem = campo.querySelector(".texto-campo-whatsapp");
  const botaoEnviar = campo.querySelector(".enviar-campo-whatsapp");
  let filaDeEnvio = [];
  let indiceDaFila = 0;

  function filtroAtual() {
    return seletorFiltro.value || "todos";
  }

  function clientesDoFiltro() {
    if (filtroAtual() === "todos") return clientes;
    if (filtroAtual() === "cadastrados_hoje") return clientes.filter(clienteCadastradoHoje);
    if (filtroAtual() === "agendados_hoje") {
      return clientesAgendadosNaDataWhatsApp(
        formatarDataParaSalvar(new Date())
      );
    }
    if (filtroAtual() === "agendados_amanha") {
      return clientesAgendadosNaDataWhatsApp(dataDeAmanhaWhatsApp());
    }
    if (filtroAtual() === "pagamento_pendente") {
      return clientesComPagamentoPendenteWhatsApp();
    }
    return clientes.filter((cliente) => selecionados.has(cliente.id));
  }

  function atualizarResumo() {
    const lista = clientesDoFiltro();
    const comCelular = lista.filter((cliente) => String(cliente.celular || "").trim());
    resumo.textContent = `${comCelular.length} ${comCelular.length === 1 ? "cliente selecionado" : "clientes selecionados"}`;
    if (lista.length > comCelular.length) resumo.textContent += ` • ${lista.length - comCelular.length} sem celular`;
  }

  function mensagemParaCliente(cliente) {
    return textoMensagem.value.trim();
  }

  function abrirConversaDoCliente(cliente) {
    const linkBase = criarLinkWhatsAppDoCliente(cliente);
    if (!linkBase) {
      status.textContent = `O celular de ${cliente.nome} não está completo.`;
      return false;
    }

    const link = linkWhatsAppComMensagem(
      cliente,
      mensagemParaCliente(cliente)
    );

    window.open(link, "_blank", "noopener,noreferrer");
    return true;
  }

  function reiniciarFilaDeEnvio() {
    filaDeEnvio = [];
    indiceDaFila = 0;
    botaoEnviar.textContent = "Enviar mensagem";
  }

  function mostrarClientesManuais() {
    const termo = pesquisa.value.trim().toLowerCase();
    listaManual.innerHTML = "";
    const selecaoManual = filtroAtual() === "manual";
    const clientesDisponiveis = selecaoManual
      ? clientes
      : clientesDoFiltro();
    const filtrados = clientesDisponiveis.filter((cliente) =>
      !termo || cliente.nome.toLowerCase().includes(termo) || String(cliente.celular || "").includes(termo)
    );
    if (!filtrados.length) {
      listaManual.innerHTML = '<p class="estado-vazio-whatsapp">Nenhum cliente encontrado.</p>';
      return;
    }
    filtrados.forEach((cliente) => {
      const label = document.createElement("label");
      label.className = `cliente-manual-whatsapp${cliente.celular ? "" : " sem-telefone"}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selecaoManual
        ? selecionados.has(cliente.id)
        : true;
      checkbox.disabled = !selecaoManual || !cliente.celular;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selecionados.add(cliente.id);
        else selecionados.delete(cliente.id);
        reiniciarFilaDeEnvio();
        atualizarResumo();
      });
      const dados = document.createElement("span");
      const nome = document.createElement("strong");
      const celular = document.createElement("small");
      const botaoWhatsApp = document.createElement("button");
      nome.textContent = cliente.nome;
      celular.textContent = cliente.celular || "Sem celular cadastrado";
      botaoWhatsApp.type = "button";
      botaoWhatsApp.className = "botao-whatsapp-manual";
      botaoWhatsApp.textContent = "WhatsApp";
      botaoWhatsApp.disabled = !criarLinkWhatsAppDoCliente(cliente);
      botaoWhatsApp.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        abrirConversaDoCliente(cliente);
      });
      dados.append(nome, celular);
      label.append(checkbox, dados, botaoWhatsApp);
      listaManual.appendChild(label);
    });
  }

  seletorFiltro.addEventListener("change", () => {
    areaManual.classList.remove("escondida");
    pesquisa.value = "";
    textoMensagem.value =
      MENSAGENS_DOS_FILTROS_WHATSAPP[filtroAtual()] ||
      MENSAGEM_PADRAO_WHATSAPP;
    mostrarClientesManuais();
    atualizarResumo();
    reiniciarFilaDeEnvio();
    status.textContent = "";
  });
  pesquisa.addEventListener("input", mostrarClientesManuais);
  textoMensagem.addEventListener("input", reiniciarFilaDeEnvio);
  campo.querySelector(".botao-remover-campo-whatsapp").addEventListener("click", () => campo.remove());
  botaoEnviar.addEventListener("click", () => {
    if (!filaDeEnvio.length || indiceDaFila >= filaDeEnvio.length) {
      filaDeEnvio = clientesDoFiltro().filter((cliente) =>
        criarLinkWhatsAppDoCliente(cliente)
      );
      indiceDaFila = 0;
    }

    if (!filaDeEnvio.length) {
      status.textContent = "Selecione pelo menos um cliente com celular.";
      return;
    }
    if (!textoMensagem.value.trim()) {
      status.textContent = "Digite a mensagem que será enviada.";
      return;
    }

    const cliente = filaDeEnvio[indiceDaFila];
    if (!abrirConversaDoCliente(cliente)) return;

    indiceDaFila += 1;
    const restantes = filaDeEnvio.length - indiceDaFila;

    if (restantes > 0) {
      status.textContent = `Conversa de ${cliente.nome} aberta. Depois de enviar, clique para abrir o próximo cliente.`;
      botaoEnviar.textContent = `Abrir próximo (${restantes})`;
      return;
    }

    status.textContent = `Conversa de ${cliente.nome} aberta. Todos os clientes selecionados foram encaminhados.`;
    reiniciarFilaDeEnvio();
  });

  camposMensagensWhatsApp.appendChild(campo);
  mostrarClientesManuais();
  atualizarResumo();
  campo.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function abrirTelaWhatsApp() {
  if (tipoUsuario === "barbeiro") return;

  esconderTodasAsTelas();
  telaWhatsApp.classList.remove("escondida");
  marcarBotaoAtivo("WhatsApp");
  try {
    const [, respostaAgendamentos] = await Promise.all([
      carregarClientes(),
      getDocs(collection(db, "agendamentos")),
      carregarPlanos()
    ]);
    agendamentosWhatsApp = respostaAgendamentos.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));
    mostrarListaRapidaWhatsApp();
  } catch (erro) {
    console.log("Erro ao carregar dados do WhatsApp:", erro);
  }
}

botaoAdicionarMensagemWhatsApp?.addEventListener("click", criarCampoMensagemWhatsApp);

/* =========================================================
   SINCRONIZAÇÃO DO TEMA
========================================================= */

onSnapshot(
  configuracaoGeral,

  (documento) => {
    const configuracoes =
      documento.exists()
        ? documento.data()
        : {};

    aplicarTema("claro");

    localStorage.setItem(
      "temaSistema",
      "claro"
    );

    if (
      !telaRelatorio.classList.contains(
        "escondida"
      )
    ) {
      if (
        conteudoRelatorioFinanceiro &&
        !conteudoRelatorioFinanceiro.classList.contains(
          "escondida"
        )
      ) {
        atualizarFinanceiro();
      } else if (
        conteudoRelatorioHistorico &&
        !conteudoRelatorioHistorico.classList.contains(
          "escondida"
        )
      ) {
        atualizarHistoricoFinanceiro();
      } else if (
        conteudoRelatorioProdutosDiarios &&
        !conteudoRelatorioProdutosDiarios.classList.contains("escondida")
      ) {
        atualizarProdutosDiarios();
      } else {
        atualizarRelatorio();
      }
    }
  },

  (erro) => {
    console.log(
      "Erro ao carregar configurações:",
      erro
    );

    aplicarTema("claro");
  }
);

/* =========================================================
   ZOOM
========================================================= */

function atualizarBotoesZoom() {
  botaoDiminuirZoom.disabled =
    zoomAgenda <=
    ZOOM_MINIMO;

  botaoAumentarZoom.disabled =
    zoomAgenda >=
    ZOOM_MAXIMO;
}

function alterarZoom(valor) {
  const novoZoom =
    Math.min(
      ZOOM_MAXIMO,
      Math.max(
        ZOOM_MINIMO,
        zoomAgenda +
          valor
      )
    );

  if (
    novoZoom ===
    zoomAgenda
  ) {
    return;
  }

  const horizontal =
    agendaScroll.scrollLeft;

  const vertical =
    agendaScroll.scrollTop;

  zoomAgenda =
    Number(
      novoZoom.toFixed(
        2
      )
    );

  mostrarAgenda();

  agendaScroll.scrollLeft =
    horizontal;

  agendaScroll.scrollTop =
    vertical;

  atualizarBotoesZoom();
}

botaoDiminuirZoom.addEventListener(
  "click",
  () => {
    alterarZoom(
      -PASSO_ZOOM
    );
  }
);

botaoAumentarZoom.addEventListener(
  "click",
  () => {
    alterarZoom(
      PASSO_ZOOM
    );
  }
);

/* =========================================================
   FECHAR MODAIS
========================================================= */

document
  .querySelectorAll(
    "[data-fechar]"
  )
  .forEach(
    (botao) => {
      botao.addEventListener(
        "click",
        () => {
          fecharModal(
            botao.dataset.fechar
          );
        }
      );
    }
  );

/* =========================================================
   SAIR
========================================================= */

if (
  botaoConfirmarSair
) {
  botaoConfirmarSair.addEventListener(
    "click",
    async () => {
      await encerrarSessao();
    }
  );
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function iniciarDashboard() {
  montarMenu();

  configurarBotaoVoltarDoCelular();

  criarPrimeirosDias();

  atualizarBotoesZoom();

  boasVindas.textContent =
    `Boas-vindas, ${nomeUsuario}!`;

  try {
    await carregarBarbeiros();

    if (
      usuarioPodeVisualizarTodasAgendas()
    ) {
      escolherBarbeiro.classList.add(
        "ativo"
      );

      preencherSelectDeBarbeiros();

      textoAgenda.textContent =
        "Escolha um profissional para ver a agenda.";

      barbeiroAtual =
        "";

      iniciarEscutaAgendamentosTempoReal();

      agendamentos =
        [];

      mostrarAgenda();
    } else {
      escolherBarbeiro.classList.remove(
        "ativo"
      );

      barbeiroAtual =
        nomeUsuario;

      textoAgenda.textContent =
        `Profissional ${barbeiroAtual} vai atender.`;

      await atualizarAgenda();

      iniciarEscutaAgendamentosTempoReal();
    }
  } catch (erro) {
    textoAgenda.textContent =
      "Não foi possível conectar ao Firebase.";

    console.log(
      "Erro ao iniciar o dashboard:",
      erro
    );
  }
}

function adicionarCampoServico() {

  const container =
    document.querySelector(
      "#container-servicos-atendimento"
    );

  const linha =
    document.createElement("div");

  linha.className =
    "linha-selecao-atendimento";


  const select =
    document.createElement("select");

  select.className =
    "select-servico-atendimento";


  select.innerHTML = `
    <option value="">
      Selecione outro serviço
    </option>
  `;


  servicos.forEach((servico) => {

    const opcao =
      document.createElement("option");

    opcao.value =
      servico.id;

    opcao.textContent =
      `${servico.nome} — ${formatarValorEmReal(servico.valor)}`;

    select.appendChild(
      opcao
    );
  });


  const remover =
    document.createElement("button");

  remover.type =
    "button";

  remover.className =
    "botao-remover-item-atendimento";

  remover.textContent =
    "×";


  select.addEventListener("change", () => {
    valorServicosInformadoBarbeiro = null;
    valorTotalAtendimentoEditado = false;
    atualizarValoresConclusao();
  });


  remover.addEventListener(
    "click",
    () => {

      linha.remove();

      valorServicosInformadoBarbeiro = null;
      valorTotalAtendimentoEditado = false;
      atualizarValoresConclusao();
    }
  );


  linha.append(
    select,
    remover
  );


  container.appendChild(
    linha
  );
}

function adicionarCampoProduto() {

  const container =
    document.querySelector(
      "#container-produtos-atendimento"
    );

  const linha =
    document.createElement("div");

  linha.className =
    "linha-selecao-atendimento";


  const select =
    document.createElement("select");

  select.className =
    "select-produto-atendimento";


  select.innerHTML = `
    <option value="">
      Selecione outro produto
    </option>
  `;


  produtos.forEach((produto) => {

    const opcao =
      document.createElement("option");

    opcao.value =
      produto.id;

    opcao.textContent =
      `${produto.nome} — ${formatarValorEmReal(produto.valor)}`;

    select.appendChild(
      opcao
    );
  });


  const remover =
    document.createElement("button");

  remover.type =
    "button";

  remover.className =
    "botao-remover-item-atendimento";

  remover.textContent =
    "×";


  select.addEventListener(
    "change",
    atualizarValoresConclusao
  );


  remover.addEventListener(
    "click",
    () => {

      linha.remove();

      atualizarValoresConclusao();
    }
  );


  linha.append(
    select,
    remover
  );


  container.appendChild(
    linha
  );
}

document
  .querySelector(
    "#adicionar-servico-atendimento"
  )
  .addEventListener(
    "click",
    adicionarCampoServico
  );


document
  .querySelector(
    "#adicionar-produto-atendimento"
  )
  .addEventListener(
    "click",
    adicionarCampoProduto
  );

/* =========================================================
   EVENTOS DOS PLANOS
========================================================= */

if (botaoMostrarCadastroPlano) {
  botaoMostrarCadastroPlano.addEventListener("click", async () => {
    limparFormularioPlano();
    await carregarServicos();
    preencherServicosDoPlano();
    formCadastroPlano.classList.toggle("escondida");
  });
}

if (cancelarEdicaoPlano) {
  cancelarEdicaoPlano.addEventListener("click", () => {
    limparFormularioPlano();
    formCadastroPlano.classList.add("escondida");
  });
}

if (valorNovoPlano) {
  valorNovoPlano.addEventListener("input", () => {
    formatarCampoValor(valorNovoPlano);
  });
}

if (pesquisaPlano) {
  pesquisaPlano.addEventListener("input", mostrarListaDePlanos);
}

if (formCadastroPlano) {
  formCadastroPlano.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagemPlano.textContent = "";

    if (!usuarioPodeGerenciarPlanos()) {
      mensagemPlano.textContent = "Você não tem permissão para alterar planos.";
      return;
    }

    const valor = converterValorParaNumero(valorNovoPlano.value);
    const servicoId = servicoNovoPlano.value;
    const usosMensais = Number(usosNovoPlano.value);
    const servico = servicos.find((item) => item.id === servicoId);
    const nome = servico?.nome?.trim() || "";

    if (!nome || valor <= 0 || !servico || !Number.isInteger(usosMensais) || usosMensais <= 0) {
      mensagemPlano.textContent = "Preencha corretamente os dados do plano.";
      return;
    }

    const idEdicao = planoIdEdicao.value;
    const planoAnterior = planos.find((plano) => plano.id === idEdicao);

    const dados = {
      nome,
      valor,
      servicoId: servico.id,
      servicoNome: servico.nome,
      usosMensais,
      clientesIds: Array.isArray(planoAnterior?.clientesIds)
        ? planoAnterior.clientesIds
        : [],
      clientesPlano: Array.isArray(planoAnterior?.clientesPlano)
        ? planoAnterior.clientesPlano
        : [],
      ativo: true,
      atualizadoEm: Date.now()
    };

    try {
      if (idEdicao) {
        await updateDoc(doc(db, "planos", idEdicao), dados);
        mensagemPlano.textContent = "Plano atualizado com sucesso.";
      } else {
        await addDoc(collection(db, "planos"), {
          ...dados,
          dataCadastro: Date.now(),
          criadoPor: nomeUsuario
        });
        mensagemPlano.textContent = "Plano criado com sucesso.";
      }

      await carregarPlanos();
      mostrarListaDePlanos();
      limparFormularioPlano();
      formCadastroPlano.classList.add("escondida");
    } catch (erro) {
      console.log("Erro ao salvar plano:", erro);
      mensagemPlano.textContent = "Não foi possível salvar o plano.";
    }
  });
}

if (botaoPlanoSemExtras) {
  botaoPlanoSemExtras.addEventListener("click", async () => {
    if (perguntaExtrasPlanoAbertaPeloBarbeiro) {
      perguntaExtrasPlanoAbertaPeloBarbeiro = false;
      fecharModal("modal-extras-plano");
      await abrirFormularioRegistroServicosBarbeiro();
      formRegistrarServicos?.requestSubmit();
      return;
    }

    await finalizarAtendimentoSomentePlano();
  });
}

window.addEventListener("beforeunload", () => {
  cancelarEscutaAgendamentos?.();
});

if (botaoPlanoComExtras) {
  botaoPlanoComExtras.addEventListener("click", async () => {
    if (perguntaExtrasPlanoAbertaPeloBarbeiro) {
      perguntaExtrasPlanoAbertaPeloBarbeiro = false;
      fecharModal("modal-extras-plano");
      await abrirFormularioRegistroServicosBarbeiro();
      return;
    }

    atendimentoPeloPlano = true;
    atendimentoPlanoComExtras = true;
    fecharModal("modal-extras-plano");
    await abrirConclusaoAtendimento(true);
  });
}

iniciarDashboard();
