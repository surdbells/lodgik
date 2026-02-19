<?php

declare(strict_types=1);

use DI\ContainerBuilder;
use Doctrine\DBAL\DriverManager;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\ORMSetup;
use Lodgik\Doctrine\Listener\TenantListener;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\MiddlewareFactory;
use Lodgik\Middleware\RateLimitMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Admin\AdminController;
use Lodgik\Module\Admin\AdminService;
use Lodgik\Module\AppDistribution\AppDistributionController;
use Lodgik\Module\AppDistribution\AppDistributionService;
use Lodgik\Module\Auth\AuthController;
use Lodgik\Module\Auth\AuthService;
use Lodgik\Module\Feature\FeatureController;
use Lodgik\Module\Feature\FeatureService;
use Lodgik\Module\Onboarding\OnboardingController;
use Lodgik\Module\Onboarding\OnboardingService;
use Lodgik\Module\Subscription\SubscriptionController;
use Lodgik\Module\Subscription\SubscriptionService;
use Lodgik\Module\Usage\UsageController;
use Lodgik\Module\Usage\UsageService;
use Lodgik\Module\Room\RoomController;
use Lodgik\Module\Room\RoomService;
use Lodgik\Module\Room\RoomStatusMachine;
use Lodgik\Module\Guest\GuestController;
use Lodgik\Module\Guest\GuestService;
use Lodgik\Module\Booking\BookingController;
use Lodgik\Module\Booking\BookingService;
use Lodgik\Module\Booking\BookingStateMachine;
use Lodgik\Module\Booking\RateCalculator;
use Lodgik\Module\Dashboard\DashboardController;
use Lodgik\Module\Dashboard\DashboardService;
use Lodgik\Module\Staff\StaffController;
use Lodgik\Module\Staff\StaffService;
use Lodgik\Module\Tenant\TenantController;
use Lodgik\Module\Tenant\TenantService;
use Lodgik\Repository\PropertyRepository;
use Lodgik\Repository\RefreshTokenRepository;
use Lodgik\Repository\RoomRepository;
use Lodgik\Repository\RoomTypeRepository;
use Lodgik\Repository\RoomStatusLogRepository;
use Lodgik\Repository\AmenityRepository;
use Lodgik\Repository\GuestRepository;
use Lodgik\Repository\GuestDocumentRepository;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\BookingAddonRepository;
use Lodgik\Repository\BookingStatusLogRepository;
use Lodgik\Repository\DailySnapshotRepository;
use Lodgik\Repository\FolioRepository;
use Lodgik\Repository\FolioChargeRepository;
use Lodgik\Repository\FolioPaymentRepository;
use Lodgik\Repository\FolioAdjustmentRepository;
use Lodgik\Repository\InvoiceRepository;
use Lodgik\Repository\InvoiceItemRepository;
use Lodgik\Repository\TaxConfigurationRepository;
use Lodgik\Repository\SubscriptionPlanRepository;
use Lodgik\Repository\TenantRepository;
use Lodgik\Repository\UserRepository;
use Lodgik\Service\AuditService;
use Lodgik\Module\Folio\FolioService;
use Lodgik\Module\Folio\FolioController;
use Lodgik\Module\Invoice\InvoiceService;
use Lodgik\Module\Invoice\InvoiceController;
use Lodgik\Repository\DepartmentRepository;
use Lodgik\Repository\EmployeeRepository;
use Lodgik\Repository\ShiftRepository;
use Lodgik\Repository\ShiftAssignmentRepository;
use Lodgik\Repository\AttendanceRecordRepository;
use Lodgik\Repository\LeaveTypeRepository;
use Lodgik\Repository\LeaveBalanceRepository;
use Lodgik\Repository\LeaveRequestRepository;
use Lodgik\Module\Employee\EmployeeService;
use Lodgik\Module\Employee\EmployeeController;
use Lodgik\Module\Attendance\AttendanceService;
use Lodgik\Module\Attendance\AttendanceController;
use Lodgik\Module\Leave\LeaveService;
use Lodgik\Module\Leave\LeaveController;
use Lodgik\Service\FileStorageService;
use Lodgik\Service\JwtService;
use Lodgik\Service\PaystackService;
use Lodgik\Service\ZeptoMailService;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Predis\Client as RedisClient;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

return function (ContainerBuilder $builder): void {
    $builder->addDefinitions([

        // ─── Settings ──────────────────────────────────────────────
        'settings' => function (): array {
            return require __DIR__ . '/app.php';
        },

        // ─── Logger (Monolog) ──────────────────────────────────────
        LoggerInterface::class => function (ContainerInterface $c): LoggerInterface {
            $settings = $c->get('settings')['logging'];
            $logger = new Logger('lodgik');

            $level = Level::fromName(ucfirst($settings['level']));

            if ($settings['channel'] === 'stderr') {
                $logger->pushHandler(new StreamHandler('php://stderr', $level));
            } else {
                $logFile = rtrim($settings['path'], '/') . '/app.log';
                $logger->pushHandler(new StreamHandler($logFile, $level));
            }

            return $logger;
        },

        // ─── Doctrine Entity Manager ──────────────────────────────
        EntityManagerInterface::class => function (ContainerInterface $c): EntityManagerInterface {
            $settings = $c->get('settings')['database'];
            $appSettings = $c->get('settings')['app'];

            $config = ORMSetup::createAttributeMetadataConfiguration(
                paths: [__DIR__ . '/../src/Entity'],
                isDevMode: $appSettings['debug'],
            );

            // Register global filters
            $config->addFilter('tenant', \Lodgik\Doctrine\Filter\TenantFilter::class);
            $config->addFilter('soft_delete', \Lodgik\Doctrine\Filter\SoftDeleteFilter::class);

            $connection = DriverManager::getConnection([
                'driver' => $settings['driver'],
                'host' => $settings['host'],
                'port' => $settings['port'],
                'dbname' => $settings['dbname'],
                'user' => $settings['user'],
                'password' => $settings['password'],
                'charset' => $settings['charset'],
            ], $config);

            $em = new EntityManager($connection, $config);

            // Enable soft delete filter by default (always hide deleted records)
            $em->getFilters()->enable('soft_delete');

            // Register Doctrine event listeners
            $tenantListener = $c->get(TenantListener::class);
            $em->getEventManager()->addEventListener(
                [\Doctrine\ORM\Events::prePersist],
                $tenantListener
            );

            // Tenant filter is enabled per-request by TenantMiddleware
            // $em->getFilters()->enable('tenant')->setParameter('tenantId', $id);

            return $em;
        },

        // ─── Tenant Listener (singleton, shared with middleware) ──
        TenantListener::class => function (): TenantListener {
            return new TenantListener();
        },

        // ─── Redis Client ──────────────────────────────────────────
        RedisClient::class => function (ContainerInterface $c): RedisClient {
            $settings = $c->get('settings')['redis'];

            $options = [
                'prefix' => $settings['prefix'],
            ];

            $parameters = [
                'scheme' => 'tcp',
                'host' => $settings['host'],
                'port' => $settings['port'],
            ];

            if (!empty($settings['password'])) {
                $parameters['password'] = $settings['password'];
            }

            return new RedisClient($parameters, $options);
        },

        // ─── Helpers ───────────────────────────────────────────────
        ResponseHelper::class => function (): ResponseHelper {
            return new ResponseHelper();
        },

        // ─── JWT Service ───────────────────────────────────────────
        JwtService::class => function (ContainerInterface $c): JwtService {
            $settings = $c->get('settings')['jwt'];

            return new JwtService(
                secret: $settings['secret'],
                accessTtl: $settings['access_ttl'],
                refreshTtl: $settings['refresh_ttl'],
                algorithm: $settings['algorithm'],
                issuer: $settings['issuer'],
            );
        },

        // ─── Auth Middleware (singleton, used in route groups) ─────
        AuthMiddleware::class => function (ContainerInterface $c): AuthMiddleware {
            return new AuthMiddleware(
                jwt: $c->get(JwtService::class),
            );
        },

        // ─── Tenant Middleware (singleton, used in route groups) ───
        TenantMiddleware::class => function (ContainerInterface $c): TenantMiddleware {
            return new TenantMiddleware(
                em: $c->get(EntityManagerInterface::class),
                tenantListener: $c->get(TenantListener::class),
            );
        },

        // ─── Rate Limit Middleware ─────────────────────────────────
        RateLimitMiddleware::class => function (ContainerInterface $c): RateLimitMiddleware {
            return new RateLimitMiddleware(
                redis: $c->get(RedisClient::class),
            );
        },

        // ─── Middleware Factory (convenience builder for routes) ───
        MiddlewareFactory::class => function (ContainerInterface $c): MiddlewareFactory {
            return new MiddlewareFactory($c);
        },

        // ─── Repositories ──────────────────────────────────────────
        TenantRepository::class => function (ContainerInterface $c): TenantRepository {
            return new TenantRepository($c->get(EntityManagerInterface::class));
        },

        UserRepository::class => function (ContainerInterface $c): UserRepository {
            return new UserRepository($c->get(EntityManagerInterface::class));
        },

        RefreshTokenRepository::class => function (ContainerInterface $c): RefreshTokenRepository {
            return new RefreshTokenRepository($c->get(EntityManagerInterface::class));
        },

        PropertyRepository::class => function (ContainerInterface $c): PropertyRepository {
            return new PropertyRepository($c->get(EntityManagerInterface::class));
        },

        SubscriptionPlanRepository::class => function (ContainerInterface $c): SubscriptionPlanRepository {
            return new SubscriptionPlanRepository($c->get(EntityManagerInterface::class));
        },

        // ─── Services ──────────────────────────────────────────────
        AuditService::class => function (ContainerInterface $c): AuditService {
            return new AuditService($c->get(EntityManagerInterface::class));
        },

        ZeptoMailService::class => function (ContainerInterface $c): ZeptoMailService {
            $settings = $c->get('settings')['zeptomail'];

            return new ZeptoMailService(
                apiKey: $settings['api_key'],
                fromEmail: $settings['from_email'],
                fromName: $settings['from_name'],
                logger: $c->get(LoggerInterface::class),
            );
        },

        // ─── Auth Module ───────────────────────────────────────────
        AuthService::class => function (ContainerInterface $c): AuthService {
            return new AuthService(
                em: $c->get(EntityManagerInterface::class),
                jwt: $c->get(JwtService::class),
                tenantRepo: $c->get(TenantRepository::class),
                userRepo: $c->get(UserRepository::class),
                refreshTokenRepo: $c->get(RefreshTokenRepository::class),
                mail: $c->get(ZeptoMailService::class),
                audit: $c->get(AuditService::class),
                logger: $c->get(LoggerInterface::class),
                appUrl: $c->get('settings')['app']['url'],
            );
        },

        AuthController::class => function (ContainerInterface $c): AuthController {
            return new AuthController(
                authService: $c->get(AuthService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Staff Module ──────────────────────────────────────────
        StaffService::class => function (ContainerInterface $c): StaffService {
            return new StaffService(
                em: $c->get(EntityManagerInterface::class),
                userRepo: $c->get(UserRepository::class),
                tenantRepo: $c->get(TenantRepository::class),
                mail: $c->get(ZeptoMailService::class),
                audit: $c->get(AuditService::class),
                logger: $c->get(LoggerInterface::class),
                appUrl: $c->get('settings')['app']['url'],
            );
        },

        StaffController::class => function (ContainerInterface $c): StaffController {
            return new StaffController(
                staffService: $c->get(StaffService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Tenant Module ─────────────────────────────────────────
        TenantService::class => function (ContainerInterface $c): TenantService {
            return new TenantService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
                propertyRepo: $c->get(PropertyRepository::class),
            );
        },

        TenantController::class => function (ContainerInterface $c): TenantController {
            return new TenantController(
                tenantService: $c->get(TenantService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Admin Module (Super Admin) ────────────────────────────
        AdminService::class => function (ContainerInterface $c): AdminService {
            return new AdminService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
                planRepo: $c->get(SubscriptionPlanRepository::class),
            );
        },

        AdminController::class => function (ContainerInterface $c): AdminController {
            return new AdminController(
                adminService: $c->get(AdminService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Feature Module ────────────────────────────────────────
        FeatureService::class => function (ContainerInterface $c): FeatureService {
            return new FeatureService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
            );
        },

        FeatureController::class => function (ContainerInterface $c): FeatureController {
            return new FeatureController(
                featureService: $c->get(FeatureService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── File Storage ──────────────────────────────────────────
        FileStorageService::class => function (ContainerInterface $c): FileStorageService {
            return new FileStorageService(
                logger: $c->get(LoggerInterface::class),
            );
        },

        // ─── Onboarding Module ─────────────────────────────────────
        OnboardingService::class => function (ContainerInterface $c): OnboardingService {
            return new OnboardingService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
                audit: $c->get(AuditService::class),
                fileStorage: $c->get(FileStorageService::class),
                mailer: $c->get(ZeptoMailService::class),
            );
        },

        OnboardingController::class => function (ContainerInterface $c): OnboardingController {
            return new OnboardingController(
                onboardingService: $c->get(OnboardingService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── App Distribution Module ───────────────────────────────
        AppDistributionService::class => function (ContainerInterface $c): AppDistributionService {
            return new AppDistributionService(
                em: $c->get(EntityManagerInterface::class),
                fileStorage: $c->get(FileStorageService::class),
            );
        },

        AppDistributionController::class => function (ContainerInterface $c): AppDistributionController {
            return new AppDistributionController(
                appService: $c->get(AppDistributionService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Paystack ──────────────────────────────────────────────
        PaystackService::class => function (): PaystackService {
            return new PaystackService();
        },

        // ─── Subscription Module ───────────────────────────────────
        SubscriptionService::class => function (ContainerInterface $c): SubscriptionService {
            return new SubscriptionService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
                paystack: $c->get(PaystackService::class),
                audit: $c->get(AuditService::class),
            );
        },

        SubscriptionController::class => function (ContainerInterface $c): SubscriptionController {
            return new SubscriptionController(
                subscriptionService: $c->get(SubscriptionService::class),
                paystack: $c->get(PaystackService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Usage Module ──────────────────────────────────────────
        UsageService::class => function (ContainerInterface $c): UsageService {
            return new UsageService(
                em: $c->get(EntityManagerInterface::class),
                tenantRepo: $c->get(TenantRepository::class),
            );
        },

        UsageController::class => function (ContainerInterface $c): UsageController {
            return new UsageController(
                usageService: $c->get(UsageService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Phase 1: Room Module ─────────────────────────────────
        RoomTypeRepository::class => function (ContainerInterface $c): RoomTypeRepository {
            return new RoomTypeRepository($c->get(EntityManagerInterface::class));
        },

        RoomRepository::class => function (ContainerInterface $c): RoomRepository {
            return new RoomRepository($c->get(EntityManagerInterface::class));
        },

        RoomStatusLogRepository::class => function (ContainerInterface $c): RoomStatusLogRepository {
            return new RoomStatusLogRepository($c->get(EntityManagerInterface::class));
        },

        AmenityRepository::class => function (ContainerInterface $c): AmenityRepository {
            return new AmenityRepository($c->get(EntityManagerInterface::class));
        },

        RoomStatusMachine::class => function (): RoomStatusMachine {
            return new RoomStatusMachine();
        },

        RoomService::class => function (ContainerInterface $c): RoomService {
            return new RoomService(
                em: $c->get(EntityManagerInterface::class),
                roomRepo: $c->get(RoomRepository::class),
                roomTypeRepo: $c->get(RoomTypeRepository::class),
                statusLogRepo: $c->get(RoomStatusLogRepository::class),
                amenityRepo: $c->get(AmenityRepository::class),
                statusMachine: $c->get(RoomStatusMachine::class),
                logger: $c->get(LoggerInterface::class),
            );
        },

        RoomController::class => function (ContainerInterface $c): RoomController {
            return new RoomController(
                roomService: $c->get(RoomService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Phase 1: Guest Module ────────────────────────────────
        GuestRepository::class => function (ContainerInterface $c): GuestRepository {
            return new GuestRepository($c->get(EntityManagerInterface::class));
        },

        GuestDocumentRepository::class => function (ContainerInterface $c): GuestDocumentRepository {
            return new GuestDocumentRepository($c->get(EntityManagerInterface::class));
        },

        GuestService::class => function (ContainerInterface $c): GuestService {
            return new GuestService(
                em: $c->get(EntityManagerInterface::class),
                guestRepo: $c->get(GuestRepository::class),
                docRepo: $c->get(GuestDocumentRepository::class),
                logger: $c->get(LoggerInterface::class),
            );
        },

        GuestController::class => function (ContainerInterface $c): GuestController {
            return new GuestController(
                guestService: $c->get(GuestService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Phase 1: Booking Module ──────────────────────────────
        BookingRepository::class => function (ContainerInterface $c): BookingRepository {
            return new BookingRepository($c->get(EntityManagerInterface::class));
        },

        BookingAddonRepository::class => function (ContainerInterface $c): BookingAddonRepository {
            return new BookingAddonRepository($c->get(EntityManagerInterface::class));
        },

        BookingStatusLogRepository::class => function (ContainerInterface $c): BookingStatusLogRepository {
            return new BookingStatusLogRepository($c->get(EntityManagerInterface::class));
        },

        BookingStateMachine::class => function (): BookingStateMachine {
            return new BookingStateMachine();
        },

        RateCalculator::class => function (): RateCalculator {
            return new RateCalculator();
        },

        BookingService::class => function (ContainerInterface $c): BookingService {
            return new BookingService(
                em: $c->get(EntityManagerInterface::class),
                bookingRepo: $c->get(BookingRepository::class),
                addonRepo: $c->get(BookingAddonRepository::class),
                statusLogRepo: $c->get(BookingStatusLogRepository::class),
                guestRepo: $c->get(GuestRepository::class),
                roomRepo: $c->get(RoomRepository::class),
                roomTypeRepo: $c->get(RoomTypeRepository::class),
                stateMachine: $c->get(BookingStateMachine::class),
                roomStateMachine: $c->get(RoomStatusMachine::class),
                rateCalc: $c->get(RateCalculator::class),
                logger: $c->get(LoggerInterface::class),
                folioService: $c->get(FolioService::class),
                invoiceService: $c->get(InvoiceService::class),
            );
        },

        BookingController::class => function (ContainerInterface $c): BookingController {
            return new BookingController(
                bookingService: $c->get(BookingService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Phase 1: Dashboard Module ────────────────────────────
        DailySnapshotRepository::class => function (ContainerInterface $c): DailySnapshotRepository {
            return new DailySnapshotRepository($c->get(EntityManagerInterface::class));
        },

        DashboardService::class => function (ContainerInterface $c): DashboardService {
            return new DashboardService(
                em: $c->get(EntityManagerInterface::class),
                bookingRepo: $c->get(BookingRepository::class),
                roomRepo: $c->get(RoomRepository::class),
                snapshotRepo: $c->get(DailySnapshotRepository::class),
                logger: $c->get(LoggerInterface::class),
            );
        },

        DashboardController::class => function (ContainerInterface $c): DashboardController {
            return new DashboardController(
                dashboardService: $c->get(DashboardService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Phase 2: Finance Module ──────────────────────────────
        FolioRepository::class => fn(ContainerInterface $c) => new FolioRepository($c->get(EntityManagerInterface::class)),
        FolioChargeRepository::class => fn(ContainerInterface $c) => new FolioChargeRepository($c->get(EntityManagerInterface::class)),
        FolioPaymentRepository::class => fn(ContainerInterface $c) => new FolioPaymentRepository($c->get(EntityManagerInterface::class)),
        FolioAdjustmentRepository::class => fn(ContainerInterface $c) => new FolioAdjustmentRepository($c->get(EntityManagerInterface::class)),
        InvoiceRepository::class => fn(ContainerInterface $c) => new InvoiceRepository($c->get(EntityManagerInterface::class)),
        InvoiceItemRepository::class => fn(ContainerInterface $c) => new InvoiceItemRepository($c->get(EntityManagerInterface::class)),
        TaxConfigurationRepository::class => fn(ContainerInterface $c) => new TaxConfigurationRepository($c->get(EntityManagerInterface::class)),

        FolioService::class => function (ContainerInterface $c): FolioService {
            return new FolioService(
                em: $c->get(EntityManagerInterface::class),
                folioRepo: $c->get(FolioRepository::class),
                chargeRepo: $c->get(FolioChargeRepository::class),
                paymentRepo: $c->get(FolioPaymentRepository::class),
                adjustmentRepo: $c->get(FolioAdjustmentRepository::class),
                logger: $c->get(LoggerInterface::class),
            );
        },

        FolioController::class => fn(ContainerInterface $c) => new FolioController(
            folioService: $c->get(FolioService::class),
            response: $c->get(ResponseHelper::class),
        ),

        InvoiceService::class => function (ContainerInterface $c): InvoiceService {
            return new InvoiceService(
                em: $c->get(EntityManagerInterface::class),
                invoiceRepo: $c->get(InvoiceRepository::class),
                itemRepo: $c->get(InvoiceItemRepository::class),
                chargeRepo: $c->get(FolioChargeRepository::class),
                paymentRepo: $c->get(FolioPaymentRepository::class),
                taxRepo: $c->get(TaxConfigurationRepository::class),
                mail: $c->get(ZeptoMailService::class),
                logger: $c->get(LoggerInterface::class),
            );
        },

        InvoiceController::class => fn(ContainerInterface $c) => new InvoiceController(
            invoiceService: $c->get(InvoiceService::class),
            response: $c->get(ResponseHelper::class),
        ),

        // ─── Phase 3: HR & Payroll ───────────────────────────────

        DepartmentRepository::class => fn(ContainerInterface $c) => new DepartmentRepository($c->get(EntityManagerInterface::class)),
        EmployeeRepository::class => fn(ContainerInterface $c) => new EmployeeRepository($c->get(EntityManagerInterface::class)),
        ShiftRepository::class => fn(ContainerInterface $c) => new ShiftRepository($c->get(EntityManagerInterface::class)),
        ShiftAssignmentRepository::class => fn(ContainerInterface $c) => new ShiftAssignmentRepository($c->get(EntityManagerInterface::class)),
        AttendanceRecordRepository::class => fn(ContainerInterface $c) => new AttendanceRecordRepository($c->get(EntityManagerInterface::class)),
        LeaveTypeRepository::class => fn(ContainerInterface $c) => new LeaveTypeRepository($c->get(EntityManagerInterface::class)),
        LeaveBalanceRepository::class => fn(ContainerInterface $c) => new LeaveBalanceRepository($c->get(EntityManagerInterface::class)),
        LeaveRequestRepository::class => fn(ContainerInterface $c) => new LeaveRequestRepository($c->get(EntityManagerInterface::class)),

        EmployeeService::class => fn(ContainerInterface $c) => new EmployeeService(
            em: $c->get(EntityManagerInterface::class),
            empRepo: $c->get(EmployeeRepository::class),
            deptRepo: $c->get(DepartmentRepository::class),
            logger: $c->get(LoggerInterface::class),
        ),
        EmployeeController::class => fn(ContainerInterface $c) => new EmployeeController(
            service: $c->get(EmployeeService::class),
        ),

        AttendanceService::class => fn(ContainerInterface $c) => new AttendanceService(
            em: $c->get(EntityManagerInterface::class),
            attRepo: $c->get(AttendanceRecordRepository::class),
            shiftRepo: $c->get(ShiftRepository::class),
            assignRepo: $c->get(ShiftAssignmentRepository::class),
            logger: $c->get(LoggerInterface::class),
        ),
        AttendanceController::class => fn(ContainerInterface $c) => new AttendanceController(
            service: $c->get(AttendanceService::class),
        ),

        LeaveService::class => fn(ContainerInterface $c) => new LeaveService(
            em: $c->get(EntityManagerInterface::class),
            typeRepo: $c->get(LeaveTypeRepository::class),
            balRepo: $c->get(LeaveBalanceRepository::class),
            reqRepo: $c->get(LeaveRequestRepository::class),
            logger: $c->get(LoggerInterface::class),
        ),
        LeaveController::class => fn(ContainerInterface $c) => new LeaveController(
            service: $c->get(LeaveService::class),
        ),
    ]);
};
