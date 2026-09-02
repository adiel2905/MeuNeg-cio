import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const listaBarbeiros = document.querySelector("#lista-barbeiros");
const mensagem = document.querySelector("#mensagem");
const botaoAdministrador = document.querySelector(".administrador");

function entrarNoDashboard(nome, tipo) {
  sessionStorage.setItem("nomeUsuario", nome);
  sessionStorage.setItem("tipoUsuario", tipo);

  window.location.href = "dashboard.html";
}

async function mostrarBarbeiros() {
  listaBarbeiros.innerHTML = "";

  try {
    const resposta = await getDocs(collection(db, "barbeiros"));

    if (resposta.empty) {
      listaBarbeiros.innerHTML = "<p>Nenhum barbeiro cadastrado ainda.</p>";
      return;
    }

    resposta.forEach((documento) => {
      const barbeiro = documento.data();

      const botao = document.createElement("button");

      botao.type = "button";
      botao.className = "botao-usuario";
      botao.textContent = barbeiro.nome;

      botao.addEventListener("click", () => {
        entrarNoDashboard(barbeiro.nome, "barbeiro");
      });

      listaBarbeiros.appendChild(botao);
    });
  } catch (erro) {
    mensagem.textContent = "Não foi possível carregar os barbeiros.";
    console.log(erro);
  }
}

botaoAdministrador.addEventListener("click", () => {
  entrarNoDashboard("Administrador", "administrador");
});

mostrarBarbeiros();
``