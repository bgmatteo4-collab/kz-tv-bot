/**
 * Le gabarit des cartes de salon : la configuration entre, du HTML sort.
 *
 * Le dessin reprend le langage des panneaux Twitch du pack de stream — carte papier,
 * contour nuit, ombre portée pleine, bandeau d'encre, pastille honey gold pour les
 * commandes. Une seule image de motif, recolorée par catégorie en soft-light.
 */
import { univers } from '../serveur.config.js';

/** Sépare l'emoji du nom : « 🎬・clips » → { emoji: '🎬', nom: 'clips' }. */
export function decouper(nomComplet) {
  if (nomComplet.includes('・')) {
    const [emoji, ...reste] = nomComplet.split('・');
    return { emoji: emoji.trim(), nom: reste.join('・').trim() };
  }
  const i = nomComplet.indexOf(' ');
  if (i > 0) return { emoji: nomComplet.slice(0, i).trim(), nom: nomComplet.slice(i + 1).trim() };
  return { emoji: '', nom: nomComplet };
}

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** **gras** → mot en teal ; le reste est échappé. */
const riche = (t) => echapper(t).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');

function bloc(salon, categorie) {
  const { emoji, nom } = decouper(salon.nom);
  const c = salon.carte;
  const u = categorie.univers;
  const marque = categorie.acces === 'staff' ? 'STAFF · KAYZX TV' : 'KAYZX TV';

  // Au-delà de quatre règles, la colonne de gauche ne suffit plus : on étale sur les deux
  // et on renonce à l'encadré. C'est le cas du règlement, et c'est très bien ainsi.
  const double = !c.commandes && (c.regles ?? []).length > 4;

  const uneRegle = (r) => `
      <div class="regle ${r.type === 'non' ? 'non' : r.type === 'plus' ? 'plus' : ''}">
        <div class="num">${echapper(r.symbole)}</div><div>
        <b>${echapper(r.titre)}</b><span>${echapper(r.texte)}</span></div></div>`;

  const regles = c.regles ?? [];
  const coupe = double ? Math.ceil(regles.length / 2) : regles.length;

  const corpsGauche = c.commandes
    ? c.commandes.map(([cmd, titre, suite]) => `
      <div class="cmd"><span class="pastille">${echapper(cmd)}</span>
        <span><u>${echapper(titre)}</u> ${echapper(suite ?? '')}</span></div>`).join('')
    : regles.slice(0, coupe).map(uneRegle).join('');

  const suite = double ? regles.slice(coupe).map(uneRegle).join('') : '';

  const encadre = !double && c.ailleurs?.length ? `
      <div class="encadre"><h3>${c.commandes ? 'LE RÉFLEXE' : "SINON, C'EST OÙ ?"}</h3>
        ${c.ailleurs.map(([quoi, vers]) => `<p>${echapper(quoi)} → <b>${echapper(vers)}</b></p>`).join('')}
      </div>` : '';

  const note = c.note ? `<div class="note">${riche(c.note).replace(/<em>/g, '<b>').replace(/<\/em>/g, '</b>')}</div>` : '';

  return `
<div class="cadre" id="carte-${salon.cle}"><div class="p u-${u}">
  <div class="tete"><div class="fond"></div>
    <span class="glyphe">${emoji}</span><b>${echapper(nom.toUpperCase())}</b>
    <span class="marque">${marque}</span>
    <img class="vignette" src="img/logo-nuit.png" alt=""></div>
  <div class="corps">
    <div class="col gauche"><div class="intro">${riche(c.intro)}</div>${corpsGauche}</div>
    <div class="col droite ${double ? 'suite' : ''}">${suite}${encadre}${note}</div>
  </div><div class="grain"></div>
</div></div>`;
}

export function pageComplete(categories) {
  const blocs = categories.flatMap((cat) =>
    cat.salons.filter((s) => s.carte).map((s) => bloc(s, cat))).join('\n');
  return STYLE.replace('<!--BLOCS-->', blocs);
}

export const STYLE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Cartes de salon — Kayzx TV</title><style>
@font-face{font-family:Rubik;src:url(polices/Rubik-1.ttf)}
@font-face{font-family:Rubik;font-weight:500;src:url(polices/Rubik-2.ttf)}
@font-face{font-family:Rubik;font-weight:900;src:url(polices/Rubik-3.ttf)}
:root{--nuit:#0F1519;--teal:#1E5B57;--teal-n:#3FD3C2;--miel:#E0A93B;--papier:#F1ECE3;
      --ligne:#E2DACB;--gris:#5E6E6F;--corail:#B9533F;--chene:#8A5A36}
*{box-sizing:border-box;margin:0;padding:0}
body{background:transparent;font-family:Rubik,sans-serif}
.cadre{padding:44px;width:1688px}
.p{width:1600px;height:900px;background:var(--papier);border:14px solid var(--nuit);border-radius:52px;
   overflow:hidden;box-shadow:0 24px 0 rgba(15,21,25,.85);position:relative;display:flex;flex-direction:column}
.p.u-communaute{--cat:${univers.communaute.bandeau}}
.p.u-direct    {--cat:${univers.direct.bandeau}}
.p.u-gaming    {--cat:${univers.gaming.bandeau}}
.p.u-staff     {--cat:${univers.staff.bandeau}}
.tete{height:168px;background:var(--cat);display:flex;align-items:center;gap:28px;padding:0 44px 0 48px;
      border-bottom:14px solid var(--nuit);position:relative;flex:none}
.tete .fond{position:absolute;inset:0;background:url(img/fond-banniere.png) 28% 42%/1700px auto;
            mix-blend-mode:soft-light}
.tete:before{content:"";position:absolute;inset:0;
             background:linear-gradient(90deg,rgba(15,21,25,.60),rgba(15,21,25,.10))}
.u-direct .tete:before{background:linear-gradient(90deg,rgba(241,236,227,.40),rgba(241,236,227,.02))}
.tete .glyphe{position:relative;font-size:76px;line-height:1;flex:none;
              filter:drop-shadow(0 4px 6px rgba(15,21,25,.5))}
.tete b{position:relative;font:900 62px Rubik;color:var(--papier);letter-spacing:-1px;
        text-shadow:0 4px 12px rgba(0,0,0,.6);white-space:nowrap}
.tete .marque{position:relative;margin-left:auto;font:900 24px Rubik;color:var(--miel);
              letter-spacing:4px;flex:none;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.u-direct .tete b{color:var(--nuit);text-shadow:0 3px 10px rgba(241,236,227,.55)}
.u-direct .tete .marque{color:var(--nuit)}
.vignette{position:relative;margin-left:24px;width:104px;height:104px;border-radius:26px;flex:none;
          border:5px solid var(--papier);object-fit:cover;box-shadow:0 5px 14px rgba(0,0,0,.45)}
.corps{flex:1;display:flex;gap:44px;padding:38px 48px 42px;min-height:0}
.col{display:flex;flex-direction:column;min-width:0}
.gauche{flex:1.18}
.droite{flex:.82}
.droite.suite{flex:1}
.droite.suite .regle:first-of-type{margin-top:0;border-top:0;padding-top:0}
.intro{font:500 42px/1.30 Rubik;color:var(--nuit)}
.intro em{font-style:normal;font-weight:900;color:var(--teal)}
.regle{display:flex;gap:24px;align-items:flex-start;padding:17px 0;border-top:6px solid var(--ligne)}
.regle:first-of-type{margin-top:16px}
.num{width:62px;height:62px;border-radius:50%;background:var(--teal);color:var(--papier);
     font:900 30px/62px Rubik;text-align:center;flex:none;border:6px solid var(--nuit)}
.regle.non .num{background:var(--corail)}
.regle.plus .num{background:var(--miel);color:var(--nuit)}
.regle b{display:block;font:900 35px Rubik;color:var(--nuit);margin-bottom:3px}
.regle span{font:500 30px/1.24 Rubik;color:var(--gris)}
.cmd{display:flex;gap:22px;align-items:center;padding:16px 0;border-top:6px solid var(--ligne)}
.cmd:first-of-type{margin-top:18px}
.cmd .pastille{background:var(--nuit);color:var(--miel);font:900 34px Rubik;padding:11px 26px;
          border-radius:999px;flex:none;white-space:nowrap;min-width:280px;text-align:center}
.cmd span{font:500 31px/1.24 Rubik;color:var(--gris)}
.cmd span u{text-decoration:none;font-weight:900;color:var(--nuit)}
.encadre{background:#E8E0D3;border:6px solid var(--nuit);border-radius:28px;padding:26px 28px}
.encadre h3{font:900 28px Rubik;color:var(--chene);letter-spacing:3px;margin-bottom:14px}
.encadre p{font:500 31px/1.26 Rubik;color:var(--nuit)}
.encadre p + p{margin-top:12px}
.encadre p b{font-weight:900;color:var(--teal)}
.note{margin-top:auto;padding-top:22px;font:500 28px/1.3 Rubik;color:var(--gris)}
.note b{font-weight:900;color:var(--nuit)}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.07;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
</style></head><body>
<!--BLOCS-->
</body></html>`;
