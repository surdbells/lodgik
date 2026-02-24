<?php
header('Content-Type: application/json');
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$results = [];

try {
    $cb = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($cb);
    $container = $cb->build();

    $app = Slim\Factory\AppFactory::createFromContainer($container);
    (require __DIR__ . '/../config/routes.php')($app);
    $app->addRoutingMiddleware();
    (require __DIR__ . '/../config/middleware.php')($app);

    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    $conn = $em->getConnection();
    $admin = $conn->fetchAssociative("SELECT id, role, tenant_id FROM users WHERE role = 'super_admin' LIMIT 1");

    if (!$admin) { echo json_encode(['error' => 'No super_admin']); exit; }

    // Generate proper JWT with type claim
    $jwt = $container->get('settings')['jwt'];
    $payload = [
        'iss' => $jwt['issuer'] ?? 'lodgik',
        'sub' => $admin['id'],
        'role' => $admin['role'],
        'tenant_id' => $admin['tenant_id'],
        'type' => 'access',
        'iat' => time(),
        'exp' => time() + 900,
    ];
    $token = Firebase\JWT\JWT::encode($payload, $jwt['secret'], 'HS256');

    // Test each failing endpoint
    $endpoints = [
        '/api/admin/merchants?status=&search=',
        '/api/admin/merchants/kyc/pending',
        '/api/admin/merchants/tiers',
        '/api/admin/merchants/payouts?status=',
        '/api/admin/merchants/resources',
    ];

    foreach ($endpoints as $ep) {
        try {
            $req = (new Slim\Psr7\Factory\ServerRequestFactory())
                ->createServerRequest('GET', $ep);
            $req = $req
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Authorization', 'Bearer ' . $token);

            $resp = $app->handle($req);
            $body = (string)$resp->getBody();
            $status = $resp->getStatusCode();
            $results[$ep] = [
                'status' => $status,
                'body' => json_decode($body, true) ?? substr($body, 0, 300),
            ];
        } catch (\Throwable $e) {
            $results[$ep] = [
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()) . ':' . $e->getLine(),
            ];
        }
    }

} catch (\Throwable $e) {
    $results['fatal'] = $e->getMessage() . ' at ' . basename($e->getFile()) . ':' . $e->getLine();
    if ($p = $e->getPrevious()) $results['caused_by'] = $p->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
