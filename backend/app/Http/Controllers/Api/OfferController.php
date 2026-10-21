<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OfferController extends Controller
{
    private const PUBLIC_CACHE_KEY = 'public_offers';

    public function index(): JsonResponse
    {
        $offers = Offer::with('dresses:id')
            ->withCount('bookings')
            ->withSum('bookings as discount_total', 'discount_amount')
            ->orderByDesc('starts_at')->orderByDesc('id')->get();

        return response()->json($offers->map(fn (Offer $offer) => $this->present($offer)));
    }

    /** Running offers for the website: labels and covered dress ids only, never prices */
    public function publicIndex(): JsonResponse
    {
        $offers = Cache::remember(self::PUBLIC_CACHE_KEY, 300, function () {
            return Offer::running()->orderByDesc('starts_at')->orderByDesc('id')->get()
                ->map(fn (Offer $offer) => [
                    'id' => $offer->id,
                    'name' => $offer->name,
                    'name_ar' => $offer->name_ar,
                    'type' => $offer->type,
                    'value' => $offer->type === 'perk' ? null : (float) $offer->value,
                    'perk' => $offer->perk,
                    'perk_ar' => $offer->perk_ar,
                    'banner_text' => $offer->banner_text,
                    'banner_text_ar' => $offer->banner_text_ar,
                    'ends_at' => $offer->ends_at->toDateString(),
                    'dress_ids' => $offer->coveredDressIds(),
                ])->values()->all();
        });

        return response()->json($offers);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOffer($request);

        $offer = DB::transaction(function () use ($validated) {
            $offer = Offer::create($validated['attributes']);
            $offer->dresses()->sync($validated['dress_ids']);

            return $offer;
        });
        Cache::forget(self::PUBLIC_CACHE_KEY);

        return response()->json($this->present($offer), 201);
    }

    public function show(Offer $offer): JsonResponse
    {
        return response()->json($this->present($offer));
    }

    public function update(Request $request, Offer $offer): JsonResponse
    {
        $validated = $this->validateOffer($request, $offer);

        DB::transaction(function () use ($offer, $validated) {
            $offer->update($validated['attributes']);
            $offer->dresses()->sync($validated['dress_ids']);
        });
        Cache::forget(self::PUBLIC_CACHE_KEY);

        return response()->json($this->present($offer));
    }

    public function destroy(Offer $offer): JsonResponse
    {
        $offer->delete();
        Cache::forget(self::PUBLIC_CACHE_KEY);

        return response()->json(['message' => 'تم حذف العرض']);
    }

    /**
     * Validates a full offer. On update the sent fields are laid over the saved offer,
     * so a partial payload (e.g. only is_active) is checked as a whole offer.
     *
     * @return array{attributes: array<string, mixed>, dress_ids: array<int, int>}
     */
    private function validateOffer(Request $request, ?Offer $offer = null): array
    {
        $current = $offer ? [
            ...$offer->only($offer->getFillable()),
            'starts_at' => $offer->starts_at?->toDateString(),
            'ends_at' => $offer->ends_at?->toDateString(),
            'dress_ids' => $offer->dresses()->pluck('dresses.id')->all(),
        ] : [];
        $input = array_merge($current, $request->only([...(new Offer)->getFillable(), 'dress_ids']));

        $data = Validator::make($input, [
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(Offer::TYPES)],
            'value' => [
                'nullable', 'numeric', 'gt:0', 'required_unless:type,perk',
                Rule::when(($input['type'] ?? null) === 'percentage', 'max:100'),
            ],
            'perk' => 'nullable|string|max:255',
            'perk_ar' => 'nullable|string|max:255|required_if:type,perk',
            'scope' => ['required', Rule::in(Offer::SCOPES)],
            'scope_id' => [
                'nullable', 'integer', 'required_if:scope,category,collection',
                Rule::when(($input['scope'] ?? null) === 'category', 'exists:categories,id'),
                Rule::when(($input['scope'] ?? null) === 'collection', 'exists:collections,id'),
            ],
            'dress_ids' => 'nullable|array|required_if:scope,dresses',
            'dress_ids.*' => 'integer|distinct|exists:dresses,id',
            'banner_text' => 'nullable|string|max:255',
            'banner_text_ar' => 'nullable|string|max:255',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after_or_equal:starts_at',
            'is_active' => 'boolean',
        ], [
            'value.required_unless' => 'اكتبي قيمة الخصم',
            'value.max' => 'النسبة لا تزيد عن 100%',
            'perk_ar.required_if' => 'اكتبي الميزة المجانية بالعربي',
            'scope_id.required_if' => 'اختاري الفئة أو التشكيلة',
            'dress_ids.required_if' => 'اختاري فستانًا واحدًا على الأقل',
            'ends_at.after_or_equal' => 'تاريخ النهاية لازم يكون بعد البداية',
        ])->validate();

        $scope = $data['scope'];
        $attributes = collect($data)->except('dress_ids')->all();
        $attributes['value'] = $data['type'] === 'perk' ? null : $data['value'];
        $attributes['scope_id'] = in_array($scope, ['category', 'collection'], true) ? $data['scope_id'] : null;

        return [
            'attributes' => $attributes,
            'dress_ids' => $scope === 'dresses' ? array_values($data['dress_ids'] ?? []) : [],
        ];
    }

    /** @return array<string, mixed> */
    private function present(Offer $offer): array
    {
        $offer->loadMissing('dresses:id');
        if (! array_key_exists('bookings_count', $offer->getAttributes())) {
            $offer->loadCount('bookings')->loadSum('bookings as discount_total', 'discount_amount');
        }

        return [
            ...$offer->makeHidden('dresses')->toArray(),
            'dress_ids' => $offer->dresses->pluck('id')->all(),
            'bookings_count' => (int) $offer->bookings_count,
            'discount_total' => round((float) $offer->discount_total, 2),
        ];
    }
}
