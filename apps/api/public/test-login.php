<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$result = ['steps' => []];

try {
    // Step 1: Build container
    $cb = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($cb);
    $container = $cb->build();
    $result['steps'][] = '✅ Container built';

    // Step 2: Get EntityManager
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    $result['steps'][] = '✅ EntityManager created';

    // Step 3: Try a raw query on users table
    $conn = $em->getConnection();
    $count = $conn->fetchOne('SELECT COUNT(*) FROM users');
    $result['steps'][] = "✅ Raw SQL: {$count} users";

    // Step 4: Try Doctrine query on User
    $users = $em->createQueryBuilder()
        ->select('u')
        ->from(Lodgik\Entity\User::class, 'u')
        ->setMaxResults(1)
        ->getQuery()
        ->getResult();
    $result['steps'][] = '✅ Doctrine User query OK (' . count($users) . ' rows)';

    // Step 5: Try finding user by email
    $repo = $em->getRepository(Lodgik\Entity\User::class);
    $first = $conn->fetchAssociative('SELECT email FROM users LIMIT 1');
    if ($first) {
        $email = $first['email'];
        $user = $repo->findOneBy(['email' => $email]);
        $result['steps'][] = $user 
            ? "✅ findOneBy email works (found: {$email})" 
            : "❌ findOneBy returned null for {$email}";
        
        if ($user) {
            // Step 6: Try loading tenant
            $tenantId = $user->getTenantId();
            $result['steps'][] = "ℹ️  User tenantId: {$tenantId}";
            
            $tenant = $em->find(Lodgik\Entity\Tenant::class, $tenantId);
            $result['steps'][] = $tenant 
                ? '✅ Tenant found: ' . $tenant->getName()
                : '❌ Tenant NOT found';

            // Step 7: Try flush (what login does after touchLogin)
            // Don't actually modify, just test the unit of work
            $result['steps'][] = '✅ User role: ' . $user->getRole()->value;
        }
    } else {
        $result['steps'][] = '⚠️  No users in database';
    }

    // Step 8: Check AuthService
    $authService = $container->get(Lodgik\Module\Auth\AuthService::class);
    $result['steps'][] = '✅ AuthService created';

    // Step 9: Check JWT settings
    $settings = $container->get('settings');
    $result['steps'][] = '✅ JWT secret length: ' . strlen($settings['jwt']['secret'] ?? '');
    $result['steps'][] = '✅ JWT issuer: ' . ($settings['jwt']['issuer'] ?? 'NOT SET');

} catch (\Throwable $e) {
    $result['error'] = $e->getMessage();
    $result['file'] = basename($e->getFile()) . ':' . $e->getLine();
    $result['trace'] = array_map(function($t) {
        return basename($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? '');
    }, array_slice($e->getTrace(), 0, 10));
    if ($prev = $e->getPrevious()) {
        $result['caused_by'] = $prev->getMessage();
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
