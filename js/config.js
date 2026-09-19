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

  telefone: "+351 000 000 000",        // POR PREENCHER
  telefoneLimpo: "351000000000",       // POR PREENCHER — só dígitos, com indicativo do país, para o WhatsApp
  email: "geral@garrafeiracampelo.pt", // POR PREENCHER

  morada: {
    rua: "Rua Exemplo, 000",           // POR PREENCHER
    codigoPostal: "0000-000",          // POR PREENCHER
    localidade: "Localidade",          // POR PREENCHER
    pais: "Portugal"
  },

  /* Horário de funcionamento. Deixa a string vazia ("") num dia
     em que estejas fechado — o site mostra "Encerrado".        */
  horario: [
    { dia: "Segunda a Sexta", horas: "10:00 – 19:00" },  // POR PREENCHER
    { dia: "Sábado",          horas: "10:00 – 13:00" },  // POR PREENCHER
    { dia: "Domingo",         horas: "" }                // POR PREENCHER
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

  /* --- Entregas --- */
  entrega: {
    texto: "Entregamos em todo o Portugal continental.",  // POR PREENCHER
    prazo: "2 a 3 dias úteis",                            // POR PREENCHER
    portes: "Portes grátis acima de 50 €"                 // POR PREENCHER
  }
};
