/* =========================================================
   Garrafeira Campelo — comportamento da página
   Depende de VINHOS, definido em js/vinhos.js
   ========================================================= */

(function () {
  "use strict";

  const TIPOS = ["todos", "tinto", "branco", "rosé", "espumante", "fortificado"];

  const lista = document.getElementById("lista-vinhos");
  const filtros = document.querySelector(".filters");
  const semResultados = document.getElementById("sem-resultados");

  let filtroAtivo = "todos";

  /* ---------- Catálogo ---------- */

  function precoFormatado(valor) {
    return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
  }

  function criarCartao(vinho) {
    const card = document.createElement("article");
    card.className = "card";

    const badge = vinho.destaque
      ? `<span class="badge">${vinho.destaque}</span>`
      : "";

    card.innerHTML = `
      <div class="card-top">
        ${badge}
        <div class="bottle" style="--cor-vinho: ${vinho.cor}" role="img"
             aria-label="Garrafa de ${vinho.nome}"></div>
      </div>
      <div class="card-body">
        <p class="card-region">${vinho.regiao} · ${vinho.tipo}</p>
        <h3 class="card-name">${vinho.nome}</h3>
        <p class="card-note">${vinho.nota}</p>
        <div class="card-foot">
          <span class="price">${precoFormatado(vinho.preco)}</span>
          <span class="vintage">Colheita ${vinho.ano}</span>
        </div>
      </div>
    `;
    return card;
  }

  function desenharLista() {
    const visiveis = filtroAtivo === "todos"
      ? VINHOS
      : VINHOS.filter(v => v.tipo === filtroAtivo);

    lista.replaceChildren(...visiveis.map(criarCartao));
    semResultados.hidden = visiveis.length > 0;
  }

  function desenharFiltros() {
    TIPOS.forEach(tipo => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      btn.setAttribute("aria-pressed", String(tipo === filtroAtivo));

      btn.addEventListener("click", () => {
        filtroAtivo = tipo;
        filtros.querySelectorAll(".chip").forEach(c =>
          c.setAttribute("aria-pressed", String(c === btn))
        );
        desenharLista();
      });

      filtros.appendChild(btn);
    });
  }

  /* ---------- Menu em ecrãs pequenos ---------- */

  function ligarMenu() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const aberto = nav.classList.toggle("aberto");
      toggle.setAttribute("aria-expanded", String(aberto));
    });

    // Fecha o menu ao escolher uma secção
    nav.addEventListener("click", e => {
      if (e.target.tagName === "A") {
        nav.classList.remove("aberto");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Formulário de contacto ----------
     Validação no browser apenas. Para receber mensagens a sério
     é preciso um backend ou um serviço de formulários (ex.: Formspree,
     Netlify Forms). Ver o README.                                      */

  function ligarFormulario() {
    const form = document.getElementById("form-contacto");
    const nota = document.getElementById("form-nota");
    if (!form || !nota) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const campos = [...form.querySelectorAll("input, textarea")];
      let valido = true;

      campos.forEach(campo => {
        const ok = campo.checkValidity();
        campo.setAttribute("aria-invalid", String(!ok));
        if (!ok) valido = false;
      });

      if (!valido) {
        nota.textContent = "Preenche todos os campos com dados válidos.";
        return;
      }

      nota.textContent = "Obrigado! (Demo — o formulário ainda não envia nada.)";
      form.reset();
      campos.forEach(c => c.removeAttribute("aria-invalid"));
    });
  }

  /* ---------- Arranque ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof VINHOS === "undefined") {
      console.error("js/vinhos.js não foi carregado.");
      return;
    }
    desenharFiltros();
    desenharLista();
    ligarMenu();
    ligarFormulario();
  });
})();
