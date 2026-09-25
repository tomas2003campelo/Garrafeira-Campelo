#!/usr/bin/env python3
"""
Lê o catálogo de catalogo/produtos.xlsx e atualiza o site.

    python3 catalogo/atualizar-site.py              atualiza o site
    python3 catalogo/atualizar-site.py --verificar  só confere, não mexe em nada

Confere a folha toda antes de escrever. Se houver um erro em qualquer
linha, não altera nada no site e diz-te o que corrigir.

Não precisa de instalar nada: lê o .xlsx com o que o Python já traz.
"""

import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parent.parent
EXCEL = RAIZ / "catalogo" / "produtos.xlsx"
DESTINO = RAIZ / "js" / "produtos.js"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

CATEGORIAS = {
    "verde": "verde", "verdes": "verde", "vinho verde": "verde",
    "maduro": "maduro", "maduros": "maduro",
    "espumantes": "espumantes", "espumante": "espumantes",
    "cervejas": "cervejas", "cerveja": "cervejas",
}

# O Douro e o Alentejo são maduros. Uma folha antiga, em que o Douro
# era categoria à parte, continua a funcionar: passa a Maduro, e a
# região fica preenchida se estiver vazia, para o filtro do site o pôr
# no sítio certo.
REGIOES_COMO_CATEGORIA = {"douro": "Douro", "alentejo": "Alentejo"}
TIPOS = {
    "tinto": "tinto", "branco": "branco", "rosé": "rosé", "rose": "rosé",
    "espumante": "espumante", "cerveja": "cerveja",
}

# A garrafa desenhada toma a cor do tipo
CORES = {
    "tinto": "#53000F", "branco": "#C9B35F", "rosé": "#D98A9A",
    "espumante": "#DCC98A", "cerveja": "#C08A2E",
}

# Doçura dos espumantes, pelos nomes da lei portuguesa. Aceita também
# os nomes franceses que aparecem nos rótulos.
DOCURAS = {
    "bruto natural": "Bruto Natural", "brut nature": "Bruto Natural",
    "extra bruto": "Extra Bruto", "extra brut": "Extra Bruto",
    "bruto": "Bruto", "brut": "Bruto",
    "extra seco": "Extra Seco", "extra sec": "Extra Seco",
    "seco": "Seco", "sec": "Seco",
    "meio seco": "Meio Seco", "meio-seco": "Meio Seco", "demi-sec": "Meio Seco",
    "doce": "Doce", "doux": "Doce",
}

# O que o cabeçalho diz → o nome do campo. Aceita variações, para a
# folha continuar a funcionar se mudares um pouco o texto do cabeçalho.
CABECALHOS = {
    "publicar": "publicar",
    "nome": "nome",
    "categoria": "categoria",
    "tipo": "tipo",
    "doçura": "docura", "docura": "docura", "dosagem": "docura",
    "produtor": "produtor",
    "região": "regiao", "regiao": "regiao",
    "ano": "ano", "colheita": "ano",
    "volume": "volume",
    # Uma folha antiga, com uma só coluna de preço, mostra esse preço no site
    "preço": "preco", "preco": "preco", "pvp": "preco",
    "descrição": "descricao", "descricao": "descricao",
    "etiqueta": "destaque", "destaque": "destaque",
    "esgotado": "esgotado",
    "fotografia": "imagem", "foto": "imagem", "imagem": "imagem",
    "álcool": "alcool", "alcool": "alcool", "teor": "alcool",
    "unidades": "caixa", "caixa": "caixa",
    "sempre": "inicio",
}

# Cabeçalhos de duas palavras, que se leem antes dos de uma
CABECALHOS_COMPOSTOS = {
    "preço loja": "preco_loja", "preco loja": "preco_loja", "preço na loja": "preco_loja",
    "preço site": "preco_site", "preco site": "preco_site", "preço no site": "preco_site",
    "preço online": "preco_site", "preco online": "preco_site",
    "sempre no início": "inicio", "sempre no inicio": "inicio",
    "destaque no início": "inicio", "destaque no inicio": "inicio",
}

# Sem a aba Definições, o preço do site é o da loja mais isto
AUMENTO_SITE = 0.05


# ---------------------------------------------------------------
# Ler o .xlsx
# ---------------------------------------------------------------

def ler_folha(caminho):
    """Devolve a primeira folha como lista de linhas: [(nº, {coluna: valor})]."""
    with zipfile.ZipFile(caminho) as z:
        partilhados = textos_partilhados(z)
        folha = ET.fromstring(z.read(caminho_da_folha(z, "Produtos") or caminho_da_folha(z)))

    linhas = []
    for row in folha.iter(f"{{{NS['m']}}}row"):
        numero = int(row.get("r"))
        celulas = {}
        for c in row.findall("m:c", NS):
            coluna = re.match(r"[A-Z]+", c.get("r")).group()
            valor = valor_da_celula(c, partilhados)
            if valor not in (None, ""):
                celulas[coluna] = valor
        linhas.append((numero, celulas))
    return linhas


def textos_partilhados(z):
    """Quando o Excel grava, guarda os textos à parte e as células passam
    a ter só o índice."""
    partilhados = []
    if "xl/sharedStrings.xml" in z.namelist():
        raiz = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in raiz.findall("m:si", NS):
            # Junta todos os pedaços: um texto com negrito numa palavra
            # vem partido em vários <t>
            partilhados.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    return partilhados


def caminho_da_folha(z, nome=None):
    """O caminho da folha com este nome (sem nome, a primeira), ou None."""
    livro = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    alvo = {r.get("Id"): r.get("Target") for r in rels}
    folhas = livro.findall("m:sheets/m:sheet", NS)
    rid = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    escolhida = next((f for f in folhas if f.get("name") == nome), None) if nome else folhas[0]
    if escolhida is None:
        return None
    destino = alvo[escolhida.get(rid)].lstrip("/")
    return destino if destino.startswith("xl/") else "xl/" + destino


def ler_aumento(caminho):
    """O aumento dos preços no site, da célula com o nome AumentoSite (na
    aba Definições). None se a folha não o tiver."""
    with zipfile.ZipFile(caminho) as z:
        livro = ET.fromstring(z.read("xl/workbook.xml"))
        nome = next((d for d in livro.iter(f"{{{NS['m']}}}definedName")
                     if d.get("name") == "AumentoSite"), None)
        sitio = re.fullmatch(r"'?(.+?)'?!\$?([A-Z]+)\$?(\d+)", (nome.text or "").strip()) if nome is not None else None
        caminho_folha = caminho_da_folha(z, sitio.group(1)) if sitio else None
        if not caminho_folha:
            return None
        ref = sitio.group(2) + sitio.group(3)
        folha = ET.fromstring(z.read(caminho_folha))
        celula = next((c for c in folha.iter(f"{{{NS['m']}}}c") if c.get("r") == ref), None)
        return valor_da_celula(celula, textos_partilhados(z)) if celula is not None else None


def valor_da_celula(c, partilhados):
    tipo = c.get("t")
    if tipo == "inlineStr":
        return "".join(t.text or "" for t in c.iter(f"{{{NS['m']}}}t")).strip()
    v = c.find("m:v", NS)
    if v is None or v.text is None:
        return None
    if tipo == "s":
        return partilhados[int(v.text)].strip()
    if tipo in ("str", "e"):
        return v.text.strip()
    if tipo == "b":
        return "Sim" if v.text == "1" else "Não"
    # Número
    n = float(v.text)
    return int(n) if n.is_integer() else n


# ---------------------------------------------------------------
# Transformar em produtos
# ---------------------------------------------------------------

def slug(texto):
    """'Alvarinho de Monção' → 'alvarinho-de-moncao'"""
    s = unicodedata.normalize("NFKD", texto)
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "produto"


def sim(valor):
    return str(valor).strip().lower() in ("sim", "s", "yes", "x", "1", "verdadeiro")


def preco(valor):
    """Aceita 14.9, '14,90', '14,90 €', '€ 14.90'."""
    if isinstance(valor, (int, float)):
        return float(valor)
    limpo = str(valor).replace("€", "").replace(" ", "").replace(",", ".")
    return float(limpo)


def com_aumento(loja, aumento):
    """O preço da loja com o aumento, arredondado ao cêntimo como o ARRED
    do Excel: 4,95 + 5% = 5,1975, que fica 5,20."""
    valor = Decimal(str(loja)) * (1 + Decimal(str(aumento)))
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def euros(valor):
    """5.2 -> '5,20 €'"""
    return f"{valor:.2f} €".replace(".", ",")


def percentagem(valor):
    """5% vem do Excel como 0,05. Aceita também "5%" e 5 escritos à mão."""
    texto = str(valor).replace("%", "").replace(",", ".").strip()
    n = float(texto)
    if "%" in str(valor) or n > 1:
        n /= 100
    if not 0 <= n <= 1:
        raise ValueError
    return n


def volume(valor):
    """'75cl' -> '75 cl', '1,5L' -> '1,5 l', '33 CL' -> '33 cl'.
    Um número sem unidade é tratado como centilitros."""
    texto = str(valor).strip()
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(cl|ml|l|lt|litros?)?\.?", texto, re.I)
    if not m:
        return texto
    numero, unidade = m.group(1).replace(".", ","), (m.group(2) or "cl").lower()
    unidade = "l" if unidade in ("lt", "litro", "litros") else unidade
    return f"{numero} {unidade}"


def ler_produtos():
    linhas = ler_folha(EXCEL)
    if not linhas:
        return [], ["A folha Produtos está vazia."], []

    # Mapear colunas pelo texto do cabeçalho, não pela posição
    _, cabecalho = linhas[0]
    mapa = {}
    for coluna, texto in cabecalho.items():
        inteiro = " ".join(str(texto).strip().lower().split(" (")[0].split())
        chave = inteiro.split(" ")[0]
        if inteiro in CABECALHOS_COMPOSTOS:
            mapa[coluna] = CABECALHOS_COMPOSTOS[inteiro]
        elif chave in CABECALHOS:
            mapa[coluna] = CABECALHOS[chave]

    em_falta = {"nome", "categoria"} - set(mapa.values())
    if not {"preco", "preco_loja", "preco_site"} & set(mapa.values()):
        em_falta.add("preço")
    if em_falta:
        return [], [f"Não encontrei a coluna: {', '.join(sorted(em_falta))}. "
                    "Confirma que o cabeçalho na linha 1 não foi apagado."], []

    produtos, erros, avisos = [], [], []

    # O preço do site é o da loja mais o aumento da aba Definições
    aumento = AUMENTO_SITE
    bruto = ler_aumento(EXCEL)
    if bruto not in (None, ""):
        try:
            aumento = percentagem(bruto)
        except (ValueError, TypeError):
            return [], [f"Na aba Definições, o aumento \"{bruto}\" não é uma percentagem válida. "
                        "Escreve, por exemplo, 5%."], []
    elif "preco_loja" in mapa.values():
        avisos.append("Não encontrei o aumento na aba Definições. Usei 5%.")
    ids_vistos = {}
    escondidos = 0

    for numero, celulas in linhas[1:]:
        dados = {mapa[c]: v for c, v in celulas.items() if c in mapa}
        if not dados:
            continue  # linha vazia

        nome = str(dados.get("nome", "")).strip()
        sitio = f"Linha {numero}" + (f" ({nome})" if nome else "")

        # Só publica o que está marcado Sim. Vazio conta como Sim, para
        # não desaparecerem produtos por esquecimento. Um valor que não
        # seja nem Sim nem Não é um erro: esconder calado faria um produto
        # sumir sem se perceber porquê.
        if "publicar" in dados:
            marca = str(dados["publicar"]).strip().lower()
            if marca in ("não", "nao", "n", "no", "0", "falso"):
                escondidos += 1
                continue
            if not sim(marca):
                erros.append(f"{sitio}: na coluna Publicar está \"{dados['publicar']}\". "
                             "Tem de ser Sim ou Não.")
                continue

        if not nome:
            erros.append(f"{sitio}: falta o nome.")
            continue

        # A linha de exemplo do modelo não pode ir para o site. Basta
        # apagar o "Não" da coluna Publicar sem querer para ela passar a
        # contar: por isso é travada pelo nome, não pela coluna.
        if "(exemplo)" in nome.lower():
            erros.append(f"{sitio}: esta é a linha de exemplo do modelo. "
                         "Apaga-a, ou põe Não na coluna Publicar.")
            continue

        cat_bruta = str(dados.get("categoria", "")).strip().lower()
        regiao = str(dados.get("regiao", "")).strip()
        if cat_bruta in REGIOES_COMO_CATEGORIA:
            regiao = regiao or REGIOES_COMO_CATEGORIA[cat_bruta]
            cat_bruta = "maduro"
        categoria = CATEGORIAS.get(cat_bruta)
        if not categoria:
            erros.append(f"{sitio}: a categoria \"{dados.get('categoria', '')}\" não existe. "
                         "Usa Verde, Maduro, Espumantes ou Cervejas.")
            continue

        tipo_bruto = str(dados.get("tipo", "")).strip().lower()
        tipo = TIPOS.get(tipo_bruto)
        # Nos espumantes, o tipo é a cor. Uma folha antiga com "Espumante"
        # no tipo, ou sem tipo, fica branco, que é o mais comum.
        if categoria == "espumantes" and tipo in (None, "espumante"):
            tipo = "branco"
        if not tipo:
            # Sem tipo, deduz-se o que for óbvio pela categoria
            tipo = {"cervejas": "cerveja"}.get(categoria)
            if not tipo:
                erros.append(f"{sitio}: falta o tipo (Tinto, Branco ou Rosé).")
                continue

        docura = ""
        docura_bruta = str(dados.get("docura", "")).strip()
        if docura_bruta:
            docura = DOCURAS.get(docura_bruta.lower())
            if not docura:
                erros.append(f"{sitio}: a doçura \"{docura_bruta}\" não existe. Usa Bruto Natural, "
                             "Extra Bruto, Bruto, Extra Seco, Seco, Meio Seco ou Doce.")
                continue
            if categoria != "espumantes":
                avisos.append(f"{sitio}: a doçura só conta nos espumantes. Ignorei-a.")
                docura = ""
        elif categoria == "espumantes":
            avisos.append(f"{sitio}: espumante sem doçura. Escolhe Bruto, Meio Seco ou outra, "
                          "para aparecer no cartão e nos filtros.")

        # O preço que vai para o site: o da coluna Preço site, que a folha
        # calcula. Se a célula ainda não tiver o resultado (a folha não foi
        # aberta no Excel depois de escrita), faz-se aqui a mesma conta.
        # Numa folha antiga, a coluna Preço.
        try:
            if "preco_loja" in dados:
                loja = round(preco(dados["preco_loja"]), 2)
                if loja <= 0:
                    raise ValueError
            if "preco_site" in dados:
                valor = round(preco(dados["preco_site"]), 2)
            elif "preco_loja" in dados:
                valor = com_aumento(loja, aumento)
            elif "preco" in dados:
                valor = round(preco(dados["preco"]), 2)
            else:
                erros.append(f"{sitio}: falta o preço da loja.")
                continue
            if valor <= 0:
                raise ValueError
        except (ValueError, TypeError):
            errado = dados.get("preco_loja", dados.get("preco_site", dados.get("preco")))
            erros.append(f"{sitio}: o preço \"{errado}\" não é um número válido.")
            continue
        if "preco_loja" in dados and valor < loja:
            avisos.append(f"{sitio}: o preço do site ({euros(valor)}) é mais baixo que o da loja "
                          f"({euros(loja)}). Confirma a coluna Preço site.")

        ano = dados.get("ano")
        if ano not in (None, ""):
            try:
                ano = int(float(ano))
                if not 1900 <= ano <= 2100:
                    raise ValueError
            except (ValueError, TypeError):
                erros.append(f"{sitio}: o ano \"{dados['ano']}\" não é válido.")
                continue
        else:
            ano = None

        # Identificador: vem do nome, e é o que o carrinho guarda. Se dois
        # produtos tiverem o mesmo nome, o segundo leva um número.
        base = slug(nome)
        ident = base
        if base in ids_vistos:
            ids_vistos[base] += 1
            ident = f"{base}-{ids_vistos[base]}"
            avisos.append(f"{sitio}: já há outro produto com este nome. "
                          "Convém distinguir, por exemplo com o ano.")
        else:
            ids_vistos[base] = 1

        produto = {
            "id": ident,
            "nome": nome,
            "categoria": categoria,
            "tipo": tipo,
            "produtor": str(dados.get("produtor", "")).strip(),
            "regiao": regiao,
            "ano": ano,
            "volume": volume(dados.get("volume", "75 cl")),
            "preco": valor,
            "descricao": str(dados.get("descricao", "")).strip(),
            # O espumante branco desenha-se mais claro que o vinho branco
            "cor": CORES["espumante"] if categoria == "espumantes" and tipo == "branco" else CORES[tipo],
        }
        if docura:
            produto["docura"] = docura

        if dados.get("alcool") not in (None, ""):
            try:
                graus = float(str(dados["alcool"]).lower().replace("%", "").replace("vol", "")
                              .replace(",", ".").strip())
                if not 0 < graus <= 80:
                    raise ValueError
                produto["alcool"] = round(graus, 1)
            except ValueError:
                erros.append(f"{sitio}: o álcool \"{dados['alcool']}\" não é válido. "
                             "Escreve só o número, por exemplo 13,5.")
                continue

        if dados.get("caixa") not in (None, ""):
            try:
                caixa = int(float(str(dados["caixa"]).replace(",", ".")))
                if not 1 <= caixa <= 48:
                    raise ValueError
                if caixa > 1:
                    produto["caixa"] = caixa
            except ValueError:
                erros.append(f"{sitio}: as unidades por caixa \"{dados['caixa']}\" não são válidas. "
                             "Escreve um número inteiro, como 6, ou deixa vazio.")
                continue

        if not produto["descricao"]:
            avisos.append(f"{sitio}: sem descrição. Fica com o cartão vazio por baixo do nome.")
        if categoria == "maduro" and not regiao:
            avisos.append(f"{sitio}: maduro sem região. Aparece no filtro \"Outros maduros\"; "
                          "escreve Douro ou Alentejo na coluna Região, se for o caso.")

        if dados.get("destaque"):
            produto["destaque"] = str(dados["destaque"]).strip()
        if dados.get("esgotado") and sim(dados["esgotado"]):
            produto["esgotado"] = True
        if dados.get("inicio") and sim(dados["inicio"]):
            produto["inicio"] = True
        if dados.get("imagem"):
            ficheiro = str(dados["imagem"]).strip()
            if not ficheiro.startswith("img/"):
                ficheiro = "img/" + ficheiro
            if not (RAIZ / ficheiro).exists():
                avisos.append(f"{sitio}: a fotografia {ficheiro} não existe na pasta img. "
                              "Fica com a garrafa desenhada até lá pores o ficheiro.")
            else:
                produto["imagem"] = ficheiro

        produtos.append(produto)

    fixos = [p["nome"] for p in produtos if p.get("inicio")]
    if len(fixos) > 4:
        avisos.append(f"Há {len(fixos)} produtos com \"Sempre no início\", mas a página inicial só "
                      f"mostra 4: ficam os primeiros da folha ({', '.join(fixos[:4])}).")

    return produtos, erros, avisos, escondidos, (aumento if "preco_loja" in mapa.values() else None)


# ---------------------------------------------------------------
# Escrever o js/produtos.js
# ---------------------------------------------------------------

def js_valor(v):
    if v is None:
        return "null"
    if v is True:
        return "true"
    if isinstance(v, float):
        return f"{v:.2f}"
    if isinstance(v, int):
        return str(v)
    texto = str(v).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return f'"{texto}"'


def bloco_produto(p):
    ordem = ["id", "pagina", "nome", "categoria", "tipo", "docura", "produtor", "regiao", "ano",
             "volume", "alcool", "caixa", "preco", "descricao", "cor", "imagem", "destaque",
             "inicio", "esgotado"]
    linhas = [f"    {k}: {js_valor(p[k])}" for k in ordem if k in p]
    return "  {\n" + ",\n".join(linhas) + "\n  }"


def escrever(produtos):
    atual = DESTINO.read_text(encoding="utf-8")

    # Mantém as descrições das categorias, que não vivem na folha
    inicio_cat = atual.find("/* Nomes bonitos")
    if inicio_cat == -1:
        inicio_cat = atual.find("const CATEGORIAS")
    categorias = atual[inicio_cat:].strip() if inicio_cat != -1 else ""

    cabecalho = '''/* =========================================================
   CATÁLOGO DE PRODUTOS

   ESTE FICHEIRO É GERADO. NÃO O EDITES À MÃO.

   Os produtos vêm da folha catalogo/produtos.xlsx. Para mudar o
   catálogo, edita a folha e corre, na pasta do site:

       python3 catalogo/atualizar-site.py

   O que escreveres aqui diretamente é substituído da próxima vez
   que o comando correr.
   ========================================================= */
'''
    corpo = "const PRODUTOS = [\n" + ",\n".join(bloco_produto(p) for p in produtos) + "\n];\n"
    DESTINO.write_text(cabecalho + "\n" + corpo + "\n" + categorias + "\n", encoding="utf-8")


# ---------------------------------------------------------------
# Escrever uma página por produto
#
# O produto.html monta a ficha já no browser de quem visita, a partir
# do js/produtos.js. Serve as pessoas, mas o Google recebe a página
# em branco: o nome do vinho, o preço e a descrição não estão dentro
# do ficheiro que o servidor entrega.
#
# Por isso escreve-se aqui, para cada produto, uma página já feita:
# conde-villar-branco.html, com o nome no título, a descrição, a foto,
# o preço e a ficha também em dados estruturados, que é o formato que
# o Google lê para mostrar o preço nos resultados. O produto.html
# continua a existir e reencaminha, para as ligações antigas que já
# andam por aí não se perderem.
# ---------------------------------------------------------------

MODELO = RAIZ / "produto.html"

# Por esta marca se conhecem as páginas geradas: as que a levam são
# apagadas e escritas de novo em cada passagem.
MARCA = "<!-- PÁGINA GERADA por catalogo/atualizar-site.py. Não a edites à mão. -->"

PAGINA_DA_CATEGORIA = {"espumantes": "espumantes.html", "cervejas": "cervejas.html"}
FAMILIA = {"verde": "Verdes", "maduro": "Maduros",
           "espumantes": "Espumantes", "cervejas": "Cervejas"}
ANCORA = {"verde": "#verde", "maduro": "#maduro"}
NOME_CATEGORIA = {"verde": "Verde", "maduro": "Maduro",
                  "espumantes": "Espumantes", "cervejas": "Cervejas"}


def dados_do_site():
    """O nome e o endereço do site, lidos onde já estão escritos: o nome
    no js/config.js, o domínio no ficheiro CNAME."""
    texto = (RAIZ / "js" / "config.js").read_text(encoding="utf-8")
    m = re.search(r'\bnome\s*:\s*"([^"]*)"', texto)
    nome = m.group(1) if m else "Garrafeira Campelo"
    cname = RAIZ / "CNAME"
    dominio = cname.read_text(encoding="utf-8").strip() if cname.exists() else ""
    return nome, f"https://{dominio}" if dominio else ""


def esc(texto):
    return (str(texto).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def numero(n):
    """10.0 -> '10', 13.5 -> '13,5'"""
    return f"{float(n):.1f}".rstrip("0").rstrip(".").replace(".", ",")


def escala_da_garrafa(p):
    """As garrafas pequenas (menos de 50 cl) desenham-se um pouco menores."""
    m = re.search(r"([\d.,]+)\s*(cl|ml|l)\b", p.get("volume") or "", re.I)
    if not m:
        return 1
    n = float(m.group(1).replace(",", "."))
    unidade = m.group(2).lower()
    cl = n * 100 if unidade == "l" else n / 10 if unidade == "ml" else n
    return 0.8 if cl < 50 else 1


def nomes_ocupados():
    """As páginas escritas à mão que vivem na raiz do site. Um produto
    com um id igual a um destes nomes leva 'vinho-' à frente, para não
    tapar a página do site."""
    ocupados = set()
    for pagina in RAIZ.glob("*.html"):
        if MARCA not in pagina.read_text(encoding="utf-8"):
            ocupados.add(pagina.stem)
    return ocupados


def ficheiro_do_produto(p, ocupados):
    nome = p["id"]
    if nome in ocupados:
        nome = f"vinho-{nome}"
    return f"{nome}.html"


def meta_do_produto(p):
    """'Verde · branco'; nos espumantes, a cor e a doçura."""
    if p["categoria"] == "espumantes":
        partes = ["Espumante",
                  "" if p.get("tipo") == "espumante" else p.get("tipo"),
                  p.get("docura")]
    else:
        partes = [NOME_CATEGORIA[p["categoria"]], p.get("tipo")]
    return " · ".join(x for x in partes if x)


def titulo_do_produto(p, nome_site):
    partes = [p["nome"]]
    if p.get("regiao") and p["regiao"].lower() not in p["nome"].lower():
        partes.append(p["regiao"])
    return f"{', '.join(partes)} | {nome_site}"


def descricao_do_produto(p, nome_site, limite=170):
    """A descrição que o Google mostra debaixo do título. Leva sempre o
    preço no fim; se não couber tudo, corta-se a descrição, não o preço."""
    caixa = p.get("caixa") or 1
    preco_txt = f"{euros(p['preco'])} por garrafa" if caixa > 1 else euros(p["preco"])
    fim = f" {preco_txt}, na {nome_site}."
    texto = p.get("descricao") or ""
    sobra = limite - len(fim)
    if len(texto) > sobra:
        # Corta-se onde acaba uma frase, se houver uma que caiba bem;
        # se não, corta-se numa palavra inteira, com reticências.
        frase = texto[:sobra].rsplit(". ", 1)[0]
        if len(frase) >= sobra * 0.55:
            texto = frase + "."
        else:
            texto = texto[:sobra].rsplit(" ", 1)[0].rstrip(" ,.;:") + "…"
    return texto + fim


def linhas_da_ficha(p):
    caixa = p.get("caixa") or 1
    pares = [
        ("Produtor", p.get("produtor")),
        ("Região", p.get("regiao")),
        ("Ano", p.get("ano")),
        ("Teor alcoólico", f"{numero(p['alcool'])}% vol." if p.get("alcool") else ""),
        ("Volume", p.get("volume")),
        ("Doçura", p.get("docura")),
        ("Venda", f"Caixa de {caixa} garrafas" if caixa > 1 else "À unidade"),
    ]
    return [(k, v) for k, v in pares if v]


def html_da_ficha(p, nome_site, url):
    """O mesmo que o js/main.js desenha no browser, escrito já no
    ficheiro. Quem visita o site vê isto de imediato; o JavaScript
    volta a desenhar por cima, para o botão de comprar funcionar."""
    cat = p["categoria"]
    pagina_cat = PAGINA_DA_CATEGORIA.get(cat, "vinhos.html")
    caixa = p.get("caixa") or 1
    escala = escala_da_garrafa(p)
    estilo = f' style="--escala: {escala}"' if escala != 1 else ""

    if p.get("esgotado"):
        etiqueta = '<span class="badge badge-esgotado">Esgotado</span>'
        botao = "Esgotado"
    else:
        etiqueta = f'<span class="badge">{esc(p["destaque"])}</span>' if p.get("destaque") else ""
        botao = f"Adicionar caixa de {caixa}" if caixa > 1 else "Adicionar ao carrinho"

    if caixa > 1:
        preco_extra = (f'<span class="ficha-caixa">Caixa de {caixa}: '
                       f'<strong>{euros(p["preco"] * caixa)}</strong></span>')
    else:
        preco_extra = ""

    dados = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>"
                    for k, v in linhas_da_ficha(p))
    partilha = ("https://wa.me/?text="
                + quote(f"{p['nome']}, na {nome_site}: {url}", safe=""))

    return f'''<a class="btn-voltar voltar-ficha" data-voltar href="{pagina_cat}{ANCORA.get(cat, "")}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        Voltar
      </a>
      <nav class="migalhas" aria-label="Estás em">
        <a href="index.html">Início</a><span aria-hidden="true">/</span>
        <a href="{pagina_cat}{ANCORA.get(cat, "")}">{FAMILIA[cat]}</a><span aria-hidden="true">/</span>
        <span aria-current="page">{esc(p["nome"])}</span>
      </nav>
      <div class="ficha">
        <div class="ficha-foto">{etiqueta}<img src="{esc(p["imagem"])}" alt="{esc(p["nome"])}"{estilo}></div>
        <div class="ficha-texto">
          <p class="card-meta">{esc(meta_do_produto(p))}</p>
          <h1 class="ficha-nome">{esc(p["nome"])}</h1>
          <p class="ficha-desc">{esc(p.get("descricao") or "")}</p>
          <div class="ficha-compra">
            <div class="ficha-preco">
              <span class="preco">{euros(p["preco"])}</span>
              <span class="volume">{"por garrafa · " if caixa > 1 else ""}IVA incluído</span>
              {preco_extra}
            </div>
            <button class="btn btn-primary btn-comprar" data-add="{esc(p["id"])}"{" disabled" if p.get("esgotado") else ""}>{esc(botao)}</button>
          </div>
          <dl class="ficha-dados">
            {dados}
          </dl>
          <p class="ficha-partilhar"><a href="{esc(partilha)}" target="_blank" rel="noopener">Partilhar no WhatsApp</a></p>
        </div>
      </div>'''


def html_da_lista(escolhidos, com_regiao=False):
    """Ligações simples para produtos: nome, região e preço. O JavaScript
    põe cartões por cima assim que corre, por isso quase ninguém vê isto.
    Fica escrito para o Google poder ir de uma página para as outras, que
    é como ele anda por um site, e para quem tem o JavaScript desligado."""
    if not escolhidos:
        return ""
    itens = []
    for x in escolhidos:
        onde = (f'<span class="onde">{esc(x["regiao"])}</span>'
                if com_regiao and x.get("regiao") else "")
        itens.append(f'<li><a href="{x["pagina"]}">{esc(x["nome"])}{onde}'
                     f'<span class="quanto">{euros(x["preco"])}</span></a></li>')
    return '<ul class="links-produtos">' + "".join(itens) + "</ul>"


def dados_estruturados(p, nome_site, site, url):
    """A ficha outra vez, no formato que o Google lê para mostrar o
    preço e a disponibilidade nos resultados de pesquisa."""
    propriedades = [
        {"@type": "PropertyValue", "name": k, "value": str(v)}
        for k, v in linhas_da_ficha(p) if k != "Produtor"
    ]
    produto = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p["nome"],
        "sku": p["id"],
        "description": p.get("descricao") or "",
        "image": f"{site}/{p['imagem']}",
        "category": FAMILIA[p["categoria"]],
        "additionalProperty": propriedades,
        "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": "EUR",
            "price": f"{p['preco']:.2f}",
            "availability": ("https://schema.org/OutOfStock" if p.get("esgotado")
                             else "https://schema.org/InStock"),
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {"@type": "Organization", "name": nome_site},
        },
    }
    if p.get("produtor"):
        produto["brand"] = {"@type": "Brand", "name": p["produtor"]}

    cat = p["categoria"]
    caminho = [
        ("Início", f"{site}/"),
        (FAMILIA[cat], f"{site}/{PAGINA_DA_CATEGORIA.get(cat, 'vinhos.html')}"),
        (p["nome"], url),
    ]
    migalhas = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": nome, "item": endereco}
            for i, (nome, endereco) in enumerate(caminho, start=1)
        ],
    }

    def bloco(obj):
        texto = json.dumps(obj, ensure_ascii=False, indent=2)
        # Dentro de um <script>, um "</" fecharia a etiqueta cedo demais.
        texto = texto.replace("</", "<\\/")
        return f'  <script type="application/ld+json">\n{texto}\n  </script>'

    return bloco(produto) + "\n" + bloco(migalhas)


def pagina_do_produto(modelo, p, parecidos, nome_site, site):
    url = f"{site}/{p['pagina']}"
    titulo = titulo_do_produto(p, nome_site)
    descricao = descricao_do_produto(p, nome_site)
    t = modelo

    t = t.replace('<html lang="pt-PT">', f'<html lang="pt-PT">\n{MARCA}', 1)
    t = re.sub(r"<title>.*?</title>", f"<title>{esc(titulo)}</title>", t, count=1, flags=re.S)
    t = re.sub(r'<meta name="description" content=".*?">',
               f'<meta name="description" content="{esc(descricao)}">\n'
               f'  <link rel="canonical" href="{url}">',
               t, count=1, flags=re.S)
    # O noindex é do produto.html, que só reencaminha. Estas páginas querem ser vistas.
    t = re.sub(r'\n\s*<meta name="robots"[^>]*>', "", t, count=1)

    # Como fica ao partilhar no WhatsApp, no Facebook ou no Instagram
    t = re.sub(r'<meta property="og:title" content=".*?">',
               f'<meta property="og:title" content="{esc(p["nome"])}">', t, count=1, flags=re.S)
    t = re.sub(r'<meta property="og:description" content=".*?">',
               f'<meta property="og:description" content="{esc(descricao)}">', t, count=1, flags=re.S)
    t = re.sub(r'<meta property="og:image" content=".*?">',
               f'<meta property="og:image" content="{site}/{esc(p["imagem"])}">', t, count=1, flags=re.S)
    # A foto da garrafa é alta, não larga: fora as medidas da imagem de partilha.
    t = re.sub(r'\n\s*<meta property="og:image:(?:width|height)" content=".*?">', "", t)
    t = re.sub(r'<meta property="og:image:alt" content=".*?">',
               f'<meta property="og:image:alt" content="{esc(p["nome"])}, garrafa">', t, count=1, flags=re.S)
    t = re.sub(r'<meta property="og:url" content=".*?">',
               f'<meta property="og:url" content="{url}">', t, count=1, flags=re.S)
    t = re.sub(r'<meta property="og:type" content=".*?">',
               '<meta property="og:type" content="product">', t, count=1, flags=re.S)
    t = re.sub(r'<meta name="twitter:card" content=".*?">',
               '<meta name="twitter:card" content="summary">', t, count=1, flags=re.S)

    t = t.replace("</head>", dados_estruturados(p, nome_site, site, url) + "\n</head>", 1)

    t = t.replace('id="ficha-produto" data-produto>',
                  f'id="ficha-produto" data-produto="{esc(p["id"])}">', 1)
    t = re.sub(r"<!-- ficha: início -->.*?<!-- ficha: fim -->",
               lambda _: html_da_ficha(p, nome_site, url), t, count=1, flags=re.S)
    t = re.sub(r"<!-- relacionados: início -->.*?<!-- relacionados: fim -->",
               lambda _: html_da_lista(parecidos), t, count=1, flags=re.S)
    return t


def parecidos_com(p, produtos):
    """Da mesma família, primeiro os do mesmo tipo: um tinto sugere tintos."""
    mesma = [x for x in produtos
             if x["id"] != p["id"] and x["categoria"] == p["categoria"] and not x.get("esgotado")]
    mesma.sort(key=lambda x: x.get("tipo") != p.get("tipo"))
    return mesma[:4]


def escrever_paginas(produtos):
    """Escreve a página de cada produto e apaga as que já não têm produto.
    Devolve (escritas, apagadas)."""
    modelo = MODELO.read_text(encoding="utf-8")
    nome_site, site = dados_do_site()
    for marcador in ("<!-- ficha: início -->", "<!-- relacionados: início -->",
                     'id="ficha-produto" data-produto>'):
        if marcador not in modelo:
            raise SystemExit(f"Falta a marca {marcador} no produto.html. "
                             "Sem ela não sei onde escrever a ficha.")

    ocupados = nomes_ocupados()
    for p in produtos:
        p["pagina"] = ficheiro_do_produto(p, ocupados)

    escritas = set()
    for p in produtos:
        caminho = RAIZ / p["pagina"]
        texto = pagina_do_produto(modelo, p, parecidos_com(p, produtos), nome_site, site)
        if not caminho.exists() or caminho.read_text(encoding="utf-8") != texto:
            caminho.write_text(texto, encoding="utf-8")
        escritas.add(p["pagina"])

    apagadas = 0
    for pagina in sorted(RAIZ.glob("*.html")):
        if pagina.name in escritas:
            continue
        if MARCA in pagina.read_text(encoding="utf-8"):
            pagina.unlink()
            apagadas += 1

    escrever_sitemap(produtos, site)
    return len(escritas), apagadas


def escrever_catalogos(produtos):
    """Escreve a lista dos produtos dentro das páginas de catálogo e do
    início, entre as marcas <!-- lista: início --> e <!-- lista: fim -->.

    Sem isto, a página Vinhos não tem uma única ligação para os vinhos:
    os cartões nascem no browser, e o Google, que anda de ligação em
    ligação, não tinha por onde chegar às páginas dos produtos. Também
    lhe dá conteúdo, que são os nomes e os preços que antes não estavam
    em lado nenhum dentro do ficheiro.

    Devolve quantas páginas mudaram."""
    mudadas = 0
    for pagina in sorted(RAIZ.glob("*.html")):
        texto = pagina.read_text(encoding="utf-8")
        if "<!-- lista: início -->" not in texto or MARCA in texto:
            continue

        # A página diz o que quer: um catálogo por categorias, ou os
        # destaques do início.
        m = re.search(r'id="lista-produtos"[^>]*data-categorias="([^"]*)"', texto)
        if m:
            categorias = [c for c in m.group(1).split(",") if c]
            escolhidos = [p for p in produtos if p["categoria"] in categorias]
        else:
            m = re.search(r'id="lista-destaques"[^>]*data-quantos="(\d+)"', texto)
            if not m:
                continue
            quantos = int(m.group(1))
            livres = [p for p in produtos if not p.get("esgotado")]
            escolhidos = [p for p in livres if p.get("inicio")][:quantos]
            faltam = quantos - len(escolhidos)
            escolhidos += [p for p in livres if not p.get("inicio")][:faltam]

        lista = html_da_lista(escolhidos, com_regiao=True)
        novo = re.sub(r"<!-- lista: início -->.*?<!-- lista: fim -->",
                      lambda _: f"<!-- lista: início -->{lista}<!-- lista: fim -->",
                      texto, count=1, flags=re.S)
        if novo != texto:
            pagina.write_text(novo, encoding="utf-8")
            mudadas += 1
    return mudadas


def escrever_contagens(produtos):
    """Escreve o número de produtores do catálogo onde a página o pedir,
    entre as marcas <!-- produtores: início --> e <!-- produtores: fim -->.

    O número vem da folha, por isso é sempre verdade: quando entra um
    produtor novo, a página Sobre passa a dizê-lo sem ninguém lhe mexer.
    Antes estava escrito à mão, e dizia 20 quando o catálogo tinha 11.

    Devolve quantas páginas mudaram."""
    produtores = len({p["produtor"].strip().lower()
                      for p in produtos if (p.get("produtor") or "").strip()})
    mudadas = 0
    for pagina in sorted(RAIZ.glob("*.html")):
        texto = pagina.read_text(encoding="utf-8")
        if "<!-- produtores: início -->" not in texto or MARCA in texto:
            continue
        novo = re.sub(r"<!-- produtores: início -->.*?<!-- produtores: fim -->",
                      f"<!-- produtores: início -->{produtores}<!-- produtores: fim -->",
                      texto, flags=re.S)
        if novo != texto:
            pagina.write_text(novo, encoding="utf-8")
            mudadas += 1
    return mudadas


def escrever_sitemap(produtos, site):
    """Põe as páginas dos produtos na lista que se entrega ao Google."""
    caminho = RAIZ / "sitemap.xml"
    if not caminho.exists() or not site:
        return
    texto = caminho.read_text(encoding="utf-8")
    inicio, fim = "<!-- produtos: início -->", "<!-- produtos: fim -->"
    if inicio not in texto:
        return
    linhas = [f"  <url><loc>{site}/{p['pagina']}</loc><priority>0.7</priority></url>"
              for p in produtos]
    novo = re.sub(re.escape(inicio) + r".*?" + re.escape(fim),
                  inicio + "\n" + "\n".join(linhas) + "\n  " + fim,
                  texto, count=1, flags=re.S)
    if novo != texto:
        caminho.write_text(novo, encoding="utf-8")


# ---------------------------------------------------------------

def plural(n, um, varios):
    return f"{n} {um if n == 1 else varios}"


def carimbar_versoes():
    """Põe em cada página uma marca de versão nos ficheiros .css e .js
    (por exemplo js/produtos.js?v=3f9a1c2e), tirada do conteúdo de cada
    um. O browser de quem já visitou o site guarda estes ficheiros durante
    uns minutos; quando um muda, a marca muda, e o browser vai buscar o
    novo em vez de mostrar o antigo. Devolve quantas páginas mudaram."""
    import hashlib
    versoes = {}
    for caminho in sorted((RAIZ / "css").glob("*.css")) + sorted((RAIZ / "js").glob("*.js")):
        rel = caminho.relative_to(RAIZ).as_posix()
        versoes[rel] = hashlib.sha1(caminho.read_bytes()).hexdigest()[:8]

    padrao = re.compile(r'((?:href|src)=")((?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")')

    def marca(m):
        if m.group(2) not in versoes:
            return m.group(0)
        return f"{m.group(1)}{m.group(2)}?v={versoes[m.group(2)]}{m.group(3)}"

    mudadas = 0
    for pagina in sorted(RAIZ.glob("*.html")):
        texto = pagina.read_text(encoding="utf-8")
        novo = padrao.sub(marca, texto)
        if novo != texto:
            pagina.write_text(novo, encoding="utf-8")
            mudadas += 1
    return mudadas


def main():
    so_verificar = "--verificar" in sys.argv

    if not EXCEL.exists():
        print(f"Não encontrei {EXCEL.relative_to(RAIZ)}.")
        print("Cria o modelo com: python3 catalogo/criar-modelo.py")
        sys.exit(1)

    try:
        resultado = ler_produtos()
    except zipfile.BadZipFile:
        print("O ficheiro produtos.xlsx não abre. Está aberto no Excel a meio de gravar?")
        print("Fecha o Excel e tenta de novo.")
        sys.exit(1)

    if len(resultado) == 3:            # erro antes de ler as linhas
        produtos, erros, avisos = resultado
        escondidos, aumento = 0, None
    else:
        produtos, erros, avisos, escondidos, aumento = resultado

    for a in avisos:
        print(f"  aviso  {a}")
    if avisos:
        print()

    if erros:
        print("Há coisas a corrigir na folha. Não mexi no site.\n")
        for e in erros:
            print(f"  ✗  {e}")
        print(f"\n{plural(len(erros), 'erro', 'erros')}. Corrige, grava, e corre outra vez.")
        sys.exit(1)

    if not produtos:
        print("A folha não tem nenhum produto marcado para publicar.")
        print("Não mexi no site, para não o deixar vazio.")
        sys.exit(1)

    contagem = {}
    for p in produtos:
        contagem[p["categoria"]] = contagem.get(p["categoria"], 0) + 1
    resumo = ", ".join(f"{k} {v}" for k, v in contagem.items())

    if so_verificar:
        print(f"Tudo em ordem: {plural(len(produtos), 'produto pronto', 'produtos prontos')} "
              f"a publicar ({resumo}).")
        if escondidos:
            print(f"{plural(escondidos, 'marcado', 'marcados')} como não publicar.")
        print("Nada foi alterado. Corre sem --verificar para atualizar o site.")
        return

    paginas, apagadas = escrever_paginas(produtos)
    catalogos = escrever_catalogos(produtos)
    escrever_contagens(produtos)
    escrever(produtos)
    carimbar_versoes()
    print(f"Site atualizado: {plural(len(produtos), 'produto', 'produtos')} ({resumo}).")
    print(f"{plural(paginas, 'página de produto escrita', 'páginas de produto escritas')}"
          + (f", {plural(apagadas, 'apagada', 'apagadas')}." if apagadas else "."))
    if catalogos:
        print(f"Listas de produtos refeitas em "
              f"{plural(catalogos, 'página de catálogo', 'páginas de catálogo')}.")
    if aumento is not None:
        pct = f"{round(aumento * 100, 2):g}".replace(".", ",")
        print(f"Preços no site: os da loja mais {pct}%.")
    if escondidos:
        print(f"{plural(escondidos, 'marcado', 'marcados')} como não publicar, "
              f"{'ficou' if escondidos == 1 else 'ficaram'} de fora.")
    print("\nPara ver: abre o index.html. Para publicar: git add -A, git commit, git push.")


if __name__ == "__main__":
    main()
