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
    $results[] = '✅ Container';
    
    $app = Slim\Factory\AppFactory::createFromContainer($container);
    $results[] = '✅ App';
    
    (require __DIR__ . '/../config/routes.php')($app);
    $results[] = '✅ Routes';
    
    $app->addRoutingMiddleware();
    (require __DIR__ . '/../config/middleware.php')($app);
    $results[] = '✅ Middleware';

    // Get a valid JWT token by logging in
    $settings = $container->get('settings');
    $results[] = '✅ Settings loaded';
    
    // Test: simulate calling /api/admin/merchants without auth
    // This should return 401, not 500
    $request = (new Slim\Psr7\Factory\ServerRequestFactory())
        ->createServerRequest('GET', '/api/admin/merchants?status=&search=');
    $request = $request->withHeader('Content-Type', 'application/json');
    
    $response = $app->handle($request);
    $body = (string)$response->getBody();
    $status = $response->getStatusCode();
    $results[] = "Response without auth: HTTP {$status}";
    $results[] = "Body: " . substr($body, 0, 200);

    // Now test with auth - get a real token first
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    $conn = $em->getConnection();
    $admin = $conn->fetchAssociative("SELECT id, role, tenant_id FROM users WHERE role = 'super_admin' LIMIT 1");
    
    if ($admin) {
        $results[] = "✅ Found admin user: {$admin['id']}";
        
        // Generate a JWT manually
        $jwt = $container->get('settings')['jwt'];
        $payload = [
            'iss' => $jwt['issuer'] ?? 'lodgik',
            'sub' => $admin['id'],
            'role' => $admin['role'],
            'tenant_id' => $admin['tenant_id'],
            'iat' => time(),
            'exp' => time() + 900,
        ];
        $token = Firebase\JWT\JWT::encode($payload, $jwt['secret'], 'HS256');
        $results[] = '✅ JWT generated';
        
        // Test with auth
        $request2 = (new Slim\Psr7\Factory\ServerRequestFactory())
            ->createServerRequest('GET', '/api/admin/merchants?status=&search=');
        $request2 = $request2
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Authorization', 'Bearer ' . $token);
        
        $response2 = $app->handle($request2);
        $body2 = (string)$response2->getBody();
        $status2 = $response2->getStatusCode();
        $results[] = "Response WITH auth: HTTP {$status2}";
        $results[] = "Body: " . substr($body2, 0, 500);
    } else {
        $results[] = '❌ No super_admin user found';
    }

} catch (\Throwable $e) {
    $results[] = "❌ " . $e->getMessage();
    $results[] = basename($e->getFile()) . ':' . $e->getLine();
    $results[] = implode("\n", array_map(fn($t) => 
        basename($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? ''),
        array_slice($e->getTrace(), 0, 15)));
    if ($p = $e->getPrevious()) {
        $results[] = "Caused by: " . $p->getMessage();
    }
}

echo json_encode(['steps' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
