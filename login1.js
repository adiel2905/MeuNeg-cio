import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const $ = (seletor) => document.querySelector(seletor);
const etapaLogin = $("#etapa-login-estabelecimento");
const etapaTipos = $("#etapa-tipo-usuario");
const etapaProfissionais = $("#etapa-barbeiros");
const etapaSenha = $("#etapa-senha");
const etapas = [etapaLogin, etapaTipos, etapaProfissionais, etapaSenha];
const formLogin = $("#login-form");
const emailInput = $("#email");
const passwordInput = $("#password");
const formMessage = $("#form-message");
const formInterno = $("#login-interno-form");
const passwordInterno = $("#password-interno");
const confirmarSenha = $("#confirmar-senha-interna");
const campoConfirmar = $("#campo-confirmar-senha-interna");
const mensagemInterna = $("#mensagem-login-interno");
let perfilConta = null;
let configuracoes = {};
let profissionais = [];
let usuarioSelecionado = null;

function mostrar(etapa) {
  etapas.forEach((item) => item?.classList.toggle("escondida", item !== etapa));
}

function traduzirErro(codigo) {
  if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(codigo)) return "E-mail ou senha incorretos.";
  if (codigo === "auth/invalid-email") return "Digite um e-mail válido.";
  if (codigo === "auth/too-many-requests") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (codigo === "auth/network-request-failed") return "Não foi possível conectar. Confira sua internet.";
  return "Não foi possível entrar. Tente novamente.";
}

async function carregarConta(usuario) {
  const perfilSnapshot = await getDoc(doc(db, "usuarios", usuario.uid));
  if (!perfilSnapshot.exists()) throw new Error("perfil-nao-encontrado");
  const perfil = perfilSnapshot.data();
  if (perfil.ativo !== true) throw new Error("usuario-inativo");
  if (!perfil.estabelecimentoId) throw new Error("estabelecimento-nao-vinculado");
  perfilConta = { ...perfil, uid: usuario.uid, email: perfil.email || usuario.email || "" };

  const raiz = ["estabelecimentos", perfil.estabelecimentoId];
  const [configSnapshot, profissionaisSnapshot] = await Promise.all([
    getDoc(doc(db, ...raiz, "configuracoes", "geral")),
    getDocs(collection(db, ...raiz, "barbeiros"))
  ]);
  configuracoes = configSnapshot.exists() ? configSnapshot.data() : {};
  profissionais = profissionaisSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.ativo !== false)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}

function selecionarUsuario(usuario) {
  usuarioSelecionado = usuario;
  const primeiroAcesso = usuario.tipo === "administrador" && !usuario.senha;
  $("#tipo-usuario-selecionado").textContent = usuario.tipo === "administrador" ? "Administrador" : "Profissional";
  $("#nome-usuario-selecionado").textContent = usuario.nome;
  $("#instrucao-senha-interna").textContent = primeiroAcesso
    ? "Este é o primeiro acesso. Crie e confirme a senha interna do Administrador."
    : "Digite a senha deste usuário para continuar.";
  campoConfirmar.classList.toggle("escondida", !primeiroAcesso);
  confirmarSenha.required = primeiroAcesso;
  $("#botao-entrar-interno").firstChild.textContent = primeiroAcesso ? "Criar senha e entrar " : "Entrar ";
  formInterno.reset();
  mensagemInterna.textContent = "";
  mostrar(etapaSenha);
  passwordInterno.focus();
}

function listarProfissionais() {
  const lista = $("#lista-barbeiros");
  lista.innerHTML = "";
  $("#mensagem-barbeiros").textContent = "";
  if (!profissionais.length) {
    lista.innerHTML = '<p class="carregando">Nenhum profissional cadastrado ainda.</p>';
    return;
  }
  profissionais.forEach((profissional) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-barbeiro";
    const inicial = document.createElement("span");
    inicial.className = "inicial-barbeiro";
    inicial.textContent = (profissional.nome || "P").trim().charAt(0).toUpperCase();
    const nome = document.createElement("strong");
    nome.textContent = profissional.nome || "Profissional";
    botao.append(inicial, nome);
    botao.addEventListener("click", () => selecionarUsuario({
      id: profissional.id, nome: profissional.nome || "Profissional", tipo: "barbeiro", senha: profissional.senha || ""
    }));
    lista.appendChild(botao);
  });
}

function listarUsuariosNaEntrada() {
  const lista = $("#opcoes-profissionais-login");
  lista.innerHTML = "";
  profissionais.forEach((profissional) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-tipo";
    botao.innerHTML = `
      <span class="icone-usuario">P</span>
      <span class="texto-botao">
        <strong></strong>
        <small>Entrar como profissional</small>
      </span>
      <span class="seta">→</span>
    `;
    botao.querySelector("strong").textContent = profissional.nome || "Profissional";
    botao.addEventListener("click", () => selecionarUsuario({
      id: profissional.id,
      nome: profissional.nome || "Profissional",
      tipo: "barbeiro",
      senha: profissional.senha || ""
    }));
    lista.appendChild(botao);
  });
}

function entrarNoPainel() {
  sessionStorage.setItem("nomeUsuario", usuarioSelecionado.nome);
  sessionStorage.setItem("tipoUsuario", usuarioSelecionado.tipo);
  sessionStorage.setItem("usuarioId", usuarioSelecionado.id);
  sessionStorage.setItem("estabelecimentoId", perfilConta.estabelecimentoId);
  sessionStorage.setItem("emailUsuario", perfilConta.email);
  window.location.href = "dashboard.html";
}

$("#toggle-password")?.addEventListener("click", () => {
  const visivel = passwordInput.type === "text";
  passwordInput.type = visivel ? "password" : "text";
  $("#toggle-password").classList.toggle("is-visible", !visivel);
  $("#toggle-password").setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
  passwordInput.focus();
});

formLogin?.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "Confirmando acesso...";
  formMessage.dataset.state = "loading";
  try {
    const credencial = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    await carregarConta(credencial.user);
    listarUsuariosNaEntrada();
    formMessage.textContent = "";
    passwordInput.value = "";
    mostrar(etapaTipos);
  } catch (erro) {
    console.error("Falha no login:", erro);
    await signOut(auth).catch(() => {});
    perfilConta = null;
    const mensagens = {
      "perfil-nao-encontrado": "Seu login ainda não possui cadastro no sistema.",
      "usuario-inativo": "Este usuário está inativo.",
      "estabelecimento-nao-vinculado": "Seu usuário não está vinculado a um estabelecimento."
    };
    formMessage.dataset.state = "error";
    formMessage.textContent = mensagens[erro.message] || traduzirErro(erro.code);
    passwordInput.value = "";
    passwordInput.focus();
  }
});

$("#botao-tipo-administrador")?.addEventListener("click", () => selecionarUsuario({
  id: perfilConta.uid,
  nome: "Administrador",
  tipo: "administrador",
  senha: configuracoes.senhaAdministrador || ""
}));
$("#voltar-tipos")?.addEventListener("click", () => mostrar(etapaTipos));
$("#voltar-selecao")?.addEventListener("click", () => mostrar(etapaTipos));

formInterno?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const senha = passwordInterno.value.trim();
  mensagemInterna.textContent = "";
  if (senha.length < 4) {
    mensagemInterna.textContent = "A senha precisa ter pelo menos 4 caracteres.";
    return;
  }
  const primeiroAcesso = usuarioSelecionado.tipo === "administrador" && !usuarioSelecionado.senha;
  if (primeiroAcesso) {
    if (senha !== confirmarSenha.value.trim()) {
      mensagemInterna.textContent = "As duas senhas não são iguais.";
      return;
    }
    try {
      await setDoc(doc(db, "estabelecimentos", perfilConta.estabelecimentoId, "configuracoes", "geral"), { senhaAdministrador: senha }, { merge: true });
      usuarioSelecionado.senha = senha;
      entrarNoPainel();
    } catch (erro) {
      console.error("Falha ao criar a senha do administrador:", erro);
      mensagemInterna.textContent = "Não foi possível criar a senha. Tente novamente.";
    }
    return;
  }
  if (senha !== usuarioSelecionado.senha) {
    mensagemInterna.textContent = "Senha incorreta.";
    passwordInterno.value = "";
    passwordInterno.focus();
    return;
  }
  entrarNoPainel();
});

sessionStorage.clear();
mostrar(etapaLogin);
onAuthStateChanged(auth, async (usuario) => {
  if (!usuario || perfilConta) return;
  try {
    await carregarConta(usuario);
    listarUsuariosNaEntrada();
    mostrar(etapaTipos);
  } catch {
    await signOut(auth).catch(() => {});
    perfilConta = null;
    mostrar(etapaLogin);
  }
});

const PALETAS_DISPONIVEIS = ["verde", "azul", "marinho", "grafite", "amarelo", "laranja", "vermelho", "lilas"];
function aplicarPaleta(nomePaleta) {
  const paleta = PALETAS_DISPONIVEIS.includes(nomePaleta) ? nomePaleta : "verde";
  document.body.dataset.paleta = paleta;
  localStorage.setItem("meunegocio-paleta", paleta);
  document.querySelectorAll(".cor-paleta").forEach((botao) => {
    const ativa = botao.dataset.paleta === paleta;
    botao.classList.toggle("ativa", ativa);
    botao.setAttribute("aria-pressed", String(ativa));
  });
}
document.querySelectorAll(".cor-paleta").forEach((botao) => botao.addEventListener("click", () => aplicarPaleta(botao.dataset.paleta)));
aplicarPaleta(localStorage.getItem("meunegocio-paleta") || "verde");
