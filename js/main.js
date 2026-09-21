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

    // Segundo número: só aparece se existir no config
    document.querySelectorAll("[data-tel2]").forEach(el => {
      if (!CONFIG.telefone2) return;
      el.href = "tel:" + CONFIG.telefone2.replace(/\s/g, "");
      el.textContent = CONFIG.telefone2;
      el.hidden = false;
    });
    document.querySelectorAll("[data-email]").forEach(el => { el.href = "mailto:" + CONFIG.email; });
    document.querySelectorAll("[data-whatsapp]").forEach(el => { el.href = "https://wa.me/" + CONFIG.telefoneLimpo; });

    // Morada numa linha só, para correr dentro de um parágrafo
    document.querySelectorAll("[data-morada-linha]").forEach(el => {
      const mo = CONFIG.morada;
      el.textContent = (CONFIG.empresa && CONFIG.empresa.sede)
        ? CONFIG.empresa.sede
        : `${mo.rua}, ${mo.codigoPostal} ${mo.localidade}`;
    });

    // Valor mínimo da entrega em mão, formatado em euros
    document.querySelectorAll("[data-minimo-entrega]").forEach(el => {
      const m = CONFIG.entrega && CONFIG.entrega.minimo;
      if (m) el.textContent = m.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    });

    // Lista de concelhos de entrega, em português corrente:
    // "A, B, C e D" em vez de "A, B, C, D"
    document.querySelectorAll("[data-concelhos]").forEach(el => {
      const c = (CONFIG.entrega && CONFIG.entrega.concelhos) || [];
      if (!c.length) return;
      el.textContent = c.length === 1
        ? c[0]
        : c.slice(0, -1).join(", ") + " e " + c[c.length - 1];
    });

    // Data de atualização dos textos legais
    document.querySelectorAll("[data-atualizado]").forEach(el => {
      el.textContent = new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    });

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

  /* Linha de identificação da empresa no rodapé.
     Obrigatória num site comercial: quem compra tem direito a saber
     com quem está a negociar. Enquanto os campos não estiverem
     preenchidos, mostra um aviso visível — para não passar
     despercebido que falta.                                        */
  function preencherIdentificacao() {
    const alvo = document.querySelector("[data-identificacao]");
    if (!alvo) return;

    const e = CONFIG.empresa || {};
    const m = CONFIG.morada;
    const sede = e.sede || `${m.rua}, ${m.codigoPostal} ${m.localidade}`;

    if (!e.denominacao || !e.nif) {
      alvo.innerHTML = '<strong>Por preencher:</strong> denominação e NIF da empresa ' +
                       '(js/config.js). São obrigatórios num site comercial.';
      alvo.classList.add("identificacao-em-falta");
      return;
    }

    const partes = [e.denominacao, `NIF ${e.nif}`, sede];
    if (e.capitalSocial)    partes.push(`Capital social ${e.capitalSocial}`);
    if (e.registoComercial) partes.push(e.registoComercial);
    alvo.textContent = partes.join(" · ");
  }

  /* O link da entidade de resolução de litígios só aparece depois
     de estar preenchido — um link vazio é pior do que nenhum.      */
  function preencherLitigios() {
    const link = document.querySelector("[data-litigios]");
    if (!link) return;

    const l = CONFIG.litigios || {};
    if (!l.site || !l.nome) return;      // fica escondido

    link.href = l.site;
    link.textContent = l.nome;
    link.target = "_blank";
    link.rel = "noopener";
    link.hidden = false;
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
    const alvos = document.querySelectorAll(".revelar, .cortina");
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

    // O atraso escalonado é calculado por grupo de irmãos, para
    // os cartões entrarem em cascata mesmo quando são gerados por JS.
    const contagemPorPai = new Map();
    alvos.forEach(el => {
      if (el.style.getPropertyValue("--atraso")) return;
      const pai = el.parentElement;
      const n = contagemPorPai.get(pai) || 0;
      contagemPorPai.set(pai, n + 1);
      if (n > 0) el.style.setProperty("--atraso", `${Math.min(n * 0.07, 0.42)}s`);
    });

    alvos.forEach(el => observador.observe(el));
  }

  /* Quem pediu menos movimento no sistema não leva animações
     nenhumas — nem as que são feitas por JavaScript.          */
  const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Faixa de pré-visualização ---
     Mede a altura real da faixa e diz ao cabeçalho onde colar.
     Sem isto, o cabeçalho tapava a faixa em ecrãs estreitos,
     onde o texto quebra para duas linhas.                     */
  function ajustarFaixaRascunho() {
    const faixa = document.querySelector(".faixa-rascunho");
    if (!faixa) return;

    function medir() {
      document.documentElement.style.setProperty(
        "--altura-faixa", faixa.offsetHeight + "px");
    }
    medir();
    window.addEventListener("resize", medir, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(medir).observe(faixa);
  }

  /* --- Barra de progresso de leitura --- */
  function ligarProgresso() {
    if (menosMovimento) return;

    const barra = document.createElement("div");
    barra.className = "progresso";
    document.body.appendChild(barra);

    let aEsperar = false;
    function atualizar() {
      const altura = document.documentElement.scrollHeight - window.innerHeight;
      const fracao = altura > 0 ? window.scrollY / altura : 0;
      barra.style.transform = `scaleX(${fracao})`;
      aEsperar = false;
    }
    window.addEventListener("scroll", () => {
      if (!aEsperar) { aEsperar = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    atualizar();
  }

  /* --- Cabeçalho encolhe depois dos primeiros pixels --- */
  function ligarCabecalhoEncolhido() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    let aEsperar = false;
    function verificar() {
      topbar.classList.toggle("encolhido", window.scrollY > 60);
      aEsperar = false;
    }
    window.addEventListener("scroll", () => {
      if (!aEsperar) { aEsperar = true; requestAnimationFrame(verificar); }
    }, { passive: true });
    verificar();
  }

  /* --- Números que contam para cima quando aparecem --- */
  function ligarContadores() {
    const numeros = document.querySelectorAll(".stats dd");
    if (!numeros.length) return;

    if (menosMovimento || !("IntersectionObserver" in window)) return;

    const observador = new IntersectionObserver(entradas => {
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;
        observador.unobserve(entrada.target);

        const alvo = parseInt(entrada.target.textContent.replace(/\D/g, ""), 10);
        if (!alvo) return;

        const duracao = 1100;
        const inicio = performance.now();

        function passo(agora) {
          const t = Math.min((agora - inicio) / duracao, 1);
          // desacelera no fim, para o número assentar
          const suave = 1 - Math.pow(1 - t, 3);
          entrada.target.textContent = Math.round(alvo * suave);
          if (t < 1) requestAnimationFrame(passo);
        }
        entrada.target.textContent = "0";
        requestAnimationFrame(passo);
      });
    }, { threshold: 0.5 });

    numeros.forEach(n => observador.observe(n));
  }

  /* --- Brilho dos cartões a seguir o rato --- */
  function ligarBrilhoCartoes() {
    if (menosMovimento || window.matchMedia("(hover: none)").matches) return;

    document.addEventListener("pointermove", e => {
      const card = e.target.closest(".card, .categoria-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--rato-x", `${e.clientX - r.left}px`);
      card.style.setProperty("--rato-y", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* --- Parallax da faixa fotográfica ---
     A imagem desliza mais devagar do que a página, o que dá
     sensação de profundidade sem pesar nada.                 */
  function ligarParallaxFaixa() {
    if (menosMovimento) return;

    const faixas = [...document.querySelectorAll(".faixa")];
    if (!faixas.length) return;

    let aEsperar = false;
    function mover() {
      faixas.forEach(faixa => {
        const r = faixa.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const img = faixa.querySelector(".faixa-fundo img");
        if (!img) return;
        // -1 quando a faixa entra por baixo, +1 quando sai por cima
        const progresso = (window.innerHeight / 2 - (r.top + r.height / 2)) / window.innerHeight;
        img.style.transform = `translateY(${progresso * 42}px)`;
      });
      aEsperar = false;
    }
    window.addEventListener("scroll", () => {
      if (!aEsperar) { aEsperar = true; requestAnimationFrame(mover); }
    }, { passive: true });
    mover();
  }

  /* --- Inclinação dos cartões conforme a posição do rato --- */
  function ligarInclinacao() {
    if (menosMovimento || window.matchMedia("(hover: none)").matches) return;

    const LIMITE = 4.5;   // graus — mais do que isto enjoa

    document.addEventListener("pointermove", e => {
      const card = e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.setProperty("--inclina-y", `${px * LIMITE * 2}deg`);
      card.style.setProperty("--inclina-x", `${-py * LIMITE * 2}deg`);
    }, { passive: true });

    document.addEventListener("pointerout", e => {
      const card = e.target.closest(".card");
      if (!card || card.contains(e.relatedTarget)) return;
      card.style.setProperty("--inclina-x", "0deg");
      card.style.setProperty("--inclina-y", "0deg");
    }, { passive: true });
  }

  /* --- Transição entre páginas ---
     Esbate a página a sair antes de navegar, para não haver
     o salto branco entre páginas. Se o JavaScript falhar, os
     links continuam a funcionar como links normais.          */
  function ligarTransicaoPaginas() {
    if (menosMovimento) return;

    document.addEventListener("click", e => {
      const link = e.target.closest("a");
      if (!link) return;

      const destino = link.getAttribute("href") || "";
      const interno = /^[\w-]+\.html(#.*)?$/.test(destino);
      const modificador = e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

      if (!interno || modificador || link.target === "_blank") return;

      e.preventDefault();
      document.body.classList.add("a-sair");
      setTimeout(() => { location.href = destino; }, 240);
    });

    // Se o utilizador voltar atrás, a página vem da cache já esbatida
    window.addEventListener("pageshow", ev => {
      if (ev.persisted) document.body.classList.remove("a-sair");
    });
  }

  /* --- Garrafa grande do hero --- */
  function desenharGarrafaHero() {
    const palco = document.getElementById("hero-garrafa");
    if (!palco) return;
    palco.innerHTML = Ilustracoes.garrafa("#53000F", "bordeaux", "Garrafa da Garrafeira Campelo");
  }

  /* --- Parallax suave na ilustração do hero --- */
  function ligarParallax() {
    if (menosMovimento) return;

    const arte = document.querySelector(".hero-arte");
    const hero = document.querySelector(".hero");
    if (!arte || !hero) return;

    let aEsperar = false;
    function mover() {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) {
        arte.style.transform = `translateY(${y * 0.13}px)`;
        hero.style.setProperty("--deslocamento", `${y * 0.05}px`);
      }
      aEsperar = false;
    }
    window.addEventListener("scroll", () => {
      if (!aEsperar) { aEsperar = true; requestAnimationFrame(mover); }
    }, { passive: true });
  }

  /* =======================================================
     4. CARTÕES DE PRODUTO
     ======================================================= */

  function arteDoProduto(p) {
    if (p.imagem) {
      return `<img src="${p.imagem}" alt="${p.nome}" loading="lazy">`;
    }
    return Ilustracoes.paraProduto(p);
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
        : Ilustracoes.paraProduto(p);

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

      const modo = Carrinho.modoAtual();
      const falta = Carrinho.faltaParaEntrega();
      const minimo = CONFIG.entrega.minimo || 0;
      const minimoTexto = minimo.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
      const pode = Carrinho.podeEncomendar();
      const concelhos = (CONFIG.entrega.concelhos || []);
      const listaConcelhos = concelhos.length > 1
        ? concelhos.slice(0, -1).join(", ") + " e " + concelhos[concelhos.length - 1]
        : (concelhos[0] || "");

      /* Opções de receção. A entrega em mão mostra quanto falta para o
         mínimo em vez de desaparecer: assim o cliente percebe porquê,
         e percebe que chega lá com mais uma garrafa. */
      const opcoes = [
        {
          valor: "recolha",
          titulo: "Recolha na loja",
          detalhe: "Sem mínimo de compra. Rua Principal, Silveiros."
        },
        Carrinho.entregaDisponivel() && {
          valor: "entrega",
          titulo: "Entrega em mão",
          detalhe: falta > 0
            ? `A partir de ${minimoTexto}. Faltam ${euros(falta)}.`
            : `Grátis em ${listaConcelhos}.`,
          bloqueada: falta > 0
        },
        {
          valor: "pais",
          titulo: "Resto do país",
          detalhe: "Pedimos orçamento de envio antes de fechar."
        }
      ].filter(Boolean);

      const opcoesHTML = opcoes.map(o => `
        <label class="modo${o.valor === modo ? " escolhido" : ""}${o.bloqueada ? " bloqueado" : ""}">
          <input type="radio" name="modo-rececao" value="${o.valor}"
                 ${o.valor === modo ? "checked" : ""}>
          <span class="modo-texto">
            <strong>${o.titulo}</strong>
            <span>${o.detalhe}</span>
          </span>
        </label>`).join("");

      let aviso = "";
      if (modo === "entrega" && falta > 0) {
        aviso = `<p class="aviso-minimo">
          A entrega em mão é a partir de ${minimoTexto}. Faltam ${euros(falta)},
          ou escolhe a recolha na loja.
        </p>`;
      }

      const textoBotao = CONFIG.metodoEncomenda === "email" ? "Encomendar por email" : "Encomendar por WhatsApp";

      fundo.innerHTML = `
        <fieldset class="modos">
          <legend>Como queres receber?</legend>
          ${opcoesHTML}
        </fieldset>

        <div class="total-linha"><span>${Carrinho.totalItens()} artigo(s)</span><span>${euros(total)}</span></div>
        <div class="total-linha grande"><span>Total</span><strong>${euros(total)}</strong></div>
        ${aviso}
        <p class="nota-carrinho">
          A encomenda é enviada como mensagem. Confirmamos disponibilidade
          e combinamos o pagamento antes de seguir.
        </p>
        <button type="button" class="btn-remover" id="btn-esvaziar">Esvaziar carrinho</button>

        <div class="carrinho-acao">
          <a class="btn btn-primary btn-bloco" id="btn-encomendar" href="${Carrinho.linkEncomenda()}"
             target="_blank" rel="noopener"${pode ? "" : ' aria-disabled="true"'}>
            ${textoBotao} · ${euros(total)}
          </a>
        </div>`;

      fundo.querySelectorAll('input[name="modo-rececao"]').forEach(r => {
        r.addEventListener("change", () => Carrinho.definirModo(r.value));
      });

      if (!pode) {
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

  /* Páginas que ninguém deve ter de desbloquear: informação legal
     tem de estar acessível sem declarar idade nenhuma.            */
  const PAGINAS_SEM_IDADE = ["privacidade.html", "termos.html"];

  function ligarVerificacaoIdade() {
    const modal = document.getElementById("modal-idade");
    if (!modal) return;

    const pagina = location.pathname.split("/").pop() || "index.html";
    if (PAGINAS_SEM_IDADE.includes(pagina)) {
      modal.remove();
      return;
    }

    let jaConfirmou = false;
    try { jaConfirmou = sessionStorage.getItem("idade-confirmada") === "sim"; } catch (e) {}

    if (jaConfirmou) return;

    modal.classList.add("aberto");
    document.body.classList.add("sem-scroll");

    modal.querySelector("[data-idade-sim]")?.addEventListener("click", confirmar);

    /* Antes, o "Não" atirava a pessoa para o Google. Quem carregasse
       por engano perdia o site e não tinha caminho de volta óbvio.
       Agora fica no sítio, com a despedida e a hipótese de corrigir. */
    modal.querySelector("[data-idade-nao]")?.addEventListener("click", () => {
      const caixa = modal.querySelector(".modal-caixa");
      caixa.innerHTML = `
        <img src="img/logo.png" alt="">
        <h2>Volta noutra altura</h2>
        <p>
          Este site vende bebidas alcoólicas e, por lei, só pode ser visitado
          por maiores de 18 anos.
        </p>
        <div class="modal-acoes">
          <button class="btn btn-ghost" data-idade-voltar>Enganei-me, tenho 18 ou mais</button>
        </div>
        <p class="modal-legal">
          Se precisares de falar connosco por outro motivo, escreve para
          <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>.
        </p>`;

      caixa.querySelector("[data-idade-voltar]").addEventListener("click", confirmar);
    });

    function confirmar() {
      try { sessionStorage.setItem("idade-confirmada", "sim"); } catch (e) {}
      modal.classList.remove("aberto");
      document.body.classList.remove("sem-scroll");
    }
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
      nota.textContent = "Obrigado! Isto é uma demonstração: o formulário ainda não envia nada.";
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
    preencherIdentificacao();
    preencherLitigios();
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
    desenharGarrafaHero();
    ajustarFaixaRascunho();
    ligarProgresso();
    ligarCabecalhoEncolhido();
    ligarContadores();
    ligarBrilhoCartoes();
    ligarParallax();
    ligarParallaxFaixa();
    ligarInclinacao();
    ligarTransicaoPaginas();
  });
})();
