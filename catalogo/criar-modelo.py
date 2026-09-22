#!/usr/bin/env python3
"""
Cria o ficheiro catalogo/produtos.xlsx, o modelo onde preenches o catálogo.

Só precisas de correr isto uma vez. Se o ficheiro já existir, não mexe
nele (para não apagares o teu trabalho por engano).

    python3 catalogo/criar-modelo.py

Não precisa de instalar nada: um ficheiro .xlsx é um ZIP com ficheiros
XML lá dentro, e o Python sabe escrever isso sozinho.
"""

import sys
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from xml.sax.saxutils import escape

PASTA = Path(__file__).parent
DESTINO = PASTA / "produtos.xlsx"

# Linhas preparadas com listas pendentes (dá para 200 produtos)
LINHAS = 200

CATEGORIAS = ["Verde", "Maduro", "Espumantes", "Cervejas"]
TIPOS = ["Tinto", "Branco", "Rosé", "Cerveja"]
DOCURAS = ["Bruto Natural", "Extra Bruto", "Bruto", "Extra Seco", "Seco", "Meio Seco", "Doce"]

# Quanto mais caro é o preço no site do que o da loja. Fica na aba
# Definições da folha, onde se pode mudar sem mexer em mais nada.
AUMENTO_SITE = 0.05

# (cabeçalho, largura, estilo, estilo do exemplo)
COLUNAS = [
    ("Publicar",                    11, 2, 4),
    ("Nome",                        30, 2, 4),
    ("Categoria",                   14, 2, 4),
    ("Tipo",                        13, 2, 4),
    ("Doçura",                      14, 2, 4),
    ("Produtor",                    24, 2, 4),
    ("Região",                      22, 2, 4),
    ("Ano",                          8, 9, 10),
    ("Volume",                      10, 2, 4),
    ("Preço loja (€, com IVA)",     13, 3, 5),
    ("Preço site (€, com IVA)",     13, 11, 5),
    ("Descrição",                   60, 2, 4),
    ("Etiqueta",                    14, 2, 4),
    ("Esgotado",                    11, 2, 4),
    ("Fotografia",                  24, 2, 4),
    ("Álcool (%)",                  10, 9, 10),
    ("Unidades por caixa",          12, 9, 10),
]

EXEMPLO = [
    "Não", "Alvarinho Reserva (exemplo)", "Verde", "Branco", "",
    "Quinta de Exemplo", "Monção e Melgaço", 2023, "75 cl", 14.90, None,
    "Pêssego branco e flor de laranjeira, com acidez viva e final salino. "
    "Vai bem com marisco e peixe grelhado.",
    "Novidade", "Não", "", 12.5, 6,
]

INSTRUCOES = [
    ("titulo", "Como preencher o catálogo"),
    ("texto", ""),
    ("texto", "Cada linha da folha Produtos é um produto no site. Preenches "
              "aqui, gravas, e depois corres um comando que atualiza o site."),
    ("texto", ""),
    ("negrito", "A linha 2 é um exemplo"),
    ("texto", "Tem Publicar = Não, por isso não aparece no site. Serve para "
              "veres o formato. Podes apagá-la quando já não precisares."),
    ("texto", ""),
    ("titulo", "Colunas"),
    ("texto", ""),
    ("negrito", "Publicar"),
    ("texto", "Sim para aparecer no site, Não para esconder. Útil para produtos "
              "fora de época, que queres manter na folha sem mostrar."),
    ("negrito", "Nome"),
    ("texto", "Como aparece no site. Obrigatório."),
    ("negrito", "Categoria"),
    ("texto", "Escolhe da lista: Verde, Maduro, Espumantes ou Cervejas. O Douro "
              "e o Alentejo são maduros: escolhe Maduro e escreve a região na "
              "coluna Região. Define em que página do site o produto aparece. "
              "Obrigatório."),
    ("negrito", "Tipo"),
    ("texto", "Escolhe da lista: Tinto, Branco, Rosé ou Cerveja. Nos espumantes, "
              "é a cor do espumante. Define a cor da garrafa desenhada e os filtros."),
    ("negrito", "Doçura"),
    ("texto", "Só nos espumantes: Bruto Natural, Extra Bruto, Bruto, Extra Seco, "
              "Seco, Meio Seco ou Doce. Aparece no cartão e nos filtros da página "
              "dos espumantes. Nos outros produtos, deixa vazio."),
    ("negrito", "Produtor e Região"),
    ("texto", "Aparecem por baixo do nome, no cartão do produto. Nos maduros, a "
              "Região também decide o filtro da página dos vinhos: Douro, "
              "Alentejo ou Outros maduros."),
    ("negrito", "Ano"),
    ("texto", "Ano de colheita. Deixa vazio nas cervejas e nos vinhos sem ano."),
    ("negrito", "Volume"),
    ("texto", "Escreve como queres que apareça: 75 cl, 1,5 l, 33 cl."),
    ("negrito", "Preço loja"),
    ("texto", "O preço de venda na loja, com IVA incluído, em euros. Só o "
              "número: 14,90 e não 14,90 €. Obrigatório."),
    ("negrito", "Preço site"),
    ("texto", "Não se escreve: calcula-se sozinho, com o Preço loja mais o aumento "
              "da aba Definições (5%). É o preço que aparece no site. Se num produto "
              "quiseres outro preço no site, escreve o número por cima; esse produto "
              "deixa de acompanhar o Preço loja."),
    ("negrito", "Descrição"),
    ("texto", "Uma ou duas frases. É o que convence alguém a escolher este vinho "
              "e não outro do mesmo preço: com que prato vai, a que temperatura, "
              "se é para beber já ou guardar."),
    ("negrito", "Etiqueta"),
    ("texto", "Opcional. Aparece no canto do cartão: Reserva, Novidade, "
              "Favorito. Os produtos com etiqueta aparecem em destaque na "
              "página inicial."),
    ("negrito", "Esgotado"),
    ("texto", "Sim esconde o botão de comprar, mas o produto continua visível."),
    ("negrito", "Álcool (%)"),
    ("texto", "Opcional. O teor alcoólico, só o número: 13,5. Aparece na página "
              "do produto."),
    ("negrito", "Unidades por caixa"),
    ("texto", "Quantas garrafas tem a caixa: 6, 12, 24. Com um número, o produto só "
              "se vende à caixa: o botão acrescenta a caixa inteira e o carrinho "
              "anda de caixa em caixa. Vazio, vende-se à unidade."),
    ("negrito", "Fotografia"),
    ("texto", "Opcional. Nome do ficheiro da foto, que tem de estar na pasta img "
              "do site. Por exemplo: alvarinho-reserva.webp. Sem foto, o site "
              "desenha uma garrafa na cor do tipo."),
    ("texto", ""),
    ("negrito", "Aba Definições"),
    ("texto", "Tem o aumento dos preços no site, 5%. Se o mudares, todos os preços "
              "do site mudam de uma vez."),
    ("texto", ""),
    ("titulo", "Depois de gravares"),
    ("texto", ""),
    ("texto", "No Terminal, na pasta do site:"),
    ("negrito", "python3 catalogo/atualizar-site.py"),
    ("texto", "Isto lê a folha, confere se está tudo bem preenchido e atualiza "
              "o site. Se houver um erro, diz-te em que linha e o que falta."),
    ("texto", ""),
    ("titulo", "Atenção"),
    ("texto", ""),
    ("texto", "Esta folha fica só no teu computador: não vai para o GitHub, que é "
              "público. Por isso podes acrescentar colunas tuas, como preço de "
              "custo ou fornecedor, sem que apareçam no site."),
    ("texto", "Mas também quer dizer que não há cópia dela em lado nenhum. "
              "Guarda uma no iCloud ou no Google Drive."),
]


# ---------------------------------------------------------------
# Construção do XML
# ---------------------------------------------------------------

def letra(n):
    """1 -> A, 2 -> B, ... 27 -> AA"""
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def col(nome):
    """A letra da coluna cujo cabeçalho começa por nome: col("Ano") -> H"""
    return letra(next(i for i, c in enumerate(COLUNAS, 1) if c[0].startswith(nome)))


def com_aumento(loja, aumento):
    """O preço da loja com o aumento, arredondado ao cêntimo como o ARRED
    do Excel: 4,95 + 5% = 5,1975, que fica 5,20."""
    valor = Decimal(str(loja)) * (1 + Decimal(str(aumento)))
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def celula_preco_site(r, loja, estilo, aumento):
    """A célula Preço site da linha r: uma fórmula que soma o aumento ao
    Preço loja. Leva já o resultado, para se ler bem antes de o Excel a
    calcular."""
    ref_loja = f"{col('Preço loja')}{r}"
    formula = f'IF({ref_loja}="","",ROUND({ref_loja}*(1+AumentoSite),2))'
    valor = f"<v>{com_aumento(loja, aumento)}</v>" if isinstance(loja, (int, float)) else ""
    return f'<c r="{col("Preço site")}{r}" s="{estilo}"><f>{escape(formula)}</f>{valor}</c>'


def celulas_da_linha(r, valores, estilo, aumento):
    """Uma célula por coluna. A coluna Preço site leva sempre a fórmula."""
    site = col("Preço site")
    loja = valores[next(i for i, c in enumerate(COLUNAS) if c[0].startswith("Preço loja"))]
    return "".join(
        celula_preco_site(r, loja, estilo(c), aumento) if letra(i) == site
        else celula(f"{letra(i)}{r}", v, estilo(c))
        for i, (c, v) in enumerate(zip(COLUNAS, valores), 1)
    )


def ultima_linha(produtos):
    """Até onde vão as listas pendentes e as fórmulas: sempre com espaço
    para mais produtos do que os que há."""
    return max(LINHAS, len(produtos or []) + 100) + 1


def celula(ref, valor, estilo):
    if valor is None or valor == "":
        return f'<c r="{ref}" s="{estilo}"/>'
    if isinstance(valor, (int, float)):
        return f'<c r="{ref}" s="{estilo}"><v>{valor}</v></c>'
    return (f'<c r="{ref}" s="{estilo}" t="inlineStr">'
            f'<is><t xml:space="preserve">{escape(str(valor))}</t></is></c>')


def folha_produtos(produtos=None, aumento=AUMENTO_SITE):
    """Sem produtos, é o modelo vazio, com a linha de exemplo. Com
    produtos (listas de valores pela ordem de COLUNAS), escreve-os a
    partir da linha 2."""
    ncol = len(COLUNAS)
    ultima = letra(ncol)
    fim = ultima_linha(produtos)

    cols = "".join(
        f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>'
        for i, (_, w, _, _) in enumerate(COLUNAS, 1)
    )

    linhas = []
    # Cabeçalho
    cab = "".join(celula(f"{letra(i)}1", c[0], 1) for i, c in enumerate(COLUNAS, 1))
    linhas.append(f'<row r="1" ht="36" customHeight="1">{cab}</row>')
    if produtos:
        # A altura acompanha o tamanho da descrição, para se ler toda
        desc = [c[0] for c in COLUNAS].index("Descrição")
        for r, valores in enumerate(produtos, 2):
            texto = str(valores[desc] or "")
            altura = max(20, 15 * -(-len(texto) // 58) + 6) if texto else 20
            cels = celulas_da_linha(r, valores, lambda c: c[2], aumento)
            linhas.append(f'<row r="{r}" ht="{altura}" customHeight="1">{cels}</row>')
        primeira_vazia = len(produtos) + 2
    else:
        # Exemplo
        ex = celulas_da_linha(2, EXEMPLO, lambda c: c[3], aumento)
        linhas.append(f'<row r="2" ht="48" customHeight="1">{ex}</row>')
        primeira_vazia = 3
    # Linhas vazias, já com estilo, bordas e a fórmula do Preço site
    vazio = [None] * ncol
    for r in range(primeira_vazia, fim + 1):
        linhas.append(f'<row r="{r}">{celulas_da_linha(r, vazio, lambda c: c[2], aumento)}</row>')

    def lista(col, valores, titulo, texto):
        # As aspas fazem parte da fórmula da lista; escapa só & < >
        return (f'<dataValidation type="list" allowBlank="1" showInputMessage="1" '
                f'showErrorMessage="1" errorTitle="{escape(titulo)}" '
                f'error="{escape(texto)}" sqref="{col}2:{col}{fim}">'
                f'<formula1>"{escape(",".join(valores))}"</formula1></dataValidation>')

    # A letra de cada coluna sai da lista de colunas (col), para as
    # listas pendentes continuarem certas se se acrescentar uma coluna
    validacoes = [
        lista(col("Publicar"), ["Sim", "Não"], "Publicar", "Escolhe Sim ou Não."),
        lista(col("Categoria"), CATEGORIAS, "Categoria", "Escolhe uma categoria da lista."),
        lista(col("Tipo"), TIPOS, "Tipo", "Escolhe um tipo da lista."),
        lista(col("Doçura"), DOCURAS, "Doçura", "Escolhe uma doçura da lista."),
        lista(col("Esgotado"), ["Sim", "Não"], "Esgotado", "Escolhe Sim ou Não."),
        (f'<dataValidation type="whole" operator="between" allowBlank="1" '
         f'showErrorMessage="1" errorTitle="Ano" '
         f'error="Escreve um ano com quatro algarismos, ou deixa vazio." '
         f'sqref="{col("Ano")}2:{col("Ano")}{fim}"><formula1>1900</formula1><formula2>2100</formula2></dataValidation>'),
        (f'<dataValidation type="decimal" operator="greaterThan" allowBlank="1" '
         f'showErrorMessage="1" errorTitle="Preço" '
         f'error="Escreve só o número, maior que zero. Por exemplo: 14,90" '
         f'sqref="{col("Preço loja")}2:{col("Preço loja")}{fim}"><formula1>0</formula1></dataValidation>'),
        (f'<dataValidation type="decimal" operator="between" allowBlank="1" '
         f'showErrorMessage="1" errorTitle="Álcool" '
         f'error="Escreve só o número, entre 0 e 80. Por exemplo: 13,5" '
         f'sqref="{col("Álcool")}2:{col("Álcool")}{fim}"><formula1>0</formula1><formula2>80</formula2></dataValidation>'),
        (f'<dataValidation type="whole" operator="between" allowBlank="1" '
         f'showErrorMessage="1" errorTitle="Unidades por caixa" '
         f'error="Escreve um número inteiro, por exemplo 6, ou deixa vazio para vender à unidade." '
         f'sqref="{col("Unidades")}2:{col("Unidades")}{fim}"><formula1>1</formula1><formula2>48</formula2></dataValidation>'),
    ]

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView tabSelected="1" workbookViewId="0" zoomScale="110"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>{cols}</cols>
<sheetData>{"".join(linhas)}</sheetData>
<autoFilter ref="A1:{ultima}{fim}"/>
<dataValidations count="{len(validacoes)}">{"".join(validacoes)}</dataValidations>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>'''


def folha_definicoes(aumento=AUMENTO_SITE):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="110"/></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols><col min="1" max="1" width="44" customWidth="1"/><col min="2" max="2" width="12" customWidth="1"/></cols>
<sheetData>
<row r="1" ht="26" customHeight="1">{celula("A1", "Definições", 6)}</row>
<row r="3" ht="24" customHeight="1">{celula("A3", "Aumento dos preços no site", 8)}{celula("B3", aumento, 12)}</row>
<row r="4" ht="64" customHeight="1">{celula("A4", "O preço que aparece no site é o Preço loja mais esta percentagem. "
    "Muda o número e grava: a coluna Preço site acerta-se sozinha. Depois corre o "
    "comando que atualiza o site.", 7)}</row>
</sheetData>
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>'''


def folha_instrucoes():
    estilos = {"titulo": 6, "texto": 7, "negrito": 8}
    linhas = []
    for r, (tipo, texto) in enumerate(INSTRUCOES, 1):
        altura = ' ht="26" customHeight="1"' if tipo == "titulo" else ""
        if tipo == "texto" and len(texto) > 90:
            altura = f' ht="{18 * (len(texto) // 90 + 1)}" customHeight="1"'
        linhas.append(f'<row r="{r}"{altura}>{celula(f"A{r}", texto, estilos[tipo])}</row>')

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="110"/></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols><col min="1" max="1" width="96" customWidth="1"/></cols>
<sheetData>{"".join(linhas)}</sheetData>
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>'''


ESTILOS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts>
<fonts count="5">
  <font><sz val="11"/><name val="Arial"/><family val="2"/></font>
  <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
  <font><i/><sz val="11"/><color rgb="FF808080"/><name val="Arial"/><family val="2"/></font>
  <font><b/><sz val="15"/><color rgb="FF53000F"/><name val="Arial"/><family val="2"/></font>
  <font><b/><sz val="11"/><name val="Arial"/><family val="2"/></font>
</fonts>
<fills count="6">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF53000F"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF6EBD5"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border>
    <left style="thin"><color rgb="FFD9D9D9"/></left>
    <right style="thin"><color rgb="FFD9D9D9"/></right>
    <top style="thin"><color rgb="FFD9D9D9"/></top>
    <bottom style="thin"><color rgb="FFD9D9D9"/></bottom>
    <diagonal/>
  </border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
  <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
  <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
  <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
  <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
  <xf numFmtId="9" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''

TIPOS_CONTEUDO = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>'''

RELACOES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

LIVRO = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>
<sheet name="Produtos" sheetId="1" r:id="rId1"/>
<sheet name="Como preencher" sheetId="2" r:id="rId2"/>
<sheet name="Definições" sheetId="3" r:id="rId3"/>
</sheets>
<definedNames><definedName name="AumentoSite">'Definições'!$B$3</definedName><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Produtos!$A$1:$ULTIMA$</definedName></definedNames>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>'''

RELACOES_LIVRO = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''


def criar(destino, produtos=None, aumento=AUMENTO_SITE):
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", TIPOS_CONTEUDO)
        z.writestr("_rels/.rels", RELACOES)
        z.writestr("xl/workbook.xml", LIVRO.replace("ULTIMA$", f"{letra(len(COLUNAS))}${ultima_linha(produtos)}"))
        z.writestr("xl/_rels/workbook.xml.rels", RELACOES_LIVRO)
        z.writestr("xl/styles.xml", ESTILOS)
        z.writestr("xl/worksheets/sheet1.xml", folha_produtos(produtos, aumento))
        z.writestr("xl/worksheets/sheet2.xml", folha_instrucoes())
        z.writestr("xl/worksheets/sheet3.xml", folha_definicoes(aumento))


if __name__ == "__main__":
    forcar = "--forcar" in sys.argv
    if DESTINO.exists() and not forcar:
        print(f"{DESTINO.name} já existe. Não mexi nele, para não perderes o que lá tens.")
        print("Se quiseres mesmo um modelo novo e vazio, apaga o ficheiro primeiro.")
        sys.exit(0)
    criar(DESTINO)
    print(f"Criado: {DESTINO}")
