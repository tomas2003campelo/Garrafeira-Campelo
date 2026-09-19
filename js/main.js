/* =========================================================
   Garrafeira Campelo — comportamento do site
   Depende de: config.js, produtos.js, carrinho.js
   ========================================================= */

(function () {
  "use strict";

  const euros = Carrinho.euros;

  /* =======================================================
     1. PREENCHER OS DADOS DO NEGÓCIO
     Tudo o que tenha data-config="campo" recebe o valor
     correspondente do config.js.
     ======================================================= */

  function valorDaConfig(caminho) {
    return caminho.split(".").reduce((obj, chave) => (obj || {})[chave], CONFIG);
  }

  function preencherConfig() {
    document.querySelectorAll("[data-config]").forEach(el => {
      const valor = valorDaConfig(el.dataset.config);
      if (valor === undefined || valor === null || valor === "") return;
      if (el.tagName === "A" && el.dataset.configHref) {
        el.href = el.dataset.configHref.replace("{valor}", valor);
      }
      el.textContent = valor;
    });

    // Links de telefone e email
    document.querySelectorAll("[data-tel]").forEach(el => { el.href = "tel:" + CONFIG.telefone.replace(/\s/g, ""); });
    document.querySelectorAll("[data-email]").forEach(el => { el.href = "mailto:" + CONFIG.email; });
    document.querySelectorAll("[data-whatsapp]").forEach(el => { el.href = "https://wa.me/" + CONFIG.telefoneLimpo; });

    // Morada completa
    const m = CONFIG.morada;
    document.querySelectorAll("[data-morada]").forEach(el => {
      el.innerHTML = `${m.rua}<br>${m.codigoPostal} ${m.localidade}<br>${m.pais}`;
    });

    // Link do Google Maps
    const consulta = encodeURIComponent(`${CONFIG.nome}, ${m.rua}, ${m.codigoPostal} ${m.localidade}`);
    document.querySelectorAll("[data-mapa]").forEach(el => {
      el.href = `https://www.google.com/maps/search/?api=1&query=${consulta}`;
    });

    // Redes sociais: esconde as que não estão preenchidas
    document.querySelectorAll("[data-rede]").forEach(el => {
      const url = CONFIG.redes[el.dataset.rede];
      if (url) el.href = url;
      else el.remove();
    });

    // Ano corrente no rodapé
    document.querySelectorAll("[data-ano]").forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function preencherHorario() {
    const alvo = document.querySelector("[data-horario]");
    if (!alvo) return;
    alvo.innerHTML = CONFIG.horario.map(d => `
      <tr>
        <th scope="row">${d.dia}</th>
        <td${d.horas ? "" : ' class="fechado"'}>${d.horas || "Encerrado"}</td>
      </tr>`).join("");
  }

  /* =======================================================
     2. NAVEGAÇÃO
     ======================================================= */

  function marcarPaginaAtual() {
    const atual = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach(a => {
      const destino = a.getAttribute("href");
      if (destino === atual) a.setAttribute("aria-current", "page");
    });
  }

  function ligarMenu() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const aberto = nav.classList.toggle("aberto");
      toggle.setAttribute("aria-expanded", String(aberto));
      toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });

    nav.addEventListener("click", e => {
      if (e.target.tagName === "A") {
        nav.classList.remove("aberto");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =======================================================
     3. ANIMAÇÕES DE ENTRADA
     Cada elemento com a classe "revelar" aparece quando
     entra no ecrã.
     ======================================================= */

  function ligarAnimacoes() {
    const alvos = document.querySelectorAll(".revelar");
    if (!alvos.length) return;

    // Se o browser não souber observar, mostra tudo já.
    if (!("IntersectionObserver" in window)) {
      alvos.forEach(el => el.classList.add("visivel"));
      return;
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visivel");
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    alvos.forEach(el => observador.observe(el));
  }

  /* =======================================================
     4. CARTÕES DE PRODUTO
     ======================================================= */

  function arteDoProduto(p) {
    if (p.imagem) {
      return `<img src="${p.imagem}" alt="${p.nome}" loading="lazy">`;
    }
    if (p.categoria === "cervejas") {
      return `<div class="lata" style="--cor-produto: ${p.cor}" role="img" aria-label="Lata de ${p.nome}"></div>`;
    }
    return `<div class="garrafa" style="--cor-produto: ${p.cor}" role="img" aria-label="Garrafa de ${p.nome}">
              <span class="rotulo"></span>
            </div>`;
  }

  function criarCartao(p) {
    const card = document.createElement("article");
    card.className = "card revelar" + (p.esgotado ? " esgotado" : "");

    const etiqueta = p.esgotado
      ? '<span class="badge badge-esgotado">Esgotado</span>'
      : (p.destaque ? `<span class="badge">${p.destaque}</span>` : "");

    const linhaMeta = [CATEGORIAS[p.categoria].nome, p.tipo].join(" · ");
    const anoTexto = p.ano ? ` · ${p.ano}` : "";

    card.innerHTML = `
      <div class="card-top">
        ${etiqueta}
        ${arteDoProduto(p)}
      </div>
      <div class="card-body">
        <p class="card-meta">${linhaMeta}</p>
        <h3 class="card-nome">${p.nome}</h3>
        <p class="card-produtor">${p.produtor} · ${p.regiao}${anoTexto}</p>
        <p class="card-desc">${p.descricao}</p>
        <div class="card-foot">
          <span class="preco-bloco">
            <span class="preco">${euros(p.preco)}</span>
            <span class="volume">${p.volume}</span>
          </span>
          <button class="btn-add" data-add="${p.id}" ${p.esgotado ? "disabled" : ""}>
            ${p.esgotado ? "Esgotado" : "Adicionar"}
          </button>
        </div>
      </div>`;
    return card;
  }

  /* Desenha uma lista de produtos dentro de um contentor */
  function desenharProdutos(contentor, produtos) {
    if (!produtos.length) {
      contentor.innerHTML = '<p class="vazio">Nenhum produto corresponde a este filtro.</p>';
      return;
    }
    contentor.replaceChildren(...produtos.map(criarCartao));
    ligarAnimacoes();
  }

  /* =======================================================
     5. PÁGINAS DE CATÁLOGO (vinhos.html, cervejas.html)
     ======================================================= */

  function ligarCatalogo() {
    const lista = document.getElementById("lista-produtos");
    if (!lista) return;

    // A página diz que categorias mostra: data-categorias="douro,verde,maduro"
    const permitidas = (lista.dataset.categorias || "").split(",").filter(Boolean);
    const doCatalogo = permitidas.length
      ? PRODUTOS.filter(p => permitidas.includes(p.categoria))
      : PRODUTOS;

    const filtros = document.querySelector(".filtros");
    let ativo = "todos";

    function aplicar() {
      const visiveis = ativo === "todos"
        ? doCatalogo
        : doCatalogo.filter(p => p.categoria === ativo || p.tipo === ativo);
      desenharProdutos(lista, visiveis);
    }

    if (filtros && permitidas.length > 1) {
      const botoes = [{ chave: "todos", nome: "Todos" }]
        .concat(permitidas.map(c => ({ chave: c, nome: CATEGORIAS[c].nome })));

      botoes.forEach(b => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = b.nome;
        btn.setAttribute("aria-pressed", String(b.chave === ativo));
        btn.addEventListener("click", () => {
          ativo = b.chave;
          filtros.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === btn)));
          aplicar();
        });
        filtros.appendChild(btn);
      });
    }

    // Permite chegar à página já com um filtro: vinhos.html#douro
    const ancora = location.hash.replace("#", "");
    if (ancora && permitidas.includes(ancora)) {
      ativo = ancora;
      const btn = [...(filtros?.querySelectorAll(".chip") || [])]
        .find(c => c.textContent === CATEGORIAS[ancora].nome);
      if (btn) filtros.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === btn)));
    }

    aplicar();
  }

  /* Destaques na página inicial */
  function ligarDestaques() {
    const lista = document.getElementById("lista-destaques");
    if (!lista) return;
    const quantos = parseInt(lista.dataset.quantos || "4", 10);
    const destaques = PRODUTOS.filter(p => p.destaque && !p.esgotado).slice(0, quantos);
    desenharProdutos(lista, destaques.length ? destaques : PRODUTOS.slice(0, quantos));
  }

  /* Contagem de produtos nos cartões de categoria da página inicial */
  function preencherContagens() {
    document.querySelectorAll("[data-conta-categoria]").forEach(el => {
      const cat = el.dataset.contaCategoria;
      const n = PRODUTOS.filter(p => p.categoria === cat).length;
      el.textContent = n === 1 ? "1 referência" : `${n} referências`;
    });
  }

  /* =======================================================
     6. PAINEL DO CARRINHO
     ======================================================= */

  function ligarCarrinho() {
    const painel = document.getElementById("painel-carrinho");
    const veu = document.getElementById("veu");
    const lista = document.getElementById("carrinho-lista");
    const fundo = document.getElementById("carrinho-fundo");
    if (!painel || !lista) return;

    function abrir() {
      painel.classList.add("aberto");
      veu.classList.add("aberto");
      document.body.classList.add("sem-scroll");
      painel.querySelector(".btn-fechar")?.focus();
    }

    function fechar() {
      painel.classList.remove("aberto");
      veu.classList.remove("aberto");
      document.body.classList.remove("sem-scroll");
    }

    document.querySelectorAll("[data-abrir-carrinho]").forEach(b => b.addEventListener("click", abrir));
    painel.querySelector(".btn-fechar")?.addEventListener("click", fechar);
    veu?.addEventListener("click", fechar);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && painel.classList.contains("aberto")) fechar();
    });

    function linhaHTML(l) {
      const p = l.produto;
      const arte = p.imagem
        ? `<img src="${p.imagem}" alt="">`
        : `<span class="linha-pilula" style="--cor-produto: ${p.cor}"></span>`;

      return `
        <div class="linha-item">
          <span class="linha-arte">${arte}</span>
          <div class="linha-info">
            <p class="linha-nome">${p.nome}</p>
            <p class="linha-meta">${p.volume} · ${euros(p.preco)}</p>
            <span class="qtd">
              <button type="button" data-menos="${p.id}" aria-label="Menos um ${p.nome}">−</button>
              <span>${l.qtd}</span>
              <button type="button" data-mais="${p.id}" aria-label="Mais um ${p.nome}">+</button>
            </span>
          </div>
          <div class="linha-direita">
            <span class="linha-preco">${euros(p.preco * l.qtd)}</span>
            <button type="button" class="btn-remover" data-remover="${p.id}">Remover</button>
          </div>
        </div>`;
    }

    function desenhar() {
      const linhas = Carrinho.linhas();
      const total = Carrinho.totalEuros();

      if (!linhas.length) {
        lista.innerHTML = `
          <div class="carrinho-vazio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z"/>
              <path d="M4 6h16M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <p>O teu carrinho está vazio.</p>
          </div>`;
        fundo.hidden = true;
        return;
      }

      lista.innerHTML = linhas.map(linhaHTML).join("");
      fundo.hidden = false;

      const faltam = CONFIG.encomendaMinima - total;
      const abaixoDoMinimo = CONFIG.encomendaMinima > 0 && faltam > 0;

      fundo.innerHTML = `
        <div class="total-linha"><span>${Carrinho.totalItens()} artigo(s)</span><span>${euros(total)}</span></div>
        <div class="total-linha grande"><span>Total</span><strong>${euros(total)}</strong></div>
        ${abaixoDoMinimo ? `<p class="aviso-minimo">Faltam ${euros(faltam)} para a encomenda mínima.</p>` : ""}
        <a class="btn btn-primary btn-bloco" id="btn-encomendar" href="${Carrinho.linkEncomenda()}"
           target="_blank" rel="noopener"${abaixoDoMinimo ? ' aria-disabled="true"' : ""}>
          ${CONFIG.metodoEncomenda === "email" ? "Encomendar por email" : "Encomendar por WhatsApp"}
        </a>
        <button type="button" class="btn-remover" id="btn-esvaziar" style="display:block;margin:.9rem auto 0">Esvaziar carrinho</button>
        <p class="nota-carrinho">
          A encomenda é enviada como mensagem. Confirmamos disponibilidade,
          entrega e pagamento antes de seguir.
        </p>`;

      if (abaixoDoMinimo) {
        document.getElementById("btn-encomendar").addEventListener("click", e => e.preventDefault());
      }
      document.getElementById("btn-esvaziar").addEventListener("click", () => {
        if (confirm("Esvaziar o carrinho?")) Carrinho.esvaziar();
      });
    }

    // Cliques dentro do painel
    lista.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const { mais, menos, remover } = btn.dataset;
      const linha = id => Carrinho.linhas().find(l => l.produto.id === id);

      if (mais)    Carrinho.definirQuantidade(mais, linha(mais).qtd + 1);
      if (menos)   Carrinho.definirQuantidade(menos, linha(menos).qtd - 1);
      if (remover) Carrinho.remover(remover);
    });

    Carrinho.aoMudar(desenhar);
    desenhar();
    return { abrir, fechar };
  }

  /* Contador no botão do topo */
  function ligarContador() {
    const contadores = document.querySelectorAll("[data-contador]");
    if (!contadores.length) return;

    function atualizar(animar) {
      const n = Carrinho.totalItens();
      contadores.forEach(c => {
        c.textContent = n;
        c.hidden = n === 0;
        if (animar && n > 0) {
          c.classList.add("salta");
          setTimeout(() => c.classList.remove("salta"), 260);
        }
      });
    }

    Carrinho.aoMudar(() => atualizar(true));
    atualizar(false);
  }

  /* Botões "Adicionar" espalhados pela página */
  function ligarBotoesAdicionar() {
    document.addEventListener("click", e => {
      const btn = e.target.closest("[data-add]");
      if (!btn || btn.disabled) return;

      const id = btn.dataset.add;
      if (!Carrinho.adicionar(id)) return;

      const original = btn.textContent;
      btn.textContent = "Adicionado ✓";
      btn.classList.add("feito");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("feito");
      }, 1300);

      const produto = PRODUTOS.find(p => p.id === id);
      mostrarToast(`${produto.nome} adicionado ao carrinho`);
    });
  }

  /* Notificação que aparece em baixo */
  let temporizadorToast;
  function mostrarToast(texto) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      <span>${texto}</span>`;

    requestAnimationFrame(() => toast.classList.add("visivel"));
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => toast.classList.remove("visivel"), 2600);
  }

  /* =======================================================
     7. VERIFICAÇÃO DE IDADE
     Obrigatório em Portugal para venda de bebidas alcoólicas.
     ======================================================= */

  function ligarVerificacaoIdade() {
    const modal = document.getElementById("modal-idade");
    if (!modal) return;

    let jaConfirmou = false;
    try { jaConfirmou = sessionStorage.getItem("idade-confirmada") === "sim"; } catch (e) {}

    if (jaConfirmou) return;

    modal.classList.add("aberto");
    document.body.classList.add("sem-scroll");

    modal.querySelector("[data-idade-sim]")?.addEventListener("click", () => {
      try { sessionStorage.setItem("idade-confirmada", "sim"); } catch (e) {}
      modal.classList.remove("aberto");
      document.body.classList.remove("sem-scroll");
    });

    modal.querySelector("[data-idade-nao]")?.addEventListener("click", () => {
      location.href = "https://www.google.com";
    });
  }

  /* =======================================================
     8. FORMULÁRIO DE CONTACTO
     Validação no browser. Para receber mensagens a sério é
     preciso um serviço de formulários — ver o README.
     ======================================================= */

  function ligarFormulario() {
    const form = document.getElementById("form-contacto");
    const nota = document.getElementById("form-nota");
    if (!form || !nota) return;

    form.addEventListener("submit", e => {
      e.preventDefault();
      const campos = [...form.querySelectorAll("input, textarea, select")];
      let valido = true;

      campos.forEach(campo => {
        const ok = campo.checkValidity();
        campo.setAttribute("aria-invalid", String(!ok));
        if (!ok) valido = false;
      });

      if (!valido) {
        nota.className = "form-nota erro";
        nota.textContent = "Preenche todos os campos com dados válidos.";
        return;
      }

      nota.className = "form-nota ok";
      nota.textContent = "Obrigado! (Demonstração — o formulário ainda não envia nada. Liga-o a um serviço de formulários.)";
      form.reset();
      campos.forEach(c => c.removeAttribute("aria-invalid"));
    });
  }

  /* =======================================================
     ARRANQUE
     ======================================================= */

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof CONFIG === "undefined" || typeof PRODUTOS === "undefined") {
      console.error("Faltam js/config.js ou js/produtos.js.");
      return;
    }

    preencherConfig();
    preencherHorario();
    marcarPaginaAtual();
    ligarMenu();
    ligarDestaques();
    ligarCatalogo();
    preencherContagens();
    ligarCarrinho();
    ligarContador();
    ligarBotoesAdicionar();
    ligarVerificacaoIdade();
    ligarFormulario();
    ligarAnimacoes();
  });
})();
