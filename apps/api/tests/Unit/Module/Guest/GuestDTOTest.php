<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Guest;

use Lodgik\Module\Guest\DTO\CreateGuestRequest;
use Lodgik\Module\Guest\DTO\UpdateGuestRequest;
use PHPUnit\Framework\TestCase;

final class GuestDTOTest extends TestCase
{
    public function testCreateRequiresFirstName(): void
    {
        $dto = CreateGuestRequest::fromArray(['last_name' => 'Ogundimu']);
        $this->assertArrayHasKey('first_name', $dto->validate());
    }

    public function testCreateRequiresLastName(): void
    {
        $dto = CreateGuestRequest::fromArray(['first_name' => 'Adebayo']);
        $this->assertArrayHasKey('last_name', $dto->validate());
    }

    public function testCreateValidMinimal(): void
    {
        $dto = CreateGuestRequest::fromArray(['first_name' => 'Adebayo', 'last_name' => 'Ogundimu']);
        $this->assertEmpty($dto->validate());
    }

    public function testCreateValidFull(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'Adebayo', 'last_name' => 'Ogundimu',
            'email' => 'adebayo@test.com', 'phone' => '+2348012345678',
            'nationality' => 'Nigerian', 'id_type' => 'national_id',
            'id_number' => 'NIN-12345', 'gender' => 'male',
            'date_of_birth' => '1985-03-15', 'vip_status' => 'gold',
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testCreateRejectsInvalidEmail(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'email' => 'not-an-email',
        ]);
        $this->assertArrayHasKey('email', $dto->validate());
    }

    public function testCreateRejectsInvalidPhone(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'phone' => 'abc',
        ]);
        $this->assertArrayHasKey('phone', $dto->validate());
    }

    public function testCreateAcceptsNigerianPhone(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'phone' => '+2348012345678',
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testCreateRejectsInvalidIdType(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'id_type' => 'invalid_type',
        ]);
        $this->assertArrayHasKey('id_type', $dto->validate());
    }

    public function testCreateRejectsInvalidGender(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'gender' => 'xyz',
        ]);
        $this->assertArrayHasKey('gender', $dto->validate());
    }

    public function testCreateRejectsInvalidVip(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'vip_status' => 'diamond',
        ]);
        $this->assertArrayHasKey('vip_status', $dto->validate());
    }

    public function testCreateRejectsInvalidDate(): void
    {
        $dto = CreateGuestRequest::fromArray([
            'first_name' => 'A', 'last_name' => 'B', 'date_of_birth' => '15-03-1985',
        ]);
        $this->assertArrayHasKey('date_of_birth', $dto->validate());
    }

    public function testUpdateAcceptsPartial(): void
    {
        $dto = UpdateGuestRequest::fromArray(['vip_status' => 'platinum']);
        $this->assertEmpty($dto->validate());
        $this->assertEquals('platinum', $dto->vipStatus);
        $this->assertNull($dto->firstName);
    }

    public function testUpdateRejectsEmptyFirstName(): void
    {
        $dto = UpdateGuestRequest::fromArray(['first_name' => '']);
        $this->assertArrayHasKey('first_name', $dto->validate());
    }

    public function testUpdateRejectsInvalidVip(): void
    {
        $dto = UpdateGuestRequest::fromArray(['vip_status' => 'fake']);
        $this->assertArrayHasKey('vip_status', $dto->validate());
    }
}
