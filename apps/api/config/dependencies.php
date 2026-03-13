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
use Lodgik\Repository\TaxBracketRepository;
use Lodgik\Repository\PayrollPeriodRepository;
use Lodgik\Repository\PayrollItemRepository;
use Lodgik\Module\Payroll\PayrollService;
use Lodgik\Module\Payroll\PayrollController;
use Lodgik\Repository\GuestAccessCodeRepository;
use Lodgik\Repository\GuestSessionRepository;
use Lodgik\Repository\TabletDeviceRepository;
use Lodgik\Repository\ServiceRequestRepository;
use Lodgik\Repository\ChatMessageRepository;
use Lodgik\Service\TermiiService;
use Lodgik\Module\GuestAuth\GuestAuthService;
use Lodgik\Module\GuestAuth\GuestAuthController;
use Lodgik\Module\GuestPortal\GuestPortalController;
use Lodgik\Middleware\GuestMiddleware;
use Lodgik\Repository\PropertyBankAccountRepository;
use Lodgik\Module\ServiceRequest\ServiceRequestService;
use Lodgik\Module\ServiceRequest\ServiceRequestController;
use Lodgik\Module\Chat\ChatService;
use Lodgik\Module\Chat\ChatController;
use Lodgik\Repository\NotificationRepository;
use Lodgik\Repository\DeviceTokenRepository;
use Lodgik\Module\Notification\NotificationService;
use Lodgik\Module\Notification\NotificationController;
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

        // ─── Phase D/E: Recipe + Inventory Reports + Low-Stock Alerts ─
        \Lodgik\Module\Inventory\InventoryReportController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\InventoryReportController(
            reportService: $c->get(\Lodgik\Module\Inventory\InventoryReportService::class),
            alertService:  $c->get(\Lodgik\Module\Inventory\LowStockAlertService::class),
        ),
        \Lodgik\Module\Inventory\InventoryReportService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\InventoryReportService(
            em:     $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Inventory\LowStockAlertService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\LowStockAlertService(
            em:                  $c->get(EntityManagerInterface::class),
            logger:              $c->get(LoggerInterface::class),
            notificationService: $c->get(\Lodgik\Module\Notification\NotificationService::class),
        ),

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

            // Force ArrayAdapter to avoid stale APCu/Redis metadata caches
            $metadataCache = new \Symfony\Component\Cache\Adapter\ArrayAdapter();

            $config = ORMSetup::createAttributeMetadataConfiguration(
                paths: [__DIR__ . '/../src/Entity'],
                isDevMode: $appSettings['debug'],
                cache: $metadataCache,
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
                featureService: $c->get(FeatureService::class),
                redis: $c->get(RedisClient::class),
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
        \Lodgik\Module\Audit\AuditController::class => function (ContainerInterface $c): \Lodgik\Module\Audit\AuditController {
            return new \Lodgik\Module\Audit\AuditController(
                em: $c->get(EntityManagerInterface::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        ZeptoMailService::class => function (ContainerInterface $c): ZeptoMailService {
            $settings = $c->get('settings')['zeptomail'];

            $mailer = new ZeptoMailService(
                apiKey: $settings['api_key'],
                fromEmail: $settings['from_email'],
                fromName: $settings['from_name'],
                logger: $c->get(LoggerInterface::class),
            );

            // Inject SettingsService for DB-based config override
            try {
                $mailer->setSettingsService($c->get(\Lodgik\Module\Settings\SettingsService::class));
            } catch (\Throwable $e) {
                // SettingsService might not be available during initial setup
            }

            return $mailer;
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
                propertyRepo: $c->get(PropertyRepository::class),
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
                fileStorage: $c->get(\Lodgik\Service\FileStorageService::class),
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
                jwt: $c->get(JwtService::class),
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
                redis: $c->get(RedisClient::class),
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
                mailService: $c->get(\Lodgik\Service\ZeptoMailService::class),
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
        PropertyBankAccountRepository::class => fn(ContainerInterface $c) => new PropertyBankAccountRepository(
            $c->get(EntityManagerInterface::class),
        ),

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
                guestAuthService: $c->get(GuestAuthService::class),
                housekeepingService: $c->get(\Lodgik\Module\Housekeeping\HousekeepingService::class),
                // Card enforcement — enables per-property gate issuance requirement
                propertyRepo: $c->get(\Lodgik\Repository\PropertyRepository::class),
                cardRepo: $c->get(\Lodgik\Repository\GuestCardRepository::class),
            );
        },

        BookingController::class => function (ContainerInterface $c): BookingController {
            return new BookingController(
                bookingService:  $c->get(BookingService::class),
                response:        $c->get(ResponseHelper::class),
                mailService:     $c->get(\Lodgik\Service\ZeptoMailService::class),
                accessCodeRepo:  $c->get(GuestAccessCodeRepository::class),
                guestRepo:       $c->get(GuestRepository::class),
                roomRepo:        $c->get(RoomRepository::class),
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
                propertyRepo: $c->get(PropertyRepository::class),
            );
        },

        DashboardController::class => function (ContainerInterface $c): DashboardController {
            return new DashboardController(
                dashboardService: $c->get(DashboardService::class),
                response: $c->get(ResponseHelper::class),
            );
        },

        // ─── Reports Module ───────────────────────────────────────
        \Lodgik\Module\Report\ReportService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Report\ReportService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Report\ReportController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Report\ReportController(
            reportService: $c->get(\Lodgik\Module\Report\ReportService::class),
        ),

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
            mailer: $c->get(ZeptoMailService::class),
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
            folioRepo: $c->get(FolioRepository::class),
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

        // ─── Phase 3C: Payroll ───────────────────────────────────

        TaxBracketRepository::class => fn(ContainerInterface $c) => new TaxBracketRepository($c->get(EntityManagerInterface::class)),
        PayrollPeriodRepository::class => fn(ContainerInterface $c) => new PayrollPeriodRepository($c->get(EntityManagerInterface::class)),
        PayrollItemRepository::class => fn(ContainerInterface $c) => new PayrollItemRepository($c->get(EntityManagerInterface::class)),

        PayrollService::class => fn(ContainerInterface $c) => new PayrollService(
            em: $c->get(EntityManagerInterface::class),
            periodRepo: $c->get(PayrollPeriodRepository::class),
            itemRepo: $c->get(PayrollItemRepository::class),
            bracketRepo: $c->get(TaxBracketRepository::class),
            empRepo: $c->get(EmployeeRepository::class),
            mailer: $c->get(ZeptoMailService::class),
            logger: $c->get(LoggerInterface::class),
        ),
        PayrollController::class => fn(ContainerInterface $c) => new PayrollController(
            service: $c->get(PayrollService::class),
        ),

        // ─── Phase 4: Guest Experience ───────────────────────────

        GuestAccessCodeRepository::class => fn(ContainerInterface $c) => new GuestAccessCodeRepository($c->get(EntityManagerInterface::class)),
        GuestSessionRepository::class => fn(ContainerInterface $c) => new GuestSessionRepository($c->get(EntityManagerInterface::class)),
        TabletDeviceRepository::class => fn(ContainerInterface $c) => new TabletDeviceRepository($c->get(EntityManagerInterface::class)),
        ServiceRequestRepository::class => fn(ContainerInterface $c) => new ServiceRequestRepository($c->get(EntityManagerInterface::class)),
        ChatMessageRepository::class => fn(ContainerInterface $c) => new ChatMessageRepository($c->get(EntityManagerInterface::class)),

        TermiiService::class => fn(ContainerInterface $c) => new TermiiService(
            apiKey: $_ENV['TERMII_API_KEY'] ?? '',
            senderId: $_ENV['TERMII_SENDER_ID'] ?? 'Lodgik',
            logger: $c->get(LoggerInterface::class),
        ),

        GuestAuthService::class => fn(ContainerInterface $c) => new GuestAuthService(
            em: $c->get(EntityManagerInterface::class),
            codeRepo: $c->get(GuestAccessCodeRepository::class),
            sessionRepo: $c->get(GuestSessionRepository::class),
            tabletRepo: $c->get(TabletDeviceRepository::class),
            bookingRepo: $c->get(BookingRepository::class),
            guestRepo: $c->get(GuestRepository::class),
            roomRepo: $c->get(RoomRepository::class),
            termii: $c->get(TermiiService::class),
            logger: $c->get(LoggerInterface::class),
        ),
        GuestAuthController::class => fn(ContainerInterface $c) => new GuestAuthController(
            service:    $c->get(GuestAuthService::class),
            tenantRepo: $c->get(TenantRepository::class),
        ),

        GuestMiddleware::class => fn(ContainerInterface $c) => new GuestMiddleware(
            guestAuthService: $c->get(GuestAuthService::class),
        ),

        GuestPortalController::class => fn(ContainerInterface $c) => new GuestPortalController(
            folioService:          $c->get(FolioService::class),
            serviceRequestService: $c->get(ServiceRequestService::class),
            bookingRepo:           $c->get(BookingRepository::class),
            guestRepo:             $c->get(GuestRepository::class),
            bankAccountRepo:       $c->get(PropertyBankAccountRepository::class),
            propertyRepo:          $c->get(PropertyRepository::class),
            chatService:           $c->get(ChatService::class),
            securityService:       $c->get(\Lodgik\Module\Security\SecurityService::class),
            roomControlService:    $c->get(\Lodgik\Module\RoomControl\RoomControlService::class),
            spaService:            $c->get(\Lodgik\Module\Spa\SpaService::class),
            gymService:            $c->get(\Lodgik\Module\Gym\GymService::class),
            em:                    $c->get(EntityManagerInterface::class),
            termii:                $c->get(TermiiService::class),
            loyaltyService:        $c->get(\Lodgik\Module\Loyalty\LoyaltyService::class),
        ),

        ServiceRequestService::class => fn(ContainerInterface $c) => new ServiceRequestService(
            em:             $c->get(EntityManagerInterface::class),
            repo:           $c->get(ServiceRequestRepository::class),
            logger:         $c->get(LoggerInterface::class),
            notifService:   $c->get(NotificationService::class),
            bookingService: $c->get(\Lodgik\Module\Booking\BookingService::class),
        ),
        ServiceRequestController::class => fn(ContainerInterface $c) => new ServiceRequestController(
            service: $c->get(ServiceRequestService::class),
        ),

        ChatService::class => fn(ContainerInterface $c) => new ChatService(
            em: $c->get(EntityManagerInterface::class),
            repo: $c->get(ChatMessageRepository::class),
            logger: $c->get(LoggerInterface::class),
            notifService: $c->get(NotificationService::class),
        ),
        ChatController::class => fn(ContainerInterface $c) => new ChatController(
            service: $c->get(ChatService::class),
        ),

        // ─── Phase 4D: FCM Push Notifications ────────────────────

        \Lodgik\Service\FcmService::class => fn(ContainerInterface $c) => new \Lodgik\Service\FcmService(
            logger: $c->get(LoggerInterface::class),
            projectId: $_ENV['FCM_PROJECT_ID'] ?? '',
            serviceAccountJson: $_ENV['FCM_SERVICE_ACCOUNT_JSON'] ?? '',
        ),

        // ─── Phase 4A: Notifications ─────────────────────────────

        NotificationRepository::class => fn(ContainerInterface $c) => new NotificationRepository($c->get(EntityManagerInterface::class)),
        DeviceTokenRepository::class => fn(ContainerInterface $c) => new DeviceTokenRepository($c->get(EntityManagerInterface::class)),

        NotificationService::class => fn(ContainerInterface $c) => new NotificationService(
            em: $c->get(EntityManagerInterface::class),
            notifRepo: $c->get(NotificationRepository::class),
            tokenRepo: $c->get(DeviceTokenRepository::class),
            logger: $c->get(LoggerInterface::class),
            fcm: $c->get(\Lodgik\Service\FcmService::class),
        ),
        NotificationController::class => fn(ContainerInterface $c) => new NotificationController(
            service: $c->get(NotificationService::class),
        ),

        // ─── Phase 5: Gym Membership Management ─────────────────

        \Lodgik\Module\Gym\GymService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Gym\GymService(
            em: $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
            mail: $c->get(\Lodgik\Service\ZeptoMailService::class),
        ),
        \Lodgik\Module\Gym\GymController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Gym\GymController(
            service: $c->get(\Lodgik\Module\Gym\GymService::class),
        ),

        // ─── Phase 6: Housekeeping ──────────────────────────────

        \Lodgik\Module\Housekeeping\HousekeepingService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Housekeeping\HousekeepingService(
            em: $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Housekeeping\HousekeepingController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Housekeeping\HousekeepingController(
            service: $c->get(\Lodgik\Module\Housekeeping\HousekeepingService::class),
        ),

        // ─── Phase 6: POS / F&B ────────────────────────────────

        \Lodgik\Module\Pos\RecipeService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Pos\RecipeService(
            em:     $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Pos\PosService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Pos\PosService(
            em:              $c->get(EntityManagerInterface::class),
            logger:          $c->get(LoggerInterface::class),
            folioService:    $c->get(\Lodgik\Module\Folio\FolioService::class),
            movementService: $c->get(\Lodgik\Module\Inventory\MovementService::class),
            recipeService:   $c->get(\Lodgik\Module\Pos\RecipeService::class),
        ),
        \Lodgik\Module\Pos\PosController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Pos\PosController(
            service: $c->get(\Lodgik\Module\Pos\PosService::class),
        ),
        \Lodgik\Module\Pos\RecipeController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Pos\RecipeController(
            service: $c->get(\Lodgik\Module\Pos\RecipeService::class),
        ),

        // Phase 7: Security
        \Lodgik\Module\Security\SecurityService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Security\SecurityService(
            em: $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Security\SecurityController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Security\SecurityController(
            service: $c->get(\Lodgik\Module\Security\SecurityService::class),
        ),

        // Phase 7: Room Controls
        \Lodgik\Module\RoomControl\RoomControlService::class => fn(ContainerInterface $c) => new \Lodgik\Module\RoomControl\RoomControlService(
            em: $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\RoomControl\RoomControlController::class => fn(ContainerInterface $c) => new \Lodgik\Module\RoomControl\RoomControlController(
            service: $c->get(\Lodgik\Module\RoomControl\RoomControlService::class),
        ),

        // Phase 7: Guest Services
        \Lodgik\Module\GuestServices\GuestServicesService::class => fn(ContainerInterface $c) => new \Lodgik\Module\GuestServices\GuestServicesService(
            em: $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
            folioService: $c->get(\Lodgik\Module\Folio\FolioService::class),
        ),
        \Lodgik\Module\GuestServices\GuestServicesController::class => fn(ContainerInterface $c) => new \Lodgik\Module\GuestServices\GuestServicesController(
            service: $c->get(\Lodgik\Module\GuestServices\GuestServicesService::class),
        ),

        // ─── Phase 8A: Finance ──────────────────────────────────
        \Lodgik\Module\Finance\FinanceService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Finance\FinanceService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Finance\FinanceController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Finance\FinanceController(
            svc: $c->get(\Lodgik\Module\Finance\FinanceService::class),
            mailer: $c->get(ZeptoMailService::class),
        ),

        // ─── Phase 8B: Asset Management ─────────────────────────
        \Lodgik\Module\Asset\AssetService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Asset\AssetService(
            em:       $c->get(EntityManagerInterface::class),
            notifier: $c->get(\Lodgik\Module\Notification\NotificationService::class),
            logger:   $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Asset\AssetController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Asset\AssetController(
            svc: $c->get(\Lodgik\Module\Asset\AssetService::class),
        ),

        // ─── Phase 8C: WhatsApp (Termii) ────────────────────────
        \Lodgik\Module\WhatsApp\TermiiClient::class => fn(ContainerInterface $c) => new \Lodgik\Module\WhatsApp\TermiiClient(
            apiKey: $_ENV['TERMII_API_KEY'] ?? '',
            senderId: $_ENV['TERMII_SENDER_ID'] ?? 'Lodgik',
        ),
        \Lodgik\Module\WhatsApp\WhatsAppService::class => fn(ContainerInterface $c) => new \Lodgik\Module\WhatsApp\WhatsAppService(
            em: $c->get(EntityManagerInterface::class),
            termii: $c->get(\Lodgik\Module\WhatsApp\TermiiClient::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\WhatsApp\WhatsAppController::class => fn(ContainerInterface $c) => new \Lodgik\Module\WhatsApp\WhatsAppController(
            svc: $c->get(\Lodgik\Module\WhatsApp\WhatsAppService::class),
        ),

        // ─── Phase 8D: Loyalty/CRM + Analytics ──────────────────
        \Lodgik\Module\Loyalty\LoyaltyService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Loyalty\LoyaltyService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Loyalty\LoyaltyController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Loyalty\LoyaltyController(
            svc: $c->get(\Lodgik\Module\Loyalty\LoyaltyService::class),
        ),
        \Lodgik\Module\Analytics\AnalyticsService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Analytics\AnalyticsService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Analytics\AnalyticsController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Analytics\AnalyticsController(
            svc: $c->get(\Lodgik\Module\Analytics\AnalyticsService::class),
        ),

        // ─── Phase 8E: Spa, OTA, IoT ────────────────────────────
        \Lodgik\Module\Spa\SpaService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Spa\SpaService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Spa\SpaController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Spa\SpaController(
            svc: $c->get(\Lodgik\Module\Spa\SpaService::class),
        ),
        \Lodgik\Module\Ota\OtaService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Ota\OtaService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Ota\OtaController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Ota\OtaController(
            svc: $c->get(\Lodgik\Module\Ota\OtaService::class),
        ),
        // ── Corporate Profiles ────────────────────────────────────────────
        \Lodgik\Module\Corporate\CorporateService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Corporate\CorporateService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Corporate\CorporateController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Corporate\CorporateController(
            svc: $c->get(\Lodgik\Module\Corporate\CorporateService::class),
        ),
        // ── Events / Banquet Management ───────────────────────────────────
        \Lodgik\Module\Event\EventService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Event\EventService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Event\EventController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Event\EventController(
            svc: $c->get(\Lodgik\Module\Event\EventService::class),
        ),
        \Lodgik\Module\IoT\IoTService::class => fn(ContainerInterface $c) => new \Lodgik\Module\IoT\IoTService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\IoT\IoTController::class => fn(ContainerInterface $c) => new \Lodgik\Module\IoT\IoTController(
            svc: $c->get(\Lodgik\Module\IoT\IoTService::class),
        ),

        // Phase 9: Merchant
        \Lodgik\Module\Merchant\MerchantService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Merchant\MerchantService(
            em: $c->get(EntityManagerInterface::class),
            mailer: $c->get(\Lodgik\Service\ZeptoMailService::class),
            jwt: $c->get(JwtService::class),
        ),
        \Lodgik\Module\Merchant\MerchantController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Merchant\MerchantController(
            service: $c->get(\Lodgik\Module\Merchant\MerchantService::class),
        ),

        // ─── Phase C: Procurement ─────────────────────────────
        //
        // MovementService is registered explicitly here so PHP-DI injects
        // ProcurementService into the optional constructor param. Without
        // this, autowiring resolves the optional to null.
        \Lodgik\Module\Inventory\MovementService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\MovementService(
            em:          $c->get(EntityManagerInterface::class),
            logger:      $c->get(LoggerInterface::class),
            procurement: $c->get(\Lodgik\Module\Procurement\ProcurementService::class),
        ),
        \Lodgik\Module\Procurement\ProcurementService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Procurement\ProcurementService(
            em:     $c->get(EntityManagerInterface::class),
            mailer: $c->get(\Lodgik\Service\ZeptoMailService::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Procurement\ProcurementController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Procurement\ProcurementController(
            service: $c->get(\Lodgik\Module\Procurement\ProcurementService::class),
        ),

        // ─── Phase D/E: Recipe + Inventory Reports + Low-Stock Alerts ─
        \Lodgik\Module\Inventory\InventoryReportController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\InventoryReportController(
            reportService: $c->get(\Lodgik\Module\Inventory\InventoryReportService::class),
            alertService:  $c->get(\Lodgik\Module\Inventory\LowStockAlertService::class),
        ),
        \Lodgik\Module\Inventory\InventoryReportService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\InventoryReportService(
            em:     $c->get(EntityManagerInterface::class),
            logger: $c->get(LoggerInterface::class),
        ),
        \Lodgik\Module\Inventory\LowStockAlertService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Inventory\LowStockAlertService(
            em:                  $c->get(EntityManagerInterface::class),
            logger:              $c->get(LoggerInterface::class),
            notificationService: $c->get(\Lodgik\Module\Notification\NotificationService::class),
        ),

        // ─── Settings ─────────────────────────────────────────

        // ─── System Job Management ──────────────────────────────────────────
        \Symfony\Component\Console\Application::class => function (ContainerInterface $c): \Symfony\Component\Console\Application {
            $app    = new \Symfony\Component\Console\Application('Lodgik CLI', '0.1.0');
            $em     = $c->get(EntityManagerInterface::class);
            $logger = $c->get(LoggerInterface::class);
            $app->setAutoExit(false);
            $app->addCommands([
                new \Lodgik\Command\NoonCheckoutCommand($em, $logger,
                    $c->get(\Lodgik\Module\Booking\BookingService::class),
                    $c->get(\Lodgik\Module\Housekeeping\HousekeepingService::class),
                    $c->get(\Lodgik\Module\Notification\NotificationService::class)),
                new \Lodgik\Command\FraudAutoCheckoutCommand($em, $logger,
                    $c->get(\Lodgik\Module\Booking\BookingService::class),
                    $c->get(\Lodgik\Module\Notification\NotificationService::class)),
                new \Lodgik\Command\NightAuditCommand($em, $logger,
                    $c->get(\Lodgik\Module\Finance\FinanceService::class),
                    $c->get(\Lodgik\Module\Notification\NotificationService::class)),
                new \Lodgik\Command\DatabaseBackupCommand($em, $logger),
                new \Lodgik\Command\VisitorOverstayCommand($em, $logger,
                    $c->get(\Lodgik\Module\Notification\NotificationService::class)),
                new \Lodgik\Command\LateCheckoutChargeCommand($em, $logger,
                    $c->get(\Lodgik\Module\Notification\NotificationService::class),
                    $c->get(\Lodgik\Module\Folio\FolioService::class)),
            ]);
            return $app;
        },
        \Lodgik\Module\System\SystemJobController::class => fn(ContainerInterface $c) => new \Lodgik\Module\System\SystemJobController(
            consoleApp: $c->get(\Symfony\Component\Console\Application::class),
            response:   $c->get(\Lodgik\Helper\ResponseHelper::class),
        ),
        \Lodgik\Module\Settings\SettingsService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Settings\SettingsService(
            em: $c->get(EntityManagerInterface::class),
        ),
        \Lodgik\Module\Settings\SettingsController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Settings\SettingsController(
            settings: $c->get(\Lodgik\Module\Settings\SettingsService::class),
            mailer: $c->get(\Lodgik\Service\ZeptoMailService::class),
        ),
        \Lodgik\Module\Upload\UploadController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Upload\UploadController(
            storage:  $c->get(\Lodgik\Service\FileStorageService::class),
            redis:    $c->get(RedisClient::class),
        ),

        // ── Guest Card System (Phases A–D) ────────────────────────
        \Lodgik\Repository\GuestCardRepository::class => fn(ContainerInterface $c) => new \Lodgik\Repository\GuestCardRepository(
            $c->get(EntityManagerInterface::class)
        ),
        \Lodgik\Repository\GuestCardEventRepository::class => fn(ContainerInterface $c) => new \Lodgik\Repository\GuestCardEventRepository(
            $c->get(EntityManagerInterface::class)
        ),
        \Lodgik\Repository\CardScanPointRepository::class => fn(ContainerInterface $c) => new \Lodgik\Repository\CardScanPointRepository(
            $c->get(EntityManagerInterface::class)
        ),
        \Lodgik\Module\GuestCard\GuestCardService::class => fn(ContainerInterface $c) => new \Lodgik\Module\GuestCard\GuestCardService(
            em:            $c->get(EntityManagerInterface::class),
            cardRepo:      $c->get(\Lodgik\Repository\GuestCardRepository::class),
            eventRepo:     $c->get(\Lodgik\Repository\GuestCardEventRepository::class),
            scanPointRepo: $c->get(\Lodgik\Repository\CardScanPointRepository::class),
            bookingRepo:   $c->get(\Lodgik\Repository\BookingRepository::class),
            guestRepo:     $c->get(\Lodgik\Repository\GuestRepository::class),
            folioRepo:     $c->get(\Lodgik\Repository\FolioRepository::class),
            folioService:  $c->get(\Lodgik\Module\Folio\FolioService::class),
            logger:        $c->get(\Psr\Log\LoggerInterface::class),
        ),
        \Lodgik\Module\GuestCard\GuestCardController::class => fn(ContainerInterface $c) => new \Lodgik\Module\GuestCard\GuestCardController(
            cardService:   $c->get(\Lodgik\Module\GuestCard\GuestCardService::class),
            cardRepo:      $c->get(\Lodgik\Repository\GuestCardRepository::class),
            eventRepo:     $c->get(\Lodgik\Repository\GuestCardEventRepository::class),
            scanPointRepo: $c->get(\Lodgik\Repository\CardScanPointRepository::class),
            response:      $c->get(\Lodgik\Helper\ResponseHelper::class),
        ),

        // ── RBAC ──────────────────────────────────────────────────────────────
        \Lodgik\Module\Rbac\RbacRepository::class => fn(ContainerInterface $c) => new \Lodgik\Module\Rbac\RbacRepository(
            conn: $c->get(\Doctrine\DBAL\Connection::class),
        ),
        \Lodgik\Module\Rbac\RbacService::class => fn(ContainerInterface $c) => new \Lodgik\Module\Rbac\RbacService(
            repo:   $c->get(\Lodgik\Module\Rbac\RbacRepository::class),
            logger: $c->get(\Psr\Log\LoggerInterface::class),
        ),
        \Lodgik\Module\Rbac\RbacController::class => fn(ContainerInterface $c) => new \Lodgik\Module\Rbac\RbacController(
            service: $c->get(\Lodgik\Module\Rbac\RbacService::class),
        ),
    ]);
};
