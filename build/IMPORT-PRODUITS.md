# Importer des produits

Chaque produit est une entrée de `build/products.json` :

```json
{
  "slug": "ensemble-dentelle-florale-noir",
  "name": "Ensemble en dentelle florale",
  "cat": "Ensembles",
  "cost": 9.80,
  "images": ["https://…/photo1.jpg", "https://…/photo2.jpg"],
  "colors": ["Noir", "Rouge"],
  "sizes": ["S", "M", "L", "XL"],
  "desc": "Texte court et original (ne pas copier le texte du fournisseur).",
  "details": ["Dentelle et tulle", "Armatures"],
  "supplier_url": "https://fr.aliexpress.com/item/…"
}
```

- `cost` = prix fournisseur + livraison vers la France, en euros.
- Prix de vente calculé automatiquement : coût × 2,5, arrondi à x,90 €.
- `cat` : Ensembles, Soutiens-gorge, Bodies, Nuisettes, Kimonos, Culottes, Pyjamas.
- `supplier_url` n'est jamais publié sur le site.
- Puis : `python3 build/build.py`, commit, push. La page /boutique/ et les fiches /produit/… apparaissent automatiquement.
