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

  /* Dados do cliente para a encomenda. Vivem em memória; só ficam
     guardados no browser se o próprio cliente o pedir (caixa
     "Lembrar os meus dados"). As observações nunca se guardam: são
     de cada encomenda. */
  const CHAVE_DADOS = "garrafeira-campelo-cliente";
  const DADOS_VAZIOS = {
    nome: "", telefone: "", email: "",
    fatura: false, nif: "", nomeFatura: "",
    mesmaMorada: true, moradaFatura: "", codigoPostalFatura: "", localidadeFatura: "",
    morada: "", codigoPostal: "", localidade: "", concelho: "", pais: "Portugal",
    observacoes: "", lembrar: false
  };
  let dados = carregarDados();

  function carregarDados() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE_DADOS) || "null");
      if (guardado) return Object.assign({}, DADOS_VAZIOS, guardado, { lembrar: true, observacoes: "" });
    } catch (e) {}
    return Object.assign({}, DADOS_VAZIOS);
  }

  function carregarModo() {
    try {
      const m = localStorage.getItem(CHAVE_MODO);
      return ["recolha", "entrega", "pais"].includes(m) ? m : "recolha";
    } catch (e) { return "recolha"; }
  }

  /* ---------- Guardar e ler do browser ---------- */

  function carregar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {};
      // Fica só o que ainda se pode comprar. Um carrinho de uma visita
      // antiga pode ter produtos que entretanto saíram do catálogo ou
      // esgotaram: o contador contava-os, mas o carrinho aparecia vazio.
      const limpo = {};
      for (const [id, qtd] of Object.entries(guardado)) {
        const p = PRODUTOS.find(x => x.id === id);
        const n = Math.floor(Number(qtd));
        // Um produto que passou a vender-se à caixa fica com caixas completas
        if (p && !p.esgotado && n > 0) limpo[id] = caixasCompletas(p, n);
      }
      if (JSON.stringify(limpo) !== JSON.stringify(guardado)) {
        localStorage.setItem(CHAVE, JSON.stringify(limpo));
      }
      return limpo;
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
    return linhas().reduce((soma, l) => soma + l.qtd, 0);
  }

  function totalEuros() {
    return linhas().reduce((soma, l) => soma + l.produto.preco * l.qtd, 0);
  }

  /* ---------- Alterar ---------- */

  /* Venda à caixa: produtos com "caixa" (unidades por caixa) só se
     vendem em caixas completas. Arredonda para cima, para ninguém ficar
     com meia caixa no carrinho. */
  function unidadesPorCaixa(produto) {
    return produto && produto.caixa > 1 ? produto.caixa : 1;
  }

  function caixasCompletas(produto, quantidade) {
    const c = unidadesPorCaixa(produto);
    return Math.ceil(quantidade / c) * c;
  }

  /* Sem quantidade, junta uma caixa (ou uma garrafa, se não for à caixa) */
  function adicionar(id, quantidade) {
    const produto = produtoPorId(id);
    if (!produto || produto.esgotado) return false;
    const passo = unidadesPorCaixa(produto);
    itens[id] = caixasCompletas(produto, (itens[id] || 0) + (quantidade || passo));
    guardar();
    avisar();
    return true;
  }

  function definirQuantidade(id, quantidade) {
    if (quantidade <= 0) return remover(id);
    itens[id] = caixasCompletas(produtoPorId(id), quantidade);
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

  /* ---------- Dados do cliente ---------- */

  function dadosCliente() { return Object.assign({}, dados); }

  function definirDados(parcial) {
    dados = Object.assign({}, dados, parcial);
    try {
      if (dados.lembrar) {
        const { observacoes, lembrar, ...guardar } = dados;
        localStorage.setItem(CHAVE_DADOS, JSON.stringify(guardar));
      } else {
        localStorage.removeItem(CHAVE_DADOS);
      }
    } catch (e) {}
  }

  /* A morada fiscal tem de ser escrita à parte? */
  function precisaMoradaFatura() {
    return dados.fatura && (modo === "recolha" || !dados.mesmaMorada);
  }

  /* NIF português: 9 dígitos, o último é de controlo */
  function nifValido(nif) {
    const n = String(nif).replace(/\s/g, "");
    if (!/^\d{9}$/.test(n)) return false;
    const soma = [...n.slice(0, 8)].reduce((t, d, i) => t + Number(d) * (9 - i), 0);
    const resto = soma % 11;
    const controlo = resto < 2 ? 0 : 11 - resto;
    return controlo === Number(n[8]);
  }

  /* Devolve { campo: "mensagem de erro" } — vazio se estiver tudo bem */
  function validarDados() {
    const e = {};
    const d = dados;
    const emPortugal = !d.pais || /^portugal$/i.test(d.pais.trim());

    if (d.nome.trim().length < 3) e.nome = "Escreve o teu nome completo.";

    const digitos = d.telefone.replace(/\D/g, "");
    if (!digitos) e.telefone = "Precisamos de um número para confirmar a encomenda.";
    else if (digitos.length < 9) e.telefone = "O número parece curto. Confirma se falta algum algarismo.";

    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      e.email = "Este email não parece completo.";

    if (d.fatura) {
      if (!d.nif.trim()) e.nif = "Escreve o NIF para a fatura.";
      else if (emPortugal && !nifValido(d.nif)) e.nif = "Este NIF não é válido. Confirma os algarismos.";

      // A fatura com NIF leva morada fiscal. Na entrega pode ser a mesma;
      // na recolha não há outra, por isso tem de ser escrita.
      if (precisaMoradaFatura()) {
        if (!d.moradaFatura.trim()) e.moradaFatura = "A fatura com NIF precisa da morada fiscal.";
        if (!d.codigoPostalFatura.trim()) e.codigoPostalFatura = "Falta o código postal.";
        else if (emPortugal && !/^\d{4}-\d{3}$/.test(d.codigoPostalFatura.trim()))
          e.codigoPostalFatura = "Em Portugal, o código postal é assim: 4750-123.";
        if (!d.localidadeFatura.trim()) e.localidadeFatura = "Falta a localidade.";
      }
    }

    if (modo === "entrega" || modo === "pais") {
      if (!d.morada.trim()) e.morada = "Precisamos da morada para a entrega.";
      if (!d.codigoPostal.trim()) e.codigoPostal = "Falta o código postal.";
      else if (emPortugal && !/^\d{4}-\d{3}$/.test(d.codigoPostal.trim()))
        e.codigoPostal = "Em Portugal, o código postal é assim: 4750-123.";
      if (!d.localidade.trim()) e.localidade = "Falta a localidade.";
    }

    if (modo === "entrega" && !(CONFIG.entrega.concelhos || []).includes(d.concelho))
      e.concelho = "Escolhe o concelho da entrega.";

    return e;
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
    // No WhatsApp, *texto* sai a negrito. No email ficaria com os
    // asteriscos à vista, por isso só se usa no WhatsApp.
    const zap = CONFIG.metodoEncomenda !== "email";
    const titulo = t => zap ? `*${t}*` : t.toUpperCase();
    const d = dados;
    const p = [`Olá! Gostaria de encomendar na ${CONFIG.nome}:`, ""];

    linhas().forEach(l => {
      const c = unidadesPorCaixa(l.produto);
      const quanto = c > 1
        ? `${l.qtd / c} ${l.qtd / c === 1 ? "caixa" : "caixas"} de ${c} (${l.qtd} garrafas):`
        : `${l.qtd}x`;
      p.push(`• ${quanto} ${l.produto.nome} (${l.produto.volume}) · ${euros(l.produto.preco * l.qtd)}`);
    });
    p.push("", titulo(`Total: ${euros(totalEuros())}`), "");

    p.push(titulo("Cliente"));
    p.push(`Nome: ${d.nome.trim()}`);
    p.push(`Telefone: ${d.telefone.trim()}`);
    if (d.email.trim()) p.push(`Email: ${d.email.trim()}`);
    p.push("");

    p.push(titulo("Receção"));
    if (modo === "recolha") {
      p.push("Recolha na loja");
    } else {
      p.push(modo === "entrega"
        ? `Entrega em mão em ${d.concelho}`
        : "Envio, com pedido de orçamento de transporte");
      p.push(d.morada.trim());
      p.push(`${d.codigoPostal.trim()} ${d.localidade.trim()}`);
      if (d.pais.trim() && !/^portugal$/i.test(d.pais.trim())) p.push(d.pais.trim());
    }
    p.push("");

    p.push(titulo("Faturação"));
    if (d.fatura) {
      p.push(`Fatura com NIF: ${d.nif.replace(/\s/g, "")}`);
      if (d.nomeFatura.trim()) p.push(`Em nome de: ${d.nomeFatura.trim()}`);
      // Repete a morada mesmo quando é a da entrega: nome, NIF e morada
      // juntos são o que se copia para passar a fatura.
      const outra = precisaMoradaFatura();
      const rua = (outra ? d.moradaFatura : d.morada).trim();
      const cp  = (outra ? d.codigoPostalFatura : d.codigoPostal).trim();
      const loc = (outra ? d.localidadeFatura : d.localidade).trim();
      p.push(`Morada fiscal: ${rua}, ${cp} ${loc}`);
    } else {
      p.push("Sem NIF (consumidor final)");
    }

    if (d.observacoes.trim()) {
      p.push("", titulo("Observações"), d.observacoes.trim());
    }

    if (CONFIG.notaEncomenda) p.push("", CONFIG.notaEncomenda);
    return p.join("\n");
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
    dadosCliente, definirDados, validarDados, nifValido,
    aoMudar, textoEncomenda, linkEncomenda, euros, unidadesPorCaixa
  };
})();
