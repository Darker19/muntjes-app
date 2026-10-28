<?php
/*
 * Muntjes-app — API voor de ouder-app en de kind-tablets.
 *
 * Alle gezinsgegevens (kinderen, klusjes, beloningen, geschiedenis, timers) staan als één
 * JSON-document in SQLite, met een versienummer. Wie opslaat met een oude versie krijgt 409
 * en de nieuwste versie terug; de app voert zijn wijziging dan opnieuw uit.
 *
 * Ouder:  sessie na inloggen met de pincode.
 * Tablet: apparaat-sleutel (header X-Apparaat), eenmalig gekoppeld door een ouder.
 *         Een tablet mag alleen aanvragen/meldingen voor zijn eigen kind toevoegen of intrekken.
 */
declare(strict_types=1);

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

// Eerste keer: de startpincode uit .env (START_PIN) wordt de pincode. Daarna wijzig je hem in de app.
if (instelling('pin_hash') === null) {
    $start = (string)getenv('START_PIN');
    if (preg_match('/^\d{4,8}$/', $start)) zet_instelling('pin_hash', password_hash($start, PASSWORD_DEFAULT));
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
    if (!empty($_SESSION['ouder'])) return ['rol' => 'ouder'];
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
function need_ouder(): void {
    $w = wie();
    if (!$w || $w['rol'] !== 'ouder') fail('Log eerst in als ouder.', 401);
}

/* ---- pincode met slot na te veel fouten (per IP-adres) ---- */
function controleer_pin(string $pin): void {
    global $db;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $nu = time();
    $st = $db->prepare('SELECT aantal, tot FROM fouten WHERE ip = ?');
    $st->execute([$ip]);
    $f = $st->fetch() ?: ['aantal' => 0, 'tot' => 0];
    if ((int)$f['tot'] > $nu) {
        fail('Te vaak een verkeerde pincode. Probeer het over ' . (int)ceil(((int)$f['tot'] - $nu) / 60) . ' minuten opnieuw.', 429);
    }
    $hash = instelling('pin_hash');
    if ($hash === null) fail('Er is nog geen pincode ingesteld op de server.', 503);
    if (!preg_match('/^\d{4,8}$/', $pin) || !password_verify($pin, $hash)) {
        $aantal = (int)$f['tot'] > 0 ? 1 : (int)$f['aantal'] + 1;   // na een verlopen slot opnieuw tellen
        $tot = $aantal >= MAX_FOUTEN ? $nu + LOCK_SECONDS : 0;
        $db->prepare('INSERT INTO fouten (ip, aantal, tot) VALUES (?, ?, ?)
                      ON CONFLICT(ip) DO UPDATE SET aantal = excluded.aantal, tot = excluded.tot')->execute([$ip, $aantal, $tot]);
        fail($tot ? 'Te vaak een verkeerde pincode. Probeer het over 15 minuten opnieuw.' : 'Verkeerde pincode.', $tot ? 429 : 403);
    }
    $db->prepare('DELETE FROM fouten WHERE ip = ?')->execute([$ip]);
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
// een eigen openstaande aanvraag intrekken, of een eigen regel als "gezien" markeren.
function kind_fout(array $oud, array $nieuw, string $kid): ?string {
    $nee = 'Dit mag alleen papa of mama aanpassen.';
    foreach (array_unique(array_merge(array_keys($oud), array_keys($nieuw))) as $k) {
        if ($k === 'tx' || $k === 'nextId') continue;
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
    foreach ($n as $id => $t) {
        if (isset($o[$id])) continue;
        if (!$eigenOpen($t)) return $nee;
        $ref = (string)($t['ref'] ?? '');
        $bedrag = $t['amount'] ?? null;
        if (($t['type'] ?? '') === 'klus') {
            if (!isset($klusjes[$ref]) || $bedrag !== $klusjes[$ref]['waarde']) return 'Onbekend klusje.';
        } elseif (($t['type'] ?? '') === 'beloning') {
            if (!isset($beloningen[$ref]) || $bedrag !== -$beloningen[$ref]['kosten']) return 'Onbekende beloning.';
        } else {
            return $nee;
        }
        if (($t['msg'] ?? '') !== '' || !is_string($t['label'] ?? null) || mb_strlen($t['label']) > 60) return $nee;
    }
    return null;
}

/* ---- acties ---- */
switch ($actie) {
    case 'status': {
        $w = wie();
        out(['rol' => $w['rol'] ?? null, 'kid' => $w['kid'] ?? null]);
    }

    case 'inloggen': {
        need_post();
        controleer_pin((string)($in['pin'] ?? ''));
        session_regenerate_id(true);
        $_SESSION['ouder'] = true;
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
        controleer_pin((string)($in['pin'] ?? ''));
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
        $data = json_encode(json_decode($raw)->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $db->exec('BEGIN IMMEDIATE');
        $transactie = true;
        $s = lees_staat();
        $huidig = $s ? (int)$s['versie'] : 0;
        if ((int)($in['versie'] ?? -1) !== $huidig) {
            $db->exec('ROLLBACK');
            $transactie = false;
            stuur_staat($s, 409);
        }
        if ($w['rol'] === 'kind') {
            if (!$s) fail('Dit mag alleen papa of mama aanpassen.', 403);
            $fout = kind_fout(json_decode($s['data'], true), $in['data'], $w['kid']);
            if ($fout) fail($fout, 403);
        }
        $db->prepare('INSERT INTO staat (id, versie, data, bijgewerkt) VALUES (1, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET versie = excluded.versie, data = excluded.data, bijgewerkt = excluded.bijgewerkt')
           ->execute([$huidig + 1, $data, time()]);
        $db->exec('COMMIT');
        $transactie = false;
        out(['versie' => $huidig + 1]);
    }

    case 'apparaten': {
        need_ouder();
        $rijen = $db->query('SELECT id, kid, aangemaakt, laatst FROM apparaten ORDER BY aangemaakt')->fetchAll();
        out(['apparaten' => array_map(fn($r) => [
            'id' => (int)$r['id'], 'kid' => $r['kid'], 'aangemaakt' => (int)$r['aangemaakt'], 'laatst' => (int)$r['laatst'],
        ], $rijen)]);
    }

    case 'ontkoppel': {
        need_post();
        need_ouder();
        $db->prepare('DELETE FROM apparaten WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
        out(['ok' => true]);
    }

    case 'pin': {
        need_post();
        need_ouder();
        controleer_pin((string)($in['oud'] ?? ''));
        $nieuw = (string)($in['nieuw'] ?? '');
        if (!preg_match('/^\d{4,8}$/', $nieuw)) fail('De nieuwe pincode moet uit 4 tot 8 cijfers bestaan.');
        zet_instelling('pin_hash', password_hash($nieuw, PASSWORD_DEFAULT));
        out(['ok' => true]);
    }

    default:
        fail('Onbekende actie.', 404);
}
