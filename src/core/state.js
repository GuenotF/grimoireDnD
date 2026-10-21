// État de l'écran (onglet, filtres, volets ouverts…) et personnage en cours.
// Les préférences d'affichage (onglet, mode, sections repliées) sont relues depuis l'appareil au démarrage.





const S = { list: {}, cur: null, tab: "grimoire", view: "gerer", fxOpen: false, shortOpen: false, sr: {}, open: new Set(), concWarn: null, concPanel: false,
  f: { q: "", lvl: "all", school: "", conc: false, rit: false, hideOwned: false, reachable: false },
  bf: { q: "", fp: "all", mv: "", sz: "", reach: false, fav: false },
  confirm: null, newForm: false };
S.fold = {}; try { S.fold = JSON.parse(localStorage.getItem("grimoire.fold") || "{}") || {}; } catch (e) {}
try { const t = localStorage.getItem("grimoire.tab"); if (t) S.tab = t; if (localStorage.getItem("grimoire.view") === "jeu") S.view = "jeu"; } catch (e) {}
const G = () => S.cur && S.list[S.cur] ? S.list[S.cur] : null;

export { S, G };
