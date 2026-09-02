import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  doc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const form = document.querySelector("#form-cadastro");
const tipoEstabelecimento = document.querySelector("#tipo-estabelecimento");
const campoOutroTipo = document.querySelector("#campo-outro-tipo");
const outroTipo = document.querySelector("#outro-tipo");
const mensagem = document.querySelector("#mensagem-cadastro");
const botaoEnviar = document.querySelector("#enviar-cadastro");

tipoEstabelecimento.addEventListener("change", () => {
  const escolheuOutro = tipoEstabelecimento.value === "outro";
  campoOutroTipo.classList.toggle("escondido", !escolheuOutro);
  outroTipo.required = escolheuOutro;
  if (!escolheuOutro) outroTipo.value = "";
});

function traduzirErro(erro) {
  const codigo = erro?.code || "";
  if (codigo.includes("email-already-in-use")) return "Este e-mail já possui um cadastro.";
  if (codigo.includes("invalid-email")) return "Digite um e-mail válido.";
  if (codigo.includes("weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (codigo.includes("network-request-failed")) return "Não foi possível conectar. Confira sua internet.";
  if (codigo.includes("permission-denied")) return "O cadastro ainda não está liberado no servidor.";
  return "Não foi possível enviar a solicitação. Tente novamente.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.classList.remove("sucesso");
  mensagem.textContent = "";

  const senha = document.querySelector("#senha-cadastro").value;
  const repetirSenha = document.querySelector("#repetir-senha").value;

  if (senha !== repetirSenha) {
    mensagem.textContent = "As duas senhas precisam ser iguais.";
    document.querySelector("#repetir-senha").focus();
    return;
  }

  botaoEnviar.disabled = true;
  botaoEnviar.textContent = "Enviando solicitação...";

  try {
    const email = document.querySelector("#email-cadastro").value.trim().toLowerCase();
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    const tipo = tipoEstabelecimento.value === "outro"
      ? outroTipo.value.trim()
      : tipoEstabelecimento.options[tipoEstabelecimento.selectedIndex].text;

    await setDoc(doc(db, "solicitacoesCadastro", credencial.user.uid), {
      uid: credencial.user.uid,
      email,
      nomeAdministrador: document.querySelector("#nome-administrador").value.trim(),
      nomeEstabelecimento: document.querySelector("#nome-estabelecimento").value.trim(),
      tipoEstabelecimento: tipo,
      status: "pendente",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    await signOut(auth);
    form.reset();
    campoOutroTipo.classList.add("escondido");
    mensagem.classList.add("sucesso");
    mensagem.textContent = "Solicitação enviada! Agora aguarde a aprovação do administrador.";
    botaoEnviar.textContent = "Solicitação enviada ✓";
  } catch (erro) {
    console.error("Erro no cadastro:", erro);
    await signOut(auth).catch(() => {});
    mensagem.textContent = traduzirErro(erro);
    botaoEnviar.disabled = false;
    botaoEnviar.innerHTML = "Enviar solicitação <span>→</span>";
  }
});

