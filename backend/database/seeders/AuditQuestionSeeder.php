<?php

namespace Database\Seeders;

use App\Models\AuditQuestion;
use Illuminate\Database\Seeder;

class AuditQuestionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            [
                'question' => 'Are passwords required to meet complexity requirements?',
                'description' => 'Assess the strength of password policies in the organization',
                'possible_answers' => ['Yes, fully implemented', 'Partially implemented', 'No policy in place'],
                'risk_criteria' => [
                    'Yes, fully implemented' => 'low',
                    'Partially implemented' => 'medium',
                    'No policy in place' => 'high'
                ]
            ],
            [
                'question' => 'Is multi-factor authentication enabled for all critical systems?',
                'description' => 'Evaluate the implementation of MFA across systems',
                'possible_answers' => ['All systems', 'Most systems', 'Some systems', 'No systems'],
                'risk_criteria' => [
                    'All systems' => 'low',
                    'Most systems' => 'low',
                    'Some systems' => 'medium',
                    'No systems' => 'high'
                ]
            ],
            [
                'question' => 'How frequently are security updates applied?',
                'description' => 'Review patch management processes',
                'possible_answers' => ['Within 24 hours', 'Within 1 week', 'Within 1 month', 'Irregular'],
                'risk_criteria' => [
                    'Within 24 hours' => 'low',
                    'Within 1 week' => 'low',
                    'Within 1 month' => 'medium',
                    'Irregular' => 'high'
                ]
            ],
            [
                'question' => 'Are backups tested regularly?',
                'description' => 'Assess backup and recovery procedures',
                'possible_answers' => ['Monthly', 'Quarterly', 'Annually', 'Never'],
                'risk_criteria' => [
                    'Monthly' => 'low',
                    'Quarterly' => 'medium',
                    'Annually' => 'medium',
                    'Never' => 'high'
                ]
            ],
            [
                'question' => 'Is employee security training conducted?',
                'description' => 'Evaluate security awareness programs',
                'possible_answers' => ['Quarterly', 'Annually', 'Ad-hoc', 'Never'],
                'risk_criteria' => [
                    'Quarterly' => 'low',
                    'Annually' => 'medium',
                    'Ad-hoc' => 'medium',
                    'Never' => 'high'
                ]
            ]
        ];

        foreach ($questions as $questionData) {
            AuditQuestion::create($questionData);
        }
    }
}