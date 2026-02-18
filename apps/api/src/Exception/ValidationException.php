<?php

declare(strict_types=1);

namespace Lodgik\Exception;

use RuntimeException;

final class ValidationException extends RuntimeException
{
    /**
     * @param array<string, string|array> $errors
     */
    public function __construct(
        string $message = 'Validation failed',
        private readonly array $errors = [],
    ) {
        parent::__construct($message, 422);
    }

    /**
     * @return array<string, string|array>
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
