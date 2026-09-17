<?php
$content = file_get_contents('storage/logs/laravel.log');
preg_match_all('/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\].*?Stack trace:/s', $content, $matches);
echo end($matches[0]);
