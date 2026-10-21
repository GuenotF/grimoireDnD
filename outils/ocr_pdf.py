#!/usr/bin/env python3
"""Transforme un PDF « image » (exports AideDD, fiches scannées) en texte, colonne par colonne.

    python3 outils/ocr_pdf.py Monstres-druide.pdf /tmp/betes.txt
    python3 outils/ocr_pdf.py Sorts-druide.pdf /tmp/sorts.txt --colonnes 2

Les exports AideDD sont des images sur deux colonnes : lire la page entière mélange les lignes des deux
colonnes. On découpe donc chaque page en colonnes avant la reconnaissance de texte.

Prérequis : pdftoppm (poppler-utils), tesseract, Pillow. La langue « fra » de tesseract est utilisée si
elle est installée (sinon « eng » : les accents sont alors à corriger, voir betes_aidedd.py).
"""
import argparse, glob, os, subprocess, tempfile
from PIL import Image


def langue():
    out = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
    return "fra" if "\nfra" in out else "eng"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf"); ap.add_argument("sortie")
    ap.add_argument("--colonnes", type=int, default=2, help="nombre de colonnes par page (2 pour AideDD)")
    ap.add_argument("--dpi", type=int, default=200)
    a = ap.parse_args()
    lang = langue()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(a.dpi), "-png", a.pdf, os.path.join(tmp, "p")], check=True)
        textes = []
        for page in sorted(glob.glob(os.path.join(tmp, "p-*.png"))):
            im = Image.open(page); w, h = im.size
            for c in range(a.colonnes):
                col = os.path.join(tmp, f"{os.path.basename(page)[:-4]}-{c}.png")
                im.crop((w * c // a.colonnes, 0, w * (c + 1) // a.colonnes, h)).save(col)
                # psm 4 : une seule colonne de texte de tailles variables
                out = subprocess.run(["tesseract", col, "-", "-l", lang, "--psm", "4"], capture_output=True, text=True).stdout
                textes.append(out.strip())
    open(a.sortie, "w", encoding="utf-8").write("\n".join(textes) + "\n")
    print(f"{a.sortie} : {len(textes)} colonnes lues (langue {lang})")


if __name__ == "__main__":
    main()
