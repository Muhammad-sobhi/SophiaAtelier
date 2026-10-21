<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;

/**
 * An action a service refuses (no open visit, dress not available, slot taken...).
 * Rendered as the JSON body the dashboard and the website already expect.
 */
class ActionRejected extends \RuntimeException
{
    public function __construct(private array $payload, private int $status = 422)
    {
        parent::__construct($payload['message'] ?? $payload['error'] ?? 'Action rejected');
    }

    /** An expected answer to the user, not an error to log */
    public function report(): void
    {
    }

    public function render(): JsonResponse
    {
        return response()->json($this->payload, $this->status);
    }
}
