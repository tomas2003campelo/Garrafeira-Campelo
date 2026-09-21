/* =========================================================
   CATÁLOGO DE PRODUTOS
   ---------------------------------------------------------
   ATENÇÃO: TODOS os produtos aqui em baixo são de EXEMPLO.
   Nomes, produtores, preços e descrições são inventados, só
   para o site ter conteúdo enquanto não tens o catálogo real.
   SUBSTITUI TUDO antes de pores o site online.

   Como adicionar um produto: copia um bloco { ... } inteiro,
   cola-o a seguir e muda os valores. Campos:

     id         texto único, sem espaços (usado pelo carrinho)
     nome       nome do produto
     categoria  "verde" | "maduro" | "espumantes" | "cervejas"
                (o Douro e o Alentejo são maduros)
     tipo       "tinto" | "branco" | "rosé" | "espumante" | "cerveja"
     produtor   quinta ou marca
     regiao     região ou denominação. Nos maduros, decide o filtro
                da página dos vinhos: Douro, Alentejo ou Outros maduros
     ano        ano de colheita (usa null nas cervejas)
     volume     ex: "75 cl", "33 cl"
     preco      número, em euros. Usa ponto decimal: 12.50
     descricao  uma ou duas frases para o cartão
     cor        cor da garrafa desenhada (código hexadecimal)
     imagem     opcional — caminho de uma fotografia, ex: "img/vinho.webp"
                Se existir, a foto substitui a garrafa desenhada.
     destaque   opcional — etiqueta no canto do cartão
     esgotado   opcional — true esconde o botão de adicionar
   ========================================================= */

const PRODUTOS = [

  /* ---------------- MADUROS DO DOURO ---------------- */
  {
    id: "douro-reserva-xisto",
    nome: "Reserva do Xisto",
    categoria: "maduro", tipo: "tinto",
    produtor: "Quinta do Exemplo", regiao: "Douro DOC",
    ano: 2019, volume: "75 cl", preco: 18.50,
    descricao: "Fruta escura, notas de esteva e um final longo e mineral. Pede carne assada.",
    cor: "#53000F", destaque: "Reserva"
  },
  {
    id: "douro-encosta-nascente",
    nome: "Encosta Nascente",
    categoria: "maduro", tipo: "tinto",
    produtor: "Quinta do Exemplo", regiao: "Douro DOC",
    ano: 2021, volume: "75 cl", preco: 11.90,
    descricao: "Mais leve e fresco. Ameixa, pimenta preta e taninos macios.",
    cor: "#6B1020"
  },
  {
    id: "douro-branco-altitude",
    nome: "Branco de Altitude",
    categoria: "maduro", tipo: "branco",
    produtor: "Quinta do Exemplo", regiao: "Douro DOC",
    ano: 2022, volume: "75 cl", preco: 13.40,
    descricao: "Rabigato e Viosinho de vinha velha. Citrinos, funcho e boa tensão.",
    cor: "#C29E61"
  },
  {
    id: "douro-castelo-numao-branco",
    nome: "Castelo Numão Branco",
    categoria: "maduro", tipo: "branco",
    produtor: "Produtor de exemplo", regiao: "Douro DOC",
    ano: 2022, volume: "75 cl", preco: 9.90,
    descricao: "Exemplo com fotografia real, para veres como fica um produto com foto em vez da garrafa desenhada.",
    cor: "#C29E61",
    imagem: "img/castelo-numao-branco.webp"
  },

  /* ---------------- VERDE ---------------- */
  {
    id: "verde-atlantico",
    nome: "Minho Atlântico",
    categoria: "verde", tipo: "branco",
    produtor: "Quinta do Exemplo", regiao: "Vinho Verde DOC",
    ano: 2023, volume: "75 cl", preco: 8.20,
    descricao: "Limão, maçã verde e acidez vibrante. Perfeito com marisco.",
    cor: "#D4C274"
  },
  {
    id: "verde-alvarinho",
    nome: "Alvarinho de Monção",
    categoria: "verde", tipo: "branco",
    produtor: "Quinta do Exemplo", regiao: "Vinho Verde DOC",
    ano: 2022, volume: "75 cl", preco: 15.40,
    descricao: "Mais gordo e complexo: pêssego, flor de laranjeira e fundo salino.",
    cor: "#CFBC6C", destaque: "Favorito"
  },
  {
    id: "verde-rose",
    nome: "Verde Rosé",
    categoria: "verde", tipo: "rosé",
    produtor: "Quinta do Exemplo", regiao: "Vinho Verde DOC",
    ano: 2023, volume: "75 cl", preco: 7.50,
    descricao: "Espadeiro. Framboesa, ligeira agulha e final seco. Serve bem fresco.",
    cor: "#D98A9A"
  },

  /* ---------------- MADUROS DE OUTRAS REGIÕES ---------------- */
  {
    id: "maduro-alentejo-sobreiro",
    nome: "Herdade do Sobreiro",
    categoria: "maduro", tipo: "tinto",
    produtor: "Herdade de exemplo", regiao: "Alentejo DOC",
    ano: 2022, volume: "75 cl", preco: 9.50,
    descricao: "Maduro e redondo, com baunilha do estágio em madeira. Fácil de beber.",
    cor: "#7A1424"
  },
  {
    id: "maduro-dao-granito",
    nome: "Pedra Granítica",
    categoria: "maduro", tipo: "tinto",
    produtor: "Quinta do Exemplo", regiao: "Dão DOC",
    ano: 2020, volume: "75 cl", preco: 14.00,
    descricao: "Elegante e contido. Framboesa, folha de tomate e boa acidez.",
    cor: "#5E0A18"
  },
  {
    id: "maduro-bairrada-branco",
    nome: "Barro Branco",
    categoria: "maduro", tipo: "branco",
    produtor: "Quinta do Exemplo", regiao: "Bairrada DOC",
    ano: 2021, volume: "75 cl", preco: 12.60,
    descricao: "Bical e Maria Gomes. Pera, avelã e textura cremosa.",
    cor: "#CBB768"
  },
  {
    id: "maduro-setubal-rose",
    nome: "Areia de Setúbal",
    categoria: "maduro", tipo: "rosé",
    produtor: "Quinta do Exemplo", regiao: "Península de Setúbal",
    ano: 2023, volume: "75 cl", preco: 7.80,
    descricao: "Morango, melancia e final seco. Serve a 8 °C.",
    cor: "#D07C8E"
  },
  {
    id: "maduro-moscatel",
    nome: "Moscatel Velho 10 Anos",
    categoria: "maduro", tipo: "tinto",
    produtor: "Quinta do Exemplo", regiao: "Setúbal DOC",
    ano: 2014, volume: "50 cl", preco: 24.00,
    descricao: "Laranja cristalizada, mel e noz. Para o fim da refeição.",
    cor: "#A8642A", destaque: "10 anos"
  },

  /* ---------------- ESPUMANTES ---------------- */
  {
    id: "espumante-metodo-classico",
    nome: "Método Clássico Bruto",
    categoria: "espumantes", tipo: "espumante",
    produtor: "Quinta do Exemplo", regiao: "Bairrada DOC",
    ano: 2019, volume: "75 cl", preco: 19.90,
    descricao: "36 meses sobre borras. Bolha fina, pão torrado e maçã assada.",
    cor: "#DCC98A", destaque: "36 meses"
  },
  {
    id: "espumante-rose-baga",
    nome: "Espumante Rosé Baga",
    categoria: "espumantes", tipo: "espumante",
    produtor: "Quinta do Exemplo", regiao: "Bairrada DOC",
    ano: 2020, volume: "75 cl", preco: 16.50,
    descricao: "Groselha e brioche. Ótimo como aperitivo ou com entradas.",
    cor: "#DD94A3"
  },
  {
    id: "espumante-bruto-natural",
    nome: "Bruto Natural",
    categoria: "espumantes", tipo: "espumante",
    produtor: "Quinta do Exemplo", regiao: "Távora-Varosa DOC",
    ano: 2021, volume: "75 cl", preco: 13.20,
    descricao: "Sem adição de açúcar. Seco, direto e muito gastronómico.",
    cor: "#D9C98F"
  },

  /* ---------------- CERVEJAS ---------------- */
  {
    id: "cerveja-ipa-lupulo",
    nome: "IPA do Lúpulo",
    categoria: "cervejas", tipo: "cerveja",
    produtor: "Fábrica de exemplo", regiao: "Portugal",
    ano: null, volume: "33 cl", preco: 3.20,
    descricao: "IPA artesanal de amargor médio. Citrinos, resina e final seco.",
    cor: "#B5701A"
  },
  {
    id: "cerveja-stout-cafe",
    nome: "Stout de Café",
    categoria: "cervejas", tipo: "cerveja",
    produtor: "Fábrica de exemplo", regiao: "Portugal",
    ano: null, volume: "33 cl", preco: 3.60,
    descricao: "Escura e cremosa, com café torrado e chocolate preto.",
    cor: "#2E1A12", destaque: "Escura"
  },
  {
    id: "cerveja-lager-artesanal",
    nome: "Lager Artesanal",
    categoria: "cervejas", tipo: "cerveja",
    produtor: "Fábrica de exemplo", regiao: "Portugal",
    ano: null, volume: "33 cl", preco: 2.40,
    descricao: "Leve, limpa e refrescante. A escolha fácil para acompanhar petiscos.",
    cor: "#D9A441"
  },
  {
    id: "cerveja-trigo",
    nome: "Cerveja de Trigo",
    categoria: "cervejas", tipo: "cerveja",
    produtor: "Fábrica de exemplo", regiao: "Portugal",
    ano: null, volume: "33 cl", preco: 3.10,
    descricao: "Turva e suave, com banana e cravinho. Serve com uma rodela de laranja.",
    cor: "#E0B85C"
  },
  {
    id: "cerveja-sem-alcool",
    nome: "Sem Álcool 0,0",
    categoria: "cervejas", tipo: "cerveja",
    produtor: "Fábrica de exemplo", regiao: "Portugal",
    ano: null, volume: "33 cl", preco: 2.10,
    descricao: "Todo o sabor sem álcool nenhum. Para quem conduz.",
    cor: "#C9A15A", esgotado: true
  }
];

/* Nomes bonitos para mostrar no site, por categoria */
const CATEGORIAS = {
  verde:      { nome: "Verde",      descricao: "Noroeste atlântico. Leves, cítricos e de acidez marcada." },
  maduro:     { nome: "Maduro",     descricao: "Do Douro ao Alentejo, passando pelo Dão e pela Bairrada. Tintos, brancos e rosés." },
  espumantes: { nome: "Espumantes", descricao: "Método clássico e bolha fina, para celebrar ou acompanhar a refeição." },
  cervejas:   { nome: "Cervejas",   descricao: "Artesanais portuguesas, de IPA a stout." }
};
