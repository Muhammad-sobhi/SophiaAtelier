<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/storage/{path}', \App\Http\Controllers\StorageFileController::class)->where('path', '.*');
