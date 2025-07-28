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
        $statuses = ['draft', 'submitted', 'under_review', 'completed'];
        
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

        $admin = User::where('role', 'admin')->first();

        // Create 20 sample audit submissions
        for ($i = 0; $i < 20; $i++) {
            $status = $statuses[array_rand($statuses)];
            $systemRisk = $riskLevels[array_rand($riskLevels)];
            $createdAt = fake()->dateTimeBetween('-6 months', 'now');
            
            $submission = AuditSubmission::create([
                'user_id' => $users->random()->id,
                'title' => $auditTitles[array_rand($auditTitles)] . ' - ' . fake()->year(),
                'system_overall_risk' => $systemRisk,
                'status' => $status,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            // If status is completed, add review details
            if ($status === 'completed') {
                $reviewedAt = fake()->dateTimeBetween($createdAt, 'now');
                $submission->update([
                    'admin_overall_risk' => $riskLevels[array_rand($riskLevels)],
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => $reviewedAt,
                    'admin_summary' => fake()->paragraph(),
                    'updated_at' => $reviewedAt
                ]);
            }
        }
    }
}