<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Tenant;

use Lodgik\Module\Tenant\DTO\CreatePropertyRequest;
use Lodgik\Module\Tenant\DTO\SaveBankAccountRequest;
use Lodgik\Module\Tenant\DTO\UpdatePropertyRequest;
use Lodgik\Module\Tenant\DTO\UpdateTenantRequest;
use PHPUnit\Framework\TestCase;

final class TenantDTOTest extends TestCase
{
    // ─── UpdateTenantRequest ───────────────────────────────────

    public function testUpdateTenantRejectsEmptyName(): void
    {
        $dto = UpdateTenantRequest::fromArray(['name' => '']);
        $this->assertArrayHasKey('name', $dto->validate());
    }

    public function testUpdateTenantRejectsInvalidColor(): void
    {
        $dto = UpdateTenantRequest::fromArray(['primary_color' => 'red']);
        $this->assertArrayHasKey('primary_color', $dto->validate());
    }

    public function testUpdateTenantAcceptsValidData(): void
    {
        $dto = UpdateTenantRequest::fromArray([
            'name' => 'Updated Hotel',
            'primary_color' => '#1a1a2e',
            'currency' => 'NGN',
        ]);
        $this->assertEmpty($dto->validate());
    }

    // ─── CreatePropertyRequest ─────────────────────────────────

    public function testCreatePropertyRequiresName(): void
    {
        $dto = CreatePropertyRequest::fromArray([]);
        $this->assertArrayHasKey('name', $dto->validate());
    }

    public function testCreatePropertyRejectsInvalidStar(): void
    {
        $dto = CreatePropertyRequest::fromArray(['name' => 'Test', 'star_rating' => 6]);
        $this->assertArrayHasKey('star_rating', $dto->validate());
    }

    public function testCreatePropertyAcceptsValidData(): void
    {
        $dto = CreatePropertyRequest::fromArray([
            'name' => 'Lagos Branch',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'star_rating' => 4,
            'check_in_time' => '14:00',
            'check_out_time' => '12:00',
        ]);
        $this->assertEmpty($dto->validate());
    }

    // ─── UpdatePropertyRequest ─────────────────────────────────

    public function testUpdatePropertyAllowsPartial(): void
    {
        $dto = UpdatePropertyRequest::fromArray(['city' => 'Abuja']);
        $this->assertEmpty($dto->validate());
        $this->assertSame('Abuja', $dto->city);
        $this->assertNull($dto->name);
    }

    // ─── SaveBankAccountRequest ────────────────────────────────

    public function testBankAccountRequiresFields(): void
    {
        $dto = SaveBankAccountRequest::fromArray([]);
        $errors = $dto->validate();
        $this->assertArrayHasKey('bank_name', $errors);
        $this->assertArrayHasKey('account_number', $errors);
        $this->assertArrayHasKey('account_name', $errors);
    }

    public function testBankAccountRejectsInvalidAccountNumber(): void
    {
        $dto = SaveBankAccountRequest::fromArray([
            'bank_name' => 'GTBank',
            'account_number' => '12345',
            'account_name' => 'Test',
        ]);
        $this->assertArrayHasKey('account_number', $dto->validate());
    }

    public function testBankAccountAcceptsValid10Digit(): void
    {
        $dto = SaveBankAccountRequest::fromArray([
            'bank_name' => 'GTBank',
            'account_number' => '0123456789',
            'account_name' => 'Grand Palace Hotel',
            'bank_code' => '058',
            'is_primary' => true,
        ]);
        $this->assertEmpty($dto->validate());
        $this->assertTrue($dto->isPrimary);
    }
}
