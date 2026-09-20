# Garrafeira Campelo — site

Site de catálogo com carrinho de encomendas, em HTML, CSS e JavaScript puros.
Sem passo de build, sem dependências, sem Node.

## Como ver o site

Abre o `index.html` no browser:

```bash
open index.html
```

Sempre que gravares uma alteração, recarrega a página (`⌘R`).

## Estrutura

```
.
├── index.html        Início
├── vinhos.html       Catálogo de vinhos (Douro, Verde, Maduro)
├── espumantes.html   Catálogo de espumantes
├── cervejas.html     Catálogo de cervejas
├── sobre.html        Sobre a casa
├── contacto.html     Morada, horário, formulário e entregas
├── privacidade.html  Política de privacidade (RGPD)
├── css/
│   └── style.css     Estilos, paleta da marca e animações
├── js/
│   ├── config.js      ←  OS TEUS DADOS (contactos, horário, entregas)
│   ├── produtos.js    ←  O CATÁLOGO (vinhos e cervejas)
│   ├── ilustracoes.js Garrafas e latas desenhadas em SVG
│   ├── carrinho.js    Lógica do carrinho
│   └── main.js        Navegação, filtros, animações, formulário
└── img/              Logótipo, favicon, capa social e fotos de produtos
```

Só precisas de mexer em dois ficheiros: **`js/config.js`** e **`js/produtos.js`**.

## Os teus dados — `js/config.js`

Tudo o que escreveres aqui aparece automaticamente em todas as páginas:
cabeçalho, rodapé, página de contacto e mensagens de encomenda.

Os campos marcados `// POR PREENCHER` ainda têm dados de exemplo:
telefone, email, morada, horário, redes sociais e condições de entrega.

Se deixares uma rede social vazia (`""`), o ícone desaparece do site sozinho.

## O catálogo — `js/produtos.js`

Cada produto é um bloco. Para acrescentar um, copia um bloco inteiro, cola a
seguir e muda os valores:

```js
{
  id: "identificador-unico",      // sem espaços — é o que o carrinho usa
  nome: "Nome do produto",
  categoria: "douro",             // douro | verde | maduro | espumantes | cervejas
  tipo: "tinto",                  // tinto | branco | rosé | espumante | cerveja
  produtor: "Quinta X",
  regiao: "Douro DOC",
  ano: 2021,                      // null nas cervejas
  volume: "75 cl",
  preco: 12.50,                   // ponto decimal, não vírgula
  descricao: "Uma ou duas frases.",
  cor: "#53000F",                 // cor da garrafa desenhada
  imagem: "img/foto.webp",        // opcional — substitui a garrafa desenhada
  destaque: "Reserva",            // opcional — etiqueta no canto
  esgotado: true                  // opcional — esconde o botão de comprar
}
```

Os produtos com `destaque` aparecem na secção "Em destaque" da página inicial.

> **Todos os produtos atuais são de exemplo.** Nomes, produtores, preços e notas
> de prova são inventados. Substitui-os antes de pôr o site online.

## Como funciona o carrinho

Não há pagamentos nem servidor. O carrinho guarda as escolhas no browser do
cliente e, no fim, escreve a encomenda numa mensagem de **WhatsApp** ou de
**email**, pronta a enviar-te. Confirmas disponibilidade, entrega e pagamento
pela conversa.

Para trocar entre WhatsApp e email, muda `metodoEncomenda` no `config.js`.

## Obrigações legais

O site já tem as três peças que a lei portuguesa exige:

- **Livro de Reclamações Eletrónico** — link no rodapé de todas as páginas,
  para `livroreclamacoes.pt`. Reclamações têm de ser respondidas em 15 dias úteis.
- **Identificação da empresa** — denominação, NIF e sede no rodapé, a partir do
  `config.js`. Enquanto estiverem por preencher, o rodapé mostra um aviso visível
  em vez de ficar em branco.
- **Política de privacidade** — em `privacidade.html`, escrita sobre o que o site
  realmente faz. **Por rever** antes de publicar.

As páginas legais estão isentas da verificação de idade: ninguém deve ter de
declarar idade para ler a política de privacidade.

## Por fazer

- [ ] Preencher os dados da empresa no `js/config.js` (denominação, NIF, sede)
- [ ] Rever a política de privacidade com quem trata da contabilidade
- [ ] Indicar a entidade de resolução de litígios (o link só aparece depois de preenchida)
- [ ] Preencher os contactos reais no `js/config.js`
- [ ] Substituir os produtos de exemplo no `js/produtos.js`
- [ ] Trocar as garrafas desenhadas por fotografias dos produtos
- [ ] Trocar as fotos de banco de imagens por fotos da loja
- [ ] Ligar o formulário de contacto a um serviço a sério (Formspree, Netlify
      Forms ou um backend próprio) — hoje só valida no browser
- [ ] Escrever a política de privacidade e os termos, se passar a vender online

## Notas

**Verificação de idade.** Aparece um aviso de +18 na primeira visita, como a lei
exige para venda de bebidas alcoólicas. A resposta fica guardada só durante a
sessão do browser.

**As fotografias são de banco de imagens.** Mostram adegas genéricas, não a
tua loja. A proveniência e as licenças estão no [CREDITOS.md](CREDITOS.md), que
também explica o que ter em conta se as trocares. Substitui-as por fotos tuas
quando as tiveres — é o que mais diferença faz no site.

**As garrafas são desenhos, não fotografias.** São SVG gerado em
`js/ilustracoes.js`, pintado com a cor que puseres em cada produto. Mantém o
site leve, mas é um desenho: assim que tiveres fotos dos produtos, preenche o
campo `imagem` e a fotografia passa à frente do desenho.

**Acessibilidade e animações.** O site respeita a definição do sistema de
*reduzir movimento*: quem a tiver ligada não vê animação nenhuma — nem as
de scroll, nem os contadores, nem o parallax.

## Modo de pré-visualização

O site está publicado como **rascunho**, com duas coisas temporárias:

- Uma **faixa dourada** no topo de todas as páginas a dizer que os produtos
  são exemplos
- Uma marca `<meta name="robots" content="noindex, nofollow">` que impede o
  Google de indexar o site

**Quando o catálogo for real, apaga as duas em todas as páginas.** Ambas estão
assinaladas com um comentário `PRÉ-VISUALIZAÇÃO` no HTML, e o estilo da faixa
está em `css/style.css`, na secção com o mesmo nome. Enquanto a marca `noindex`
lá estiver, o site não aparece nas pesquisas — por muito bom que seja.

## Publicar

Como é um site estático, dá para publicar de graça:

- **GitHub Pages** — só funciona em repositórios **públicos** em contas Free.
  Em *Settings → Pages*, escolhe `Deploy from a branch`, branch `main`, pasta `/ (root)`.
- **Netlify** ou **Cloudflare Pages** — publicam repositórios privados no plano
  gratuito e atualizam sozinhos a cada `git push`.
