# Muntjes-app

Beloningsapp voor de kinderen: een **ouder-app** (telefoon) en een **kind-app** (tablet) met gedeelde gegevens. Kinderen verdienen muntjes (of hartjes/vlees, afhankelijk van hun thema) met klusjes en wisselen die in voor beloningen.

- **Echte app:** https://muntjes.darkesttimes.nl — ouder logt in met de pincode, een tablet wordt eenmalig aan een kind gekoppeld. Gegevens staan op de eigen server (PHP + SQLite).
- **Demo:** https://darker19.github.io/muntjes-app/ — dezelfde app zonder server, met voorbeeldgegevens in de browser. Alleen ouder-app: `?view=ouder`, alleen kind-app: `?view=kind` (van een bepaald kind: `?view=kind&kind=daan`).

## Opbouw

- `site/` — de app (HTML, CSS, JavaScript zonder build-stap) en `api.php`. Op github.io en localhost draait hij als demo; elders als echte app (forceren: `?demo` of `?echt`).
- `server/` — wat er op de VPS staat (Docker compose, Caddy-blok). Zie `server/README.md`.

## Deploy

- Push naar `preview` → de demo op GitHub Pages wordt bijgewerkt (nieuwe ideeën eerst hier testen).
- Push naar `main` → `site/**` gaat naar de live app op de VPS (`/srv/web/sites/muntjes`, met de deploy-sleutel die alleen daar mag schrijven); `android/**` bouwt een nieuwe widget-APK.
- Klaar met testen: `preview` samenvoegen in `main`.

Lokaal bekijken (demo): `python3 -m http.server -d site` en open http://localhost:8000.
