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
├── vinhos.html       Catálogo de vinhos (Verdes e Maduros)
├── espumantes.html   Catálogo de espumantes
├── cervejas.html     Catálogo de cervejas
├── produto.html      Página de cada produto (produto.html?id=...)
├── carrinho.html     Carrinho e dados para a encomenda
├── profissionais.html Restaurantes, cafés e outros negócios
├── sobre.html        Sobre a casa
├── contacto.html     Morada, horário, formulário e entregas
├── privacidade.html  Política de privacidade (RGPD)
├── catalogo/
│   ├── produtos.xlsx      ←  O CATÁLOGO (fica só no teu Mac)
│   ├── atualizar-site.py  Passa a folha para o site
│   └── criar-modelo.py    Cria uma folha nova e vazia
├── css/
│   └── style.css     Estilos, paleta da marca e animações
├── js/
│   ├── config.js      ←  OS TEUS DADOS (contactos, horário, entregas)
│   ├── produtos.js    Gerado a partir do Excel — não editar à mão
│   ├── ilustracoes.js Garrafas e latas desenhadas em SVG
│   ├── carrinho.js    Lógica do carrinho
│   └── main.js        Navegação, filtros, pesquisa, animações, formulário
└── img/              Logótipo, favicon, capa social e fotos de produtos
```

Só precisas de mexer em dois sítios: **`js/config.js`** e **`catalogo/produtos.xlsx`**.

## Os teus dados — `js/config.js`

Tudo o que escreveres aqui aparece automaticamente em todas as páginas:
cabeçalho, rodapé, página de contacto e mensagens de encomenda.

Os campos marcados `// POR PREENCHER` ainda têm dados de exemplo:
telefone, email, morada, horário, redes sociais e condições de entrega.

Se deixares uma rede social vazia (`""`), o ícone desaparece do site sozinho.

**Telefones.** O `telefone` é o principal: é o que aparece à frente e o que o
botão "Ligar" marca. O `telefone2` e o `telefone3` aparecem a seguir, e somem
sozinhos se ficarem vazios. O `telefoneLimpo` (só dígitos, com o 351) é o número
do **WhatsApp**: é para lá que vão as encomendas do carrinho, por isso é o do
WhatsApp Business. Ao lado de cada número, o site escreve sozinho "Chamada para a
rede fixa nacional" ou "rede móvel nacional", conforme o número comece por 9 ou
não, como a lei obriga.

## O catálogo — `catalogo/produtos.xlsx`

Os produtos geres-los numa folha de Excel, uma linha por produto. Depois:

```bash
python3 catalogo/atualizar-site.py
```

O comando lê a folha, confere se está tudo bem preenchido, e atualiza
`js/produtos.js`. Se houver algum erro — categoria que não existe, preço em
falta, nome vazio —, **não mexe em nada** e diz-te em que linha está o
problema.

Para só conferir sem mudar nada:

```bash
python3 catalogo/atualizar-site.py --verificar
```

A folha tem uma aba **Como preencher** com a explicação de cada coluna. O
essencial:

- **Publicar** — Sim para aparecer no site, Não para esconder. Útil para
  produtos fora de época.
- **Categoria** e **Tipo** — escolhe da lista, para não haver erros de escrita.
- **Preço loja**: o preço na loja, com IVA incluído, só o número.
- **Preço site**: não se escreve. Calcula-se sozinho, com o preço da loja mais
  5%, e é o que aparece no site. A percentagem está na aba **Definições**: se a
  mudares, todos os preços do site acompanham.
- **Etiqueta**: opcional, aparece no canto do cartão (Reserva, DOC, Novidade).
- **Sempre no início**: Sim para o produto estar sempre no "Em destaque" da
  página inicial. Os lugares que sobram enchem-se à sorte, e mudam em cada visita.
- **Fotografia** — opcional; o nome de um ficheiro na pasta `img`. Sem foto, o
  site desenha uma garrafa na cor do tipo. O site é escuro: fotos com fundo
  transparente ou escuro ficam integradas na montra; com fundo branco, aparecem
  como um cartão fotográfico dentro dela.

A ordem das linhas conta: é a **Sugestão da casa**, a ordem em que as páginas
mostram os produtos. Os clientes podem depois pesquisar e ordenar pelo preço
ou pelo nome.

### A folha fica só no teu computador

`catalogo/produtos.xlsx` **não vai para o GitHub**, de propósito. O repositório
é público: se acrescentares uma coluna com preços de custo ou margens, ficava
visível para toda a gente. O `js/produtos.js` gerado vai, porque tem só o que o
site mostra de qualquer forma.

O lado mau: não há cópia da folha em lado nenhum. **Guarda uma no iCloud ou
no Google Drive.**

Se a perderes, cria uma nova e vazia com `python3 catalogo/criar-modelo.py`.

### Não edites o `js/produtos.js` à mão

É gerado. O que lá escreveres é substituído da próxima vez que o comando correr.

## Como funciona o carrinho

Não há pagamentos nem servidor. O carrinho guarda as escolhas no browser do
cliente e, no fim, escreve a encomenda numa mensagem de **WhatsApp** ou de
**email**, pronta a enviar-te. Confirmas disponibilidade, entrega e pagamento
pela conversa.

Para trocar entre WhatsApp e email, muda `metodoEncomenda` no `config.js`.

### Particulares e empresas

No passo dos dados, o cliente escolhe **Particular** ou **Empresa** (restaurante,
café ou outro negócio). Numa encomenda de empresa pede-se o nome e o NIF, e a
fatura com NIF passa a ser obrigatória, porque é em nome da empresa que sai. A
mensagem da encomenda leva uma linha `Empresa:` e a faturação já preenchida.

As quantidades escrevem-se à mão no carrinho, em garrafas ou em caixas, para
quem leva 24 garrafas não ter de carregar 24 vezes no "+".

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
- [x] Preencher `catalogo/produtos.xlsx` com os produtos reais e correr `atualizar-site.py`
- [x] Trocar as garrafas desenhadas por fotografias dos produtos
- [ ] Trocar as fotos de banco de imagens por fotos da loja
- [ ] Ligar o formulário de contacto a um serviço a sério (Formspree, Netlify
      Forms ou um backend próprio) — hoje só valida no browser
- [ ] Escrever a política de privacidade e os termos, se passar a vender online
- [ ] Deixar o Google encontrar o site: apagar a linha `FORA DO GOOGLE` de todas as páginas
- [ ] Decidir se há condições diferentes para restaurantes e cafés (preço, mínimo,
      pagamento a 30 dias) e escrevê-las na `profissionais.html`

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

## Fora do Google

O site está publicado, mas escondido das pesquisas: todas as páginas têm a
marca `<meta name="robots" content="noindex, nofollow">`, assinalada com o
comentário `FORA DO GOOGLE`. Quem tiver a ligação vê o site normalmente.

Quando quiseres que o Google o encontre, apaga essa linha em todas as páginas.

## Publicar

Como é um site estático, dá para publicar de graça:

- **GitHub Pages** — só funciona em repositórios **públicos** em contas Free.
  Em *Settings → Pages*, escolhe `Deploy from a branch`, branch `main`, pasta `/ (root)`.
- **Netlify** ou **Cloudflare Pages** — publicam repositórios privados no plano
  gratuito e atualizam sozinhos a cada `git push`.
