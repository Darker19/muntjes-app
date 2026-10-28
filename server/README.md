# Server (VPS)

Wat er op de server staat voor muntjes.darkesttimes.nl. Deze bestanden gaan **niet** automatisch mee met een deploy; wijzig ze op de server in `/srv/muntjes`.

- `compose.yml` → `/srv/muntjes/compose.yml` (container `muntjes-php-1`, op netwerk `web`)
- `php.ini` → `/srv/muntjes/php.ini`
- `.env` (alleen op de server): `START_PIN=…` — wordt alleen gebruikt zolang er nog geen pincode in de database staat
- `firebase.json` (alleen op de server, eigenaar uid 82, rechten 400): serviceaccount-sleutel van Firebase-project `muntjes-135e3`, voor pushberichten naar de widget. In de container op `/run/secrets/firebase.json` (`FIREBASE_SLEUTEL`). Kwijt of gelekt? In de Firebase-console › Projectinstellingen › Serviceaccounts een nieuwe sleutel maken en de oude intrekken.
- `data/` (alleen op de server, eigenaar uid 82): `muntjes.sqlite` + `sessions/`
- `Caddyfile-blok.txt` → toegevoegd aan `/srv/web/Caddyfile`
- De site zelf (`site/`) wordt bij een push naar `main` door GitHub Actions naar `/srv/web/sites/muntjes` gekopieerd (gebruiker `deploy`, alleen die map via rrsync).
- Back-up: `/srv/muntjes` staat in `/usr/local/sbin/nas-backup-export` (nachtelijk naar de NAS).

Pincode vergeten? Zet een nieuwe `START_PIN` in `/srv/muntjes/.env` en wis de oude pincode:

```sh
cd /srv/muntjes
sudo docker compose up -d   # .env opnieuw inlezen
sudo docker compose exec php php -r '(new PDO("sqlite:/srv/sites/muntjes/data/muntjes.sqlite"))->exec("DELETE FROM instellingen WHERE sleutel = \"pin_hash\"");'
```

Bij het volgende verzoek wordt `START_PIN` de nieuwe pincode.
