<?php

declare(strict_types=1);

namespace Lodgik\Helper;

use Ramsey\Uuid\Uuid;

final class UuidHelper
{
    /**
     * Generate a new UUID v4 string.
     */
    public static function generate(): string
    {
        return Uuid::uuid4()->toString();
    }

    /**
     * Validate a UUID string.
     */
    public static function isValid(string $uuid): bool
    {
        return Uuid::isValid($uuid);
    }
}
