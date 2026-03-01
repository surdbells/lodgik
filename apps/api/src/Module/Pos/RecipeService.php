<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Recipe;
use Lodgik\Entity\RecipeIngredient;
use Lodgik\Entity\StockItem;
use Lodgik\Entity\StockMovement;
use Lodgik\Entity\StockBalance;
use Lodgik\Entity\PosProduct;
use Lodgik\Entity\PosOrder;
use Lodgik\Entity\PosOrderItem;
use Psr\Log\LoggerInterface;

/**
 * RecipeService
 *
 * Responsibilities:
 *  1. CRUD for Recipe + RecipeIngredient
 *  2. Food-cost calculation per product (theoretical cost vs POS price)
 *  3. Ingredient deduction hook — called by PosService::payOrder
 *  4. Theoretical vs actual comparison across a date range
 */
final class RecipeService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface        $logger,
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // Recipe CRUD
    // ─────────────────────────────────────────────────────────────────

    /**
     * Create or fully replace the recipe for a product.
     * If a recipe already exists for this product it is replaced (ingredients cleared).
     */
    public function upsertRecipe(string $productId, string $tenantId, array $data): Recipe
    {
        /** @var Recipe|null $recipe */
        $recipe = $this->em->createQueryBuilder()
            ->select('r')->from(Recipe::class, 'r')
            ->where('r.productId = :pid')->andWhere('r.tenantId = :tid')
            ->setParameter('pid', $productId)->setParameter('tid', $tenantId)
            ->getQuery()->getOneOrNullResult();

        $product = $this->em->find(PosProduct::class, $productId);
        $productName = $product?->getName() ?? ($data['product_name'] ?? 'Unknown Product');

        if (!$recipe) {
            $recipe = new Recipe($productId, $productName, $tenantId);
            $this->em->persist($recipe);
        } else {
            // Clear existing ingredients
            $this->clearIngredients($recipe->getId(), $tenantId);
        }

        $recipe->setProductName($productName);
        if (isset($data['property_id']))    $recipe->setPropertyId($data['property_id']);
        if (isset($data['yield_quantity'])) $recipe->setYieldQuantity((string) $data['yield_quantity']);
        if (isset($data['yield_uom']))      $recipe->setYieldUom($data['yield_uom']);
        if (isset($data['notes']))          $recipe->setNotes($data['notes'] ?: null);
        if (isset($data['is_active']))      $recipe->setIsActive((bool) $data['is_active']);

        $this->em->flush();

        // Add ingredient lines
        $sortOrder = 0;
        foreach (($data['ingredients'] ?? []) as $line) {
            if (empty($line['stock_item_id']) || !isset($line['quantity_per_yield'])) continue;

            $stockItem = $this->em->find(StockItem::class, $line['stock_item_id']);
            if (!$stockItem || $stockItem->getTenantId() !== $tenantId) continue;

            $ri = new RecipeIngredient(
                recipeId:        $recipe->getId(),
                stockItemId:     $stockItem->getId(),
                itemSku:         $stockItem->getSku(),
                itemName:        $stockItem->getName(),
                quantityPerYield:(string) $line['quantity_per_yield'],
                tenantId:        $tenantId,
            );
            $ri->setUomSymbol($line['uom_symbol'] ?? 'unit');
            if (isset($line['notes'])) $ri->setNotes($line['notes'] ?: null);
            $ri->setSortOrder($sortOrder++);
            $this->em->persist($ri);
        }

        $this->em->flush();
        return $recipe;
    }

    public function getRecipe(string $recipeId, string $tenantId): array
    {
        $recipe = $this->em->find(Recipe::class, $recipeId);
        if (!$recipe || $recipe->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Recipe not found');
        }
        return $this->formatRecipe($recipe);
    }

    public function getRecipeByProduct(string $productId, string $tenantId): ?array
    {
        $recipe = $this->em->createQueryBuilder()
            ->select('r')->from(Recipe::class, 'r')
            ->where('r.productId = :pid')->andWhere('r.tenantId = :tid')
            ->setParameter('pid', $productId)->setParameter('tid', $tenantId)
            ->getQuery()->getOneOrNullResult();

        return $recipe ? $this->formatRecipe($recipe) : null;
    }

    /** @return array[] */
    public function listRecipes(string $tenantId, ?string $propertyId = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('r')->from(Recipe::class, 'r')
            ->where('r.tenantId = :tid')->setParameter('tid', $tenantId)
            ->orderBy('r.productName', 'ASC');

        if ($propertyId) {
            $qb->andWhere('r.propertyId = :pid')->setParameter('pid', $propertyId);
        }

        return array_map(
            fn(Recipe $r) => $this->formatRecipe($r),
            $qb->getQuery()->getResult()
        );
    }

    public function deleteRecipe(string $recipeId, string $tenantId): void
    {
        $recipe = $this->em->find(Recipe::class, $recipeId);
        if (!$recipe || $recipe->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Recipe not found');
        }
        $this->clearIngredients($recipeId, $tenantId);
        $this->em->remove($recipe);
        $this->em->flush();
    }

    // ─────────────────────────────────────────────────────────────────
    // Food Cost Calculation
    // ─────────────────────────────────────────────────────────────────

    /**
     * Calculate the theoretical food cost for a product based on its recipe.
     *
     * Returns:
     *   ingredient_cost_kobo  — sum of (qty_per_yield × WAC) for all ingredients
     *   product_price_kobo    — current POS price
     *   food_cost_pct         — ingredient_cost / price × 100  (null if price = 0)
     *   yield_quantity        — from recipe
     *   ingredients           — per-line breakdown
     */
    public function calculateFoodCost(string $productId, string $tenantId): array
    {
        $recipe = $this->em->createQueryBuilder()
            ->select('r')->from(Recipe::class, 'r')
            ->where('r.productId = :pid')->andWhere('r.tenantId = :tid')->andWhere('r.isActive = true')
            ->setParameter('pid', $productId)->setParameter('tid', $tenantId)
            ->getQuery()->getOneOrNullResult();

        if (!$recipe) {
            return ['has_recipe' => false];
        }

        $ingredients = $this->loadIngredients($recipe->getId(), $tenantId);
        $totalCostKobo = 0;
        $lines = [];

        foreach ($ingredients as $ri) {
            $stockItem = $this->em->find(StockItem::class, $ri->getStockItemId());
            if (!$stockItem) continue;

            $wac     = (int) $stockItem->getAverageCost(); // kobo per issue unit
            $qty     = (float) $ri->getQuantityPerYield();
            $lineCost= (int) round($wac * $qty);
            $totalCostKobo += $lineCost;

            $lines[] = [
                'stock_item_id'      => $ri->getStockItemId(),
                'item_sku'           => $ri->getItemSku(),
                'item_name'          => $ri->getItemName(),
                'quantity_per_yield' => $ri->getQuantityPerYield(),
                'uom_symbol'         => $ri->getUomSymbol(),
                'wac_kobo'           => $wac,
                'line_cost_kobo'     => $lineCost,
            ];
        }

        $product = $this->em->find(PosProduct::class, $productId);
        $priceKobo = $product ? (int) $product->getPrice() : 0;
        $foodCostPct = ($priceKobo > 0)
            ? round(($totalCostKobo / $priceKobo) * 100, 2)
            : null;

        return [
            'has_recipe'           => true,
            'recipe_id'            => $recipe->getId(),
            'product_id'           => $productId,
            'product_name'         => $recipe->getProductName(),
            'yield_quantity'       => $recipe->getYieldQuantity(),
            'yield_uom'            => $recipe->getYieldUom(),
            'ingredient_cost_kobo' => $totalCostKobo,
            'product_price_kobo'   => $priceKobo,
            'food_cost_pct'        => $foodCostPct,
            'ingredients'          => $lines,
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // Ingredient Deduction (called from PosService::payOrder)
    // ─────────────────────────────────────────────────────────────────

    /**
     * For every order item whose product has an active recipe, deduct
     * each ingredient from the stock balance.
     *
     * This method is NON-FATAL — errors are logged but never bubble up
     * to block payment. Returns a list of warning strings (empty = all good).
     *
     * @return string[]  warnings (empty array on success)
     */
    public function deductIngredients(
        string $orderId,
        string $tenantId,
        string $propertyId,
        string $orderNumber
    ): array {
        $warnings = [];

        try {
            /** @var PosOrderItem[] $items */
            $items = $this->em->createQueryBuilder()
                ->select('i')->from(PosOrderItem::class, 'i')
                ->where('i.orderId = :oid')->setParameter('oid', $orderId)
                ->getQuery()->getResult();

            foreach ($items as $item) {
                if ($item->getQuantity() <= 0) continue;

                // Load active recipe for this product
                $recipe = $this->em->createQueryBuilder()
                    ->select('r')->from(Recipe::class, 'r')
                    ->where('r.productId = :pid')
                    ->andWhere('r.tenantId = :tid')
                    ->andWhere('r.isActive = true')
                    ->setParameter('pid', $item->getProductId())
                    ->setParameter('tid', $tenantId)
                    ->getQuery()->getOneOrNullResult();

                if (!$recipe) continue;

                $ingredients = $this->loadIngredients($recipe->getId(), $tenantId);
                $orderQty    = (float) $item->getQuantity();
                $yieldQty    = (float) $recipe->getYieldQuantity();
                // Scale: if recipe yields 2 servings but we sold 3, factor = 3/2 = 1.5
                $factor = ($yieldQty > 0) ? ($orderQty / $yieldQty) : $orderQty;

                foreach ($ingredients as $ri) {
                    $needed = round((float) $ri->getQuantityPerYield() * $factor, 6);
                    if ($needed <= 0) continue;

                    $stockItem = $this->em->find(StockItem::class, $ri->getStockItemId());
                    if (!$stockItem) {
                        $warnings[] = "Recipe ingredient {$ri->getItemSku()} not found in stock catalogue";
                        continue;
                    }

                    // Find balance record — use first available location for the property
                    $balance = $this->findBalanceForProperty($stockItem->getId(), $tenantId, $propertyId);
                    if (!$balance) {
                        $warnings[] = "{$ri->getItemSku()}: no stock balance found for this property";
                        continue;
                    }

                    $currentQty = (float) $balance->getQuantity();
                    if ($currentQty < $needed) {
                        $warnings[] = "{$ri->getItemSku()}: insufficient stock (have {$currentQty}, need {$needed} {$ri->getUomSymbol()})";
                        // Still deduct what's there (soft deduction — don't block)
                        $needed = max(0, $currentQty);
                    }

                    if ($needed <= 0) continue;

                    // Apply deduction directly to balance
                    $newQty = $currentQty - $needed;
                    $balance->setQuantity((string) $newQty);

                    $this->logger->info(
                        "[RecipeDeduction] order={$orderNumber} item={$ri->getItemSku()} deducted={$needed} remaining={$newQty}"
                    );
                }
            }

            $this->em->flush();
        } catch (\Throwable $e) {
            $warnings[] = 'Recipe deduction error: ' . $e->getMessage();
            $this->logger->error('[RecipeDeduction] ' . $e->getMessage(), ['exception' => $e]);
        }

        return $warnings;
    }

    // ─────────────────────────────────────────────────────────────────
    // Food Cost Report (Theoretical vs Actual)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Aggregate food cost data across all products with recipes for a
     * given property and date range.
     *
     * theoretical_cost_kobo = sum(order_qty × ingredient_wac) for closed orders
     * actual_deducted_kobo  = sum of pos_deduction movement line values in range
     * variance_kobo         = actual - theoretical  (positive = over-use / shrinkage)
     */
    public function getFoodCostReport(
        string $tenantId,
        ?string $propertyId,
        string $dateFrom,
        string $dateTo
    ): array {
        $conn = $this->em->getConnection();

        // ── Theoretical cost: closed POS orders × recipe ingredient WAC ──
        // Join pos_order_items → pos_products → recipes → recipe_ingredients → stock_items
        $sql = <<<'SQL'
            SELECT
                pp.id                AS product_id,
                pp.name              AS product_name,
                pp.price             AS price_kobo,
                SUM(oi.quantity)     AS total_qty_sold,
                ri.stock_item_id,
                ri.item_sku,
                ri.item_name,
                ri.quantity_per_yield,
                ri.uom_symbol,
                si.average_cost      AS wac_kobo,
                r.yield_quantity
            FROM pos_order_items oi
            JOIN pos_orders      po  ON po.id = oi.order_id
            JOIN pos_products    pp  ON pp.id = oi.product_id
            JOIN recipes         r   ON r.product_id = pp.id AND r.tenant_id = pp.tenant_id AND r.is_active = 1
            JOIN recipe_ingredients ri ON ri.recipe_id = r.id AND ri.tenant_id = r.tenant_id
            JOIN stock_items     si  ON si.id = ri.stock_item_id
            WHERE po.tenant_id = :tid
              AND po.status    = 'paid'
              AND po.created_at >= :from
              AND po.created_at <= :to
        SQL;

        $params = [
            'tid'  => $tenantId,
            'from' => $dateFrom . ' 00:00:00',
            'to'   => $dateTo   . ' 23:59:59',
        ];

        if ($propertyId) {
            $sql .= ' AND po.property_id = :pid';
            $params['pid'] = $propertyId;
        }

        $sql .= ' GROUP BY pp.id, pp.name, pp.price, ri.stock_item_id, ri.item_sku, ri.item_name, ri.quantity_per_yield, ri.uom_symbol, si.average_cost, r.yield_quantity';

        $rows = $conn->fetchAllAssociative($sql, $params);

        // ── Actual: pos_deduction movement values in range ────────────
        $actualSql = <<<'SQL'
            SELECT COALESCE(SUM(ABS(ml.line_value)), 0) AS actual_kobo
            FROM stock_movement_lines ml
            JOIN stock_movements sm ON sm.id = ml.movement_id
            WHERE sm.tenant_id  = :tid
              AND sm.type       = 'pos_deduction'
              AND sm.movement_date >= :from
              AND sm.movement_date <= :to
        SQL;
        $actualParams = ['tid' => $tenantId, 'from' => $dateFrom . ' 00:00:00', 'to' => $dateTo . ' 23:59:59'];
        if ($propertyId) { $actualSql .= ' AND sm.property_id = :pid'; $actualParams['pid'] = $propertyId; }

        $actualRow    = $conn->fetchAssociative($actualSql, $actualParams);
        $actualKobo   = (int) ($actualRow['actual_kobo'] ?? 0);

        // ── Roll up per product ───────────────────────────────────────
        $byProduct = [];
        foreach ($rows as $row) {
            $pid  = $row['product_id'];
            $sold = (float) $row['total_qty_sold'];
            $yield= (float) $row['yield_quantity'];
            $factor = ($yield > 0) ? ($sold / $yield) : $sold;
            $lineCost = (int) round((float) $row['wac_kobo'] * (float) $row['quantity_per_yield'] * $factor);

            if (!isset($byProduct[$pid])) {
                $byProduct[$pid] = [
                    'product_id'         => $pid,
                    'product_name'       => $row['product_name'],
                    'price_kobo'         => (int) $row['price_kobo'],
                    'total_qty_sold'     => $sold,
                    'theoretical_cost_kobo' => 0,
                    'revenue_kobo'       => (int) round((float) $row['price_kobo'] * $sold),
                    'ingredients'        => [],
                ];
            }
            $byProduct[$pid]['theoretical_cost_kobo'] += $lineCost;
            $byProduct[$pid]['ingredients'][] = [
                'stock_item_id'  => $row['stock_item_id'],
                'item_sku'       => $row['item_sku'],
                'item_name'      => $row['item_name'],
                'qty_used'       => round((float) $row['quantity_per_yield'] * $factor, 4),
                'uom_symbol'     => $row['uom_symbol'],
                'wac_kobo'       => (int) $row['wac_kobo'],
                'line_cost_kobo' => $lineCost,
            ];
        }

        // Add food cost % per product
        foreach ($byProduct as &$p) {
            $p['food_cost_pct'] = ($p['revenue_kobo'] > 0)
                ? round(($p['theoretical_cost_kobo'] / $p['revenue_kobo']) * 100, 2)
                : null;
        }
        unset($p);

        $products     = array_values($byProduct);
        $totalTheory  = array_sum(array_column($products, 'theoretical_cost_kobo'));
        $totalRevenue = array_sum(array_column($products, 'revenue_kobo'));

        return [
            'date_from'                => $dateFrom,
            'date_to'                  => $dateTo,
            'property_id'              => $propertyId,
            'total_theoretical_kobo'   => $totalTheory,
            'total_actual_deducted_kobo' => $actualKobo,
            'variance_kobo'            => $actualKobo - $totalTheory,
            'total_revenue_kobo'       => $totalRevenue,
            'overall_food_cost_pct'    => ($totalRevenue > 0)
                ? round(($totalTheory / $totalRevenue) * 100, 2)
                : null,
            'products'                 => $products,
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────

    /** @return RecipeIngredient[] */
    private function loadIngredients(string $recipeId, string $tenantId): array
    {
        return $this->em->createQueryBuilder()
            ->select('ri')->from(RecipeIngredient::class, 'ri')
            ->where('ri.recipeId = :rid')->andWhere('ri.tenantId = :tid')
            ->setParameter('rid', $recipeId)->setParameter('tid', $tenantId)
            ->orderBy('ri.sortOrder', 'ASC')
            ->getQuery()->getResult();
    }

    private function clearIngredients(string $recipeId, string $tenantId): void
    {
        $this->em->createQuery(
            'DELETE FROM Lodgik\Entity\RecipeIngredient ri WHERE ri.recipeId = :rid AND ri.tenantId = :tid'
        )->execute(['rid' => $recipeId, 'tid' => $tenantId]);
    }

    private function findBalanceForProperty(string $stockItemId, string $tenantId, string $propertyId): ?StockBalance
    {
        return $this->em->createQueryBuilder()
            ->select('b')->from(StockBalance::class, 'b')
            ->join(\Lodgik\Entity\StockLocation::class, 'l', 'WITH', 'l.id = b.locationId')
            ->where('b.stockItemId = :iid')
            ->andWhere('b.tenantId  = :tid')
            ->andWhere('l.propertyId = :pid')
            ->andWhere('l.isActive = true')
            ->setParameter('iid', $stockItemId)
            ->setParameter('tid', $tenantId)
            ->setParameter('pid', $propertyId)
            ->orderBy('b.quantity', 'DESC')
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    private function formatRecipe(Recipe $recipe): array
    {
        $ingredients = array_map(
            fn(RecipeIngredient $ri) => $ri->toArray(),
            $this->loadIngredients($recipe->getId(), $recipe->getTenantId())
        );

        return array_merge($recipe->toArray(), ['ingredients' => $ingredients]);
    }
}
