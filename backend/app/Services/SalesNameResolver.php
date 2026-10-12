<?php

namespace App\Services;

use App\Models\Employee;

/**
 * Maps any spelling of a sales person's name (employee name or one of its sales_aliases)
 * to the employee name as saved on the employees page.
 * Matching ignores case, extra spaces and common Arabic letter variants (أ/إ/آ/ا, ى/ي, ة/ه).
 */
class SalesNameResolver
{
    /** sale-name columns per table, shared by the merge command */
    public const COLUMNS = [
        'bookings' => ['sales_name', 'pickup_sales_name', 'return_sales_name'],
        'fittings' => ['sales_name', 'sales_associate'],
        'visits' => ['sales_name'],
    ];

    private ?array $map = null;

    public static function key(string $name): string
    {
        $name = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $name)));
        return strtr($name, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ى' => 'ي', 'ة' => 'ه']);
    }

    /** Employee name for this spelling, or null when no employee matches */
    public function resolve(?string $name): ?string
    {
        if ($name === null || trim($name) === '') return null;
        return $this->map()[self::key($name)] ?? null;
    }

    /** Employee name when matched, otherwise the original text */
    public function normalize(?string $name): ?string
    {
        return $this->resolve($name) ?? $name;
    }

    private function map(): array
    {
        if ($this->map !== null) return $this->map;

        $this->map = [];
        $employees = Employee::select('id', 'name', 'sales_aliases')->orderBy('id')->get();
        // Real names win over aliases, so an alias can never hijack another employee's name
        foreach ($employees as $employee) {
            $this->map[self::key($employee->name)] ??= $employee->name;
        }
        foreach ($employees as $employee) {
            foreach ($employee->sales_aliases ?? [] as $alias) {
                if (is_string($alias) && trim($alias) !== '') {
                    $this->map[self::key($alias)] ??= $employee->name;
                }
            }
        }
        return $this->map;
    }
}
