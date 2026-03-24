<?php declare(strict_types=1);

use Slim\App;

return function (App $app): void {
    $app->get('/api/hr-ping', function ($req, $res) {
        $res->getBody()->write('{"ok":true}');
        return $res->withHeader('Content-Type', 'application/json');
    });
};
