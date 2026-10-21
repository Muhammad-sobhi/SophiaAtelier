<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // Tests run on an in-memory SQLite database (phpunit.xml), migrated fresh for each test
    use RefreshDatabase;
}
