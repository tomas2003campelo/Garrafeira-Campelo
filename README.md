# Site de Vinhos — Garrafeira Campelo

Site estático de catálogo de vinhos portugueses. HTML, CSS e JavaScript puros —
sem passo de build, sem dependências, sem Node.

## Como ver o site

Basta abrir o `index.html` no browser:

```bash
open index.html
```

Se preferires servir por HTTP (mais parecido com produção):

```bash
python3 -m http.server 8000
```

E depois abrir http://localhost:8000

## Estrutura

```
.
├── index.html        Página única com todas as secções
├── css/
│   └── style.css     Estilos, paleta e responsivo
├── js/
│   ├── vinhos.js     Dados do catálogo (editar aqui)
│   └── main.js       Filtros, menu e formulário
└── README.md
```

## Editar o catálogo

Os vinhos vivem em `js/vinhos.js`, num array de objetos. Para adicionar um vinho,
copia um bloco existente e muda os campos:

```js
{
  nome: "Nome do vinho",
  regiao: "Douro",
  tipo: "tinto",          // tinto | branco | rosé | espumante | fortificado
  ano: 2021,
  preco: 12.50,
  nota: "Descrição curta para o cartão.",
  cor: "#6b1f2e",         // cor da garrafa no cartão
  destaque: "Reserva"     // opcional — etiqueta no canto
}
```

> **Os dados atuais são de exemplo.** Nomes, preços e notas de prova são
> fictícios, só para dar forma ao layout. Substitui-os pelos reais antes de
> publicar.

Se acrescentares um tipo novo, adiciona-o também à lista `TIPOS` no topo de
`js/main.js` para aparecer nos filtros.

## Por fazer

- [ ] Substituir os dados de exemplo por vinhos reais
- [ ] Trocar as garrafas em CSS por fotografias dos produtos
- [ ] Ligar o formulário de contacto a um serviço a sério (Formspree, Netlify
      Forms ou um backend próprio) — hoje só valida no browser
- [ ] Definir os textos legais e a política de privacidade
- [ ] Verificação de idade (+18), se for para vender online

## Publicar com GitHub Pages

Como é um site estático, dá para publicar de graça: no repositório do GitHub vai a
**Settings → Pages**, em *Source* escolhe `Deploy from a branch`, e seleciona a
branch `main` com a pasta `/ (root)`. Em um ou dois minutos o site fica em
`https://<utilizador>.github.io/<repositorio>/`.
