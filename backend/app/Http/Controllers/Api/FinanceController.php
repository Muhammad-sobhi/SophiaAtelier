<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceTransaction;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function ledger(Request $request)
    {
        $query = FinanceTransaction::query();

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('transaction_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('transaction_date', '<=', $endDate);
        }

        return response()->json($query->orderByDesc('transaction_date')->paginate($request->input('per_page', 30)));
    }
}
