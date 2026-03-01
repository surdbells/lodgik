<?php
declare(strict_types=1);
namespace Lodgik\Module\Asset;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Asset, AssetCategory, ServiceEngineer, AssetIncident, PreventiveMaintenance, MaintenanceLog};
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;

final class AssetService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ?NotificationService $notifier = null,
        private readonly ?LoggerInterface $logger = null,
    ) {}

    // ─── Categories ───────────────────────────────────────────
    public function listCategories(string $tenantId): array { return array_map(fn($c) => $c->toArray(), $this->em->getRepository(AssetCategory::class)->findBy(['tenantId' => $tenantId], ['name' => 'ASC'])); }
    public function createCategory(string $name, string $tenantId, ?string $parentId = null, ?string $icon = null, ?string $desc = null): AssetCategory
    { $c = new AssetCategory($name, $tenantId); if ($parentId) $c->setParentId($parentId); if ($icon) $c->setIcon($icon); if ($desc) $c->setDescription($desc); $this->em->persist($c); $this->em->flush(); return $c; }

    // ─── Assets ───────────────────────────────────────────────
    public function listAssets(string $propertyId, ?string $status = null, ?string $categoryId = null, ?string $search = null, int $page = 1, int $limit = 20): array
    { $qb = $this->em->createQueryBuilder()->select('a')->from(Asset::class, 'a')->where('a.propertyId = :p')->setParameter('p', $propertyId)->orderBy('a.name', 'ASC');
      if ($status) $qb->andWhere('a.status = :s')->setParameter('s', $status);
      if ($categoryId) $qb->andWhere('a.categoryId = :c')->setParameter('c', $categoryId);
      if ($search) $qb->andWhere('a.name LIKE :q OR a.qrCode LIKE :q')->setParameter('q', "%$search%");
      $qb->setFirstResult(($page-1)*$limit)->setMaxResults($limit);
      return array_map(fn($a) => $a->toArray(), $qb->getQuery()->getResult()); }

    public function getAsset(string $id): ?Asset { return $this->em->find(Asset::class, $id); }

    public function getByQrCode(string $qr): ?Asset
    { return $this->em->getRepository(Asset::class)->findOneBy(['qrCode' => $qr]); }

    public function createAsset(string $pid, string $catId, string $catName, string $name, string $tid, array $x = []): Asset
    { $a = new Asset($pid, $catId, $catName, $name, $tid);
      foreach (['brand','model','serialNumber','locationBlock','locationFloor','locationRoom','custodianDept','custodianStaffName','notes','photoUrl'] as $f) {
        $key = strtolower(preg_replace('/([A-Z])/', '_$1', $f)); if (!empty($x[$key])) { $m = 'set' . ucfirst($f); $a->$m($x[$key]); } }
      if (!empty($x['criticality'])) $a->setCriticality($x['criticality']);
      if (!empty($x['purchase_date'])) $a->setPurchaseDate(new \DateTimeImmutable($x['purchase_date']));
      if (!empty($x['warranty_expiry'])) $a->setWarrantyExpiry(new \DateTimeImmutable($x['warranty_expiry']));
      if (!empty($x['purchase_cost'])) $a->setPurchaseCost($x['purchase_cost']);
      if (!empty($x['primary_engineer_id'])) $a->setPrimaryEngineerId($x['primary_engineer_id']);
      if (!empty($x['backup_engineer_id'])) $a->setBackupEngineerId($x['backup_engineer_id']);
      $this->em->persist($a); $this->em->flush(); return $a; }

    public function updateAsset(string $id, array $d): Asset
    { $a = $this->em->find(Asset::class, $id);
      if (isset($d['name'])) $a->setName($d['name']); if (isset($d['status'])) $a->setStatus($d['status']);
      if (isset($d['criticality'])) $a->setCriticality($d['criticality']);
      if (isset($d['location_block'])) $a->setLocationBlock($d['location_block']);
      if (isset($d['location_floor'])) $a->setLocationFloor($d['location_floor']);
      if (isset($d['location_room'])) $a->setLocationRoom($d['location_room']);
      if (isset($d['primary_engineer_id'])) $a->setPrimaryEngineerId($d['primary_engineer_id']);
      if (isset($d['backup_engineer_id'])) $a->setBackupEngineerId($d['backup_engineer_id']);
      if (isset($d['notes'])) $a->setNotes($d['notes']);
      $this->em->flush(); return $a; }

    public function getAssetStatusCounts(string $propertyId): array
    { $rows = $this->em->createQueryBuilder()->select('a.status, COUNT(a.id) as cnt')->from(Asset::class, 'a')
        ->where('a.propertyId = :p')->setParameter('p', $propertyId)->groupBy('a.status')->getQuery()->getResult();
      return array_column($rows, 'cnt', 'status'); }

    // ─── Engineers ────────────────────────────────────────────
    public function listEngineers(string $propertyId, ?bool $activeOnly = null): array
    { $c = ['propertyId' => $propertyId]; if ($activeOnly !== null) $c['isActive'] = $activeOnly;
      return array_map(fn($e) => $e->toArray(), $this->em->getRepository(ServiceEngineer::class)->findBy($c, ['name' => 'ASC'])); }

    public function createEngineer(string $pid, string $name, string $type, string $spec, string $phone, string $tid, array $x = []): ServiceEngineer
    { $e = new ServiceEngineer($pid, $name, $type, $spec, $phone, $tid);
      if (!empty($x['company'])) $e->setCompany($x['company']);
      if (!empty($x['emergency_phone'])) $e->setEmergencyPhone($x['emergency_phone']);
      if (!empty($x['email'])) $e->setEmail($x['email']);
      if (!empty($x['whatsapp'])) $e->setWhatsapp($x['whatsapp']);
      if (isset($x['sla_response_minutes'])) $e->setSlaResponseMinutes((int)$x['sla_response_minutes']);
      if (isset($x['sla_resolution_minutes'])) $e->setSlaResolutionMinutes((int)$x['sla_resolution_minutes']);
      if (!empty($x['availability'])) $e->setAvailability($x['availability']);
      $this->em->persist($e); $this->em->flush(); return $e; }

    public function updateEngineer(string $id, array $d): ServiceEngineer
    { $e = $this->em->find(ServiceEngineer::class, $id);
      if (isset($d['name'])) $e->setName($d['name']); if (isset($d['is_active'])) $e->setIsActive((bool)$d['is_active']);
      if (isset($d['availability'])) $e->setAvailability($d['availability']);
      if (isset($d['email'])) $e->setEmail($d['email']); if (isset($d['whatsapp'])) $e->setWhatsapp($d['whatsapp']);
      $this->em->flush(); return $e; }

    // ─── Incidents ────────────────────────────────────────────
    public function listIncidents(string $propertyId, ?string $status = null, ?string $assetId = null, int $page = 1, int $limit = 20): array
    { $qb = $this->em->createQueryBuilder()->select('i')->from(AssetIncident::class, 'i')->where('i.propertyId = :p')->setParameter('p', $propertyId)->orderBy('i.createdAt', 'DESC');
      if ($status) $qb->andWhere('i.status = :s')->setParameter('s', $status);
      if ($assetId) $qb->andWhere('i.assetId = :a')->setParameter('a', $assetId);
      $qb->setFirstResult(($page-1)*$limit)->setMaxResults($limit);
      return array_map(fn($i) => $i->toArray(), $qb->getQuery()->getResult()); }

    public function reportIncident(string $pid, string $assetId, string $assetName, string $type, string $priority, string $desc, string $reporterId, string $reporterName, string $tid, array $x = []): AssetIncident
    { $i = new AssetIncident($pid, $assetId, $assetName, $type, $priority, $desc, $reporterId, $reporterName, $tid);
      if (!empty($x['location_description'])) $i->setLocationDescription($x['location_description']);
      if (!empty($x['photo_urls'])) $i->setPhotoUrls($x['photo_urls']);
      // Auto-assign from asset's primary engineer
      $asset = $this->em->find(Asset::class, $assetId);
      if ($asset && $asset->getPrimaryEngineerId()) {
          $eng = $this->em->find(ServiceEngineer::class, $asset->getPrimaryEngineerId());
          if ($eng) $i->assign($eng->getId(), $eng->getName(), $asset->getBackupEngineerId());
      }
      $asset?->setStatus('under_repair');
      $this->em->persist($i); $this->em->flush();
      // Emergency broadcast for FIRE and SECURITY events
      if (in_array($type, ['FIRE_INCIDENT', 'SECURITY_BREACH'], true)) {
          $emoji   = $type === 'FIRE_INCIDENT' ? '🔥' : '🚨';
          $channel = strtolower($type);
          $this->notifier?->broadcastAll(
              $pid, $tid,
              "{$emoji} " . ucwords(str_replace('_', ' ', $type)),
              "URGENT: {$desc} — Location: " . ($x['location_description'] ?? 'Hotel premises'),
              $channel,
              ['incident_id' => $i->getId(), 'incident_type' => $type, 'priority' => $priority],
          );
          $this->logger?->warning("[Incident] Emergency broadcast fired: type={$type}, property={$pid}");
      }
      return $i; }

    public function assignIncident(string $id, string $engId, string $engName, ?string $backupId = null): AssetIncident
    { $i = $this->em->find(AssetIncident::class, $id); $i->assign($engId, $engName, $backupId); $this->em->flush(); return $i; }

    public function startIncidentProgress(string $id): AssetIncident { $i = $this->em->find(AssetIncident::class, $id); $i->startProgress(); $this->em->flush(); return $i; }

    public function resolveIncident(string $id, ?string $notes = null, ?int $downtime = null, ?string $cost = null): AssetIncident
    { $i = $this->em->find(AssetIncident::class, $id); $i->resolve($notes, $downtime, $cost);
      // Restore asset to active
      $asset = $this->em->find(Asset::class, $i->getAssetId()); if ($asset && $asset->getStatus() === 'under_repair') $asset->setStatus('active');
      $this->em->flush(); return $i; }

    public function closeIncident(string $id): AssetIncident { $i = $this->em->find(AssetIncident::class, $id); $i->close(); $this->em->flush(); return $i; }
    public function escalateIncident(string $id): AssetIncident { $i = $this->em->find(AssetIncident::class, $id); $i->escalate(); $this->em->flush(); return $i; }

    public function getIncidentStats(string $propertyId): array
    { $rows = $this->em->createQueryBuilder()->select('i.status, COUNT(i.id) as cnt')->from(AssetIncident::class, 'i')
        ->where('i.propertyId = :p')->setParameter('p', $propertyId)->groupBy('i.status')->getQuery()->getResult();
      return array_column($rows, 'cnt', 'status'); }

    // ─── Preventive Maintenance ───────────────────────────────
    public function listPM(string $propertyId, ?string $status = null): array
    { $c = ['propertyId' => $propertyId]; if ($status) $c['status'] = $status;
      return array_map(fn($p) => $p->toArray(), $this->em->getRepository(PreventiveMaintenance::class)->findBy($c, ['nextDue' => 'ASC'])); }

    public function createPM(string $pid, string $assetId, string $assetName, string $scheduleType, string $nextDue, string $tid, array $x = []): PreventiveMaintenance
    { $p = new PreventiveMaintenance($pid, $assetId, $assetName, $scheduleType, new \DateTimeImmutable($nextDue), $tid);
      if (!empty($x['assigned_engineer_id'])) $p->setAssignedEngineerId($x['assigned_engineer_id']);
      if (!empty($x['assigned_engineer_name'])) $p->setAssignedEngineerName($x['assigned_engineer_name']);
      if (!empty($x['checklist'])) $p->setChecklist($x['checklist']);
      if (!empty($x['notes'])) $p->setNotes($x['notes']);
      $this->em->persist($p); $this->em->flush(); return $p; }

    public function completePM(string $id): PreventiveMaintenance { $p = $this->em->find(PreventiveMaintenance::class, $id); $p->complete(); $this->em->flush(); return $p; }

    public function getOverduePM(string $propertyId): array
    { return array_map(fn($p) => $p->toArray(), $this->em->createQueryBuilder()->select('p')->from(PreventiveMaintenance::class, 'p')
        ->where('p.propertyId = :pid')->andWhere('p.nextDue < :now')->andWhere('p.status != :done')
        ->setParameter('pid', $propertyId)->setParameter('now', date('Y-m-d'))->setParameter('done', 'completed')
        ->getQuery()->getResult()); }

    // ─── Maintenance Logs ─────────────────────────────────────
    public function listLogs(string $propertyId, ?string $assetId = null, int $limit = 50): array
    { $qb = $this->em->createQueryBuilder()->select('l')->from(MaintenanceLog::class, 'l')->where('l.propertyId = :p')->setParameter('p', $propertyId)->orderBy('l.logDate', 'DESC')->setMaxResults($limit);
      if ($assetId) $qb->andWhere('l.assetId = :a')->setParameter('a', $assetId);
      return array_map(fn($l) => $l->toArray(), $qb->getQuery()->getResult()); }

    public function createLog(string $pid, string $assetId, string $engId, string $engName, string $action, string $date, string $tid, array $x = []): MaintenanceLog
    { $l = new MaintenanceLog($pid, $assetId, $engId, $engName, $action, new \DateTimeImmutable($date), $tid);
      if (!empty($x['incident_id'])) $l->setIncidentId($x['incident_id']);
      if (!empty($x['pm_id'])) $l->setPmId($x['pm_id']);
      if (!empty($x['parts_replaced'])) $l->setPartsReplaced($x['parts_replaced']);
      if (!empty($x['cost'])) $l->setCost($x['cost']);
      if (isset($x['downtime_minutes'])) $l->setDowntimeMinutes((int)$x['downtime_minutes']);
      $this->em->persist($l); $this->em->flush(); return $l; }

    // ─── Reports ──────────────────────────────────────────────
    public function getCostReport(string $propertyId, string $from, string $to): array
    { $logs = $this->em->createQueryBuilder()->select('l.assetId, SUM(l.cost) as total_cost, SUM(l.downtimeMinutes) as total_downtime, COUNT(l.id) as log_count')
        ->from(MaintenanceLog::class, 'l')->where('l.propertyId = :p')->andWhere('l.logDate >= :f')->andWhere('l.logDate <= :t')
        ->setParameter('p', $propertyId)->setParameter('f', $from)->setParameter('t', $to)
        ->groupBy('l.assetId')->getQuery()->getResult();
      return $logs; }
}
