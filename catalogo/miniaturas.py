"""Cria as versões pequenas das fotografias das garrafas, para os cartões.

    python3 catalogo/miniaturas.py

Lê img/produtos/*.webp e escreve img/produtos/pequenas/*.webp com 480 px
de altura (chega para os cartões, mesmo em ecrãs de alta definição). A
página de cada vinho e a fotografia ampliada continuam a usar a grande.
Só refaz as que faltam ou que são mais antigas do que a grande.
Usa o Chrome (o Mac não grava WebP de outra forma).
"""
import base64, re, subprocess, os, tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "img" / "produtos"
DESTINO = ORIGEM / "pequenas"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ALTURA = 480

DESTINO.mkdir(exist_ok=True)
feitas = 0
for f in sorted(ORIGEM.glob("*.webp")):
    d = DESTINO / f.name
    if d.exists() and d.stat().st_mtime >= f.stat().st_mtime:
        continue
    u = "data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()
    pagina = ("<body><pre id=o></pre><script>const i=new Image();i.onload=()=>{const H=Math.min(%d,i.naturalHeight),"
              "W=Math.round(i.naturalWidth*H/i.naturalHeight),c=document.createElement('canvas');c.width=W;c.height=H;"
              "const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(i,0,0,W,H);"
              "document.getElementById('o').textContent=c.toDataURL('image/webp',0.84);};i.src='%s';</script>") % (ALTURA, u)
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as t:
        t.write(pagina)
    out = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--virtual-time-budget=20000", "--dump-dom", "file://" + t.name],
                         capture_output=True, text=True).stdout
    os.unlink(t.name)
    m = re.search(r'<pre id="o">data:image/webp;base64,([^<]+)</pre>', out)
    if not m:
        print("FALHOU:", f.name); continue
    d.write_bytes(base64.b64decode(m.group(1)))
    feitas += 1
print(f"Miniaturas feitas: {feitas}. Total em pequenas/: {len(list(DESTINO.glob('*.webp')))}")
