<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Each loan writes one "loan" expense (finance page); link them so edits / deletes of the loan reach the expense
        Schema::table('employee_loans', function (Blueprint $table) {
            $table->foreignId('expense_id')->nullable()->after('employee_id')->constrained()->nullOnDelete();
        });

        // Backfill: link loans to loan expenses with the same employee + amount + date.
        // A group is linked only when its loans and expenses are equal in count (usually 1:1);
        // identical rows are interchangeable, so they are paired in id order. Anything ambiguous stays unlinked.
        $groups = DB::table('employee_loans')->whereNull('expense_id')->orderBy('id')->get(['id', 'employee_id', 'amount', 'date'])
            ->groupBy(fn ($loan) => $loan->employee_id . '|' . $loan->amount . '|' . $loan->date);

        foreach ($groups as $loans) {
            $first = $loans->first();
            $expenseIds = DB::table('expenses')
                ->where('category', 'loan')
                ->where('employee_id', $first->employee_id)
                ->where('amount', $first->amount)
                ->whereDate('date', $first->date)
                ->whereNotIn('id', DB::table('employee_loans')->whereNotNull('expense_id')->select('expense_id'))
                ->orderBy('id')
                ->pluck('id');

            if ($expenseIds->count() !== $loans->count()) {
                continue;
            }

            foreach ($loans->values() as $i => $loan) {
                DB::table('employee_loans')->where('id', $loan->id)->update(['expense_id' => $expenseIds[$i]]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('expense_id');
        });
    }
};
