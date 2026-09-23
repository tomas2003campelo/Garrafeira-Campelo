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
  descricao: "Vinhos Verdes e maduros do Douro, do Alentejo e de outras regiões, espumantes e cervejas, comprados diretamente a quem os faz.",

  /* --- Contactos ---------------------------------------
     POR PREENCHER: troca pelos teus dados reais.          */

  /* O primeiro número é o principal: é o que o botão "Ligar" marca e o
     que aparece à frente. É o fixo da loja, que tem o WhatsApp Business
     ligado a dois telemóveis, por isso é também para onde vão as
     encomendas do carrinho. Os outros dois aparecem a seguir; deixa
     vazio ("") qualquer um que não queiras mostrar. */
  telefone: "+351 252 961 558",
  telefoneLimpo: "351252961558",       // só dígitos, com indicativo do país, para o WhatsApp
  telefone2: "+351 936 506 371",       // segundo número, mostrado a seguir ao primeiro
  telefone3: "+351 936 506 373",       // terceiro, se houver
  email: "j.campelo.unipessoal@gmail.com",

  morada: {
    rua: "Rua Principal, 1201",
    codigoPostal: "4775-237",
    localidade: "Silveiros, Barcelos",
    pais: "Portugal"
  },

  /* Ligação dos botões "Ver no mapa" e "Como chegar". Procura só a
     morada, sem o nome da loja: com o nome, o Google mandava as pessoas
     para outra empresa, o produtor "Campelo" de Moure. Quando a loja
     tiver ficha no Google (Perfil da Empresa), podes pôr aqui a ligação
     dessa ficha. */
  mapa: "https://www.google.com/maps/search/?api=1&query=Rua%20Principal%201201%2C%204775-237%20Silveiros%2C%20Barcelos",

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
    instagram: "https://www.instagram.com/garrafeira_campelo/",
    facebook: "https://www.facebook.com/profile.php?id=61594402711283",
    tripadvisor: ""  // deixa vazio enquanto não tiveres — o ícone não aparece
  },

  /* --- Encomendas ---
     Como preferes receber os pedidos do carrinho:
       "whatsapp" → abre o WhatsApp com a encomenda escrita
       "email"    → abre o programa de email com a encomenda escrita   */
  metodoEncomenda: "whatsapp",

  /* Texto que acompanha a encomenda enviada */
  /* Frase final da mensagem. É o CLIENTE que a envia, por isso está
     escrita na voz dele, não na tua. */
  notaEncomenda: "Encomenda feita através do site. Fico a aguardar a vossa confirmação.",

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
    nome: "CIAB (Tribunal Arbitral de Consumo)",
    site: "https://www.ciab.pt"
  },

  /* --- Como o cliente recebe a encomenda ---
     Três modos, que o cliente escolhe no carrinho:

       1. Recolha na loja    sem mínimo de compra
       2. Entrega em mão     só a partir do valor mínimo, e só nos concelhos da lista
       3. Resto do país      mediante orçamento de transporte

     Para mudar o valor mínimo da entrega, muda o número em "minimo".
     Para deixar de fazer entregas em mão, põe "concelhos: []".       */

  recolha: {
    texto: "Recolha na loja, sem mínimo de compra.",
    prazo: "Pronta a levantar no próprio dia ou no seguinte. Avisamos quando estiver."
  },

  entrega: {
    /* Valor mínimo, em euros, para entrega em mão. Abaixo disto, o
       cliente só pode escolher a recolha na loja. */
    minimo: 80,

    /* Concelhos onde entregas pessoalmente */
    concelhos: ["Barcelos", "Famalicão", "Braga", "Póvoa de Varzim", "Vila do Conde"],

    prazo:  "Dia e hora combinados consigo.",
    resto:  "Pedimos orçamento de transporte antes de fechar a encomenda.",

    /* Resumo curto, para o topo da página inicial */
    resumo: "Recolha na loja ou entrega em mão"
  }
};
