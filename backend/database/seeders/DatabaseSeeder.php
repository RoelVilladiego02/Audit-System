<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin if it doesn't exist
        if (!\App\Models\User::where('email', 'admin@admin.com')->exists()) {
            $this->call(AdminSeeder::class);
        }

        $this->call([
            DepartmentSeeder::class,
            AuditQuestionSeeder::class,
            VulnerabilitySubmissionSeeder::class,
            VulnerabilitySeeder::class,
            AuditSubmissionSeeder::class,
        ]);
    }
}