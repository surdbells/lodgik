<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Staff;

use Lodgik\Module\Staff\DTO\InviteStaffRequest;
use Lodgik\Module\Staff\DTO\UpdateStaffRequest;
use PHPUnit\Framework\TestCase;

final class StaffDTOTest extends TestCase
{
    public function testInviteValidatesRequired(): void
    {
        $dto = InviteStaffRequest::fromArray([]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('first_name', $errors);
        $this->assertArrayHasKey('last_name', $errors);
        $this->assertArrayHasKey('email', $errors);
        $this->assertArrayHasKey('role', $errors);
    }

    public function testInviteRejectsSuperAdmin(): void
    {
        $dto = InviteStaffRequest::fromArray([
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'a@b.com',
            'role' => 'super_admin',
        ]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('role', $errors);
        $this->assertStringContainsString('Cannot invite', $errors['role']);
    }

    public function testInviteRejectsInvalidRole(): void
    {
        $dto = InviteStaffRequest::fromArray([
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'a@b.com',
            'role' => 'ceo',
        ]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('role', $errors);
    }

    public function testInvitePassesWithValidData(): void
    {
        $dto = InviteStaffRequest::fromArray([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@hotel.com',
            'role' => 'front_desk',
            'phone' => '+234123456',
            'property_id' => 'prop-1',
        ]);

        $this->assertEmpty($dto->validate());
        $this->assertSame('front_desk', $dto->role);
        $this->assertSame('prop-1', $dto->propertyId);
    }

    public function testUpdateAllowsPartial(): void
    {
        $dto = UpdateStaffRequest::fromArray(['first_name' => 'Updated']);
        $this->assertEmpty($dto->validate());
        $this->assertSame('Updated', $dto->firstName);
        $this->assertNull($dto->role);
        $this->assertNull($dto->isActive);
    }

    public function testUpdateRejectsSuperAdmin(): void
    {
        $dto = UpdateStaffRequest::fromArray(['role' => 'super_admin']);
        $errors = $dto->validate();
        $this->assertArrayHasKey('role', $errors);
    }

    public function testUpdateRejectsEmptyFirstName(): void
    {
        $dto = UpdateStaffRequest::fromArray(['first_name' => '']);
        $errors = $dto->validate();
        $this->assertArrayHasKey('first_name', $errors);
    }
}
