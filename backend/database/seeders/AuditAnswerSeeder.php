<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\AuditAnswer;
use App\Models\AuditQuestion;
use App\Models\AuditSubmission;
use Illuminate\Database\Seeder;

class AuditAnswerSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $questions = AuditQuestion::all();
        $submissions = AuditSubmission::all();
        $riskLevels = ['low', 'medium', 'high'];

        foreach ($submissions as $submission) {
            foreach ($questions as $question) {
                $possibleAnswers = $question->possible_answers;
                $answer = $possibleAnswers[array_rand($possibleAnswers)];
                
                // Create base answer
                $auditAnswer = AuditAnswer::create([
                    'audit_submission_id' => (int)$submission->id,
                    'audit_question_id' => (int)$question->id,
                    'answer' => $answer,
                    'system_risk_level' => $riskLevels[array_rand($riskLevels)],
                    'status' => $submission->status === 'completed' ? 'reviewed' : 'pending',
                    'recommendation' => 'Review required to address potential security concerns.',
                    'created_at' => $submission->created_at,
                ]);

                // If submission is completed, add review details
                if ($submission->status === 'completed') {
                    $auditAnswer->update([
                        'admin_risk_level' => $riskLevels[array_rand($riskLevels)],
                        'reviewed_by' => (int)$admin->id,
                        'reviewed_at' => $submission->reviewed_at,
                        'admin_notes' => fake()->paragraph(),
                        'recommendation' => fake()->paragraph(),
                        'updated_at' => $submission->reviewed_at
                    ]);
                }
            }
        }
    }
}
