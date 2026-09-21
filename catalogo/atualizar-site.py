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
    "preço": "preco", "preco": "preco", "pvp": "preco",
    "descrição": "descricao", "descricao": "descricao",
    "etiqueta": "destaque", "destaque": "destaque",
    "esgotado": "esgotado",
    "fotografia": "imagem", "foto": "imagem", "imagem": "imagem",
}


# ---------------------------------------------------------------
# Ler o .xlsx
# ---------------------------------------------------------------

def ler_folha(caminho):
    """Devolve a primeira folha como lista de linhas: [(nº, {coluna: valor})]."""
    with zipfile.ZipFile(caminho) as z:
        # Texto partilhado: quando o Excel grava, guarda aqui os textos
        # e as células passam a ter só o índice.
        partilhados = []
        if "xl/sharedStrings.xml" in z.namelist():
            raiz = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in raiz.findall("m:si", NS):
                # Junta todos os pedaços: um texto com negrito numa palavra
                # vem partido em vários <t>
                partilhados.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

        folha = ET.fromstring(z.read(primeira_folha(z)))

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


def primeira_folha(z):
    """O caminho da folha 'Produtos', ou da primeira, se não houver."""
    livro = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    alvo = {r.get("Id"): r.get("Target") for r in rels}
    folhas = livro.findall("m:sheets/m:sheet", NS)
    rid = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    escolhida = next((f for f in folhas if f.get("name") == "Produtos"), folhas[0])
    destino = alvo[escolhida.get(rid)].lstrip("/")
    return destino if destino.startswith("xl/") else "xl/" + destino


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
        chave = str(texto).strip().lower().split(" (")[0].split(" ")[0]
        if chave in CABECALHOS:
            mapa[coluna] = CABECALHOS[chave]

    em_falta = {"nome", "categoria", "preco"} - set(mapa.values())
    if em_falta:
        return [], [f"Não encontrei a coluna: {', '.join(sorted(em_falta))}. "
                    "Confirma que o cabeçalho na linha 1 não foi apagado."], []

    produtos, erros, avisos = [], [], []
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

        if "preco" not in dados:
            erros.append(f"{sitio}: falta o preço.")
            continue
        try:
            valor = round(preco(dados["preco"]), 2)
            if valor <= 0:
                raise ValueError
        except (ValueError, TypeError):
            erros.append(f"{sitio}: o preço \"{dados['preco']}\" não é um número válido.")
            continue

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

        if not produto["descricao"]:
            avisos.append(f"{sitio}: sem descrição. Fica com o cartão vazio por baixo do nome.")
        if categoria == "maduro" and not regiao:
            avisos.append(f"{sitio}: maduro sem região. Aparece no filtro \"Outros maduros\"; "
                          "escreve Douro ou Alentejo na coluna Região, se for o caso.")

        if dados.get("destaque"):
            produto["destaque"] = str(dados["destaque"]).strip()
        if dados.get("esgotado") and sim(dados["esgotado"]):
            produto["esgotado"] = True
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

    return produtos, erros, avisos, escondidos


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
             "volume", "preco", "descricao", "cor", "imagem", "destaque", "esgotado"]
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
        escondidos = 0
    else:
        produtos, erros, avisos, escondidos = resultado

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
    print(f"Site atualizado: {plural(len(produtos), 'produto', 'produtos')} ({resumo}).")
    if escondidos:
        print(f"{plural(escondidos, 'marcado', 'marcados')} como não publicar, "
              f"{'ficou' if escondidos == 1 else 'ficaram'} de fora.")
    print("\nPara ver: abre o index.html. Para publicar: git add -A, git commit, git push.")


if __name__ == "__main__":
    main()
