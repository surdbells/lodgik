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

    // Directly call the controller method, bypassing middleware
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    $conn = $em->getConnection();

    // Test 1: Direct service call
    $svc = $container->get(Lodgik\Module\Merchant\MerchantService::class);
    $results['service_listMerchants'] = 'OK: ' . count($svc->listMerchants()) . ' rows';
    $results['service_listTiers'] = 'OK: ' . count($svc->listTiers()) . ' rows';
    $results['service_listPendingKyc'] = 'OK: ' . count($svc->listPendingKyc()) . ' rows';
    $results['service_listResources'] = 'OK: ' . count($svc->listResources()) . ' rows';
    $results['service_listAllPayouts'] = 'OK: ' . count($svc->listAllPayouts()) . ' rows';

    // Test 2: Direct controller call with mocked request
    $ctrl = $container->get(Lodgik\Module\Merchant\MerchantController::class);
    
    // Create a mock request with auth attributes
    $admin = $conn->fetchAssociative("SELECT id, role, tenant_id FROM users WHERE role = 'super_admin' LIMIT 1");
    
    $factory = new Slim\Psr7\Factory\ServerRequestFactory();
    $req = $factory->createServerRequest('GET', '/api/admin/merchants?status=&search=');
    $req = $req
        ->withAttribute('auth.user_id', $admin['id'])
        ->withAttribute('auth.tenant_id', $admin['tenant_id'])
        ->withAttribute('auth.role', $admin['role'])
        ->withQueryParams(['status' => '', 'search' => '']);
    
    $res = new Slim\Psr7\Response();
    
    $response = $ctrl->list($req, $res);
    $results['controller_list'] = 'HTTP ' . $response->getStatusCode() . ': ' . substr((string)$response->getBody(), 0, 200);

    // Test tiers
    $req2 = $factory->createServerRequest('GET', '/api/admin/merchants/tiers');
    $req2 = $req2->withAttribute('auth.user_id', $admin['id']);
    $res2 = new Slim\Psr7\Response();
    $response2 = $ctrl->listTiers($req2, $res2);
    $results['controller_tiers'] = 'HTTP ' . $response2->getStatusCode();

    // Test payouts
    $req3 = $factory->createServerRequest('GET', '/api/admin/merchants/payouts?status=');
    $req3 = $req3
        ->withAttribute('auth.user_id', $admin['id'])
        ->withAttribute('auth.role', 'super_admin')
        ->withQueryParams(['status' => '']);
    $res3 = new Slim\Psr7\Response();
    $response3 = $ctrl->listPayouts($req3, $res3);
    $results['controller_payouts'] = 'HTTP ' . $response3->getStatusCode();

} catch (\Throwable $e) {
    $results['ERROR'] = $e->getMessage();
    $results['file'] = $e->getFile() . ':' . $e->getLine();
    $results['trace'] = array_slice(array_map(fn($t) =>
        basename($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? ''),
        $e->getTrace()), 0, 15);
    if ($p = $e->getPrevious()) {
        $results['caused_by'] = $p->getMessage();
    }
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
