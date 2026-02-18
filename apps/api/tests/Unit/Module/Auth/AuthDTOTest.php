<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Auth;

use Lodgik\Module\Auth\DTO\ForgotPasswordRequest;
use Lodgik\Module\Auth\DTO\LoginRequest;
use Lodgik\Module\Auth\DTO\RegisterRequest;
use Lodgik\Module\Auth\DTO\ResetPasswordRequest;
use PHPUnit\Framework\TestCase;

final class AuthDTOTest extends TestCase
{
    // ─── RegisterRequest ───────────────────────────────────────

    public function testRegisterValidatesRequiredFields(): void
    {
        $dto = RegisterRequest::fromArray([]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('tenant_name', $errors);
        $this->assertArrayHasKey('first_name', $errors);
        $this->assertArrayHasKey('last_name', $errors);
        $this->assertArrayHasKey('email', $errors);
        $this->assertArrayHasKey('password', $errors);
    }

    public function testRegisterValidatesEmail(): void
    {
        $dto = RegisterRequest::fromArray([
            'tenant_name' => 'Test Hotel',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'not-an-email',
            'password' => 'password123',
        ]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('email', $errors);
        $this->assertCount(1, $errors);
    }

    public function testRegisterValidatesPasswordLength(): void
    {
        $dto = RegisterRequest::fromArray([
            'tenant_name' => 'Test Hotel',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@test.com',
            'password' => 'short',
        ]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('password', $errors);
        $this->assertCount(1, $errors);
    }

    public function testRegisterPassesWithValidData(): void
    {
        $dto = RegisterRequest::fromArray([
            'tenant_name' => 'Grand Palace Hotel',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@grandpalace.com',
            'password' => 'securePassword123',
            'phone' => '+2341234567890',
            'property_name' => 'Grand Palace Lagos',
        ]);
        $errors = $dto->validate();

        $this->assertEmpty($errors);
        $this->assertSame('Grand Palace Hotel', $dto->tenantName);
        $this->assertSame('+2341234567890', $dto->phone);
        $this->assertSame('Grand Palace Lagos', $dto->propertyName);
    }

    // ─── LoginRequest ──────────────────────────────────────────

    public function testLoginValidatesRequiredFields(): void
    {
        $dto = LoginRequest::fromArray([]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('email', $errors);
        $this->assertArrayHasKey('password', $errors);
    }

    public function testLoginPassesWithValidData(): void
    {
        $dto = LoginRequest::fromArray([
            'email' => 'john@test.com',
            'password' => 'password123',
        ]);
        $errors = $dto->validate();

        $this->assertEmpty($errors);
    }

    // ─── ForgotPasswordRequest ─────────────────────────────────

    public function testForgotPasswordValidatesEmail(): void
    {
        $dto = ForgotPasswordRequest::fromArray(['email' => 'bad']);
        $errors = $dto->validate();

        $this->assertArrayHasKey('email', $errors);
    }

    public function testForgotPasswordPassesWithValidEmail(): void
    {
        $dto = ForgotPasswordRequest::fromArray(['email' => 'test@example.com']);
        $this->assertEmpty($dto->validate());
    }

    // ─── ResetPasswordRequest ──────────────────────────────────

    public function testResetPasswordValidatesAllFields(): void
    {
        $dto = ResetPasswordRequest::fromArray([]);
        $errors = $dto->validate();

        $this->assertArrayHasKey('token', $errors);
        $this->assertArrayHasKey('email', $errors);
        $this->assertArrayHasKey('password', $errors);
    }

    public function testResetPasswordPassesWithValidData(): void
    {
        $dto = ResetPasswordRequest::fromArray([
            'token' => 'abc123',
            'email' => 'test@example.com',
            'password' => 'newpassword123',
        ]);
        $this->assertEmpty($dto->validate());
    }
}
