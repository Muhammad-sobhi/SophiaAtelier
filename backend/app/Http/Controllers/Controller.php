<?php

namespace App\Http\Controllers;

abstract class Controller
{
    public static function saveReceipt($request, $fieldName = 'receipt')
    {
        return \App\Services\ReceiptStorage::save($request, $fieldName);
    }

    public static function saveReceiptData($data)
    {
        return \App\Services\ReceiptStorage::saveData($data);
    }
}
