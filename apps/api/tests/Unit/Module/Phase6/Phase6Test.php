<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Phase6;

use Lodgik\Entity\HousekeepingTask;
use Lodgik\Entity\LostAndFound;
use Lodgik\Entity\PosTable;
use Lodgik\Entity\PosCategory;
use Lodgik\Entity\PosProduct;
use Lodgik\Entity\PosOrder;
use Lodgik\Entity\PosOrderItem;
use Lodgik\Enum\HousekeepingTaskStatus;
use Lodgik\Enum\PosOrderStatus;
use PHPUnit\Framework\TestCase;

final class Phase6Test extends TestCase
{
    // ─── Housekeeping ───────────────────────────────────────────

    public function testHousekeepingTaskCreation(): void
    {
        $t = new HousekeepingTask('prop', 'room-1', '101', 'checkout_clean', 'tenant');
        $this->assertSame('101', $t->getRoomNumber());
        $this->assertSame('checkout_clean', $t->getTaskType());
        $this->assertSame(HousekeepingTaskStatus::PENDING, $t->getStatus());
        $this->assertSame(3, $t->getPriority());
        $this->assertSame(30, $t->getEstimatedMinutes());
    }

    public function testHousekeepingAssignment(): void
    {
        $t = new HousekeepingTask('p', 'r', '102', 'stayover_clean', 't');
        $t->assign('user-1', 'Amina');
        $this->assertSame(HousekeepingTaskStatus::ASSIGNED, $t->getStatus());
        $this->assertSame('Amina', $t->getAssignedToName());
    }

    public function testHousekeepingFullWorkflow(): void
    {
        $t = new HousekeepingTask('p', 'r', '103', 'deep_clean', 't');
        $t->setPriority(1);
        $t->setBookingId('bk-1');
        $t->assign('u1', 'Staff');
        $this->assertSame(HousekeepingTaskStatus::ASSIGNED, $t->getStatus());
        $t->start();
        $this->assertSame(HousekeepingTaskStatus::IN_PROGRESS, $t->getStatus());
        $t->complete();
        $this->assertSame(HousekeepingTaskStatus::COMPLETED, $t->getStatus());
    }

    public function testHousekeepingInspectionPass(): void
    {
        $t = new HousekeepingTask('p', 'r', '104', 'checkout_clean', 't');
        $t->assign('u1', 'S'); $t->start(); $t->complete();
        $t->inspect('inspector-1', true, 'Looks good');
        $this->assertSame(HousekeepingTaskStatus::INSPECTED, $t->getStatus());
    }

    public function testHousekeepingInspectionFail(): void
    {
        $t = new HousekeepingTask('p', 'r', '105', 'checkout_clean', 't');
        $t->assign('u1', 'S'); $t->start(); $t->complete();
        $t->inspect('inspector-1', false, 'Bathroom not clean');
        $this->assertSame(HousekeepingTaskStatus::NEEDS_REWORK, $t->getStatus());
    }

    public function testHousekeepingChecklist(): void
    {
        $t = new HousekeepingTask('p', 'r', '106', 'checkout_clean', 't');
        $checklist = [['item' => 'Bed made', 'checked' => true], ['item' => 'Floor swept', 'checked' => false]];
        $t->setChecklist($checklist);
        $this->assertCount(2, $t->getChecklist());
        $this->assertTrue($t->getChecklist()[0]['checked']);
    }

    public function testHousekeepingPhotos(): void
    {
        $t = new HousekeepingTask('p', 'r', '107', 'checkout_clean', 't');
        $t->setPhotoBefore('before.jpg');
        $t->setPhotoAfter('after.jpg');
        $this->assertSame('before.jpg', $t->getPhotoBefore());
        $this->assertSame('after.jpg', $t->getPhotoAfter());
    }

    public function testHousekeepingToArray(): void
    {
        $t = new HousekeepingTask('p', 'r', '108', 'turndown', 't');
        $t->onPrePersist();
        $arr = $t->toArray();
        $this->assertSame('108', $arr['room_number']);
        $this->assertSame('pending', $arr['status']);
        $this->assertSame('Pending', $arr['status_label']);
    }

    public function testHousekeepingStatusEnum(): void
    {
        $vals = HousekeepingTaskStatus::values();
        $this->assertCount(6, $vals);
        $this->assertContains('pending', $vals);
        $this->assertContains('needs_rework', $vals);
        $this->assertSame('#22c55e', HousekeepingTaskStatus::COMPLETED->color());
    }

    // ─── Lost & Found ───────────────────────────────────────────

    public function testLostAndFoundCreation(): void
    {
        $lf = new LostAndFound('prop', 'Gold ring', 'Room 201', 'staff-1', 't');
        $this->assertSame('Gold ring', $lf->getDescription());
        $this->assertSame('Room 201', $lf->getFoundLocation());
        $this->assertSame('stored', $lf->getStatus());
    }

    public function testLostAndFoundClaim(): void
    {
        $lf = new LostAndFound('p', 'Laptop charger', 'Lobby', 's1', 't');
        $lf->setRoomId('r-201');
        $lf->setPhotoUrl('photo.jpg');
        $lf->claim('Guest John Smith');
        $this->assertSame('claimed', $lf->getStatus());
    }

    public function testLostAndFoundDispose(): void
    {
        $lf = new LostAndFound('p', 'Old umbrella', 'Pool', 's1', 't');
        $lf->dispose();
        $this->assertSame('disposed', $lf->getStatus());
    }

    public function testLostAndFoundToArray(): void
    {
        $lf = new LostAndFound('p', 'Watch', 'Bar', 's1', 't');
        $lf->onPrePersist();
        $arr = $lf->toArray();
        $this->assertSame('Watch', $arr['description']);
        $this->assertSame('stored', $arr['status']);
    }

    // ─── POS Table ──────────────────────────────────────────────

    public function testPosTableCreation(): void
    {
        $t = new PosTable('prop', 'T1', 'tenant');
        $this->assertSame('T1', $t->getNumber());
        $this->assertSame(4, $t->getSeats());
        $this->assertSame('restaurant', $t->getSection());
        $this->assertSame('available', $t->getStatus());
        $this->assertStringStartsWith('TBL-', $t->getQrCode());
    }

    public function testPosTableOccupy(): void
    {
        $t = new PosTable('p', 'T2', 't');
        $t->setSection('bar');
        $t->setSeats(6);
        $t->occupy('order-1');
        $this->assertSame('occupied', $t->getStatus());
        $this->assertSame('order-1', $t->getCurrentOrderId());
        $t->release();
        $this->assertSame('available', $t->getStatus());
        $this->assertNull($t->getCurrentOrderId());
    }

    // ─── POS Category ───────────────────────────────────────────

    public function testPosCategoryCreation(): void
    {
        $c = new PosCategory('prop', 'Cocktails', 'tenant');
        $this->assertSame('Cocktails', $c->getName());
        $this->assertSame('food', $c->getType());
        $c->setType('drink');
        $this->assertSame('drink', $c->getType());
        $this->assertTrue($c->isActive());
    }

    // ─── POS Product ────────────────────────────────────────────

    public function testPosProductCreation(): void
    {
        $p = new PosProduct('prop', 'cat-1', 'Jollof Rice', '350000', 'tenant');
        $this->assertSame('Jollof Rice', $p->getName());
        $this->assertSame('350000', $p->getPrice());
        $this->assertTrue($p->isAvailable());
        $this->assertSame(15, $p->getPrepTimeMinutes());
        $this->assertTrue($p->getRequiresKitchen());
    }

    public function testPosProductDrink(): void
    {
        $p = new PosProduct('p', 'cat-drinks', 'Chapman', '200000', 't');
        $p->setRequiresKitchen(false);
        $p->setPrepTimeMinutes(5);
        $p->setDescription('Nigerian mixed drink');
        $this->assertFalse($p->getRequiresKitchen());
        $this->assertSame(5, $p->getPrepTimeMinutes());
    }

    // ─── POS Order ──────────────────────────────────────────────

    public function testPosOrderCreation(): void
    {
        $o = new PosOrder('prop', 'ORD-001', 'tenant');
        $this->assertSame('ORD-001', $o->getOrderNumber());
        $this->assertSame(PosOrderStatus::OPEN, $o->getStatus());
        $this->assertSame('dine_in', $o->getOrderType());
        $this->assertSame('0', $o->getTotalAmount());
    }

    public function testPosOrderStatusEnum(): void
    {
        $vals = PosOrderStatus::values();
        $this->assertCount(7, $vals);
        $this->assertSame('Sent to Kitchen', PosOrderStatus::SENT->label());
        $this->assertSame('#f59e0b', PosOrderStatus::PREPARING->color());
    }

    public function testPosOrderWorkflow(): void
    {
        $o = new PosOrder('p', 'ORD-002', 't');
        $o->setTableId('t1'); $o->setTableNumber('T1');
        $o->setOrderType('dine_in');
        $o->send();
        $this->assertSame(PosOrderStatus::SENT, $o->getStatus());
        $o->preparing();
        $this->assertSame(PosOrderStatus::PREPARING, $o->getStatus());
        $o->ready();
        $this->assertSame(PosOrderStatus::READY, $o->getStatus());
        $o->serve();
        $this->assertSame(PosOrderStatus::SERVED, $o->getStatus());
    }

    public function testPosOrderPayDirect(): void
    {
        $o = new PosOrder('p', 'ORD-003', 't');
        $o->pay('direct', 'cash');
        $this->assertSame(PosOrderStatus::PAID, $o->getStatus());
        $this->assertSame('direct', $o->getPaymentType());
        $this->assertSame('cash', $o->getPaymentMethod());
    }

    public function testPosOrderRoomCharge(): void
    {
        $o = new PosOrder('p', 'ORD-004', 't');
        $o->setBookingId('bk-1');
        $o->setGuestName('Mr. Okafor');
        $o->setRoomNumber('305');
        $o->pay('room_charge', null);
        $this->assertSame('room_charge', $o->getPaymentType());
    }

    public function testPosOrderCancel(): void
    {
        $o = new PosOrder('p', 'ORD-005', 't');
        $o->cancel();
        $this->assertSame(PosOrderStatus::CANCELLED, $o->getStatus());
    }

    public function testPosOrderToArray(): void
    {
        $o = new PosOrder('p', 'ORD-006', 't');
        $o->setGuestName('Test'); $o->setItemCount(3);
        $o->onPrePersist();
        $arr = $o->toArray();
        $this->assertSame('ORD-006', $arr['order_number']);
        $this->assertSame('open', $arr['status']);
        $this->assertSame(3, $arr['item_count']);
    }

    // ─── POS Order Item ─────────────────────────────────────────

    public function testPosOrderItemCreation(): void
    {
        $i = new PosOrderItem('ord-1', 'prod-1', 'Jollof Rice', 2, '350000', 't');
        $this->assertSame('Jollof Rice', $i->getProductName());
        $this->assertSame(2, $i->getQuantity());
        $this->assertSame('350000', $i->getUnitPrice());
        $this->assertSame('700000', $i->getLineTotal());
        $this->assertSame('pending', $i->getStatus());
        $this->assertSame(1, $i->getSplitGroup());
    }

    public function testPosOrderItemKitchenWorkflow(): void
    {
        $i = new PosOrderItem('o', 'p', 'Suya', 1, '500000', 't');
        $i->startPrep();
        $this->assertSame('preparing', $i->getStatus());
        $i->markReady();
        $this->assertSame('ready', $i->getStatus());
        $i->markServed();
        $this->assertSame('served', $i->getStatus());
    }

    public function testPosOrderItemCancel(): void
    {
        $i = new PosOrderItem('o', 'p', 'Beer', 3, '80000', 't');
        $i->cancel();
        $this->assertSame('cancelled', $i->getStatus());
    }

    public function testPosOrderItemQuantityUpdate(): void
    {
        $i = new PosOrderItem('o', 'p', 'Water', 1, '50000', 't');
        $this->assertSame('50000', $i->getLineTotal());
        $i->setQuantity(5);
        $this->assertSame('250000', $i->getLineTotal());
    }

    public function testPosOrderItemSplitGroup(): void
    {
        $i1 = new PosOrderItem('o', 'p1', 'Item A', 1, '100000', 't');
        $i2 = new PosOrderItem('o', 'p2', 'Item B', 1, '200000', 't');
        $i2->setSplitGroup(2);
        $this->assertSame(1, $i1->getSplitGroup());
        $this->assertSame(2, $i2->getSplitGroup());
    }

    public function testPosOrderItemNotes(): void
    {
        $i = new PosOrderItem('o', 'p', 'Steak', 1, '800000', 't');
        $i->setNotes('Medium rare, no salt');
        $i->setRequiresKitchen(true);
        $this->assertSame('Medium rare, no salt', $i->getNotes());
    }

    public function testPosOrderItemToArray(): void
    {
        $i = new PosOrderItem('o', 'p', 'Chicken', 2, '400000', 't');
        $i->onPrePersist();
        $arr = $i->toArray();
        $this->assertSame('Chicken', $arr['product_name']);
        $this->assertSame(2, $arr['quantity']);
        $this->assertSame('800000', $arr['line_total']);
    }

    // ─── Integrated Workflows ───────────────────────────────────

    public function testFullHousekeepingCycle(): void
    {
        $t = new HousekeepingTask('p', 'r-201', '201', 'checkout_clean', 'tn');
        $t->setBookingId('bk-xyz');
        $t->setEstimatedMinutes(45);
        $t->setChecklist([['item' => 'Bed made', 'checked' => false], ['item' => 'Floor mopped', 'checked' => false]]);
        $t->assign('hk-1', 'Fatima');
        $t->start();
        $t->setPhotoBefore('before.jpg');
        // Update checklist
        $t->setChecklist([['item' => 'Bed made', 'checked' => true], ['item' => 'Floor mopped', 'checked' => true]]);
        $t->setPhotoAfter('after.jpg');
        $t->complete();
        $t->inspect('mgr-1', true, 'Perfect');
        $this->assertSame(HousekeepingTaskStatus::INSPECTED, $t->getStatus());
    }

    public function testFullPosOrderCycle(): void
    {
        // 1. Table setup
        $table = new PosTable('p', 'T5', 't');

        // 2. Create order
        $order = new PosOrder('p', 'ORD-100', 't');
        $order->setTableId($table->getId());
        $order->setTableNumber('T5');
        $table->occupy($order->getId());

        // 3. Add items
        $item1 = new PosOrderItem($order->getId(), 'p1', 'Jollof Rice', 2, '350000', 't');
        $item2 = new PosOrderItem($order->getId(), 'p2', 'Chapman', 2, '150000', 't');
        $item2->setRequiresKitchen(false);

        // 4. Calculate total
        $total = intval($item1->getLineTotal()) + intval($item2->getLineTotal());
        $order->setTotalAmount((string)$total);
        $this->assertSame('1000000', $order->getTotalAmount()); // ₦10,000

        // 5. Send to kitchen
        $order->send();
        $item1->startPrep();
        $item1->markReady();
        $order->ready();

        // 6. Serve & pay
        $order->serve();
        $order->pay('direct', 'pos_card');
        $table->release();

        $this->assertSame(PosOrderStatus::PAID, $order->getStatus());
        $this->assertSame('available', $table->getStatus());
    }

    public function testRoomChargeOrder(): void
    {
        $order = new PosOrder('p', 'ORD-RC1', 't');
        $order->setOrderType('room_service');
        $order->setBookingId('bk-999');
        $order->setGuestName('Mrs. Adeyemi');
        $order->setRoomNumber('502');
        $order->setTotalAmount('2500000');
        $order->pay('room_charge', null);
        $order->setFolioId('folio-999');
        $this->assertSame('room_charge', $order->getPaymentType());
        $this->assertSame('folio-999', $order->getFolioId());
    }
}
