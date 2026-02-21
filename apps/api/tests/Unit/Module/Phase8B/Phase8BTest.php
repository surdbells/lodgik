<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8B;
use Lodgik\Entity\{Asset, AssetCategory, ServiceEngineer, AssetIncident, PreventiveMaintenance, MaintenanceLog};
use PHPUnit\Framework\TestCase;

final class Phase8BTest extends TestCase
{
    public function testAssetCategoryCreation(): void
    { $c = new AssetCategory('HVAC Systems', 't'); $this->assertSame('HVAC Systems', $c->getName()); $c->setIcon('hvac'); $a = $c->toArray(); $this->assertSame('hvac', $a['icon']); }

    public function testAssetCreationWithQrCode(): void
    { $a = new Asset('p', 'cat1', 'HVAC', 'Daikin AC Unit - Lobby', 't'); $this->assertStringStartsWith('AST-', $a->getQrCode()); $this->assertSame('active', $a->getStatus()); $this->assertSame('medium', $a->getCriticality()); }

    public function testAssetLocationTracking(): void
    { $a = new Asset('p', 'c', 'Electrical', 'Generator', 't'); $a->setLocationBlock('Main Building'); $a->setLocationFloor('Ground'); $a->setLocationRoom('Plant Room'); $a->onPrePersist(); $arr = $a->toArray(); $this->assertSame('Main Building', $arr['location_block']); }

    public function testAssetEngineerMapping(): void
    { $a = new Asset('p', 'c', 'Cat', 'Elevator', 't'); $a->setPrimaryEngineerId('eng1'); $a->setBackupEngineerId('eng2'); $a->setCriticality('critical');
      $this->assertSame('eng1', $a->getPrimaryEngineerId()); $this->assertSame('eng2', $a->getBackupEngineerId()); $this->assertSame('critical', $a->getCriticality()); }

    public function testAssetStatusLifecycle(): void
    { $a = new Asset('p', 'c', 'Cat', 'Pump', 't'); $this->assertSame('active', $a->getStatus()); $a->setStatus('under_repair'); $this->assertSame('under_repair', $a->getStatus()); $a->setStatus('retired'); $this->assertSame('retired', $a->getStatus()); }

    public function testServiceEngineerCreation(): void
    { $e = new ServiceEngineer('p', 'Ade Okonkwo', 'internal', 'electrical', '+2348012345678', 't');
      $e->setCompany('Internal'); $e->setEmergencyPhone('+2348099999999'); $e->setEmail('ade@hotel.com'); $e->setWhatsapp('+2348012345678');
      $e->setSlaResponseMinutes(30); $e->setSlaResolutionMinutes(120); $e->setAvailability('24x7');
      $arr = $e->toArray(); $this->assertSame('electrical', $arr['specialization']); $this->assertSame(30, $arr['sla_response_minutes']); $this->assertTrue($e->isActive()); }

    public function testServiceEngineerDeactivation(): void
    { $e = new ServiceEngineer('p', 'Test', 'external', 'plumbing', '123', 't'); $e->setIsActive(false); $this->assertFalse($e->isActive()); }

    public function testIncidentCreationAndAssignment(): void
    { $i = new AssetIncident('p', 'ast1', 'Generator', 'breakdown', 'high', 'Generator not starting', 'u1', 'Receptionist', 't');
      $this->assertSame('new', $i->getStatus()); $i->assign('eng1', 'Ade', 'eng2'); $this->assertSame('assigned', $i->getStatus()); }

    public function testIncidentFullLifecycle(): void
    { $i = new AssetIncident('p', 'ast1', 'AC Unit', 'leakage', 'medium', 'Water dripping from unit', 'u1', 'HK Staff', 't');
      $i->assign('eng1', 'Engineer'); $i->startProgress(); $this->assertSame('in_progress', $i->getStatus());
      $i->resolve('Replaced condenser pipe', 45, '150000'); $this->assertSame('resolved', $i->getStatus());
      $i->close(); $this->assertSame('closed', $i->getStatus()); }

    public function testIncidentEscalation(): void
    { $i = new AssetIncident('p', 'a1', 'Elevator', 'breakdown', 'critical', 'Stuck between floors', 'u1', 'Security', 't');
      $i->escalate(); $i->escalate(); $i->onPrePersist(); $arr = $i->toArray(); $this->assertSame(2, $arr['escalation_level']); }

    public function testIncidentPhotoUrls(): void
    { $i = new AssetIncident('p', 'a1', 'Pipe', 'leakage', 'high', 'Burst pipe', 'u1', 'Staff', 't');
      $i->setPhotoUrls(['photo1.jpg', 'photo2.jpg']); $i->setLocationDescription('3rd floor, corridor B');
      $i->onPrePersist(); $arr = $i->toArray(); $this->assertCount(2, $arr['photo_urls']); $this->assertSame('3rd floor, corridor B', $arr['location_description']); }

    public function testPreventiveMaintenanceCreation(): void
    { $p = new PreventiveMaintenance('p', 'ast1', 'Generator', 'monthly', new \DateTimeImmutable('2026-03-01'), 't');
      $p->setAssignedEngineerName('Ade'); $p->setChecklist(['Check oil', 'Test voltage', 'Clean filters']);
      $this->assertSame('scheduled', $p->getStatus()); $arr = $p->toArray(); $this->assertCount(3, $arr['checklist']); }

    public function testPMCompletionAutoReschedules(): void
    { $p = new PreventiveMaintenance('p', 'a', 'AC', 'monthly', new \DateTimeImmutable('2026-02-15'), 't');
      $p->complete(); // Should reschedule +1 month and reset to scheduled
      $this->assertSame('scheduled', $p->getStatus()); $this->assertGreaterThan(new \DateTimeImmutable('2026-02-15'), $p->getNextDue()); }

    public function testPMOverdueMarking(): void
    { $p = new PreventiveMaintenance('p', 'a', 'Elevator', 'quarterly', new \DateTimeImmutable('2025-12-01'), 't');
      $p->markOverdue(); $this->assertSame('overdue', $p->getStatus()); }

    public function testMaintenanceLogCreation(): void
    { $l = new MaintenanceLog('p', 'ast1', 'eng1', 'Ade', 'Replaced compressor', new \DateTimeImmutable('2026-02-21'), 't');
      $l->setIncidentId('inc1'); $l->setPartsReplaced('Compressor unit, refrigerant'); $l->setCost('500000'); $l->setDowntimeMinutes(180);
      $l->onPrePersist(); $arr = $l->toArray(); $this->assertSame('500000', $arr['cost']); $this->assertSame(180, $arr['downtime_minutes']); $this->assertSame('inc1', $arr['incident_id']); }

    public function testMaintenanceLogPMLink(): void
    { $l = new MaintenanceLog('p', 'a', 'e', 'Eng', 'Routine check', new \DateTimeImmutable(), 't');
      $l->setPmId('pm1'); $l->onPrePersist(); $arr = $l->toArray(); $this->assertSame('pm1', $arr['pm_id']); }

    public function testAssetToArrayComplete(): void
    { $a = new Asset('p', 'c1', 'Plumbing', 'Water Pump', 't'); $a->setBrand('Grundfos'); $a->setModel('CR-32');
      $a->setSerialNumber('SN-2024-001'); $a->setPurchaseCost('2500000'); $a->setCustodianDept('Maintenance');
      $a->setPurchaseDate(new \DateTimeImmutable('2024-01-15')); $a->setWarrantyExpiry(new \DateTimeImmutable('2027-01-15'));
      $a->onPrePersist(); $arr = $a->toArray();
      $this->assertSame('Grundfos', $arr['brand']); $this->assertSame('CR-32', $arr['model']);
      $this->assertSame('2024-01-15', $arr['purchase_date']); $this->assertSame('Maintenance', $arr['custodian_dept']); }
}
