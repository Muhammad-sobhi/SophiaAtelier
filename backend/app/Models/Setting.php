<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** System-wide key/value settings (e.g. the atelier WhatsApp number) */
class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /** Settings the public website may read */
    public const PUBLIC_KEYS = ['whatsapp_number'];

    public static function get(string $key, ?string $default = null): ?string
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function put(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /** @return array<string, string|null> */
    public static function many(array $keys): array
    {
        $values = static::whereIn('key', $keys)->pluck('value', 'key');

        return collect($keys)->mapWithKeys(fn ($key) => [$key => $values[$key] ?? null])->all();
    }
}
