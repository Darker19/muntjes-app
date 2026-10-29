<?php
/*
 * Web Push zonder extra bibliotheken: VAPID (RFC 8292) en versleuteling aes128gcm (RFC 8291).
 * Wordt geladen door api.php; zelf openen via de browser doet niets.
 */
declare(strict_types=1);
if (!defined('MUNTJES')) { http_response_code(404); exit; }

// Alleen naar de pushdiensten van de bekende browsers sturen, niet naar willekeurige adressen.
const PUSH_HOSTS = '/^(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/';

function b64url_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)); }

function push_adres_ok(string $endpoint): bool {
    $u = parse_url($endpoint);
    return ($u['scheme'] ?? '') === 'https' && preg_match(PUSH_HOSTS, strtolower($u['host'] ?? '')) === 1;
}

// Openbare sleutel als 65 bytes (0x04 + x + y).
function ec_publiek($sleutel): string {
    $ec = openssl_pkey_get_details($sleutel)['ec'];
    return "\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
}
function ec_nieuw() {
    return openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
}
// 65 bytes openbare sleutel → sleutel die openssl begrijpt.
function ec_van_publiek(string $raw) {
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $raw;
    return openssl_pkey_get_public("-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n");
}

// VAPID-sleutelpaar van deze server; de eerste keer wordt het gemaakt en bewaard.
function vapid(): array {
    $v = json_decode((string)instelling('vapid'), true);
    if (is_array($v) && isset($v['pem'], $v['publiek'])) return $v;
    $k = ec_nieuw();
    openssl_pkey_export($k, $pem);
    $v = ['pem' => $pem, 'publiek' => b64url(ec_publiek($k))];
    zet_instelling('vapid', json_encode($v));
    return $v;
}

// Handtekening van openssl (DER) → 64 bytes r||s, zoals JWT ES256 die wil.
function der_naar_rs(string $der): string {
    $pos = 2;
    if (ord($der[1]) & 0x80) $pos += ord($der[1]) & 0x7f;
    $uit = '';
    for ($i = 0; $i < 2; $i++) {
        $len = ord($der[$pos + 1]);
        $getal = ltrim(substr($der, $pos + 2, $len), "\0");
        $uit .= str_pad($getal, 32, "\0", STR_PAD_LEFT);
        $pos += 2 + $len;
    }
    return $uit;
}

function vapid_kop(string $endpoint): string {
    $v = vapid();
    $u = parse_url($endpoint);
    $deel = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256'])) . '.' . b64url(json_encode([
        'aud' => $u['scheme'] . '://' . $u['host'], 'exp' => time() + 12 * 3600, 'sub' => 'https://muntjes.darkesttimes.nl/',
    ]));
    openssl_sign($deel, $sig, openssl_pkey_get_private($v['pem']), OPENSSL_ALGO_SHA256);
    return 'vapid t=' . $deel . '.' . b64url(der_naar_rs($sig)) . ', k=' . $v['publiek'];
}

// Versleutelt het bericht voor één abonnement (RFC 8291, één record).
function push_versleutel(string $bericht, string $p256dh, string $authGeheim): string {
    $uaPub = b64url_dec($p256dh);
    $auth = b64url_dec($authGeheim);
    $eigen = ec_nieuw();
    $eigenPub = ec_publiek($eigen);
    $gedeeld = openssl_pkey_derive(ec_van_publiek($uaPub), $eigen, 32);
    $ikm = hash_hkdf('sha256', $gedeeld, 32, "WebPush: info\0" . $uaPub . $eigenPub, $auth);
    $zout = random_bytes(16);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $zout);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $zout);
    $versleuteld = openssl_encrypt($bericht . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    return $zout . pack('N', 4096) . chr(strlen($eigenPub)) . $eigenPub . $versleuteld . $tag;
}

// Stuurt een bericht naar één abonnement. Geeft de HTTP-code terug (201 = gelukt, 404/410 = weg).
function push_stuur(array $abo, array $bericht): int {
    if (!push_adres_ok($abo['endpoint'])) return 400;
    $body = push_versleutel(json_encode($bericht, JSON_UNESCAPED_UNICODE), $abo['p256dh'], $abo['auth']);
    [$code] = http_post($abo['endpoint'], $body, [
        'Authorization: ' . vapid_kop($abo['endpoint']),
        'Content-Encoding: aes128gcm',
        'Content-Type: application/octet-stream',
        'TTL: 600',
        'Urgency: high',
    ]);
    return $code;
}

// Naar alle telefoons van deze gebruikers; verlopen abonnementen worden opgeruimd.
function push_naar(array $gebruikerIds, array $bericht): int {
    global $db;
    if (!$gebruikerIds) return 0;
    $ids = implode(',', array_map('intval', array_unique($gebruikerIds)));
    $gelukt = 0;
    foreach ($db->query("SELECT id, endpoint, p256dh, auth FROM push WHERE gebruiker IN ($ids)")->fetchAll() as $abo) {
        $code = push_stuur($abo, $bericht);
        if ($code >= 200 && $code < 300) {
            $gelukt++;
            $db->prepare('UPDATE push SET laatst = ? WHERE id = ?')->execute([time(), $abo['id']]);
        } elseif (in_array($code, [400, 403, 404, 410], true)) {
            error_log('muntjes push: telefoon afgemeld (' . $code . ')');
            $db->prepare('DELETE FROM push WHERE id = ?')->execute([$abo['id']]);
        } else {
            error_log('muntjes push mislukt: ' . $code);
        }
    }
    return $gelukt;
}

// Timers die om zijn: één melding per timer (na +5 min komt er later een nieuwe).
// Naar alle ouders en naar wie de timer gestart heeft (bijv. oma).
function timers_controleren(): void {
    $s = lees_staat();
    if (!$s) return;
    $data = json_decode($s['data'], true);
    $nu = microtime(true) * 1000;
    $gemeld = json_decode((string)instelling('gemelde_timers'), true) ?: [];
    $sleutels = [];
    $teMelden = [];
    foreach ($data['timers'] ?? [] as $t) {
        if (($t['status'] ?? '') !== 'loopt' || !is_numeric($t['eind'] ?? null)) continue;
        $sleutel = $t['id'] . ':' . $t['eind'];
        $sleutels[] = $sleutel;
        if ($t['eind'] <= $nu && !in_array($sleutel, $gemeld, true)) $teMelden[] = $t;
    }
    $nieuw = array_values(array_intersect($gemeld, $sleutels));
    foreach ($teMelden as $t) {
        $nieuw[] = $t['id'] . ':' . $t['eind'];
        $kind = '';
        foreach ($data['kids'] ?? [] as $k) if (($k['id'] ?? '') === ($t['kid'] ?? '')) $kind = $k['naam'];
        push_naar(push_ontvangers($t), [
            'titel' => 'Tijd is om!',
            'tekst' => trim($kind . ' · ' . ($t['naam'] ?? 'Timer'), ' ·'),
            'tag' => 'timer-' . $t['id'],
        ]);
    }
    if ($nieuw !== $gemeld) zet_instelling('gemelde_timers', json_encode($nieuw));
}

function push_ontvangers(array $timer): array {
    global $db;
    $ids = array_map('intval', $db->query("SELECT id FROM gebruikers WHERE rol = 'ouder'")->fetchAll(PDO::FETCH_COLUMN));
    if (is_int($timer['startDoor'] ?? null)) $ids[] = $timer['startDoor'];
    return $ids;
}
