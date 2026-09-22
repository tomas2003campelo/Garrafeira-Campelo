#!/usr/bin/env python3
"""
Lê o catálogo de catalogo/produtos.xlsx e atualiza o site.

    python3 catalogo/atualizar-site.py              atualiza o site
    python3 catalogo/atualizar-site.py --verificar  só confere, não mexe em nada

Confere a folha toda antes de escrever. Se houver um erro em qualquer
linha, não altera nada no site e diz-te o que corrigir.

Não precisa de instalar nada: lê o .xlsx com o que o Python já traz.
"""

import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

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
    ordem = ["id", "nome", "categoria", "tipo", "docura", "produtor", "regiao", "ano",
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

    escrever(produtos)
    carimbar_versoes()
    print(f"Site atualizado: {plural(len(produtos), 'produto', 'produtos')} ({resumo}).")
    if aumento is not None:
        pct = f"{round(aumento * 100, 2):g}".replace(".", ",")
        print(f"Preços no site: os da loja mais {pct}%.")
    if escondidos:
        print(f"{plural(escondidos, 'marcado', 'marcados')} como não publicar, "
              f"{'ficou' if escondidos == 1 else 'ficaram'} de fora.")
    print("\nPara ver: abre o index.html. Para publicar: git add -A, git commit, git push.")


if __name__ == "__main__":
    main()
