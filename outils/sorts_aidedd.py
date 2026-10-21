#!/usr/bin/env python3
"""Relève l'en-tête de chaque sort dans le texte OCR d'un export AideDD « Sorts » (règles 2014).

    python3 outils/ocr_pdf.py Sorts-druide.pdf /tmp/sorts.txt
    python3 outils/sorts_aidedd.py /tmp/sorts.txt /tmp/sorts-entetes.json

Pour chaque sort : nom (en majuscules, sans accents, tel que l'OCR le lit), niveau, école, rituel,
temps d'incantation, portée, composantes, durée. C'est la base de vérification utilisée pour ajouter les
sorts du paladin et du druide à data/spells.json : les champs propres à l'application (id anglais, nom
français exact, description courte, pastilles, jet, progression) sont rédigés à la main ensuite, voir
outils/archives/.
Les sorts dont l'OCR a manqué le titre (souvent les sorts mineurs) sont signalés à la fin : à relever à la main.
"""
import json, re, sys

NIV = re.compile(r"^niveau\s+([0-9oO])\s*[-–]\s*([a-zéèêàç]+)(\s*\(rituel\))?", re.I)


def champ(lignes, i, nom):
    for x in lignes[i:i + 9]:
        m = re.match(nom + r"\s*:\s*(.+)", x)
        if m:
            return m.group(1).strip()
    return ""


def main():
    src, dst = sys.argv[1], sys.argv[2]
    L = [l.strip() for l in open(src, encoding="utf-8").read().split("\n")]
    recs, manques = [], []
    for i, l in enumerate(L):
        m = NIV.match(l)
        if not m or i == 0 or not champ(L, i, "Temps d'incantation"):
            continue                                   # « niveau 5 (2d12)… » dans une progression : pas un en-tête
        nom = L[i - 1]
        lettres = [c for c in nom if c.isalpha()]
        if len(lettres) < 3 or sum(c.isupper() for c in lettres) < 0.6 * len(lettres):   # titre en majuscules (l'OCR en abîme parfois quelques-unes)
            manques.append(f"ligne {i + 1} : titre illisible avant « {l} »")
            continue
        recs.append({"name": nom.replace("’", "'").upper(), "l": 0 if m.group(1) in "oO" else int(m.group(1)), "s": m.group(2).lower(),
                     "ri": bool(m.group(3)), "t": champ(L, i, "Temps d'incantation"), "r": champ(L, i, "Portée"),
                     "v": champ(L, i, "Composantes"), "d": champ(L, i, "Durée")})
    json.dump(recs, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{dst} : {len(recs)} sorts relevés")
    for x in manques:
        print("  à relever à la main :", x)


if __name__ == "__main__":
    main()
