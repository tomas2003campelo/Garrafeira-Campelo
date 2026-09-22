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

    // Link do Google Maps. Sem o nome da loja na pesquisa: com ele, o
    // Google mostrava outra empresa com "Campelo" no nome.
    const mapa = CONFIG.mapa || "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(`${m.rua.replace(",", "")}, ${m.codigoPostal} ${m.localidade}`);
    document.querySelectorAll("[data-mapa]").forEach(el => { el.href = mapa; });

    // Redes sociais: esconde as que não estão preenchidas, e os blocos
    // que fiquem sem nenhuma
    document.querySelectorAll("[data-rede]").forEach(el => {
      const url = CONFIG.redes[el.dataset.rede];
      if (url) el.href = url;
      else el.remove();
    });
    document.querySelectorAll("[data-redes]").forEach(bloco => {
      if (!bloco.querySelector("[data-rede]")) bloco.remove();
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
      if (e.target.closest("a")) {
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

        // Guarda o que está à volta do número: "+10" conta até 10 e
        // mantém o "+"
        const partes = entrada.target.textContent.trim().match(/^(\D*)(\d+)(\D*)$/);
        if (!partes) return;
        const [, antes, numero, depois] = partes;
        const alvo = parseInt(numero, 10);
        if (!alvo) return;

        const duracao = 1100;
        const inicio = performance.now();

        function passo(agora) {
          const t = Math.min((agora - inicio) / duracao, 1);
          // desacelera no fim, para o número assentar
          const suave = 1 - Math.pow(1 - t, 3);
          entrada.target.textContent = antes + Math.round(alvo * suave) + depois;
          if (t < 1) requestAnimationFrame(passo);
        }
        entrada.target.textContent = antes + "0" + depois;
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
      const interno = /^[\w-]+\.html(\?[^#]*)?(#.*)?$/.test(destino);
      const modificador = e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

      if (!interno || modificador || link.target === "_blank") return;

      // Para a mesma página só muda a âncora (vinhos.html#maduro, já
      // estando nos vinhos): o browser não recarrega, e a página ficava
      // esbatida. Deixa o link seguir sozinho.
      const atual = location.pathname.split("/").pop() || "index.html";
      if (destino.split("#")[0] === atual) return;

      e.preventDefault();
      document.body.classList.add("a-sair");
      setTimeout(() => { location.href = destino; }, 240);
    });

    // Se o utilizador voltar atrás, a página vem da cache já esbatida
    window.addEventListener("pageshow", ev => {
      if (ev.persisted) document.body.classList.remove("a-sair");
    });
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

  /* "Maduro · Tinto"; nos espumantes, a cor e a doçura: "Espumante · Branco · Bruto" */
  function metaDoProduto(p) {
    return p.categoria === "espumantes"
      ? ["Espumante", p.tipo === "espumante" ? "" : p.tipo, p.docura].filter(Boolean).join(" · ")
      : [CATEGORIAS[p.categoria].nome, p.tipo].join(" · ");
  }

  function urlDoProduto(p) {
    return `produto.html?id=${encodeURIComponent(p.id)}`;
  }

  function criarCartao(p) {
    const card = document.createElement("article");
    card.className = "card revelar" + (p.esgotado ? " esgotado" : "");

    const etiqueta = p.esgotado
      ? '<span class="badge badge-esgotado">Esgotado</span>'
      : (p.destaque ? `<span class="badge">${p.destaque}</span>` : "");

    const linhaMeta = metaDoProduto(p);
    const url = urlDoProduto(p);
    const caixa = Carrinho.unidadesPorCaixa(p);

    // Só junta o que existe: sem produtor, o cartão não pode começar
    // num ponto solto.
    const origem = [p.produtor, p.regiao, p.ano].filter(Boolean).join(" · ");

    card.innerHTML = `
      <a class="card-top" href="${url}" aria-label="Ver ${p.nome}">
        ${etiqueta}
        ${arteDoProduto(p)}
      </a>
      <div class="card-body">
        <p class="card-meta">${linhaMeta}</p>
        <h3 class="card-nome"><a href="${url}">${p.nome}</a></h3>
        ${origem ? `<p class="card-produtor">${origem}</p>` : ""}
        <p class="card-desc">${p.descricao}</p>
        <div class="card-foot">
          <span class="preco-bloco">
            <span class="preco">${euros(p.preco)}</span>
            <span class="volume">${p.volume}${caixa > 1 ? ` · caixa de ${caixa}` : ""}</span>
            <span class="volume">IVA incluído</span>
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

  /* Nos maduros, a região decide o filtro. Vem da coluna Região do
     Excel, escrita à mão ("Douro DOC", "Vinho Regional Duriense",
     "Alentejo"), por isso procura só a palavra que importa. */
  function zonaDoMaduro(p) {
    const r = (p.regiao || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (/douro|durien/.test(r)) return "douro";
    if (/alentej/.test(r)) return "alentejo";
    return "outros";
  }

  /* Filtros da página dos vinhos: os verdes, e os maduros divididos
     pela região. vinhos.html#maduro mostra os maduros todos, e aí
     acendem os três botões dos maduros. */
  const ZONAS_MADURO = ["douro", "alentejo", "outros"];
  const FILTROS_VINHOS = [
    { chave: "todos",    nome: "Todos",          aceita: () => true },
    { chave: "verde",    nome: "Verdes",         aceita: p => p.categoria === "verde" },
    { chave: "douro",    nome: "Douro",          aceita: p => p.categoria === "maduro" && zonaDoMaduro(p) === "douro" },
    { chave: "alentejo", nome: "Alentejo",       aceita: p => p.categoria === "maduro" && zonaDoMaduro(p) === "alentejo" },
    { chave: "outros",   nome: "Outros maduros", aceita: p => p.categoria === "maduro" && zonaDoMaduro(p) === "outros" },
    { chave: "maduro",   nome: "Maduros",        aceita: p => p.categoria === "maduro", semBotao: true }
  ];

  /* Filtros da página dos espumantes: pela cor e pela doçura. Cada
     grupo só aparece se tiver mais do que uma opção com produtos:
     com os espumantes todos brutos, filtrar por "Bruto" não serve. */
  const ORDEM_DOCURAS = ["Bruto Natural", "Extra Bruto", "Bruto", "Extra Seco", "Seco", "Meio Seco", "Doce"];

  function filtrosEspumantes(produtos) {
    const cor = p => (p.tipo === "espumante" ? "branco" : p.tipo);
    const cores = [
      { chave: "branco", nome: "Brancos" },
      { chave: "rosé",   nome: "Rosés" },
      { chave: "tinto",  nome: "Tintos" }
    ].filter(c => produtos.some(p => cor(p) === c.chave))
     .map(c => ({ ...c, aceita: p => cor(p) === c.chave }));

    const docuras = ORDEM_DOCURAS.filter(d => produtos.some(p => p.docura === d))
      .map(d => ({ chave: d.toLowerCase().replace(/\s+/g, "-"), nome: d, aceita: p => p.docura === d }));

    return [{ chave: "todos", nome: "Todos", aceita: () => true }]
      .concat(cores.length > 1 ? cores : [])
      .concat(docuras.length > 1 ? docuras : []);
  }

  function ligarCatalogo() {
    const lista = document.getElementById("lista-produtos");
    if (!lista) return;

    // A página diz que categorias mostra: data-categorias="verde,maduro"
    const permitidas = (lista.dataset.categorias || "").split(",").filter(Boolean);
    const doCatalogo = permitidas.length
      ? PRODUTOS.filter(p => permitidas.includes(p.categoria))
      : PRODUTOS;

    // Nos vinhos e nos espumantes, os filtros de cima. Nas outras
    // páginas, um botão por categoria, se houver mais do que uma.
    const opcoes = permitidas.includes("maduro")
      ? FILTROS_VINHOS
      : permitidas.includes("espumantes")
        ? filtrosEspumantes(doCatalogo)
        : [{ chave: "todos", nome: "Todos", aceita: () => true }]
            .concat(permitidas.map(c => ({ chave: c, nome: CATEGORIAS[c].nome, aceita: p => p.categoria === c })));

    const filtros = document.querySelector(".filtros");
    let ativo = "todos";

    function aplicar() {
      const filtro = opcoes.find(o => o.chave === ativo) || opcoes[0];
      desenharProdutos(lista, doCatalogo.filter(filtro.aceita));
      filtros?.querySelectorAll(".chip").forEach(c => {
        const chave = c.dataset.filtro;
        const aceso = chave === ativo || (ativo === "maduro" && ZONAS_MADURO.includes(chave));
        c.setAttribute("aria-pressed", String(aceso));
      });
    }

    if (filtros && opcoes.length > 2) {
      opcoes
        .filter(o => !o.semBotao)
        // Um botão que não mostrasse nada não serve: sem vinhos do
        // Alentejo no catálogo, o botão do Alentejo não aparece
        .filter(o => o.chave === "todos" || doCatalogo.some(o.aceita))
        .forEach(o => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip";
          btn.dataset.filtro = o.chave;
          btn.textContent = o.nome;
          btn.addEventListener("click", () => { ativo = o.chave; aplicar(); });
          filtros.appendChild(btn);
        });
    }

    // Permite chegar à página já com um filtro (vinhos.html#maduro) e
    // mudar de filtro pelos links do rodapé sem sair da página
    function lerAncora() {
      const ancora = location.hash.replace("#", "");
      if (opcoes.some(o => o.chave === ancora)) ativo = ancora;
    }
    lerAncora();
    window.addEventListener("hashchange", () => {
      lerAncora();
      aplicar();
      (filtros || lista).scrollIntoView({ behavior: menosMovimento ? "auto" : "smooth", block: "center" });
    });

    aplicar();
  }

  /* =======================================================
     PÁGINA DE PRODUTO (produto.html?id=...)
     Uma só página serve todos os produtos: lê o id do endereço e
     desenha a ficha. O endereço de cada produto pode partilhar-se.
     ======================================================= */

  function ligarFichaProduto() {
    const alvo = document.getElementById("ficha-produto");
    if (!alvo) return;

    const id = new URLSearchParams(location.search).get("id");
    const p = PRODUTOS.find(x => x.id === id);
    if (!p) {
      alvo.innerHTML = `
        <div class="ficha-vazia">
          <h1 class="titulo-pagina">Produto não encontrado</h1>
          <p>Este produto já não está no catálogo, ou a ligação veio incompleta.</p>
          <a class="btn btn-primary" href="vinhos.html">Ver os vinhos</a>
        </div>`;
      document.getElementById("relacionados")?.remove();
      return;
    }

    const pagina = { espumantes: "espumantes.html", cervejas: "cervejas.html" }[p.categoria] || "vinhos.html";
    const familia = { verde: "Verdes", maduro: "Maduros", espumantes: "Espumantes", cervejas: "Cervejas" }[p.categoria];
    const ancora = { verde: "#verde", maduro: "#maduro" }[p.categoria] || "";
    document.querySelectorAll(".nav > a").forEach(a => {
      if (a.getAttribute("href") === pagina) a.setAttribute("aria-current", "page");
    });
    document.title = `${p.nome} | ${CONFIG.nome}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", p.descricao);

    const caixa = Carrinho.unidadesPorCaixa(p);
    const numero = n => Number(n).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
    const dados = [
      ["Produtor", p.produtor],
      ["Região", p.regiao],
      ["Ano", p.ano],
      ["Teor alcoólico", p.alcool ? `${numero(p.alcool)}% vol.` : ""],
      ["Volume", p.volume],
      ["Doçura", p.docura],
      ["Venda", caixa > 1 ? `Caixa de ${caixa} garrafas` : "À unidade"]
    ].filter(([, v]) => v);

    const etiqueta = p.esgotado
      ? '<span class="badge badge-esgotado">Esgotado</span>'
      : (p.destaque ? `<span class="badge">${p.destaque}</span>` : "");
    const botao = p.esgotado ? "Esgotado" : (caixa > 1 ? `Adicionar caixa de ${caixa}` : "Adicionar ao carrinho");
    const partilha = "https://wa.me/?text=" + encodeURIComponent(`${p.nome}, na ${CONFIG.nome}: ${location.href}`);

    alvo.innerHTML = `
      <nav class="migalhas" aria-label="Estás em">
        <a href="index.html">Início</a><span aria-hidden="true">/</span>
        <a href="${pagina}${ancora}">${familia}</a><span aria-hidden="true">/</span>
        <span aria-current="page">${p.nome}</span>
      </nav>
      <div class="ficha">
        <div class="ficha-foto">${etiqueta}${arteDoProduto(p)}</div>
        <div class="ficha-texto">
          <p class="card-meta">${metaDoProduto(p)}</p>
          <h1 class="ficha-nome">${p.nome}</h1>
          <p class="ficha-desc">${p.descricao}</p>
          <div class="ficha-compra">
            <div class="ficha-preco">
              <span class="preco">${euros(p.preco)}</span>
              <span class="volume">${caixa > 1 ? "por garrafa · " : ""}IVA incluído</span>
              ${caixa > 1 ? `<span class="ficha-caixa">Caixa de ${caixa}: <strong>${euros(p.preco * caixa)}</strong></span>` : ""}
            </div>
            <button class="btn btn-primary btn-comprar" data-add="${p.id}" ${p.esgotado ? "disabled" : ""}>${botao}</button>
          </div>
          <dl class="ficha-dados">
            ${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
          </dl>
          <p class="ficha-partilhar"><a href="${partilha}" target="_blank" rel="noopener">Partilhar no WhatsApp</a></p>
        </div>
      </div>`;

    // Da mesma família, primeiro os do mesmo tipo (um tinto sugere tintos)
    const lista = document.getElementById("lista-relacionados");
    const parecidos = PRODUTOS
      .filter(x => x.id !== p.id && x.categoria === p.categoria && !x.esgotado)
      .sort((a, b) => (b.tipo === p.tipo) - (a.tipo === p.tipo))
      .slice(0, 4);
    if (lista && parecidos.length) desenharProdutos(lista, parecidos);
    else document.getElementById("relacionados")?.remove();
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
    const tituloPainel = painel?.querySelector(".carrinho-topo h1, .carrinho-topo h2");
    if (!painel || !lista) return;

    /* O carrinho vive na sua própria página (carrinho.html). O código
       ainda sabe funcionar como painel lateral, se algum dia voltar. */
    const naPagina = painel.hasAttribute("data-pagina");

    /* Dois passos: 1 é o carrinho, 2 são os dados do cliente. */
    let passo = 1;
    function irPara(n) {
      passo = n;
      desenhar();
      if (naPagina) {
        window.scrollTo({ top: painel.getBoundingClientRect().top + window.scrollY - 120, behavior: menosMovimento ? "auto" : "smooth" });
      } else {
        painel.scrollTop = 0;
      }
      const foco = n === 2 ? painel.querySelector("#d-nome") : painel.querySelector(".btn-fechar");
      foco?.focus({ preventScroll: true });
    }

    function abrir() {
      painel.classList.add("aberto");
      veu.classList.add("aberto");
      document.body.classList.add("sem-scroll");
      painel.querySelector(".btn-fechar")?.focus();
    }

    function fechar() {
      if (passo !== 1) { passo = 1; desenhar(); }
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
      const caixa = Carrinho.unidadesPorCaixa(p);
      const arte = p.imagem
        ? `<img src="${p.imagem}" alt="">`
        : Ilustracoes.paraProduto(p);

      return `
        <div class="linha-item">
          <span class="linha-arte">${arte}</span>
          <div class="linha-info">
            <p class="linha-nome">${p.nome}</p>
            <p class="linha-meta">${p.volume} · ${euros(p.preco)}${caixa > 1 ? ` · caixa de ${caixa}` : ""}</p>
            <span class="qtd">
              <button type="button" data-menos="${p.id}" aria-label="${caixa > 1 ? "Menos uma caixa de" : "Menos um"} ${p.nome}">−</button>
              <span>${caixa > 1 ? `${l.qtd / caixa} cx.` : l.qtd}</span>
              <button type="button" data-mais="${p.id}" aria-label="${caixa > 1 ? "Mais uma caixa de" : "Mais um"} ${p.nome}">+</button>
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

      if (passo === 2 && linhas.length) return desenharDados();
      passo = 1;
      lista.hidden = false;
      if (tituloPainel) tituloPainel.textContent = "O teu carrinho";
      painel.dataset.passo = linhas.length ? "1" : "vazio";

      if (!linhas.length) {
        lista.innerHTML = `
          <div class="carrinho-vazio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z"/>
              <path d="M4 6h16M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <p>O teu carrinho está vazio.</p>
            ${naPagina ? `
            <div class="carrinho-vazio-acoes">
              <a class="btn btn-primary" href="vinhos.html">Ver os vinhos</a>
              <a class="btn btn-ghost" href="espumantes.html">Espumantes</a>
              <a class="btn btn-ghost" href="cervejas.html">Cervejas</a>
            </div>` : ""}
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
          <button type="button" class="btn btn-primary btn-bloco" id="btn-continuar"${pode ? "" : " disabled"}>
            Continuar · ${euros(total)}
          </button>
        </div>`;

      fundo.querySelectorAll('input[name="modo-rececao"]').forEach(r => {
        r.addEventListener("change", () => Carrinho.definirModo(r.value));
      });

      document.getElementById("btn-continuar").addEventListener("click", () => {
        if (Carrinho.podeEncomendar()) irPara(2);
      });
      document.getElementById("btn-esvaziar").addEventListener("click", () => {
        if (confirm("Esvaziar o carrinho?")) Carrinho.esvaziar();
      });
    }

    /* ---------- Passo 2: dados do cliente ---------- */

    function desenharDados() {
      const d = Carrinho.dadosCliente();
      const modo = Carrinho.modoAtual();
      const total = Carrinho.totalEuros();
      const precisaMorada = modo === "entrega" || modo === "pais";
      const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const nomeModo = { recolha: "Recolha na loja", entrega: "Entrega em mão", pais: "Envio com orçamento" }[modo];
      const textoBotao = CONFIG.metodoEncomenda === "email" ? "Encomendar por email" : "Encomendar por WhatsApp";

      lista.hidden = true;
      painel.dataset.passo = "2";
      if (tituloPainel) tituloPainel.textContent = "Os teus dados";

      // Campo de texto com etiqueta, espaço para o erro e ligação acessível entre os dois
      const campo = (id, nome, etiqueta, extra = "", opcional = false) => `
        <div class="campo">
          <label for="d-${id}">${etiqueta}${opcional ? ' <span class="opcional">opcional</span>' : ""}</label>
          <input id="d-${id}" name="${nome}" value="${esc(d[nome])}" aria-describedby="e-${id}" ${extra}>
          <p class="campo-erro" id="e-${id}"></p>
        </div>`;

      const concelhos = (CONFIG.entrega.concelhos || [])
        .map(c => `<option${d.concelho === c ? " selected" : ""}>${c}</option>`).join("");

      fundo.innerHTML = `
        <div class="checkout">
          <button type="button" class="btn-voltar" id="btn-voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            Voltar ao carrinho
          </button>

          <p class="resumo-encomenda">
            <span>${Carrinho.totalItens()} ${Carrinho.totalItens() === 1 ? "artigo" : "artigos"}</span>
            <span>${nomeModo}</span>
            <strong>${euros(total)}</strong>
          </p>

          <form id="form-dados" novalidate>
            <fieldset class="bloco-dados">
              <legend>Contacto</legend>
              ${campo("nome", "nome", "Nome completo", 'autocomplete="name" required')}
              ${campo("telefone", "telefone", "Telemóvel", 'type="tel" autocomplete="tel" inputmode="tel" required')}
              ${campo("email", "email", "Email", 'type="email" autocomplete="email" inputmode="email"', true)}
              <p class="ajuda">Para te enviarmos a fatura.</p>
            </fieldset>

            ${precisaMorada ? `
            <fieldset class="bloco-dados">
              <legend>${modo === "entrega" ? "Morada da entrega" : "Morada de envio"}</legend>
              ${modo === "entrega" ? `
              <div class="campo">
                <label for="d-concelho">Concelho</label>
                <select id="d-concelho" name="concelho" aria-describedby="e-concelho" required>
                  <option value="">Escolhe</option>
                  ${concelhos}
                </select>
                <p class="campo-erro" id="e-concelho"></p>
              </div>` : ""}
              ${campo("morada", "morada", "Rua, número e andar", 'autocomplete="street-address" required')}
              <div class="campos-lado">
                ${campo("codigoPostal", "codigoPostal", "Código postal", 'autocomplete="postal-code" inputmode="numeric" placeholder="0000-000" required')}
                ${campo("localidade", "localidade", "Localidade", 'autocomplete="address-level2" required')}
              </div>
              ${modo === "pais" ? campo("pais", "pais", "País", 'autocomplete="country-name"') : ""}
            </fieldset>` : ""}

            <fieldset class="bloco-dados">
              <legend>Faturação</legend>
              <label class="opcao-caixa">
                <input type="checkbox" id="d-fatura" name="fatura"${d.fatura ? " checked" : ""}>
                <span>Quero fatura com NIF</span>
              </label>
              <div id="bloco-nif"${d.fatura ? "" : " hidden"}>
                ${campo("nif", "nif", "NIF", 'inputmode="numeric" autocomplete="off" maxlength="11"')}
                ${campo("nomeFatura", "nomeFatura", "Em nome de", 'autocomplete="organization" placeholder="Só se for diferente do teu nome"', true)}
                ${precisaMorada ? `
                <label class="opcao-caixa">
                  <input type="checkbox" id="d-mesmaMorada" name="mesmaMorada"${d.mesmaMorada ? " checked" : ""}>
                  <span>A morada da fatura é a mesma da entrega</span>
                </label>` : ""}
                <div id="bloco-morada-fatura"${precisaMorada && d.mesmaMorada ? " hidden" : ""}>
                  ${campo("moradaFatura", "moradaFatura", "Morada fiscal", 'autocomplete="billing street-address" placeholder="Rua, número e andar"')}
                  <div class="campos-lado">
                    ${campo("codigoPostalFatura", "codigoPostalFatura", "Código postal", 'autocomplete="billing postal-code" inputmode="numeric" placeholder="0000-000"')}
                    ${campo("localidadeFatura", "localidadeFatura", "Localidade", 'autocomplete="billing address-level2"')}
                  </div>
                </div>
              </div>
            </fieldset>

            <div class="campo">
              <label for="d-observacoes">Observações <span class="opcional">opcional</span></label>
              <textarea id="d-observacoes" name="observacoes" rows="2"
                placeholder="${modo === "recolha" ? "Quando pensas passar pela loja" : "Horário que dá jeito, indicações para chegar"}">${esc(d.observacoes)}</textarea>
            </div>

            <label class="opcao-caixa lembrar">
              <input type="checkbox" id="d-lembrar" name="lembrar"${d.lembrar ? " checked" : ""}>
              <span>Lembrar os meus dados neste dispositivo, para a próxima encomenda</span>
            </label>

            <p class="aviso-dados">
              Os teus dados seguem na mensagem para a ${CONFIG.nome}, só para tratar desta encomenda.
              <a href="privacidade.html" target="_blank" rel="noopener">Como tratamos os dados</a>
            </p>
          </form>

          <div class="carrinho-acao">
            <a class="btn btn-primary btn-bloco" id="btn-encomendar" href="${Carrinho.linkEncomenda()}"
               target="_blank" rel="noopener">${textoBotao} · ${euros(total)}</a>
          </div>
        </div>`;

      const form = fundo.querySelector("#form-dados");
      const botao = fundo.querySelector("#btn-encomendar");

      // Guarda o que se escreve a cada tecla, e mantém o link do botão atualizado
      function lerFormulario() {
        const v = {};
        form.querySelectorAll("input, select, textarea").forEach(el => {
          v[el.name] = el.type === "checkbox" ? el.checked : el.value;
        });
        Carrinho.definirDados(v);
        botao.href = Carrinho.linkEncomenda();
      }

      form.addEventListener("input", e => {
        // Quem corrige um campo deixa de ver o erro dele
        const alvo = e.target;
        if (alvo.getAttribute("aria-invalid") === "true") {
          alvo.removeAttribute("aria-invalid");
          const erro = fundo.querySelector(`#e-${alvo.id.slice(2)}`);
          if (erro) erro.textContent = "";
        }
        if (alvo.id === "d-fatura") fundo.querySelector("#bloco-nif").hidden = !alvo.checked;
        if (alvo.id === "d-mesmaMorada") fundo.querySelector("#bloco-morada-fatura").hidden = alvo.checked;
        lerFormulario();
      });

      // O código postal ganha o hífen sozinho: 4750123 → 4750-123
      form.querySelectorAll('[name^="codigoPostal"]').forEach(cp => {
        cp.addEventListener("blur", () => {
          const so = cp.value.replace(/\D/g, "");
          if (so.length === 7) { cp.value = `${so.slice(0, 4)}-${so.slice(4)}`; lerFormulario(); }
        });
      });

      botao.addEventListener("click", e => {
        lerFormulario();
        const erros = Carrinho.validarDados();
        const campos = Object.keys(erros);

        form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
        form.querySelectorAll(".campo-erro").forEach(el => (el.textContent = ""));

        if (!campos.length) return;          // tudo certo: segue para o WhatsApp

        e.preventDefault();
        campos.forEach(nome => {
          const el = form.querySelector(`[name="${nome}"]`);
          const msg = fundo.querySelector(`#e-${el?.id.slice(2)}`);
          if (el) el.setAttribute("aria-invalid", "true");
          if (msg) msg.textContent = erros[nome];
        });
        const primeiro = form.querySelector('[aria-invalid="true"]');
        primeiro?.focus();
        primeiro?.scrollIntoView({ block: "center", behavior: "smooth" });
      });

      fundo.querySelector("#btn-voltar").addEventListener("click", () => irPara(1));
    }

    // Cliques dentro do painel
    lista.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const { mais, menos, remover } = btn.dataset;
      const linha = id => Carrinho.linhas().find(l => l.produto.id === id);

      // Nos produtos à caixa, o + e o − andam uma caixa inteira
      const passo = id => Carrinho.unidadesPorCaixa(linha(id).produto);
      if (mais)    Carrinho.definirQuantidade(mais, linha(mais).qtd + passo(mais));
      if (menos)   Carrinho.definirQuantidade(menos, linha(menos).qtd - passo(menos));
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
      const caixa = Carrinho.unidadesPorCaixa(produto);
      mostrarToast(caixa > 1
        ? `${produto.nome}: caixa de ${caixa} no carrinho`
        : `${produto.nome} adicionado ao carrinho`, true);
    });
  }

  /* Notificação que aparece em baixo */
  let temporizadorToast;
  function mostrarToast(texto, comAtalho) {
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
      <span>${texto}</span>
      ${comAtalho ? '<a class="toast-link" href="carrinho.html">Ver carrinho</a>' : ""}`;

    requestAnimationFrame(() => toast.classList.add("visivel"));
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => toast.classList.remove("visivel"), comAtalho ? 4200 : 2600);
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
    ligarFichaProduto();
    preencherContagens();
    ligarCarrinho();
    ligarContador();
    ligarBotoesAdicionar();
    ligarVerificacaoIdade();
    ligarFormulario();
    ligarAnimacoes();
    ajustarFaixaRascunho();
    ligarProgresso();
    ligarCabecalhoEncolhido();
    ligarContadores();
    ligarBrilhoCartoes();
    ligarParallaxFaixa();
    ligarInclinacao();
    ligarTransicaoPaginas();
  });
})();
