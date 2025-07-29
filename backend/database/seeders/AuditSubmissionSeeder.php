<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\AuditSubmission;
use App\Models\AuditQuestion;
use App\Models\AuditAnswer;
use Illuminate\Database\Seeder;

class AuditSubmissionSeeder extends Seeder
{
    public function run(): void
    {
        // Get all regular users and admin user
        $users = User::where('role', 'user')->get();
        $admin = User::where('role', 'admin')->first();
        $questions = AuditQuestion::all();
        $riskLevels = ['low', 'medium', 'high'];
        $statuses = ['draft', 'submitted', 'under_review', 'completed'];
        
        $auditTitles = [
            'Quarterly Security Assessment',
            'Annual Compliance Review',
            'Network Infrastructure Audit',
            'Application Security Review',
            'Data Protection Audit',
            'Cloud Security Assessment',
            'Access Control Review',
            'Security Policy Compliance Check',
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
                'user_id' => (int)$users->random()->id,
                'title' => $auditTitles[array_rand($auditTitles)] . ' - ' . fake()->year(),
                'system_overall_risk' => $systemRisk,
                'status' => $status,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            // Create answers for each question
            foreach ($questions as $question) {
                AuditAnswer::create([
                    'audit_submission_id' => $submission->id,
                    'audit_question_id' => $question->id,
                    'answer' => fake()->paragraph(),
                    'system_risk_level' => $riskLevels[array_rand($riskLevels)],
                    'recommendation' => fake()->paragraph(),
                    'status' => 'pending',
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            // If status is completed, add review details
            if ($status === 'completed') {
                $reviewedAt = fake()->dateTimeBetween($createdAt, 'now');
                $submission->update([
                    'admin_overall_risk' => $riskLevels[array_rand($riskLevels)],
                    'reviewed_by' => (int)$admin->id,
                    'reviewed_at' => $reviewedAt,
                    'admin_summary' => fake()->paragraph(),
                    'updated_at' => $reviewedAt
                ]);
            }
        }
    }
}