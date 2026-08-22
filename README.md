# Budget — Gestion de budget (PWA)

Application de gestion de budget personnelle : salaire, dépenses/entrées, charges fixes, abonnements liés à un calendrier, comptes bancaires, livrets, PEA, compte-titres et portefeuille d'actions.

100% locale : toutes les données sont stockées dans le navigateur (IndexedDB), aucun serveur ni compte requis. Fonctionne hors-ligne une fois installée.

## Démarrer en développement

```bash
npm install
npm run dev
```

Ouvrez l'URL affichée (http://localhost:5173).

## Build de production

```bash
npm run build
npm run preview
```

`npm run build` génère le dossier `dist/` prêt à héberger sur n'importe quel serveur statique (Netlify, Vercel, GitHub Pages, un simple `serve dist`, etc.). Le service worker et le manifest PWA sont générés automatiquement par `vite-plugin-pwa`.

## Installer l'app (PWA)

Une fois l'app ouverte dans un navigateur (Chrome, Edge, Safari iOS/Android) :

- **Desktop (Chrome/Edge)** : cliquez sur l'icône d'installation dans la barre d'adresse, ou menu → "Installer l'application".
- **Android (Chrome)** : menu ⋮ → "Ajouter à l'écran d'accueil".
- **iOS (Safari)** : bouton Partager → "Sur l'écran d'accueil".

L'app s'ouvre ensuite en plein écran comme une application native, fonctionne hors-ligne, et toutes les données restent stockées localement sur l'appareil.

## Fonctionnalités

- **Tableau de bord** en bento design : patrimoine total, répartition comptes/liquidités/titres, revenus/dépenses du mois, prochaines échéances, comptes et derniers mouvements.
- **Mouvements** : ajout de dépenses et d'entrées d'argent, associées à un compte et une catégorie, historique par mois.
- **Récurrent** : salaire et revenus récurrents, charges fixes, et gestionnaire d'abonnements avec logos/icônes colorés affichés sur un calendrier mensuel au jour de prélèvement (ex. Netflix affiché le 15). Un bouton "marquer comme fait" génère le mouvement du mois dans le compte concerné.
- **Comptes & Patrimoine** : comptes courants, livrets, comptes-titres et PEA, avec suivi des titres détenus (quantité, prix d'achat, cours actuel, plus/moins-value).

## Icônes / régénérer les icônes PWA

Les icônes sont générées via `scripts/gen-icons.mjs` (nécessite `sharp` en dev dependency) :

```bash
node scripts/gen-icons.mjs
```
