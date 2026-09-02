import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const EMAIL_MASTER = "adiel.moreirabezerra1@gmail.com";
const acesso = document.querySelector("#acesso-master");
const painel = document.querySelector("#painel-master");
const form = document.querySelector("#form-master");
const mensagem = document.querySelector("#mensagem-master");
const botaoEntrar = document.querySelector("#entrar-master");
let pararEscuta = null;

function escapar(texto) {
  const elemento = document.createElement("span");
  elemento.textContent = String(texto || "");
  return elemento.innerHTML;
}

function dataCadastro(valor) {
  const data = valor?.toDate?.();
  return data ? data.toLocaleDateString("pt-BR") : "Agora";
}

function abrirPainel() {
  acesso.classList.add("escondido");
  painel.classList.remove("escondido");

  pararEscuta?.();
  const consulta = query(collection(db, "solicitacoesCadastro"), orderBy("criadoEm", "desc"));
  pararEscuta = onSnapshot(consulta, (resposta) => {
    const solicitacoes = resposta.docs.map((item) => ({ id: item.id, ...item.data() }));
    document.querySelector("#quantidade-pendentes").textContent =
      solicitacoes.filter((item) => item.status === "pendente").length;
    document.querySelector("#quantidade-aprovados").textContent =
      solicitacoes.filter((item) => item.status === "aprovado").length;
    document.querySelector("#quantidade-total").textContent = solicitacoes.length;
    document.querySelector("#status-lista").textContent =
      solicitacoes.length ? `${solicitacoes.length} cadastro(s)` : "Nenhuma solicitação";

    document.querySelector("#lista-solicitacoes").innerHTML = solicitacoes.length
      ? solicitacoes.map((item) => `
        <article class="solicitacao">
          <div>
            <h3>${escapar(item.nomeEstabelecimento)}</h3>
            <p>${escapar(item.tipoEstabelecimento)}</p>
          </div>
          <div>
            <p><strong>${escapar(item.nomeAdministrador)}</strong></p>
            <p>${escapar(item.email)} · ${dataCadastro(item.criadoEm)}</p>
          </div>
          <span class="etiqueta">${escapar(item.status || "pendente")}</span>
        </article>
      `).join("")
      : "<p>Nenhuma solicitação de cadastro recebida ainda.</p>";
  }, (erro) => {
    console.error("Erro ao carregar solicitações:", erro);
    document.querySelector("#status-lista").textContent = "Não foi possível carregar";
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.textContent = "";

  const senha = document.querySelector("#senha-master").value;
  const confirmacao = document.querySelector("#confirmar-senha-master").value;
  const email = document.querySelector("#email-master").value.trim().toLowerCase();

  if (email !== EMAIL_MASTER) {
    mensagem.textContent = "Este e-mail não possui autorização para acessar o Controle Master.";
    document.querySelector("#email-master").focus();
    return;
  }

  if (senha !== confirmacao) {
    mensagem.textContent = "A senha e a confirmação precisam ser iguais.";
    document.querySelector("#confirmar-senha-master").focus();
    return;
  }

  botaoEntrar.disabled = true;
  botaoEntrar.textContent = "Verificando acesso...";

  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    if (credencial.user.email?.toLowerCase() !== EMAIL_MASTER) {
      throw new Error("acesso-negado");
    }
    abrirPainel();
  } catch (erro) {
    console.error("Falha no acesso Master:", erro);
    await signOut(auth).catch(() => {});
    mensagem.textContent = "Senha mestre incorreta ou conta Master ainda não configurada.";
    botaoEntrar.disabled = false;
    botaoEntrar.innerHTML = "Acessar Controle Master <span>→</span>";
  }
});

document.querySelector("#sair-master").addEventListener("click", async () => {
  pararEscuta?.();
  await signOut(auth);
  window.location.href = "index.html";
});

// Sempre exige novamente a senha e a confirmação ao abrir esta página.
await signOut(auth).catch(() => {});
