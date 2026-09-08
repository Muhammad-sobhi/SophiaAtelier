<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'admin@atelier.test')->first();
echo 'Check: ' . (\Illuminate\Support\Facades\Hash::check('password123', $user->password) ? 'TRUE' : 'FALSE') . "\n";
