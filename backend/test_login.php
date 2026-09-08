<?php
$ch = curl_init('http://127.0.0.1:8000/api/auth/login');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => 'admin@atelier.test', 'password' => 'password123']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
$res = curl_exec($ch);
echo "STATUS: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "\n";
echo "RESPONSE: " . $res . "\n";
