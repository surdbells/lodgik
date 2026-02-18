<?php

declare(strict_types=1);

return [
    'entity_paths' => [
        __DIR__ . '/../src/Entity',
    ],
    'proxy_dir' => __DIR__ . '/../var/doctrine/proxies',
    'proxy_namespace' => 'Lodgik\\Proxies',
    'auto_generate_proxies' => true,
];
