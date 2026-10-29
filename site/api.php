<?php
/*
 * Muntjes-app — API voor de ouder-app en de kind-tablets.
 *
 * Alle gezinsgegevens (kinderen, klusjes, beloningen, geschiedenis, timers) staan als één
 * JSON-document in SQLite, met een versienummer. Wie opslaat met een oude versie krijgt 409
 * en de nieuwste versie terug; de app voert zijn wijziging dan opnieuw uit.
 *
 * Gebruikers: elk met een eigen pincode (die is uniek, dus inloggen gaat met alleen de pincode).
 *   - ouder:   mag alles;
 *   - familie: klusjes melden, muntjes geven (met berichtje), aanvragen goedkeuren/afwijzen, timers.
 * Tablet: apparaat-sleutel (header X-Apparaat), eenmalig gekoppeld door een ouder.
 *         Een tablet mag alleen aanvragen/meldingen voor zijn eigen kind toevoegen of intrekken.
 * Widget: de Android-widget heeft een eigen sleutel (header X-Widget) die alleen het saldo
 *         van één kind mag lezen. Na een wijziging stuurt de server een pushbericht (Firebase).
 */
declare(strict_types=1);
date_default_timezone_set('Europe/Amsterdam');   // weken en dagen zoals in de app

const DB_FILE      = __DIR__ . '/data/muntjes.sqlite';
const MAX_FOUTEN   = 5;        // na zoveel foute pincodes...
const LOCK_SECONDS = 900;      // ...15 minuten wachten
const SESSIE_DAGEN = 30;       // zo lang blijft een ouder ingelogd
const MAX_BYTES    = 2000000;  // grootste toegestane opslag-verzoek

$lifetime = SESSIE_DAGEN * 86400;
ini_set('session.gc_maxlifetime', (string)$lifetime);
if (!is_dir(__DIR__ . '/data/sessions')) @mkdir(__DIR__ . '/data/sessions', 0750, true);
ini_set('session.save_path', __DIR__ . '/data/sessions');
session_name('muntjes');
session_set_cookie_params([
    'lifetime' => $lifetime,
    'path'     => dirname($_SERVER['SCRIPT_NAME']) ?: '/',
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$transactie = false;

function out(array $data, int $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code = 400) {
    global $db, $transactie;
    if ($transactie) { $db->exec('ROLLBACK'); $transactie = false; }
    out(['fout' => $msg], $code);
}

/* ---- database ---- */
try {
    if (!is_dir(dirname(DB_FILE))) mkdir(dirname(DB_FILE), 0750, true);
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec('CREATE TABLE IF NOT EXISTS staat (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        versie INTEGER NOT NULL,
        data TEXT NOT NULL,
        bijgewerkt INTEGER NOT NULL
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS instellingen (sleutel TEXT PRIMARY KEY, waarde TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS apparaten (
        id INTEGER PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        kid TEXT NOT NULL,
        aangemaakt INTEGER NOT NULL,
        laatst INTEGER NOT NULL DEFAULT 0
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS fouten (ip TEXT PRIMARY KEY, aantal INTEGER NOT NULL, tot INTEGER NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS widgets (
        id INTEGER PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        kid TEXT NOT NULL,
        fcm TEXT,
        aangemaakt INTEGER NOT NULL,
        laatst INTEGER NOT NULL DEFAULT 0
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS kaartjes (hash TEXT PRIMARY KEY, tot INTEGER NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS gebruikers (
        id INTEGER PRIMARY KEY,
        naam TEXT NOT NULL,
        rol TEXT NOT NULL CHECK (rol IN (\'ouder\', \'familie\')),
        pin_hash TEXT NOT NULL,
        aangemaakt INTEGER NOT NULL
    )');
} catch (Throwable $e) {
    fail('De database werkt niet op deze server. Controleer of PHP de map data/ mag beschrijven en of SQLite aan staat.', 500);
}

function instelling(string $sleutel): ?string {
    global $db;
    $st = $db->prepare('SELECT waarde FROM instellingen WHERE sleutel = ?');
    $st->execute([$sleutel]);
    $w = $st->fetchColumn();
    return $w === false ? null : (string)$w;
}
function zet_instelling(string $sleutel, string $waarde): void {
    global $db;
    $db->prepare('INSERT INTO instellingen (sleutel, waarde) VALUES (?, ?)
                  ON CONFLICT(sleutel) DO UPDATE SET waarde = excluded.waarde')->execute([$sleutel, $waarde]);
}

// Eerste keer: gebruiker "Papa" (ouder) met de oude gedeelde pincode, of anders de startpincode uit .env.
if ((int)$db->query('SELECT COUNT(*) FROM gebruikers')->fetchColumn() === 0) {
    $hash = instelling('pin_hash');
    $start = (string)getenv('START_PIN');
    if ($hash === null && preg_match('/^\d{4,8}$/', $start)) $hash = password_hash($start, PASSWORD_DEFAULT);
    if ($hash !== null) {
        $db->prepare('INSERT INTO gebruikers (naam, rol, pin_hash, aangemaakt) VALUES (?, ?, ?, ?)')->execute(['Papa', 'ouder', $hash, time()]);
    }
}

/* ---- invoer ---- */
$actie = $_GET['actie'] ?? '';
$raw = '';
$in = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Alleen JSON accepteren: dat kan een andere website niet stiekem namens jou versturen.
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fail('Verkeerd soort verzoek.', 415);
    $raw = (string)file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
    if (strlen($raw) > MAX_BYTES) fail('Te veel gegevens in één keer.', 413);
    $in = json_decode($raw, true);
    if (!is_array($in)) $in = [];
}
function need_post(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Gebruik POST.', 405);
}

/* ---- wie is dit? ---- */
function wie(): ?array {
    global $db;
    if (!empty($_SESSION['gebruiker'])) {
        $st = $db->prepare('SELECT id, naam, rol FROM gebruikers WHERE id = ?');
        $st->execute([(int)$_SESSION['gebruiker']]);
        $g = $st->fetch();
        if ($g) return ['rol' => $g['rol'], 'naam' => $g['naam'], 'id' => (int)$g['id']];
    }
    $token = $_SERVER['HTTP_X_APPARAAT'] ?? '';
    if (preg_match('/^[a-f0-9]{64}$/', $token)) {
        $st = $db->prepare('SELECT id, kid, laatst FROM apparaten WHERE token_hash = ?');
        $st->execute([hash('sha256', $token)]);
        $a = $st->fetch();
        if ($a) {
            if ((int)$a['laatst'] < time() - 60) {
                $db->prepare('UPDATE apparaten SET laatst = ? WHERE id = ?')->execute([time(), $a['id']]);
            }
            return ['rol' => 'kind', 'kid' => (string)$a['kid']];
        }
    }
    return null;
}
function need_ouder(): array {
    $w = wie();
    if (!$w) fail('Log eerst in.', 401);
    if ($w['rol'] !== 'ouder') fail('Dit mag alleen papa of mama.', 403);
    return $w;
}
function need_volwassene(): array {
    $w = wie();
    if (!$w || !in_array($w['rol'], ['ouder', 'familie'], true)) fail('Log eerst in.', 401);
    return $w;
}

/* ---- pincode met slot na te veel fouten (per IP-adres) ---- */
function slot_controleren(): void {
    global $db;
    $st = $db->prepare('SELECT tot FROM fouten WHERE ip = ?');
    $st->execute([$_SERVER['REMOTE_ADDR'] ?? '?']);
    $tot = (int)$st->fetchColumn();
    if ($tot > time()) {
        fail('Te vaak een verkeerde pincode. Probeer het over ' . (int)ceil(($tot - time()) / 60) . ' minuten opnieuw.', 429);
    }
}
function slot_fout(): void {
    global $db;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $st = $db->prepare('SELECT aantal, tot FROM fouten WHERE ip = ?');
    $st->execute([$ip]);
    $f = $st->fetch() ?: ['aantal' => 0, 'tot' => 0];
    $aantal = (int)$f['tot'] > 0 ? 1 : (int)$f['aantal'] + 1;   // na een verlopen slot opnieuw tellen
    $tot = $aantal >= MAX_FOUTEN ? time() + LOCK_SECONDS : 0;
    $db->prepare('INSERT INTO fouten (ip, aantal, tot) VALUES (?, ?, ?)
                  ON CONFLICT(ip) DO UPDATE SET aantal = excluded.aantal, tot = excluded.tot')->execute([$ip, $aantal, $tot]);
    fail($tot ? 'Te vaak een verkeerde pincode. Probeer het over 15 minuten opnieuw.' : 'Verkeerde pincode.', $tot ? 429 : 403);
}
function slot_ok(): void {
    global $db;
    $db->prepare('DELETE FROM fouten WHERE ip = ?')->execute([$_SERVER['REMOTE_ADDR'] ?? '?']);
}

// Zoekt de gebruiker bij deze pincode (pincodes zijn uniek).
function gebruiker_met_pin(string $pin): array {
    global $db;
    slot_controleren();
    $alle = $db->query('SELECT id, naam, rol, pin_hash FROM gebruikers')->fetchAll();
    if (!$alle) fail('Er is nog geen gebruiker ingesteld op de server.', 503);
    if (preg_match('/^\d{4,8}$/', $pin)) {
        foreach ($alle as $g) {
            if (password_verify($pin, $g['pin_hash'])) { slot_ok(); return $g; }
        }
    }
    slot_fout();
}

function pin_in_gebruik(string $pin, int $behalve = 0): bool {
    global $db;
    foreach ($db->query('SELECT id, pin_hash FROM gebruikers')->fetchAll() as $g) {
        if ((int)$g['id'] !== $behalve && password_verify($pin, $g['pin_hash'])) return true;
    }
    return false;
}

/* ---- gegevens ---- */
function lees_staat(): ?array {
    global $db;
    $s = $db->query('SELECT versie, data FROM staat WHERE id = 1')->fetch();
    return $s ?: null;
}
function stuur_staat(?array $s, int $code = 200): void {
    http_response_code($code);
    // Het document gaat ongewijzigd terug, zodat lege objecten ({}) geen lijsten ([]) worden.
    echo '{"versie":' . ($s ? (int)$s['versie'] : 0) . ',"data":' . ($s ? $s['data'] : 'null') . '}';
    exit;
}

// Vergelijken zonder dat de volgorde van sleutels uitmaakt.
function canon($v) {
    if (!is_array($v)) return $v;
    if (!array_is_list($v)) ksort($v);
    return array_map('canon', $v);
}
function gelijk($a, $b): bool {
    return json_encode(canon($a)) === json_encode(canon($b));
}

// Wat mag een tablet veranderen? Alleen voor zijn eigen kind: een aanvraag of melding toevoegen,
// een eigen openstaande aanvraag intrekken, een eigen regel als "gezien" markeren, of de
// klaarstaande timer van een eigen spelletje-beloning starten (bij "Speel nu").
function kind_fout(array $oud, array $nieuw, string $kid): ?string {
    $nee = 'Dit mag alleen papa of mama aanpassen.';
    foreach (array_unique(array_merge(array_keys($oud), array_keys($nieuw))) as $k) {
        if ($k === 'tx' || $k === 'nextId' || $k === 'focus' || $k === 'timers') continue;
        if (!gelijk($oud[$k] ?? null, $nieuw[$k] ?? null)) return $nee;
    }
    $to = array_values(is_array($oud['timers'] ?? null) ? $oud['timers'] : []);
    $tn = array_values(is_array($nieuw['timers'] ?? null) ? $nieuw['timers'] : []);
    if (count($to) !== count($tn)) return $nee;
    $belSpel = array_column($oud['beloningen'] ?? [], null, 'id');
    foreach ($to as $i => $t) {
        if (gelijk($t, $tn[$i])) continue;
        $a = $t;
        $b = $tn[$i];
        unset($a['status'], $a['eind'], $b['status'], $b['eind']);
        $nuMs = time() * 1000;
        $eind = $tn[$i]['eind'] ?? null;
        $spel = (string)($belSpel[(string)($t['ref'] ?? '')]['spel'] ?? '');
        if (!gelijk($a, $b) || ($t['kid'] ?? '') !== $kid || ($t['status'] ?? '') !== 'wacht' || $spel === ''
            || ($tn[$i]['status'] ?? '') !== 'loopt' || !is_numeric($eind)
            || $eind < $nuMs || $eind > $nuMs + ((float)($t['rest'] ?? 0) + 120) * 1000) return $nee;
    }
    if ((int)($nieuw['nextId'] ?? 0) < (int)($oud['nextId'] ?? 0)) return $nee;

    // Weekfocus: alleen die van het eigen kind, met bestaande taken en niet meer dan toegestaan.
    $fo = is_array($oud['focus'] ?? null) ? $oud['focus'] : [];
    $fn = is_array($nieuw['focus'] ?? null) ? $nieuw['focus'] : [];
    foreach (array_unique(array_merge(array_keys($fo), array_keys($fn))) as $k) {
        if ((string)$k !== $kid && !gelijk($fo[$k] ?? null, $fn[$k] ?? null)) return $nee;
    }
    if (isset($fn[$kid])) {
        $ids = $fn[$kid]['ids'] ?? null;
        $takenIds = array_column($oud['taken'] ?? [], 'id');
        if (!is_array($ids) || count($ids) > (int)($oud['maxFocus'] ?? 3) || !is_int($fn[$kid]['week'] ?? null)) return $nee;
        foreach ($ids as $id) if (!in_array($id, $takenIds, true)) return $nee;
    }

    $o = [];
    foreach ($oud['tx'] ?? [] as $t) if (is_array($t) && isset($t['id'])) $o[(string)$t['id']] = $t;
    $n = [];
    foreach ($nieuw['tx'] ?? [] as $t) {
        if (!is_array($t) || !isset($t['id'])) return $nee;
        $n[(string)$t['id']] = $t;
    }
    $eigenOpen = fn(array $t): bool => ($t['kid'] ?? '') === $kid && ($t['bron'] ?? '') === 'kind' && ($t['status'] ?? '') === 'aangevraagd';

    foreach ($o as $id => $t) {
        if (!isset($n[$id])) {
            if (!$eigenOpen($t)) return $nee;
            continue;
        }
        if (gelijk($t, $n[$id])) continue;
        $a = $t;
        $b = $n[$id];
        unset($a['gezien'], $b['gezien']);
        if (!gelijk($a, $b) || ($t['kid'] ?? '') !== $kid || ($n[$id]['gezien'] ?? false) !== true) return $nee;
    }

    $klusjes = array_column($oud['klusjes'] ?? [], null, 'id');
    $beloningen = array_column($oud['beloningen'] ?? [], null, 'id');
    $taken = array_column($oud['taken'] ?? [], null, 'id');
    foreach ($n as $id => $t) {
        if (isset($o[$id])) continue;
        if (!$eigenOpen($t)) return $nee;
        $ref = (string)($t['ref'] ?? '');
        $bedrag = $t['amount'] ?? null;
        if (($t['type'] ?? '') === 'klus') {
            if (!isset($klusjes[$ref]) || $bedrag !== $klusjes[$ref]['waarde']) return 'Onbekend klusje.';
        } elseif (($t['type'] ?? '') === 'ster') {
            if (!isset($taken[$ref]) || $bedrag !== 0) return 'Onbekende taak.';
        } elseif (($t['type'] ?? '') === 'beloning') {
            if (!isset($beloningen[$ref]) || $bedrag !== -$beloningen[$ref]['kosten']) return 'Onbekende beloning.';
        } else {
            return $nee;
        }
        if (($t['msg'] ?? '') !== '' || !is_string($t['label'] ?? null) || mb_strlen($t['label']) > 60) return $nee;
    }
    return null;
}

// Wat mag familie (opa, oma, oppas) veranderen? Klusjes melden en muntjes geven (met berichtje),
// aanvragen goedkeuren of afwijzen, en timers bedienen. Kaarten, kinderen en instellingen niet.
function familie_fout(array $oud, array $nieuw, string $naam): ?string {
    $nee = 'Dit mag alleen papa of mama aanpassen.';
    foreach (array_unique(array_merge(array_keys($oud), array_keys($nieuw))) as $k) {
        if (in_array($k, ['tx', 'timers', 'nextId'], true)) continue;
        if (!gelijk($oud[$k] ?? null, $nieuw[$k] ?? null)) return $nee;
    }
    if ((int)($nieuw['nextId'] ?? 0) < (int)($oud['nextId'] ?? 0)) return $nee;

    $o = [];
    foreach ($oud['tx'] ?? [] as $t) if (is_array($t) && isset($t['id'])) $o[(string)$t['id']] = $t;
    $n = [];
    foreach ($nieuw['tx'] ?? [] as $t) {
        if (!is_array($t) || !isset($t['id'])) return $nee;
        $n[(string)$t['id']] = $t;
    }
    foreach ($o as $id => $t) {
        if (!isset($n[$id])) return $nee;
        if (gelijk($t, $n[$id])) continue;
        // Alleen een openstaande aanvraag (of gemelde ster) goedkeuren of afwijzen
        $a = $t;
        $b = $n[$id];
        unset($a['status'], $b['status'], $b['beslistDoor']);
        if (($t['status'] ?? '') !== 'aangevraagd' || !in_array($n[$id]['status'] ?? '', ['goed', 'afgewezen'], true)
            || !gelijk($a, $b) || ($n[$id]['beslistDoor'] ?? '') !== $naam) return $nee;
    }
    $klusjes = array_column($oud['klusjes'] ?? [], null, 'id');
    $taken = array_column($oud['taken'] ?? [], null, 'id');
    foreach ($n as $id => $t) {
        if (isset($o[$id])) continue;
        if (($t['bron'] ?? '') !== 'ouder' || ($t['status'] ?? '') !== 'goed' || ($t['door'] ?? '') !== $naam) return $nee;
        $bedrag = $t['amount'] ?? null;
        $ref = (string)($t['ref'] ?? '');
        if (($t['type'] ?? '') === 'klus') {
            if (!isset($klusjes[$ref]) || $bedrag !== $klusjes[$ref]['waarde']) return 'Onbekend klusje.';
        } elseif (($t['type'] ?? '') === 'ster') {
            if (!isset($taken[$ref]) || $bedrag !== 0) return 'Onbekende taak.';
        } elseif (($t['type'] ?? '') === 'taakklaar') {
            if (!isset($taken[$ref]) || $bedrag !== $taken[$ref]['beloning']) return 'Onbekende taak.';
        } elseif (($t['type'] ?? '') === 'overig') {
            if (!is_int($bedrag) || $bedrag < 1 || $bedrag > 20) return 'Familie kan alleen muntjes geven, niet afhalen.';
        } else {
            return $nee;
        }
        if (!is_string($t['label'] ?? null) || mb_strlen($t['label']) > 60 || mb_strlen((string)($t['msg'] ?? '')) > 200) return $nee;
    }
    return null;
}

/* ---- widget ---- */

// Wat de widget van één kind laat zien. Rekent hetzelfde als de app (saldo min gereserveerd).
function samenvatting(array $data, string $kid): ?array {
    $kind = null;
    foreach ($data['kids'] ?? [] as $k) if (($k['id'] ?? '') === $kid) $kind = $k;
    if (!$kind) return null;
    $weekStart = strtotime('monday this week 00:00') * 1000;
    $saldo = 0; $gereserveerd = 0; $open = 0; $week = 0; $laatste = null;
    $sterren = 0; $perTaak = []; $voltooid = [];
    foreach ($data['tx'] ?? [] as $t) {
        if (($t['kid'] ?? '') !== $kid) continue;
        $bedrag = (int)($t['amount'] ?? 0);
        $status = $t['status'] ?? '';
        $dezeWeek = ($t['ts'] ?? 0) >= $weekStart;
        if (($t['type'] ?? '') === 'ster' && $status === 'goed' && $dezeWeek) {
            $sterren++;
            $perTaak[$t['ref']] = ($perTaak[$t['ref']] ?? 0) + 1;
        }
        if (($t['type'] ?? '') === 'taakklaar' && $dezeWeek) $voltooid[$t['ref']] = true;
        if ($status === 'goed') {
            $saldo += $bedrag;
            if (($t['type'] ?? '') === 'klus' && ($t['ts'] ?? 0) >= $weekStart) $week += $bedrag;
        } elseif ($status === 'aangevraagd') {
            $open++;
            if ($bedrag < 0) $gereserveerd -= $bedrag;
        }
        if ($status !== 'afgewezen' && (!$laatste || ($t['ts'] ?? 0) > $laatste['ts'])) {
            $laatste = ['label' => (string)($t['label'] ?? ''), 'bedrag' => $bedrag, 'status' => $status, 'ts' => (int)($t['ts'] ?? 0)];
        }
    }
    // Taken waar het kind deze week op focust, met hoeveel sterren al binnen zijn.
    $taken = array_column($data['taken'] ?? [], null, 'id');
    $f = $data['focus'][$kid] ?? null;
    $focus = is_array($f) && (int)($f['week'] ?? 0) === $weekStart && is_array($f['ids'] ?? null) ? $f['ids'] : [];
    $gekozen = [];
    foreach ($focus as $id) {
        if (!isset($taken[$id])) continue;
        $n = $perTaak[$id] ?? 0;
        $doel = (int)$taken[$id]['doel'];
        $gekozen[] = ['naam' => $taken[$id]['naam'], 'sterren' => min($n, $doel), 'doel' => $doel, 'klaar' => isset($voltooid[$id]) || $n >= $doel];
    }
    return [
        'naam' => $kind['naam'], 'thema' => $kind['thema'] ?? 'geen', 'kleur' => $kind['kleur'], 'zacht' => $kind['zacht'],
        'saldo' => $saldo - $gereserveerd, 'gereserveerd' => $gereserveerd, 'open' => $open,
        'week' => $week, 'maxWeek' => (int)($data['maxWeek'] ?? 7), 'laatste' => $laatste,
        'heeftTaken' => count($taken) > 0, 'sterren' => $sterren, 'taken' => $gekozen,
    ];
}

function widget_wie(): ?array {
    global $db;
    $token = $_SERVER['HTTP_X_WIDGET'] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) return null;
    $st = $db->prepare('SELECT id, kid, laatst FROM widgets WHERE token_hash = ?');
    $st->execute([hash('sha256', $token)]);
    $w = $st->fetch();
    if ($w && (int)$w['laatst'] < time() - 60) $db->prepare('UPDATE widgets SET laatst = ? WHERE id = ?')->execute([time(), $w['id']]);
    return $w ?: null;
}

// Widgets waarvan het kind er na deze wijziging anders uitziet.
function widgets_met_wijziging(array $oud, array $nieuw): array {
    global $db;
    $uit = [];
    foreach ($db->query('SELECT id, kid, fcm FROM widgets WHERE fcm IS NOT NULL')->fetchAll() as $w) {
        if (!gelijk(samenvatting($oud, $w['kid']), samenvatting($nieuw, $w['kid']))) $uit[] = $w;
    }
    return $uit;
}

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

function http_post(string $url, string $body, array $headers): array {
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $antwoord = (string)curl_exec($c);
    $code = (int)curl_getinfo($c, CURLINFO_RESPONSE_CODE);
    curl_close($c);
    return [$code, $antwoord];
}

function firebase(): ?array {
    $pad = getenv('FIREBASE_SLEUTEL');
    if (!$pad || !is_readable($pad)) return null;
    $sa = json_decode((string)file_get_contents($pad), true);
    return is_array($sa) && isset($sa['private_key'], $sa['client_email'], $sa['project_id']) ? $sa : null;
}

// Toegangssleutel voor Firebase (OAuth, 1 uur geldig, bewaard in de database).
function google_token(array $sa): ?string {
    $cache = json_decode((string)instelling('fcm_toegang'), true);
    if (is_array($cache) && ($cache['tot'] ?? 0) > time() + 60) return $cache['token'];
    $nu = time();
    $deel = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . b64url(json_encode([
        'iss' => $sa['client_email'], 'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $nu, 'exp' => $nu + 3600,
    ]));
    if (!openssl_sign($deel, $handtekening, $sa['private_key'], OPENSSL_ALGO_SHA256)) return null;
    [$code, $antwoord] = http_post('https://oauth2.googleapis.com/token', http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $deel . '.' . b64url($handtekening),
    ]), ['Content-Type: application/x-www-form-urlencoded']);
    $j = json_decode($antwoord, true);
    if ($code !== 200 || empty($j['access_token'])) { error_log('Muntjes: geen Firebase-token: ' . $antwoord); return null; }
    zet_instelling('fcm_toegang', json_encode(['token' => $j['access_token'], 'tot' => $nu + (int)($j['expires_in'] ?? 3600)]));
    return $j['access_token'];
}

// Stuurt een stil seintje naar de widgets; die halen daarna zelf het nieuwe saldo op.
function stuur_push(array $widgets, bool $alleenTesten = false): array {
    global $db;
    $sa = firebase();
    if (!$sa) return ['fout' => 'Geen Firebase-sleutel op de server.'];
    $token = google_token($sa);
    if (!$token) return ['fout' => 'Firebase gaf geen toegang.'];
    $uitslag = [];
    foreach ($widgets as $w) {
        [$code, $antwoord] = http_post('https://fcm.googleapis.com/v1/projects/' . $sa['project_id'] . '/messages:send',
            json_encode(['validate_only' => $alleenTesten, 'message' => [
                'token' => $w['fcm'], 'data' => ['t' => 'ververs'], 'android' => ['priority' => 'high'],
            ]]), ['Authorization: Bearer ' . $token, 'Content-Type: application/json']);
        // Token bestaat niet meer (app verwijderd): niet meer naar sturen.
        if (!$alleenTesten && ($code === 404 || ($code === 400 && str_contains($antwoord, 'registration token')))) {
            $db->prepare('UPDATE widgets SET fcm = NULL WHERE id = ?')->execute([$w['id']]);
        }
        $uitslag[] = ['code' => $code, 'antwoord' => json_decode($antwoord, true)];
    }
    return $uitslag;
}

function gebruikers_lijst(): array {
    global $db;
    return array_map(fn($g) => ['id' => (int)$g['id'], 'naam' => $g['naam'], 'rol' => $g['rol']],
        $db->query('SELECT id, naam, rol FROM gebruikers ORDER BY rol DESC, aangemaakt')->fetchAll());
}
function aantal_ouders(int $behalve = 0): int {
    global $db;
    $st = $db->prepare("SELECT COUNT(*) FROM gebruikers WHERE rol = 'ouder' AND id != ?");
    $st->execute([$behalve]);
    return (int)$st->fetchColumn();
}

/* ---- acties ---- */
switch ($actie) {
    case 'status': {
        $w = wie();
        out(['rol' => $w['rol'] ?? null, 'kid' => $w['kid'] ?? null, 'naam' => $w['naam'] ?? null, 'id' => $w['id'] ?? null]);
    }

    case 'inloggen': {
        need_post();
        $g = gebruiker_met_pin((string)($in['pin'] ?? ''));
        session_regenerate_id(true);
        $_SESSION['gebruiker'] = (int)$g['id'];
        out(['ok' => true]);
    }

    case 'uitloggen': {
        need_post();
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);
    }

    // Tablet koppelen, stap 1: pincode van een ouder, dan de lijst met kinderen.
    case 'koppelstart': {
        need_post();
        $g = gebruiker_met_pin((string)($in['pin'] ?? ''));
        if ($g['rol'] !== 'ouder') fail('Alleen papa of mama kan een tablet koppelen.', 403);
        $_SESSION['koppel_tot'] = time() + 300;
        $s = lees_staat();
        $kids = $s ? (json_decode($s['data'], true)['kids'] ?? []) : [];
        out(['kids' => array_map(fn($k) => [
            'id' => $k['id'], 'naam' => $k['naam'], 'kleur' => $k['kleur'], 'zacht' => $k['zacht'],
        ], $kids)]);
    }

    // Stap 2: kind kiezen. De tablet krijgt een sleutel; op de server staat alleen de hash.
    case 'koppel': {
        need_post();
        if (($_SESSION['koppel_tot'] ?? 0) < time()) fail('Vul eerst opnieuw de pincode in.', 403);
        $kid = (string)($in['kid'] ?? '');
        $s = lees_staat();
        $kids = $s ? array_column(json_decode($s['data'], true)['kids'] ?? [], 'id') : [];
        if (!in_array($kid, $kids, true)) fail('Dit kind bestaat niet (meer).', 404);
        unset($_SESSION['koppel_tot']);
        $token = bin2hex(random_bytes(32));
        $db->prepare('INSERT INTO apparaten (token_hash, kid, aangemaakt, laatst) VALUES (?, ?, ?, ?)')
           ->execute([hash('sha256', $token), $kid, time(), time()]);
        out(['token' => $token, 'kid' => $kid]);
    }

    case 'staat': {
        if (!wie()) fail('Niet ingelogd.', 401);
        $s = lees_staat();
        if ($s && (int)$s['versie'] === (int)($_GET['sinds'] ?? -1)) {
            http_response_code(204);
            exit;
        }
        stuur_staat($s);
    }

    case 'opslaan': {
        need_post();
        $w = wie();
        if (!$w) fail('Niet ingelogd.', 401);
        if (!isset($in['data']) || !is_array($in['data']) || !is_array($in['data']['kids'] ?? null)) fail('Ongeldige gegevens.');
        // Opnieuw inlezen als objecten, zodat {} ook als {} wordt bewaard.
        $obj = json_decode($raw)->data;

        $db->exec('BEGIN IMMEDIATE');
        $transactie = true;
        $s = lees_staat();
        $huidig = $s ? (int)$s['versie'] : 0;
        if ((int)($in['versie'] ?? -1) !== $huidig) {
            $db->exec('ROLLBACK');
            $transactie = false;
            stuur_staat($s, 409);
        }
        // Instellingen die nog niet op de server staan (van na een update) vult de app zelf aan
        // met de standaardwaarde. Die neemt een tablet of familielid niet mee; dat doet een ouder.
        if ($s && $w['rol'] !== 'ouder') {
            $opgeslagen = json_decode($s['data'], true);
            foreach (array_keys($in['data']) as $k) {
                if (array_key_exists($k, $opgeslagen) || in_array($k, ['tx', 'nextId', 'focus', 'timers'], true)) continue;
                unset($in['data'][$k], $obj->$k);
            }
        }
        $data = json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($w['rol'] === 'kind') {
            if (!$s) fail('Dit mag alleen papa of mama aanpassen.', 403);
            $fout = kind_fout(json_decode($s['data'], true), $in['data'], $w['kid']);
            if ($fout) fail($fout, 403);
        } elseif ($w['rol'] === 'familie') {
            if (!$s) fail('Dit mag alleen papa of mama aanpassen.', 403);
            $fout = familie_fout(json_decode($s['data'], true), $in['data'], $w['naam']);
            if ($fout) fail($fout, 403);
        }
        $db->prepare('INSERT INTO staat (id, versie, data, bijgewerkt) VALUES (1, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET versie = excluded.versie, data = excluded.data, bijgewerkt = excluded.bijgewerkt')
           ->execute([$huidig + 1, $data, time()]);
        $db->exec('COMMIT');
        $transactie = false;
        // Pas na het antwoord de widgets een seintje geven, zodat opslaan niet trager wordt.
        $teSturen = widgets_met_wijziging($s ? json_decode($s['data'], true) : [], $in['data']);
        if ($teSturen) {
            register_shutdown_function(function () use ($teSturen) {
                if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
                stuur_push($teSturen);
            });
        }
        out(['versie' => $huidig + 1]);
    }

    case 'apparaten': {
        need_ouder();
        $rijen = $db->query("SELECT id, kid, aangemaakt, laatst, 'tablet' AS soort FROM apparaten
                             UNION ALL SELECT id, kid, aangemaakt, laatst, 'widget' AS soort FROM widgets ORDER BY aangemaakt")->fetchAll();
        out(['apparaten' => array_map(fn($r) => [
            'id' => (int)$r['id'], 'kid' => $r['kid'], 'aangemaakt' => (int)$r['aangemaakt'], 'laatst' => (int)$r['laatst'], 'soort' => $r['soort'],
        ], $rijen)]);
    }

    case 'ontkoppel': {
        need_post();
        need_ouder();
        $tabel = ($in['soort'] ?? '') === 'widget' ? 'widgets' : 'apparaten';
        $db->prepare("DELETE FROM $tabel WHERE id = ?")->execute([(int)($in['id'] ?? 0)]);
        out(['ok' => true]);
    }

    // Eigen pincode wijzigen (ouder en familie)
    case 'pin': {
        need_post();
        $w = need_volwassene();
        slot_controleren();
        $st = $db->prepare('SELECT pin_hash FROM gebruikers WHERE id = ?');
        $st->execute([$w['id']]);
        if (!password_verify((string)($in['oud'] ?? ''), (string)$st->fetchColumn())) slot_fout();
        slot_ok();
        $nieuw = (string)($in['nieuw'] ?? '');
        if (!preg_match('/^\d{4,8}$/', $nieuw)) fail('De nieuwe pincode moet uit 4 tot 8 cijfers bestaan.');
        if (pin_in_gebruik($nieuw, $w['id'])) fail('Deze pincode is al van iemand anders. Kies een andere.');
        $db->prepare('UPDATE gebruikers SET pin_hash = ? WHERE id = ?')->execute([password_hash($nieuw, PASSWORD_DEFAULT), $w['id']]);
        out(['ok' => true]);
    }

    case 'gebruikers': {
        need_ouder();
        out(['gebruikers' => gebruikers_lijst()]);
    }

    // Gebruiker toevoegen of aanpassen (alleen ouders). Pincode verplicht bij nieuw, anders optioneel.
    case 'gebruiker': {
        need_post();
        $w = need_ouder();
        $id = (int)($in['id'] ?? 0);
        $naam = trim(str_replace(['<', '>', '&', '"'], '', (string)($in['naam'] ?? '')));
        $rol = (string)($in['rol'] ?? '');
        $pin = (string)($in['pin'] ?? '');
        if ($naam === '' || mb_strlen($naam) > 30) fail('Vul een naam in (maximaal 30 tekens).');
        if (!in_array($rol, ['ouder', 'familie'], true)) fail('Kies Ouder of Familie.');
        if (($id === 0 || $pin !== '') && !preg_match('/^\d{4,8}$/', $pin)) fail('De pincode moet uit 4 tot 8 cijfers bestaan.');
        if ($pin !== '' && pin_in_gebruik($pin, $id)) fail('Deze pincode is al van iemand anders. Kies een andere.');
        if ($id === 0) {
            $db->prepare('INSERT INTO gebruikers (naam, rol, pin_hash, aangemaakt) VALUES (?, ?, ?, ?)')
               ->execute([$naam, $rol, password_hash($pin, PASSWORD_DEFAULT), time()]);
        } else {
            if ($rol !== 'ouder' && aantal_ouders($id) === 0) fail('Er moet altijd minstens één ouder zijn.');
            $db->prepare('UPDATE gebruikers SET naam = ?, rol = ? WHERE id = ?')->execute([$naam, $rol, $id]);
            if ($pin !== '') $db->prepare('UPDATE gebruikers SET pin_hash = ? WHERE id = ?')->execute([password_hash($pin, PASSWORD_DEFAULT), $id]);
        }
        out(['gebruikers' => gebruikers_lijst()]);
    }

    case 'gebruiker_weg': {
        need_post();
        need_ouder();
        $id = (int)($in['id'] ?? 0);
        if (aantal_ouders($id) === 0) fail('Er moet altijd minstens één ouder zijn.');
        $db->prepare('DELETE FROM gebruikers WHERE id = ?')->execute([$id]);
        out(['gebruikers' => gebruikers_lijst()]);
    }

    // Widget koppelen, stap 1: pincode van een ouder → lijst met kinderen + een koppelkaartje (5 minuten geldig).
    case 'widget_start': {
        need_post();
        $g = gebruiker_met_pin((string)($in['pin'] ?? ''));
        if ($g['rol'] !== 'ouder') fail('Alleen papa of mama kan een widget koppelen.', 403);
        $db->prepare('DELETE FROM kaartjes WHERE tot < ?')->execute([time()]);
        $kaartje = bin2hex(random_bytes(16));
        $db->prepare('INSERT INTO kaartjes (hash, tot) VALUES (?, ?)')->execute([hash('sha256', $kaartje), time() + 300]);
        $s = lees_staat();
        $kids = $s ? (json_decode($s['data'], true)['kids'] ?? []) : [];
        out(['kaartje' => $kaartje, 'kids' => array_map(fn($k) => ['id' => $k['id'], 'naam' => $k['naam']], $kids)]);
    }

    // Stap 2: kind kiezen. De widget krijgt een sleutel die alleen mag lezen.
    case 'widget_koppel': {
        need_post();
        $st = $db->prepare('DELETE FROM kaartjes WHERE hash = ? AND tot >= ?');
        $st->execute([hash('sha256', (string)($in['kaartje'] ?? '')), time()]);
        if ($st->rowCount() !== 1) fail('Vul eerst opnieuw de pincode in.', 403);
        $kid = (string)($in['kid'] ?? '');
        $s = lees_staat();
        if (!$s || !samenvatting(json_decode($s['data'], true), $kid)) fail('Dit kind bestaat niet (meer).', 404);
        $fcm = is_string($in['fcm'] ?? null) && strlen($in['fcm']) < 500 ? $in['fcm'] : null;
        $sleutel = bin2hex(random_bytes(32));
        $db->prepare('INSERT INTO widgets (token_hash, kid, fcm, aangemaakt, laatst) VALUES (?, ?, ?, ?, ?)')
           ->execute([hash('sha256', $sleutel), $kid, $fcm, time(), time()]);
        out(['sleutel' => $sleutel, 'kid' => $kid]);
    }

    case 'widget': {
        $w = widget_wie();
        if (!$w) fail('Deze widget is niet (meer) gekoppeld.', 401);
        $s = lees_staat();
        $sv = $s ? samenvatting(json_decode($s['data'], true), $w['kid']) : null;
        if (!$sv) fail('Dit kind bestaat niet meer.', 410);
        out($sv);
    }

    // Firebase geeft de widget soms een nieuw adres voor pushberichten.
    case 'widget_fcm': {
        need_post();
        $w = widget_wie();
        if (!$w) fail('Deze widget is niet (meer) gekoppeld.', 401);
        $fcm = is_string($in['fcm'] ?? null) && strlen($in['fcm']) < 500 ? $in['fcm'] : null;
        $db->prepare('UPDATE widgets SET fcm = ? WHERE id = ?')->execute([$fcm, $w['id']]);
        out(['ok' => true]);
    }

    case 'widget_ontkoppel': {
        need_post();
        $w = widget_wie();
        if ($w) $db->prepare('DELETE FROM widgets WHERE id = ?')->execute([$w['id']]);
        out(['ok' => true]);
    }

    default:
        fail('Onbekende actie.', 404);
}
