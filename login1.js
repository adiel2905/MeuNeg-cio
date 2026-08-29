import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const etapaTipoUsuario = document.querySelector("#etapa-tipo-usuario");
const etapaBarbeiros = document.querySelector("#etapa-barbeiros");
const etapaSenha = document.querySelector("#etapa-senha");
const tipoUsuarioSelecionado = document.querySelector("#tipo-usuario-selecionado");
const nomeUsuarioSelecionado = document.querySelector("#nome-usuario-selecionado");
const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#toggle-password");
const formMessage = document.querySelector("#form-message");
const botaoVoltarSelecao = document.querySelector("#voltar-selecao");

function mostrarLogin() {
  etapaTipoUsuario?.classList.add("escondida");
  etapaBarbeiros?.classList.add("escondida");
  etapaSenha?.classList.remove("escondida");
  tipoUsuarioSelecionado.textContent = "Acesso seguro";
  nomeUsuarioSelecionado.textContent = "MeuNegócio";
  botaoVoltarSelecao?.classList.add("escondida");
}

function traduzirErroLogin(codigo) {
  if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(codigo)) {
    return "E-mail ou senha incorretos.";
  }
  if (codigo === "auth/invalid-email") return "Digite um e-mail válido.";
  if (codigo === "auth/too-many-requests") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (codigo === "auth/network-request-failed") return "Não foi possível conectar. Confira sua internet.";
  return "Não foi possível entrar. Tente novamente.";
}

async function carregarPerfil(usuario) {
  const perfilSnapshot = await getDoc(doc(db, "usuarios", usuario.uid));
  if (!perfilSnapshot.exists()) throw new Error("perfil-nao-encontrado");

  const perfil = perfilSnapshot.data();
  if (perfil.ativo !== true) throw new Error("usuario-inativo");
  if (!perfil.estabelecimentoId) throw new Error("estabelecimento-nao-vinculado");

  sessionStorage.setItem("nomeUsuario", perfil.nome || usuario.email || "Usuário");
  sessionStorage.setItem("tipoUsuario", perfil.cargo || "usuario");
  sessionStorage.setItem("usuarioId", usuario.uid);
  sessionStorage.setItem("estabelecimentoId", perfil.estabelecimentoId);
  sessionStorage.setItem("emailUsuario", perfil.email || usuario.email || "");
}

togglePassword?.addEventListener("click", () => {
  const estaVisivel = passwordInput.type === "text";
  passwordInput.type = estaVisivel ? "password" : "text";
  togglePassword.classList.toggle("is-visible", !estaVisivel);
  togglePassword.setAttribute("aria-label", estaVisivel ? "Mostrar senha" : "Ocultar senha");
  passwordInput.focus();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "Entrando...";
  formMessage.dataset.state = "loading";

  try {
    const credencial = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );
    await carregarPerfil(credencial.user);
    window.location.href = "dashboard.html";
  } catch (erro) {
    console.error("Falha no login:", erro);
    await signOut(auth).catch(() => {});
    sessionStorage.clear();

    const mensagens = {
      "perfil-nao-encontrado": "Seu login ainda não possui cadastro no sistema.",
      "usuario-inativo": "Este usuário está inativo.",
      "estabelecimento-nao-vinculado": "Seu usuário não está vinculado a um estabelecimento."
    };
    formMessage.dataset.state = "error";
    formMessage.textContent = mensagens[erro.message] || traduzirErroLogin(erro.code);
    passwordInput.value = "";
    passwordInput.focus();
  }
});

sessionStorage.clear();
mostrarLogin();

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) return;
  try {
    await carregarPerfil(usuario);
    window.location.href = "dashboard.html";
  } catch {
    await signOut(auth).catch(() => {});
    sessionStorage.clear();
  }
});
