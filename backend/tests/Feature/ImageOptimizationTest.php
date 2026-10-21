<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImageOptimizationTest extends TestCase
{
    /** A noisy photo-like JPEG: a solid fake image would already be tiny */
    private function photo(int $width, int $height): string
    {
        $image = imagecreatetruecolor($width, $height);
        for ($i = 0; $i < 4000; $i++) {
            $color = imagecolorallocate($image, random_int(0, 255), random_int(0, 255), random_int(0, 255));
            imagefilledellipse($image, random_int(0, $width), random_int(0, $height), random_int(5, 80), random_int(5, 80), $color);
        }
        ob_start();
        imagejpeg($image, null, 98);

        return ob_get_clean();
    }

    public function test_uploaded_gallery_photo_is_scaled_down_in_place()
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $file = UploadedFile::fake()->createWithContent('bride.jpg', $this->photo(3000, 2000));

        $path = $this->post('/api/client-gallery', ['client_name' => 'Test', 'image' => $file])
            ->assertCreated()->json('image_path');

        $this->assertStringEndsWith('.jpg', $path);
        [$width, $height, $type] = getimagesize(Storage::disk('public')->path($path));
        $this->assertSame([1600, 1067, IMAGETYPE_JPEG], [$width, $height, $type]);
        $this->assertLessThan($file->getSize(), Storage::disk('public')->size($path));
    }

    public function test_uploaded_video_is_left_untouched()
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $file = UploadedFile::fake()->createWithContent('reel.mp4', "\x00\x00\x00\x18ftypmp42" . random_bytes(300 * 1024));

        $path = $this->post('/api/client-gallery', ['client_name' => 'Test', 'image' => $file])
            ->assertCreated()->json('image_path');

        $this->assertSame($file->getSize(), Storage::disk('public')->size($path));
    }

    public function test_command_dry_run_then_apply_with_backup_and_is_idempotent()
    {
        Storage::fake('public');
        Storage::fake('local');
        $original = $this->photo(2400, 3200);
        Storage::disk('public')->put('dresses/big.jpg', $original);
        Storage::disk('public')->put('bills/receipt.jpg', $original);

        $this->artisan('images:optimize')->assertSuccessful();
        $this->assertSame(strlen($original), Storage::disk('public')->size('dresses/big.jpg'));

        $this->artisan('images:optimize --apply')->assertSuccessful();
        [$width, $height] = getimagesize(Storage::disk('public')->path('dresses/big.jpg'));
        $this->assertSame([1200, 1600], [$width, $height]);
        $this->assertSame($original, Storage::disk('local')->get('image-originals/dresses/big.jpg'));
        $this->assertSame(strlen($original), Storage::disk('public')->size('bills/receipt.jpg'));

        $optimized = Storage::disk('public')->get('dresses/big.jpg');
        $this->artisan('images:optimize --apply')->expectsOutputToContain('0 photo(s) optimized')->assertSuccessful();
        $this->assertSame($optimized, Storage::disk('public')->get('dresses/big.jpg'));
    }
}
