<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'admin@atelier.test')->first();
$user->password = 'password123';
$user->save();

echo "Password reset to password123 successfully.\n";
