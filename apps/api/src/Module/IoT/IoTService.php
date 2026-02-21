<?php
declare(strict_types=1);
namespace Lodgik\Module\IoT;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{IoTDevice, IoTAutomation};

final class IoTService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // Devices
    public function listDevices(string $propertyId, ?string $roomId = null, ?string $type = null): array
    { $qb = $this->em->createQueryBuilder()->select('d')->from(IoTDevice::class, 'd')->where('d.propertyId = :p')->setParameter('p', $propertyId)->orderBy('d.roomNumber', 'ASC');
      if ($roomId) $qb->andWhere('d.roomId = :r')->setParameter('r', $roomId);
      if ($type) $qb->andWhere('d.deviceType = :t')->setParameter('t', $type);
      return array_map(fn($d) => $d->toArray(), $qb->getQuery()->getResult()); }

    public function registerDevice(string $pid, string $type, string $name, string $tid, array $x = []): IoTDevice
    { $d = new IoTDevice($pid, $type, $name, $tid);
      if (!empty($x['room_id'])) $d->setRoomId($x['room_id']); if (!empty($x['room_number'])) $d->setRoomNumber($x['room_number']);
      if (!empty($x['mqtt_topic'])) $d->setMqttTopic($x['mqtt_topic']);
      $this->em->persist($d); $this->em->flush(); return $d; }

    public function updateDeviceState(string $id, array $state): IoTDevice
    { $d = $this->em->find(IoTDevice::class, $id); $d->updateState($state); $this->em->flush(); return $d; }

    public function controlDevice(string $id, string $action, array $params = []): array
    { $d = $this->em->find(IoTDevice::class, $id);
      // Build MQTT command (in production, publish to broker)
      $command = ['device_id' => $id, 'action' => $action, 'params' => $params, 'timestamp' => time()];
      // Update optimistic state
      $d->updateState(array_merge($d->toArray()['current_state'] ?? [], [$action => $params]));
      $this->em->flush();
      return ['success' => true, 'command' => $command, 'device' => $d->toArray()]; }

    public function getRoomDevices(string $propertyId, string $roomId): array
    { return array_map(fn($d) => $d->toArray(), $this->em->getRepository(IoTDevice::class)->findBy(['propertyId' => $propertyId, 'roomId' => $roomId])); }

    public function getEnergyReport(string $propertyId, ?string $roomId = null): array
    { $qb = $this->em->createQueryBuilder()->select('d.roomNumber, d.deviceType, d.name, d.energyKwh, d.status')
        ->from(IoTDevice::class, 'd')->where('d.propertyId = :p')->setParameter('p', $propertyId)->orderBy('d.energyKwh', 'DESC');
      if ($roomId) $qb->andWhere('d.roomId = :r')->setParameter('r', $roomId);
      return $qb->getQuery()->getResult(); }

    public function getDeviceStatusSummary(string $propertyId): array
    { $rows = $this->em->createQueryBuilder()->select('d.status, COUNT(d.id) as cnt')->from(IoTDevice::class, 'd')
        ->where('d.propertyId = :p')->setParameter('p', $propertyId)->groupBy('d.status')->getQuery()->getResult();
      return array_column($rows, 'cnt', 'status'); }

    // Automations
    public function listAutomations(string $propertyId, ?bool $activeOnly = null): array
    { $c = ['propertyId' => $propertyId]; if ($activeOnly !== null) $c['isActive'] = $activeOnly;
      return array_map(fn($a) => $a->toArray(), $this->em->getRepository(IoTAutomation::class)->findBy($c, ['name' => 'ASC'])); }

    public function createAutomation(string $pid, string $name, string $triggerType, array $triggerConfig, array $actions, string $tid): IoTAutomation
    { $a = new IoTAutomation($pid, $name, $triggerType, $triggerConfig, $actions, $tid); $this->em->persist($a); $this->em->flush(); return $a; }

    public function toggleAutomation(string $id, bool $active): IoTAutomation
    { $a = $this->em->find(IoTAutomation::class, $id); $a->setIsActive($active); $this->em->flush(); return $a; }

    /** Trigger automations for an event (check_in, check_out, etc.) */
    public function triggerEvent(string $propertyId, string $eventType, array $context = []): array
    { $automations = $this->em->getRepository(IoTAutomation::class)->findBy(['propertyId' => $propertyId, 'triggerType' => $eventType, 'isActive' => true]);
      $executed = [];
      foreach ($automations as $auto) {
        foreach ($auto->getActions() as $action) {
          // In production: publish MQTT commands per action
          $executed[] = ['automation' => $auto->getName(), 'action' => $action, 'context' => $context];
        }
      }
      return $executed; }
}
