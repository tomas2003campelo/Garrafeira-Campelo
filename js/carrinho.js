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
     "Lembrar os meus dados"). As observações e o dia da recolha
     nunca se guardam: são de cada encomenda.
     "tipo" é "particular" ou "empresa" (restaurante, café ou outro
     negócio). Uma empresa leva sempre fatura com NIF. */
  const CHAVE_DADOS = "garrafeira-campelo-cliente";
  const DADOS_VAZIOS = {
    tipo: "particular", empresa: "",
    nome: "", telefone: "", email: "",
    fatura: false, nif: "", nomeFatura: "",
    mesmaMorada: true, moradaFatura: "", codigoPostalFatura: "", localidadeFatura: "",
    morada: "", codigoPostal: "", localidade: "", concelho: "", pais: "Portugal",
    diaRecolha: "", observacoes: "", lembrar: false
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
        const { observacoes, diaRecolha, lembrar, ...guardar } = dados;
        localStorage.setItem(CHAVE_DADOS, JSON.stringify(guardar));
      } else {
        localStorage.removeItem(CHAVE_DADOS);
      }
    } catch (e) {}
  }

  function eEmpresa() { return dados.tipo === "empresa"; }

  /* Fatura com NIF: quando o particular a pede, e sempre numa empresa */
  function comFatura() { return dados.fatura || eEmpresa(); }

  /* A morada fiscal tem de ser escrita à parte? */
  function precisaMoradaFatura() {
    return comFatura() && (modo === "recolha" || !dados.mesmaMorada);
  }

  /* ---------- Dia da recolha na loja ----------
     O horário vem do config.js, escrito para pessoas ("Segunda a
     Sexta", "09:00 – 19:00"). Daqui sai, para cada dia da semana, a
     hora a que a loja abre e fecha, ou null se estiver fechada. Se o
     horário mudar no config.js, os dias aceites mudam com ele. */
  const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  function horasDoDia(diaSemana) {           // 0 = domingo ... 6 = sábado
    for (const h of CONFIG.horario || []) {
      const nomes = h.dia.toLowerCase().replace(/-feira/g, "").split(/\s+a\s+/).map(n => n.trim());
      const ini = DIAS_SEMANA.indexOf(nomes[0]);
      const fim = DIAS_SEMANA.indexOf(nomes[nomes.length - 1]);
      if (ini < 0 || fim < 0) continue;
      const dentro = ini <= fim
        ? diaSemana >= ini && diaSemana <= fim
        : diaSemana >= ini || diaSemana <= fim;
      if (!dentro) continue;
      const m = (h.horas || "").match(/(\d{1,2})[:h](\d{2})?\D+(\d{1,2})[:h]?(\d{2})?/);
      if (!m) return null;
      const hora = (hh, mm) => `${hh.padStart(2, "0")}:${mm || "00"}`;
      return { abre: hora(m[1], m[2]), fecha: hora(m[3], m[4]) };
    }
    return null;
  }

  /* "2026-09-26", como vem da caixa de data, em data do dia local */
  function dataLocal(texto) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || "");
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  /* "sábado, 26 de setembro" */
  function textoDoDia(texto) {
    const dia = dataLocal(texto);
    return dia ? dia.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }) : "";
  }

  /* Mensagem de erro para o dia escolhido, ou "" se servir */
  function erroNoDiaDeRecolha(texto) {
    const dia = dataLocal(texto);
    if (!dia) return "Escolha o dia em que vem buscar a encomenda.";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dia < hoje) return "Esse dia já passou. Escolha outro.";
    if (dia - hoje > 90 * 864e5) return "Escolha um dia nos próximos três meses.";
    const horas = horasDoDia(dia.getDay());
    if (!horas) {
      const nome = dia.toLocaleDateString("pt-PT", { weekday: "long" });
      return `${nome.endsWith("feira") ? "À" : "Ao"} ${nome} estamos fechados. Escolha outro dia.`;
    }
    if (dia.getTime() === hoje.getTime()) {
      // No próprio dia, só até uma hora antes de fechar
      const agora = new Date();
      const [h, m] = horas.fecha.split(":").map(Number);
      if (agora.getHours() * 60 + agora.getMinutes() > h * 60 + m - 60)
        return "Hoje já não dá tempo de prepararmos a encomenda. Escolha outro dia.";
    }
    return "";
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

    if (eEmpresa() && d.empresa.trim().length < 2) e.empresa = "Indique o nome da empresa.";
    if (d.nome.trim().length < 3) e.nome = "Indique o seu nome completo.";

    const digitos = d.telefone.replace(/\D/g, "");
    if (!digitos) e.telefone = "Precisamos de um número para confirmar a encomenda.";
    else if (digitos.length < 9) e.telefone = "O número parece curto. Confirme se falta algum algarismo.";

    if (!d.email.trim()) e.email = "Indique o seu email: é para lá que enviamos a fatura.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      e.email = "Este email não parece completo.";

    if (modo === "recolha") {
      const erroDia = erroNoDiaDeRecolha(d.diaRecolha);
      if (erroDia) e.diaRecolha = erroDia;
    }

    if (comFatura()) {
      if (!d.nif.trim()) e.nif = eEmpresa() ? "Indique o NIF da empresa." : "Indique o NIF para a fatura.";
      else if (emPortugal && !nifValido(d.nif)) e.nif = "Este NIF não é válido. Confirme os algarismos.";

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
      e.concelho = "Escolha o concelho da entrega.";

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

    p.push(titulo(eEmpresa() ? "Cliente (empresa)" : "Cliente"));
    if (eEmpresa()) p.push(`Empresa: ${d.empresa.trim()}`);
    p.push(`Nome: ${d.nome.trim()}`);
    p.push(`Telefone: ${d.telefone.trim()}`);
    if (d.email.trim()) p.push(`Email: ${d.email.trim()}`);
    p.push("");

    p.push(titulo("Receção"));
    if (modo === "recolha") {
      p.push("Recolha na loja");
      if (d.diaRecolha) p.push(`Dia: ${textoDoDia(d.diaRecolha)}`);
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
    if (comFatura()) {
      p.push(`Fatura com NIF: ${d.nif.replace(/\s/g, "")}`);
      const emNomeDe = d.nomeFatura.trim() || (eEmpresa() ? d.empresa.trim() : "");
      if (emNomeDe) p.push(`Em nome de: ${emNomeDe}`);
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
    dadosCliente, definirDados, validarDados, nifValido, eEmpresa,
    horasDoDia, dataLocal, textoDoDia, erroNoDiaDeRecolha,
    aoMudar, textoEncomenda, linkEncomenda, euros, unidadesPorCaixa
  };
})();
