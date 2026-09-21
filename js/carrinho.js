/* =========================================================
   CARRINHO DE COMPRAS
   ---------------------------------------------------------
   Guarda o que o cliente escolheu no próprio browser dele
   (localStorage), por isso o carrinho sobrevive a recarregar
   a página e a fechar o separador.

   Não há pagamentos nem servidor: no fim, o carrinho escreve
   a encomenda numa mensagem de WhatsApp ou de email, pronta
   a enviar-te. Quem confirma tudo és tu, pela conversa.
   ========================================================= */

const Carrinho = (function () {
  "use strict";

  const CHAVE = "garrafeira-campelo-carrinho";
  const CHAVE_MODO = "garrafeira-campelo-modo";

  /* itens = { idDoProduto: quantidade } */
  let itens = carregar();

  /* Como o cliente quer receber: "recolha", "entrega" ou "pais".
     Começa em recolha, que é o único modo sem mínimo de compra. */
  let modo = carregarModo();

  function carregarModo() {
    try {
      const m = localStorage.getItem(CHAVE_MODO);
      return ["recolha", "entrega", "pais"].includes(m) ? m : "recolha";
    } catch (e) { return "recolha"; }
  }

  /* ---------- Guardar e ler do browser ---------- */

  function carregar() {
    try {
      const guardado = localStorage.getItem(CHAVE);
      return guardado ? JSON.parse(guardado) : {};
    } catch (e) {
      // Browser em modo privado ou storage bloqueado: o carrinho
      // funciona na mesma, só não sobrevive a recarregar a página.
      return {};
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch (e) { /* sem persistência — segue na mesma */ }
  }

  /* ---------- Consultar ---------- */

  function produtoPorId(id) {
    return PRODUTOS.find(p => p.id === id);
  }

  function linhas() {
    return Object.keys(itens)
      .map(id => ({ produto: produtoPorId(id), qtd: itens[id] }))
      .filter(l => l.produto);          // ignora ids de produtos entretanto apagados
  }

  function totalItens() {
    return Object.values(itens).reduce((soma, q) => soma + q, 0);
  }

  function totalEuros() {
    return linhas().reduce((soma, l) => soma + l.produto.preco * l.qtd, 0);
  }

  /* ---------- Alterar ---------- */

  function adicionar(id, quantidade = 1) {
    const produto = produtoPorId(id);
    if (!produto || produto.esgotado) return false;
    itens[id] = (itens[id] || 0) + quantidade;
    guardar();
    avisar();
    return true;
  }

  function definirQuantidade(id, quantidade) {
    if (quantidade <= 0) return remover(id);
    itens[id] = quantidade;
    guardar();
    avisar();
  }

  function remover(id) {
    delete itens[id];
    guardar();
    avisar();
  }

  function esvaziar() {
    itens = {};
    guardar();
    avisar();
  }

  /* ---------- Modo de receção ---------- */

  function modoAtual() { return modo; }

  function definirModo(novo) {
    if (!["recolha", "entrega", "pais"].includes(novo)) return;
    modo = novo;
    try { localStorage.setItem(CHAVE_MODO, modo); } catch (e) {}
    avisar();
  }

  /* A entrega em mão só existe se houver concelhos configurados */
  function entregaDisponivel() {
    return (CONFIG.entrega.concelhos || []).length > 0;
  }

  /* Quanto falta para chegar ao mínimo da entrega em mão (0 se já chega) */
  function faltaParaEntrega() {
    const minimo = CONFIG.entrega.minimo || 0;
    return Math.max(0, minimo - totalEuros());
  }

  /* A encomenda pode seguir no modo escolhido? */
  function podeEncomendar() {
    if (!linhas().length) return false;
    if (modo === "entrega") return faltaParaEntrega() === 0;
    return true;
  }

  /* ---------- Avisar quem está a ouvir ---------- */

  const ouvintes = [];
  function aoMudar(fn) { ouvintes.push(fn); }
  function avisar() { ouvintes.forEach(fn => fn()); }

  /* ---------- Escrever a encomenda ---------- */

  function euros(valor) {
    return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
  }

  function textoEncomenda() {
    const partes = [`Olá! Gostaria de encomendar na ${CONFIG.nome}:`, ""];

    linhas().forEach(l => {
      const total = euros(l.produto.preco * l.qtd);
      partes.push(`• ${l.qtd}x ${l.produto.nome} (${l.produto.volume}) · ${total}`);
    });

    partes.push("");
    partes.push(`Total: ${euros(totalEuros())}`);
    partes.push("");

    if (modo === "recolha") {
      partes.push("Vou levantar na loja.");
    } else if (modo === "entrega") {
      partes.push("Gostaria de entrega em mão. A minha morada é:");
      partes.push("(escrever aqui a morada)");
    } else {
      partes.push("Sou de fora da zona de entrega. Peço orçamento de envio para:");
      partes.push("(escrever aqui a morada)");
    }

    if (CONFIG.notaEncomenda) {
      partes.push("");
      partes.push(CONFIG.notaEncomenda);
    }
    return partes.join("\n");
  }

  /* Devolve o endereço que abre o WhatsApp ou o email já preenchido */
  function linkEncomenda() {
    const texto = textoEncomenda();

    if (CONFIG.metodoEncomenda === "email") {
      const assunto = encodeURIComponent(`Encomenda para ${CONFIG.nome}`);
      return `mailto:${CONFIG.email}?subject=${assunto}&body=${encodeURIComponent(texto)}`;
    }
    return `https://wa.me/${CONFIG.telefoneLimpo}?text=${encodeURIComponent(texto)}`;
  }

  /* ---------- O que fica acessível de fora ---------- */

  return {
    linhas, totalItens, totalEuros,
    adicionar, definirQuantidade, remover, esvaziar,
    modoAtual, definirModo, entregaDisponivel, faltaParaEntrega, podeEncomendar,
    aoMudar, textoEncomenda, linkEncomenda, euros
  };
})();
