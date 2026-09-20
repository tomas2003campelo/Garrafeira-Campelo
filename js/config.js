/* =========================================================
   CONFIGURAÇÃO DO NEGÓCIO
   ---------------------------------------------------------
   É AQUI que mudas os teus dados. Tudo o que escreveres neste
   ficheiro aparece automaticamente em todas as páginas do site:
   cabeçalho, rodapé, página de contacto e mensagens de encomenda.

   Os campos marcados com POR PREENCHER têm dados de exemplo.
   Substitui-os pelos verdadeiros.
   ========================================================= */

const CONFIG = {

  /* --- Identidade --- */
  nome: "Garrafeira Campelo",
  tagline: "Retalhista de vinhos · Direto das quintas",
  descricao: "Vinhos do Douro, Verde, Maduro, Espumantes e Cervejas, comprados diretamente a quem os faz.",

  /* --- Contactos ---------------------------------------
     POR PREENCHER: troca pelos teus dados reais.          */

  telefone: "+351 936 506 371",
  telefoneLimpo: "351936506371",       // só dígitos, com indicativo do país, para o WhatsApp
  telefone2: "+351 936 506 373",       // segundo número, mostrado a seguir ao primeiro
  email: "j.campelo.unipessoal@gmail.com",

  morada: {
    rua: "Rua Principal, 1201",
    codigoPostal: "4775-237",
    localidade: "Silveiros, Barcelos",
    pais: "Portugal"
  },

  /* Horário de funcionamento. Deixa a string vazia ("") num dia
     em que estejas fechado — o site mostra "Encerrado".        */
  horario: [
    { dia: "Segunda a Sexta", horas: "09:00 – 19:00" },
    { dia: "Sábado",          horas: "09:00 – 13:00" },
    { dia: "Domingo",         horas: "" }
  ],

  /* --- Redes sociais ---
     Deixa vazio ("") qualquer rede que não tenhas — o ícone
     desaparece do site sozinho.                                */
  redes: {
    instagram: "",   // POR PREENCHER — ex: "https://instagram.com/garrafeiracampelo"
    facebook: "",    // POR PREENCHER
    tripadvisor: ""  // POR PREENCHER
  },

  /* --- Encomendas ---
     Como preferes receber os pedidos do carrinho:
       "whatsapp" → abre o WhatsApp com a encomenda escrita
       "email"    → abre o programa de email com a encomenda escrita   */
  metodoEncomenda: "whatsapp",

  /* Valor mínimo de encomenda em euros (0 = sem mínimo) */
  encomendaMinima: 0,

  /* Texto que acompanha a encomenda enviada */
  notaEncomenda: "Encomenda feita através do site. Confirmo disponibilidade e combino entrega e pagamento por esta via.",

  /* --- Dados legais da empresa ---
     Obrigatórios num site comercial português. Quem compra tem
     direito a saber com quem está a negociar antes de encomendar.  */

  empresa: {
    denominacao: "J. Faria Campelo, Unipessoal Lda",
    nif: "506401561",
    sede: "",                 // vazio = usa a morada da loja
    capitalSocial: "",        // Opcional — só se for sociedade
    registoComercial: ""      // Opcional — conservatória e número de matrícula
  },

  /* Entidade de resolução alternativa de litígios de consumo.
     Um site que vende a consumidores tem de indicar a entidade a
     que está vinculado ou a que o cliente pode recorrer.
     Procura a da tua região em www.consumidor.gov.pt              */
  litigios: {
    // O CIAB é a entidade competente para o concelho de Barcelos,
    // sem limite de valor. Verificado em setembro de 2026.
    nome: "CIAB — Tribunal Arbitral de Consumo",
    site: "https://www.ciab.pt"
  },

  /* --- Entregas ---
     Dois modos: entrega em mão nos concelhos da zona, e o resto
     do país mediante orçamento. A lista de concelhos aparece
     sozinha no site — acrescenta ou tira e o site acompanha.    */
  entrega: {
    /* Concelhos onde entregas pessoalmente */
    concelhos: ["Barcelos", "Famalicão", "Braga", "Póvoa de Varzim", "Vila do Conde"],

    emMao:  "Entrega em mão, sem custo de portes.",
    prazo:  "Dia e hora combinados consigo.",
    resto:  "Pedimos orçamento de transporte antes de fechar a encomenda.",

    /* Resumo curto, para o topo da página inicial */
    resumo: "Entrega em mão no Minho"
  }
};
