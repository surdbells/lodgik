<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\StockCategory;
use Lodgik\Entity\UnitOfMeasure;
use Lodgik\Entity\StockLocation;
use Lodgik\Entity\StockItem;
use Lodgik\Entity\StockBalance;

class InventoryService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // ═══════════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════════

    /** @return StockCategory[] */
    public function listCategories(string $tenantId, bool $activeOnly = false): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('c')
            ->from(StockCategory::class, 'c')
            ->where('c.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('c.sortOrder', 'ASC')
            ->addOrderBy('c.name', 'ASC');

        if ($activeOnly) {
            $qb->andWhere('c.isActive = true');
        }

        return $qb->getQuery()->getResult();
    }

    public function createCategory(string $tenantId, array $data): StockCategory
    {
        $cat = new StockCategory(
            $data['name'],
            $tenantId,
            $data['department'] ?? 'general'
        );

        if (isset($data['description']))  $cat->setDescription($data['description']);
        if (isset($data['parent_id']))    $cat->setParentId($data['parent_id']);
        if (isset($data['sort_order']))   $cat->setSortOrder((int) $data['sort_order']);

        $this->em->persist($cat);
        $this->em->flush();

        return $cat;
    }

    public function updateCategory(string $id, string $tenantId, array $data): StockCategory
    {
        $cat = $this->findCategoryOrFail($id, $tenantId);

        if (isset($data['name']))        $cat->setName($data['name']);
        if (isset($data['description'])) $cat->setDescription($data['description']);
        if (isset($data['department']))  $cat->setDepartment($data['department']);
        if (isset($data['parent_id']))   $cat->setParentId($data['parent_id'] ?: null);
        if (isset($data['sort_order']))  $cat->setSortOrder((int) $data['sort_order']);
        if (isset($data['is_active']))   $cat->setIsActive((bool) $data['is_active']);

        $this->em->flush();

        return $cat;
    }

    public function deleteCategory(string $id, string $tenantId): void
    {
        $cat = $this->findCategoryOrFail($id, $tenantId);

        // Prevent deletion if items reference this category
        $itemCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(i.id)')
            ->from(StockItem::class, 'i')
            ->where('i.tenantId = :tid')
            ->andWhere('i.categoryId = :cid')
            ->setParameter('tid', $tenantId)
            ->setParameter('cid', $id)
            ->getQuery()->getSingleScalarResult();

        if ($itemCount > 0) {
            throw new \DomainException("Cannot delete category: {$itemCount} stock item(s) reference it. Deactivate it instead.");
        }

        $this->em->remove($cat);
        $this->em->flush();
    }

    private function findCategoryOrFail(string $id, string $tenantId): StockCategory
    {
        $cat = $this->em->find(StockCategory::class, $id);
        if (!$cat || $cat->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Stock category not found');
        }
        return $cat;
    }

    // ═══════════════════════════════════════════════════════════════
    // UNITS OF MEASURE
    // ═══════════════════════════════════════════════════════════════

    /** @return UnitOfMeasure[] */
    public function listUoms(string $tenantId, bool $activeOnly = false): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('u')
            ->from(UnitOfMeasure::class, 'u')
            ->where('u.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('u.type', 'ASC')
            ->addOrderBy('u.name', 'ASC');

        if ($activeOnly) {
            $qb->andWhere('u.isActive = true');
        }

        return $qb->getQuery()->getResult();
    }

    public function createUom(string $tenantId, array $data): UnitOfMeasure
    {
        // Enforce unique name per tenant at service level (DB also has constraint)
        $existing = $this->em->createQueryBuilder()
            ->select('COUNT(u.id)')
            ->from(UnitOfMeasure::class, 'u')
            ->where('u.tenantId = :tid')
            ->andWhere('LOWER(u.name) = LOWER(:name)')
            ->setParameter('tid', $tenantId)
            ->setParameter('name', $data['name'])
            ->getQuery()->getSingleScalarResult();

        if ((int) $existing > 0) {
            throw new \DomainException("A unit of measure named '{$data['name']}' already exists.");
        }

        $uom = new UnitOfMeasure(
            $data['name'],
            $data['symbol'],
            $tenantId,
            $data['type'] ?? 'count'
        );

        if (isset($data['base_unit_id']))      $uom->setBaseUnitId($data['base_unit_id']);
        if (isset($data['conversion_factor'])) $uom->setConversionFactor((string) $data['conversion_factor']);

        $this->em->persist($uom);
        $this->em->flush();

        return $uom;
    }

    public function updateUom(string $id, string $tenantId, array $data): UnitOfMeasure
    {
        $uom = $this->findUomOrFail($id, $tenantId);

        if (isset($data['name']))              $uom->setName($data['name']);
        if (isset($data['symbol']))            $uom->setSymbol($data['symbol']);
        if (isset($data['type']))              $uom->setType($data['type']);
        if (isset($data['base_unit_id']))      $uom->setBaseUnitId($data['base_unit_id'] ?: null);
        if (isset($data['conversion_factor'])) $uom->setConversionFactor((string) $data['conversion_factor']);
        if (isset($data['is_active']))         $uom->setIsActive((bool) $data['is_active']);

        $this->em->flush();

        return $uom;
    }

    public function deleteUom(string $id, string $tenantId): void
    {
        $uom = $this->findUomOrFail($id, $tenantId);

        // Prevent deletion if items reference this UOM
        $refCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(i.id)')
            ->from(StockItem::class, 'i')
            ->where('i.tenantId = :tid')
            ->andWhere('i.purchaseUomId = :uid OR i.issueUomId = :uid')
            ->setParameter('tid', $tenantId)
            ->setParameter('uid', $id)
            ->getQuery()->getSingleScalarResult();

        if ($refCount > 0) {
            throw new \DomainException("Cannot delete UOM: {$refCount} stock item(s) reference it. Deactivate it instead.");
        }

        $this->em->remove($uom);
        $this->em->flush();
    }

    private function findUomOrFail(string $id, string $tenantId): UnitOfMeasure
    {
        $uom = $this->em->find(UnitOfMeasure::class, $id);
        if (!$uom || $uom->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Unit of measure not found');
        }
        return $uom;
    }

    // ═══════════════════════════════════════════════════════════════
    // LOCATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @return StockLocation[]
     * Pass $propertyId to filter to a specific property + warehouse.
     * Pass null to get all locations for the tenant (chain-wide view).
     */
    public function listLocations(string $tenantId, ?string $propertyId = null, bool $activeOnly = false): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('l')
            ->from(StockLocation::class, 'l')
            ->where('l.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('l.type', 'ASC')
            ->addOrderBy('l.name', 'ASC');

        if ($propertyId !== null) {
            // Return the property's locations AND the central warehouse (property_id IS NULL)
            $qb->andWhere('l.propertyId = :pid OR l.propertyId IS NULL')
               ->setParameter('pid', $propertyId);
        }

        if ($activeOnly) {
            $qb->andWhere('l.isActive = true');
        }

        return $qb->getQuery()->getResult();
    }

    public function createLocation(string $tenantId, array $data): StockLocation
    {
        $loc = new StockLocation(
            $data['name'],
            $data['type'],
            $tenantId,
            $data['property_id'] ?? null
        );

        if (isset($data['description']))  $loc->setDescription($data['description']);
        if (isset($data['parent_id']))    $loc->setParentId($data['parent_id'] ?: null);
        if (isset($data['department']))   $loc->setDepartment($data['department'] ?: null);
        if (isset($data['manager_name'])) $loc->setManagerName($data['manager_name'] ?: null);

        $this->em->persist($loc);
        $this->em->flush();

        return $loc;
    }

    public function updateLocation(string $id, string $tenantId, array $data): StockLocation
    {
        $loc = $this->findLocationOrFail($id, $tenantId);

        if (isset($data['name']))         $loc->setName($data['name']);
        if (isset($data['description']))  $loc->setDescription($data['description'] ?: null);
        if (isset($data['type']))         $loc->setType($data['type']);
        if (isset($data['parent_id']))    $loc->setParentId($data['parent_id'] ?: null);
        if (isset($data['department']))   $loc->setDepartment($data['department'] ?: null);
        if (isset($data['manager_name'])) $loc->setManagerName($data['manager_name'] ?: null);
        if (isset($data['is_active']))    $loc->setIsActive((bool) $data['is_active']);

        $this->em->flush();

        return $loc;
    }

    public function deleteLocation(string $id, string $tenantId): void
    {
        $loc = $this->findLocationOrFail($id, $tenantId);

        // Prevent deletion if balances exist at this location
        $balanceCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.locationId = :lid')
            ->setParameter('tid', $tenantId)
            ->setParameter('lid', $id)
            ->getQuery()->getSingleScalarResult();

        if ($balanceCount > 0) {
            throw new \DomainException("Cannot delete location: it has stock balance records. Deactivate it instead.");
        }

        $this->em->remove($loc);
        $this->em->flush();
    }

    private function findLocationOrFail(string $id, string $tenantId): StockLocation
    {
        $loc = $this->em->find(StockLocation::class, $id);
        if (!$loc || $loc->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Stock location not found');
        }
        return $loc;
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK ITEMS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Paginated list with optional filters and joined category/UOM names.
     * Returns ['items' => StockItem[], 'total' => int]
     */
    public function listItems(
        string  $tenantId,
        int     $page = 1,
        int     $perPage = 30,
        ?string $categoryId = null,
        ?string $search = null,
        ?bool   $activeOnly = true,
        ?bool   $lowStockOnly = null
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('i')
            ->from(StockItem::class, 'i')
            ->where('i.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('i.name', 'ASC');

        if ($categoryId) {
            $qb->andWhere('i.categoryId = :cat')->setParameter('cat', $categoryId);
        }

        if ($search) {
            $qb->andWhere('LOWER(i.name) LIKE LOWER(:q) OR LOWER(i.sku) LIKE LOWER(:q)')
               ->setParameter('q', '%' . $search . '%');
        }

        if ($activeOnly !== null) {
            $qb->andWhere('i.isActive = :active')->setParameter('active', $activeOnly);
        }

        $total = (int) (clone $qb)
            ->select('COUNT(i.id)')
            ->getQuery()->getSingleScalarResult();

        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()->getResult();

        return ['items' => $items, 'total' => $total];
    }

    public function getItem(string $id, string $tenantId): StockItem
    {
        return $this->findItemOrFail($id, $tenantId);
    }

    public function createItem(string $tenantId, array $data): StockItem
    {
        // Validate category belongs to tenant
        $this->findCategoryOrFail($data['category_id'], $tenantId);
        $this->findUomOrFail($data['purchase_uom_id'], $tenantId);
        $this->findUomOrFail($data['issue_uom_id'], $tenantId);

        // Enforce unique SKU
        $existing = $this->em->createQueryBuilder()
            ->select('COUNT(i.id)')
            ->from(StockItem::class, 'i')
            ->where('i.tenantId = :tid')
            ->andWhere('LOWER(i.sku) = LOWER(:sku)')
            ->setParameter('tid', $tenantId)
            ->setParameter('sku', $data['sku'])
            ->getQuery()->getSingleScalarResult();

        if ((int) $existing > 0) {
            throw new \DomainException("SKU '{$data['sku']}' already exists.");
        }

        $item = new StockItem(
            strtoupper(trim($data['sku'])),
            $data['name'],
            $data['category_id'],
            $data['purchase_uom_id'],
            $data['issue_uom_id'],
            $tenantId
        );

        $this->applyItemFields($item, $data);

        $this->em->persist($item);
        $this->em->flush();

        return $item;
    }

    public function updateItem(string $id, string $tenantId, array $data): StockItem
    {
        $item = $this->findItemOrFail($id, $tenantId);

        // Validate FK references if changed
        if (isset($data['category_id']))    $this->findCategoryOrFail($data['category_id'], $tenantId);
        if (isset($data['purchase_uom_id'])) $this->findUomOrFail($data['purchase_uom_id'], $tenantId);
        if (isset($data['issue_uom_id']))   $this->findUomOrFail($data['issue_uom_id'], $tenantId);

        // If SKU is being changed, enforce uniqueness
        if (isset($data['sku']) && strtoupper(trim($data['sku'])) !== $item->getSku()) {
            $existing = $this->em->createQueryBuilder()
                ->select('COUNT(i.id)')
                ->from(StockItem::class, 'i')
                ->where('i.tenantId = :tid')
                ->andWhere('LOWER(i.sku) = LOWER(:sku)')
                ->andWhere('i.id != :id')
                ->setParameter('tid', $tenantId)
                ->setParameter('sku', $data['sku'])
                ->setParameter('id', $id)
                ->getQuery()->getSingleScalarResult();

            if ((int) $existing > 0) {
                throw new \DomainException("SKU '{$data['sku']}' already exists.");
            }

            $item->setSku(strtoupper(trim($data['sku'])));
        }

        if (isset($data['category_id']))     $item->setCategoryId($data['category_id']);
        if (isset($data['purchase_uom_id'])) $item->setPurchaseUomId($data['purchase_uom_id']);
        if (isset($data['issue_uom_id']))    $item->setIssueUomId($data['issue_uom_id']);

        $this->applyItemFields($item, $data);

        $this->em->flush();

        return $item;
    }

    public function deleteItem(string $id, string $tenantId): void
    {
        $item = $this->findItemOrFail($id, $tenantId);

        // Prevent deletion if there are non-zero balances
        $balanceCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.itemId = :iid')
            ->andWhere('b.quantityOnHand > 0')
            ->setParameter('tid', $tenantId)
            ->setParameter('iid', $id)
            ->getQuery()->getSingleScalarResult();

        if ($balanceCount > 0) {
            throw new \DomainException('Cannot delete item with stock on hand. Deactivate it instead.');
        }

        // Remove zero balances cleanly
        $this->em->createQueryBuilder()
            ->delete(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.itemId = :iid')
            ->setParameter('tid', $tenantId)
            ->setParameter('iid', $id)
            ->getQuery()->execute();

        $this->em->remove($item);
        $this->em->flush();
    }

    private function applyItemFields(StockItem $item, array $data): void
    {
        if (isset($data['name']))                     $item->setName($data['name']);
        if (isset($data['description']))              $item->setDescription($data['description'] ?: null);
        if (isset($data['purchase_to_issue_factor'])) $item->setPurchaseToIssueFactor((string) $data['purchase_to_issue_factor']);
        if (isset($data['reorder_point']))            $item->setReorderPoint((string) $data['reorder_point']);
        if (isset($data['par_level']))                $item->setParLevel((string) $data['par_level']);
        if (isset($data['max_level']))                $item->setMaxLevel((string) $data['max_level']);
        if (isset($data['is_perishable']))            $item->setIsPerishable((bool) $data['is_perishable']);
        if (isset($data['expiry_alert_days']))        $item->setExpiryAlertDays((int) $data['expiry_alert_days']);
        if (isset($data['barcode']))                  $item->setBarcode($data['barcode'] ?: null);
        if (isset($data['image_url']))                $item->setImageUrl($data['image_url'] ?: null);
        if (isset($data['preferred_vendor']))         $item->setPreferredVendor($data['preferred_vendor'] ?: null);
        if (isset($data['is_active']))                $item->setIsActive((bool) $data['is_active']);
    }

    private function findItemOrFail(string $id, string $tenantId): StockItem
    {
        $item = $this->em->find(StockItem::class, $id);
        if (!$item || $item->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Stock item not found');
        }
        return $item;
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK BALANCES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get stock balance for a specific item across all locations,
     * or for a specific location if $locationId is provided.
     * @return StockBalance[]
     */
    public function getBalances(
        string  $tenantId,
        string  $itemId,
        ?string $locationId = null
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('b')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.itemId = :iid')
            ->setParameter('tid', $tenantId)
            ->setParameter('iid', $itemId);

        if ($locationId) {
            $qb->andWhere('b.locationId = :lid')->setParameter('lid', $locationId);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Get all balances at a location (for a stock-take / location view).
     * Joins item data for display. Returns array of combined data.
     */
    public function getLocationStock(string $tenantId, string $locationId, ?string $search = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('b', 'i')
            ->from(StockBalance::class, 'b')
            ->join(StockItem::class, 'i', 'WITH', 'i.id = b.itemId AND i.tenantId = b.tenantId')
            ->where('b.tenantId = :tid')
            ->andWhere('b.locationId = :lid')
            ->andWhere('i.isActive = true')
            ->setParameter('tid', $tenantId)
            ->setParameter('lid', $locationId)
            ->orderBy('i.name', 'ASC');

        if ($search) {
            $qb->andWhere('LOWER(i.name) LIKE LOWER(:q) OR LOWER(i.sku) LIKE LOWER(:q)')
               ->setParameter('q', '%' . $search . '%');
        }

        $rows = $qb->getQuery()->getResult();

        // Rows come back as [StockBalance, StockItem] pairs
        $result = [];
        foreach ($rows as $row) {
            if ($row instanceof StockBalance) {
                $result[] = $row;
            }
        }

        return $result;
    }

    /**
     * Set opening balance for an item at a location (Phase A only — no movement log yet).
     * Creates the balance row if it doesn't exist; updates if it does.
     * Phase B will replace this with a proper Opening Balance movement type.
     */
    public function setOpeningBalance(
        string $tenantId,
        string $itemId,
        string $locationId,
        string $quantity,
        string $unitCost,
        ?string $propertyId = null
    ): StockBalance {
        $this->findItemOrFail($itemId, $tenantId);
        $this->findLocationOrFail($locationId, $tenantId);

        // Look for existing balance record
        $balance = $this->em->createQueryBuilder()
            ->select('b')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.itemId = :iid')
            ->andWhere('b.locationId = :lid')
            ->setParameter('tid', $tenantId)
            ->setParameter('iid', $itemId)
            ->setParameter('lid', $locationId)
            ->getQuery()->getOneOrNullResult();

        if (!$balance) {
            $balance = new StockBalance($itemId, $locationId, $tenantId, $propertyId);
            $this->em->persist($balance);
        }

        $qty       = (float) $quantity;
        $cost      = (int)   $unitCost;
        $totalValue = (string) (int) ($qty * $cost);

        $balance->setQuantityOnHand((string) $qty);
        $balance->setValueOnHand($totalValue);
        $balance->setLastMovementAt(new \DateTimeImmutable());

        // Also set the item's average cost to the given unit cost if not yet set
        $item = $this->findItemOrFail($itemId, $tenantId);
        if ($item->getAverageCost() === '0') {
            $item->setAverageCost((string) $cost);
            $item->setLastPurchaseCost((string) $cost);
        }

        $this->em->flush();

        return $balance;
    }

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD SUMMARY
    // ═══════════════════════════════════════════════════════════════

    /**
     * High-level summary for the inventory dashboard.
     * Returns counts and low-stock alerts for the given scope.
     */
    public function getSummary(string $tenantId, ?string $propertyId = null): array
    {
        // Total active items
        $totalItems = (int) $this->em->createQueryBuilder()
            ->select('COUNT(i.id)')
            ->from(StockItem::class, 'i')
            ->where('i.tenantId = :tid')
            ->andWhere('i.isActive = true')
            ->setParameter('tid', $tenantId)
            ->getQuery()->getSingleScalarResult();

        // Total active locations
        $locQb = $this->em->createQueryBuilder()
            ->select('COUNT(l.id)')
            ->from(StockLocation::class, 'l')
            ->where('l.tenantId = :tid')
            ->andWhere('l.isActive = true')
            ->setParameter('tid', $tenantId);

        if ($propertyId) {
            $locQb->andWhere('l.propertyId = :pid OR l.propertyId IS NULL')
                  ->setParameter('pid', $propertyId);
        }
        $totalLocations = (int) $locQb->getQuery()->getSingleScalarResult();

        // Total stock value
        $valueQb = $this->em->createQueryBuilder()
            ->select('SUM(b.valueOnHand)')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->setParameter('tid', $tenantId);

        if ($propertyId) {
            $valueQb->andWhere('b.propertyId = :pid OR b.propertyId IS NULL')
                    ->setParameter('pid', $propertyId);
        }
        $totalValue = (string) ($valueQb->getQuery()->getSingleScalarResult() ?? '0');

        // Low-stock items: quantity_on_hand <= reorder_point (and reorder_point > 0)
        $lowStockItems = $this->em->createQueryBuilder()
            ->select('i.id', 'i.name', 'i.sku', 'i.reorderPoint', 'SUM(b.quantityOnHand) AS total_qty')
            ->from(StockBalance::class, 'b')
            ->join(StockItem::class, 'i', 'WITH', 'i.id = b.itemId AND i.tenantId = b.tenantId')
            ->where('b.tenantId = :tid')
            ->andWhere('i.isActive = true')
            ->andWhere('i.reorderPoint > 0')
            ->setParameter('tid', $tenantId)
            ->groupBy('i.id, i.name, i.sku, i.reorderPoint')
            ->having('SUM(b.quantityOnHand) <= i.reorderPoint')
            ->orderBy('i.name', 'ASC')
            ->getQuery()->getArrayResult();

        return [
            'total_items'     => $totalItems,
            'total_locations' => $totalLocations,
            'total_value'     => $totalValue,
            'low_stock_count' => count($lowStockItems),
            'low_stock_items' => $lowStockItems,
        ];
    }
}
