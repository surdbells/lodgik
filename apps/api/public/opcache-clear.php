<?php
header('Content-Type: application/json');
if (function_exists('opcache_reset')) { opcache_reset(); }
if (function_exists('apcu_clear_cache')) { apcu_clear_cache(); }
echo json_encode(['opcache' => 'cleared', 'time' => date('c')]);
