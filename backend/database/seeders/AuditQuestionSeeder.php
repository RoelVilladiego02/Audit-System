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
                    'high' => 'No password complexity requirements are in place, creating significant security vulnerabilities',
                    'medium' => 'Basic password requirements exist but may not meet all security best practices',
                    'low' => 'Comprehensive password complexity requirements are properly enforced'
                ]
            ],
            [
                'question' => 'Is multi-factor authentication enabled for all critical systems?',
                'description' => 'Evaluate the implementation of MFA across systems',
                'possible_answers' => ['All systems', 'Most systems', 'Some systems', 'No systems'],
                'risk_criteria' => [
                    'high' => 'Critical systems lack multi-factor authentication protection',
                    'medium' => 'MFA is implemented on some but not all critical systems',
                    'low' => 'Multi-factor authentication is properly implemented across critical systems'
                ]
            ],
            [
                'question' => 'How frequently are security updates applied?',
                'description' => 'Review patch management processes',
                'possible_answers' => ['Within 24 hours', 'Within 1 week', 'Within 1 month', 'Irregular'],
                'risk_criteria' => [
                    'high' => 'Security updates are applied irregularly or with significant delays',
                    'medium' => 'Security updates are applied within a month of release',
                    'low' => 'Security updates are applied promptly within a week of release'
                ]
            ],
            [
                'question' => 'Are backups tested regularly?',
                'description' => 'Assess backup and recovery procedures',
                'possible_answers' => ['Monthly', 'Quarterly', 'Annually', 'Never'],
                'risk_criteria' => [
                    'high' => 'Backups are never tested or verification processes are absent',
                    'medium' => 'Backup testing is conducted annually or quarterly',
                    'low' => 'Regular monthly backup testing and verification is performed'
                ]
            ],
            [
                'question' => 'Is employee security training conducted?',
                'description' => 'Evaluate security awareness programs',
                'possible_answers' => ['Quarterly', 'Annually', 'Ad-hoc', 'Never'],
                'risk_criteria' => [
                    'high' => 'No regular security awareness training program exists',
                    'medium' => 'Security training is conducted annually or on an ad-hoc basis',
                    'low' => 'Regular quarterly security awareness training is conducted'
                ]
            ]
        ];

        foreach ($questions as $questionData) {
            AuditQuestion::create($questionData);
        }
    }
}