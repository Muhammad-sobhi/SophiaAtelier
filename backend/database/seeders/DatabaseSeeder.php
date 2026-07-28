<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Designer;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\Fitting;
use App\Models\Revenue;
use App\Models\Task;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // User
        User::create([
            'name' => 'Studio Admin',
            'email' => 'admin@atelier.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        // Clients
        $clients = Client::insert([
            ['name' => 'سارة الأحمد', 'phone' => '+966501234567', 'email' => 'sara@example.com', 'source' => 'instagram', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'نورة القحطاني', 'phone' => '+966509876543', 'email' => 'noura@example.com', 'source' => 'whatsapp', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ريم الشمري', 'phone' => '+966555555555', 'email' => 'reem@example.com', 'source' => 'referral', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'منال الحربي', 'phone' => '+966566666666', 'email' => 'manal@example.com', 'source' => 'website', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'هدى العتيبي', 'phone' => '+966577777777', 'email' => 'huda@example.com', 'source' => 'walkin', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Categories
        Category::insert([
            ['name' => 'Wedding Dresses', 'name_ar' => 'فساتين زفاف', 'description' => 'Luxury bridal gowns for weddings', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Evening Gowns', 'name_ar' => 'فساتين سهرة', 'description' => 'Elegant evening and gala dresses', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bridesmaid', 'name_ar' => 'فساتين إشبيلا', 'description' => 'Bridesmaid dresses and accessories', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Designers
        $designers = Designer::insert([
            ['name' => 'Elie Saab', 'phone' => '+9611234567', 'email' => 'info@eliesaab.com', 'notes' => 'Lebanese haute couture', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Monique Lhuillier', 'phone' => '+12125551234', 'email' => 'info@moniquelhuillier.com', 'notes' => 'American bridal designer', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Dresses
        Dress::insert([
            ['name' => 'Celestial Rose', 'name_ar' => 'سليستيال روز', 'category_id' => 1, 'designer_id' => 1, 'description' => 'A-line with rose gold embroidery', 'description_ar' => 'فستان بقصة A وتطريز ذهبي وردي فاخر', 'purchase_price' => 8500, 'rental_price' => 1200, 'status' => 'available', 'size' => 'M', 'color' => 'Ivory', 'fabric' => 'Satin', 'fabric_ar' => 'ساتان', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Midnight Bloom', 'name_ar' => 'ميدنايت بلوم', 'category_id' => 1, 'designer_id' => 1, 'description' => 'Ball gown with floral appliques', 'description_ar' => 'فستان منفوش مطرز بزهور بارزة', 'purchase_price' => 12000, 'rental_price' => 1800, 'status' => 'out', 'size' => 'S', 'color' => 'White', 'fabric' => 'Tulle', 'fabric_ar' => 'تول', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Pearl Cascade', 'name_ar' => 'بيرل كاسكيد', 'category_id' => 1, 'designer_id' => 2, 'description' => 'Mermaid silhouette with pearl detailing', 'description_ar' => 'قصة حورية البحر مرصعة باللؤلؤ', 'purchase_price' => 9500, 'rental_price' => 1400, 'status' => 'available', 'size' => 'L', 'color' => 'Champagne', 'fabric' => 'Crepe', 'fabric_ar' => 'كريب', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Velvet Dusk', 'name_ar' => 'فيلفيت دسك', 'category_id' => 2, 'designer_id' => 2, 'description' => 'Floor-length velvet evening gown', 'description_ar' => 'فستان سهرة طويل من المخمل الفاخر', 'purchase_price' => 6000, 'rental_price' => 900, 'status' => 'maintenance', 'size' => 'M', 'color' => 'Burgundy', 'fabric' => 'Velvet', 'fabric_ar' => 'مخمل', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Starlight Sequin', 'name_ar' => 'ستارلايت سيكوين', 'category_id' => 2, 'designer_id' => 1, 'description' => 'Full sequin evening dress', 'description_ar' => 'فستان سهرة لامع بالكامل بالترتر الذهبي', 'purchase_price' => 5500, 'rental_price' => 800, 'status' => 'available', 'size' => 'S', 'color' => 'Gold', 'fabric' => 'Sequined', 'fabric_ar' => 'ترتر', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dusty Petal', 'name_ar' => 'داستي بيتال', 'category_id' => 3, 'designer_id' => 2, 'description' => 'Flowing chiffon bridesmaid dress', 'description_ar' => 'فستان إشبيلا ناعم من الشيفون الانسيابي', 'purchase_price' => 2000, 'rental_price' => 350, 'status' => 'available', 'size' => 'M', 'color' => 'Dusty Rose', 'fabric' => 'Chiffon', 'fabric_ar' => 'شيفون', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Ethereal Mist', 'name_ar' => 'إيثيريال ميست', 'category_id' => 3, 'designer_id' => 1, 'description' => 'Lightweight tulle bridesmaid gown', 'description_ar' => 'فستان إشبيلا خفيف من التول الرقيق', 'purchase_price' => 1800, 'rental_price' => 300, 'status' => 'cleaning', 'size' => 'L', 'color' => 'Sage', 'fabric' => 'Tulle', 'fabric_ar' => 'تول', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Royal Silk', 'name_ar' => 'رويال سيلك', 'category_id' => 1, 'designer_id' => 1, 'description' => 'Silk royal wedding gown', 'description_ar' => 'فستان زفاف ملكي من الحرير الخالص', 'purchase_price' => 15000, 'rental_price' => 2200, 'status' => 'available', 'size' => 'M', 'color' => 'White', 'fabric' => 'Silk', 'fabric_ar' => 'حرير', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Visits
        Visit::insert([
            ['client_id' => 1, 'visit_date' => now()->subDays(10)->toDateString(), 'status' => 'booked', 'source' => 'instagram', 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 2, 'visit_date' => now()->subDays(8)->toDateString(), 'status' => 'done', 'source' => 'whatsapp', 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 3, 'visit_date' => now()->subDays(5)->toDateString(), 'status' => 'arrived', 'source' => 'referral', 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 4, 'visit_date' => now()->subDays(3)->toDateString(), 'status' => 'no_show', 'source' => 'website', 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 5, 'visit_date' => now()->toDateString(), 'status' => 'arrived', 'source' => 'walkin', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Bookings
        Booking::insert([
            ['client_id' => 1, 'dress_id' => 1, 'booking_date' => now()->subDays(9)->toDateString(), 'event_date' => now()->addMonths(2)->toDateString(), 'status' => 'confirmed', 'total_amount' => 1200, 'deposit_amount' => 600, 'insurance_amount' => 200, 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 2, 'dress_id' => 3, 'booking_date' => now()->subDays(7)->toDateString(), 'event_date' => now()->addMonths(3)->toDateString(), 'status' => 'pending', 'total_amount' => 1400, 'deposit_amount' => 500, 'insurance_amount' => 200, 'created_at' => now(), 'updated_at' => now()],
            ['client_id' => 3, 'dress_id' => 2, 'booking_date' => now()->subDays(4)->toDateString(), 'event_date' => now()->addMonth()->toDateString(), 'status' => 'picked_up', 'total_amount' => 1800, 'deposit_amount' => 900, 'insurance_amount' => 300, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Fittings
        Fitting::insert([
            ['booking_id' => 1, 'fitting_date' => now()->subDays(6)->toDateString(), 'measurements' => 'Bust: 90cm, Waist: 70cm, Hips: 95cm', 'sales_associate' => 'Fatima', 'alterations_notes' => null, 'status' => 'completed', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 2, 'fitting_date' => now()->subDays(3)->toDateString(), 'measurements' => 'Bust: 85cm, Waist: 65cm, Hips: 90cm', 'sales_associate' => 'Fatima', 'alterations_notes' => null, 'status' => 'scheduled', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 3, 'fitting_date' => now()->subDays(2)->toDateString(), 'measurements' => 'Bust: 88cm, Waist: 68cm, Hips: 92cm', 'sales_associate' => 'Layla', 'alterations_notes' => 'Hem needs shortening by 3cm', 'status' => 'completed', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 3, 'fitting_date' => now()->addDays(3)->toDateString(), 'measurements' => null, 'sales_associate' => 'Layla', 'alterations_notes' => null, 'status' => 'scheduled', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Tasks
        Task::insert([
            ['booking_id' => 1, 'title' => 'Steam and prep Celestial Rose', 'description' => null, 'type' => 'preparation', 'assigned_to' => 'Layla', 'status' => 'pending', 'due_date' => now()->addDays(5)->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 3, 'title' => 'Hem adjustment for Midnight Bloom', 'description' => 'Shorten hem by 3cm', 'type' => 'alteration', 'assigned_to' => 'Sara', 'status' => 'in_progress', 'due_date' => now()->addDays(2)->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => null, 'title' => 'Deep clean Velvet Dusk', 'description' => null, 'type' => 'cleaning', 'assigned_to' => 'Nora', 'status' => 'pending', 'due_date' => now()->addDay()->toDateString(), 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Employees
        Employee::insert([
            ['name' => 'Fatima Al-Rashid', 'phone' => '+966511111111', 'email' => 'fatima@atelier.test', 'position' => 'Senior Sales Associate', 'salary' => 8000, 'hire_date' => now()->subYears(2)->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Layla Mansour', 'phone' => '+966522222222', 'email' => 'layla@atelier.test', 'position' => 'Seamstress', 'salary' => 6500, 'hire_date' => now()->subYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Sara Nasser', 'phone' => '+966533333333', 'email' => 'sara@atelier.test', 'position' => 'Seamstress', 'salary' => 6500, 'hire_date' => now()->subYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Nora Al-Otaibi', 'phone' => '+966544444444', 'email' => 'nora@atelier.test', 'position' => 'Dress Cleaner', 'salary' => 5000, 'hire_date' => now()->subMonths(8)->toDateString(), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Hana Youssef', 'phone' => '+966555555555', 'email' => 'hana@atelier.test', 'position' => 'Sales Associate', 'salary' => 6000, 'hire_date' => now()->subMonths(6)->toDateString(), 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Revenues
        Revenue::insert([
            ['booking_id' => 1, 'type' => 'deposit', 'amount' => 600, 'payment_method' => 'bank_transfer', 'payment_date' => now()->subDays(9)->toDateString(), 'notes' => 'Deposit for Celestial Rose', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 2, 'type' => 'deposit', 'amount' => 500, 'payment_method' => 'cash', 'payment_date' => now()->subDays(7)->toDateString(), 'notes' => 'Deposit for Pearl Cascade', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 3, 'type' => 'deposit', 'amount' => 900, 'payment_method' => 'credit_card', 'payment_date' => now()->subDays(4)->toDateString(), 'notes' => 'Deposit for Midnight Bloom', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => null, 'type' => 'fitting_fee', 'amount' => 100, 'payment_method' => 'cash', 'payment_date' => now()->subDays(5)->toDateString(), 'notes' => 'Walk-in fitting fee', 'created_at' => now(), 'updated_at' => now()],
            ['booking_id' => 1, 'type' => 'balance', 'amount' => 600, 'payment_method' => 'bank_transfer', 'payment_date' => now()->subDays(1)->toDateString(), 'notes' => 'Remaining balance for Celestial Rose', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Expenses
        Expense::insert([
            ['category' => 'salary', 'amount' => 32000, 'description' => 'Monthly payroll', 'date' => now()->startOfMonth()->toDateString(), 'employee_id' => null, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'cleaning', 'amount' => 500, 'description' => 'Professional dress cleaning service', 'date' => now()->subDays(3)->toDateString(), 'employee_id' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'purchase', 'amount' => 2000, 'description' => 'Sewing supplies and accessories', 'date' => now()->subDays(5)->toDateString(), 'employee_id' => null, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'maintenance', 'amount' => 800, 'description' => 'Studio equipment maintenance', 'date' => now()->subDays(7)->toDateString(), 'employee_id' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->call(WhatsappTemplateSeeder::class);
    }
}
