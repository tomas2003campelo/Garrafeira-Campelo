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

  /* itens = { idDoProduto: quantidade } */
  let itens = carregar();

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
      partes.push(`• ${l.qtd}x ${l.produto.nome} (${l.produto.volume}) — ${total}`);
    });

    partes.push("");
    partes.push(`Total: ${euros(totalEuros())}`);

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
      const assunto = encodeURIComponent(`Encomenda — ${CONFIG.nome}`);
      return `mailto:${CONFIG.email}?subject=${assunto}&body=${encodeURIComponent(texto)}`;
    }
    return `https://wa.me/${CONFIG.telefoneLimpo}?text=${encodeURIComponent(texto)}`;
  }

  /* ---------- O que fica acessível de fora ---------- */

  return {
    linhas, totalItens, totalEuros,
    adicionar, definirQuantidade, remover, esvaziar,
    aoMudar, textoEncomenda, linkEncomenda, euros
  };
})();
