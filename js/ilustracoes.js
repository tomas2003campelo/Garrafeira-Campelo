/* =========================================================
   ILUSTRAÇÕES DAS GARRAFAS E LATAS
   ---------------------------------------------------------
   As garrafas do site são desenhadas em SVG, não são
   fotografias. Isto mantém o site leve e permite pintar cada
   garrafa com a cor do vinho, mas continua a ser um desenho:
   assim que tiveres fotos reais dos produtos, põe o caminho
   no campo "imagem" do produto e a foto passa à frente.

   Cada função recebe a cor e devolve o SVG em texto.
   ========================================================= */

const Ilustracoes = (function () {
  "use strict";

  /* Escurece ou aclara uma cor hexadecimal.
     fator < 1 escurece, fator > 1 aclara.                    */
  function ajustar(hex, fator) {
    const n = parseInt(hex.replace("#", ""), 16);
    const canal = d => Math.max(0, Math.min(255, Math.round(((n >> d) & 255) * fator)));
    return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
  }

  /* Identificador único para os gradientes não colidirem
     quando há várias garrafas na mesma página.               */
  let contador = 0;
  function novoId() { return "g" + (++contador); }

  /* ---------- Garrafa de vinho ----------
     Duas silhuetas: "bordeaux" (ombro marcado, para tintos e
     brancos) e "borgonha" (ombro descaído, para espumantes).  */

  const SILHUETAS = {
    bordeaux: "M24 10 L24 56 C24 72 13 80 13 98 L13 186 Q13 194 21 194 L47 194 Q55 194 55 186 L55 98 C55 80 44 72 44 56 L44 10 Z",
    borgonha: "M25 10 L25 52 C25 76 10 84 10 108 L10 186 Q10 194 18 194 L50 194 Q58 194 58 186 L58 108 C58 84 43 76 43 52 L43 10 Z"
  };

  function garrafa(cor, forma = "bordeaux", nome = "") {
    const id = novoId();
    const claro  = ajustar(cor, 1.45);
    const escuro = ajustar(cor, 0.55);
    const larga  = forma === "borgonha";

    return `
<svg class="ilustracao" viewBox="0 0 68 210" role="img" aria-label="${nome}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="corpo-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${escuro}"/>
      <stop offset="28%"  stop-color="${cor}"/>
      <stop offset="52%"  stop-color="${claro}"/>
      <stop offset="72%"  stop-color="${cor}"/>
      <stop offset="100%" stop-color="${escuro}"/>
    </linearGradient>
    <linearGradient id="capsula-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#8E6C31"/>
      <stop offset="45%"  stop-color="#D9B876"/>
      <stop offset="100%" stop-color="#8E6C31"/>
    </linearGradient>
  </defs>

  <!-- sombra no chão -->
  <ellipse cx="34" cy="200" rx="26" ry="5" fill="rgba(42,26,22,.16)"/>

  <!-- corpo -->
  <path d="${SILHUETAS[forma]}" fill="url(#corpo-${id})"/>

  <!-- cápsula -->
  <path d="M23 8 L45 8 L45 30 Q34 34 23 30 Z" fill="url(#capsula-${id})"/>
  <rect x="23" y="26" width="22" height="2.5" fill="rgba(0,0,0,.22)"/>

  <!-- rótulo -->
  <rect x="${larga ? 12 : 15}" y="118" width="${larga ? 44 : 38}" height="52" rx="1.5" fill="#FBF5EC"/>
  <rect x="${larga ? 12 : 15}" y="118" width="${larga ? 44 : 38}" height="52" rx="1.5" fill="none" stroke="rgba(42,26,22,.1)"/>
  <circle cx="34" cy="132" r="5" fill="none" stroke="#C29E61" stroke-width="1.1"/>
  <circle cx="34" cy="132" r="1.8" fill="#C29E61"/>
  <rect x="${larga ? 19 : 21}" y="144" width="30" height="2.2" rx="1.1" fill="#53000F" opacity=".78"/>
  <rect x="${larga ? 23 : 25}" y="151" width="22" height="1.6" rx=".8" fill="#6B5750" opacity=".5"/>
  <rect x="${larga ? 26 : 28}" y="160" width="16" height="1.4" rx=".7" fill="#C29E61" opacity=".8"/>

  <!-- brilho do vidro -->
  <path d="M19 100 Q17 140 19 182" stroke="rgba(255,255,255,.3)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M27 58 Q25 78 24 96" stroke="rgba(255,255,255,.22)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</svg>`;
  }

  /* ---------- Lata de cerveja ---------- */

  function lata(cor, nome = "") {
    const id = novoId();
    const claro  = ajustar(cor, 1.42);
    const escuro = ajustar(cor, 0.6);

    return `
<svg class="ilustracao" viewBox="0 0 68 210" role="img" aria-label="${nome}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lata-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${escuro}"/>
      <stop offset="30%"  stop-color="${cor}"/>
      <stop offset="53%"  stop-color="${claro}"/>
      <stop offset="74%"  stop-color="${cor}"/>
      <stop offset="100%" stop-color="${escuro}"/>
    </linearGradient>
    <linearGradient id="aluminio-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#9BA0A4"/>
      <stop offset="48%"  stop-color="#E4E8EA"/>
      <stop offset="100%" stop-color="#9BA0A4"/>
    </linearGradient>
  </defs>

  <ellipse cx="34" cy="200" rx="24" ry="5" fill="rgba(42,26,22,.16)"/>

  <!-- corpo da lata -->
  <path d="M15 46 Q15 40 20 38 L48 38 Q53 40 53 46 L53 182 Q53 188 48 190 L20 190 Q15 188 15 182 Z" fill="url(#lata-${id})"/>

  <!-- aros de alumínio -->
  <rect x="15" y="38"  width="38" height="7" rx="3" fill="url(#aluminio-${id})"/>
  <rect x="15" y="183" width="38" height="7" rx="3" fill="url(#aluminio-${id})"/>

  <!-- tampa -->
  <ellipse cx="34" cy="38" rx="19" ry="4.5" fill="url(#aluminio-${id})"/>
  <ellipse cx="34" cy="37.5" rx="14" ry="3" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>

  <!-- etiqueta -->
  <rect x="15" y="96" width="38" height="44" fill="rgba(251,245,236,.93)"/>
  <circle cx="34" cy="109" r="4.5" fill="none" stroke="#C29E61" stroke-width="1.1"/>
  <circle cx="34" cy="109" r="1.6" fill="#C29E61"/>
  <rect x="21" y="120" width="26" height="2.2" rx="1.1" fill="#53000F" opacity=".78"/>
  <rect x="25" y="127" width="18" height="1.6" rx=".8" fill="#6B5750" opacity=".5"/>

  <!-- brilho -->
  <path d="M22 52 Q20 115 22 176" stroke="rgba(255,255,255,.33)" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
  }

  /* ---------- Escolhe o desenho certo para o produto ---------- */

  function paraProduto(p) {
    if (p.categoria === "cervejas") return lata(p.cor, `Lata de ${p.nome}`);
    const forma = p.tipo === "espumante" ? "borgonha" : "bordeaux";
    return garrafa(p.cor, forma, `Garrafa de ${p.nome}`);
  }

  return { garrafa, lata, paraProduto };
})();
