<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\AuditSubmission;
use Illuminate\Database\Seeder;

class AuditSubmissionSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        $riskLevels = ['low', 'medium', 'high'];
        
        $auditTitles = [
            'Quarterly Security Assessment',
            'Annual Compliance Review',
            'Network Infrastructure Audit',
            'Access Control Review',
            'Data Protection Audit',
            'Incident Response Assessment',
            'Third-Party Vendor Review',
            'Employee Security Training Audit',
            'Physical Security Assessment',
            'Business Continuity Plan Review'
        ];

        // Create 20 sample audit submissions
        for ($i = 0; $i < 20; $i++) {
            $overallRisk = $riskLevels[array_rand($riskLevels)];

            AuditSubmission::create([
                'user_id' => $users->random()->id,
                'title' => $auditTitles[array_rand($auditTitles)] . ' - ' . fake()->year(),
                'overall_risk' => $overallRisk,
                'created_at' => fake()->dateTimeBetween('-6 months', 'now'),
                'updated_at' => fake()->dateTimeBetween('-6 months', 'now'),
            ]);
        }
    }
}