<?php
/*
 * Kijkt of er timers om zijn en stuurt dan een pushmelding naar de telefoons.
 * Draait op de server in de container muntjes-timers-1 (elke 15 seconden), niet via de browser.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('MUNTJES_CLI', true);
require __DIR__ . '/api.php';
timers_controleren();
