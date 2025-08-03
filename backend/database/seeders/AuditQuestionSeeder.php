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
                'category' => 'Access Control',
                'possible_answers' => ['Yes, fully implemented', 'Partially implemented', 'No policy in place', 'Others'],
                'risk_criteria' => [
                    'high' => ['No policy in place'],
                    'medium' => ['Partially implemented'],
                    'low' => ['Yes, fully implemented']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is multi-factor authentication enabled for all critical systems?',
                'description' => 'Evaluate the implementation of MFA across systems',
                'category' => 'Access Control',
                'possible_answers' => ['All systems', 'Most systems', 'Some systems', 'No systems', 'Others'],
                'risk_criteria' => [
                    'high' => ['No systems'],
                    'medium' => ['Some systems', 'Most systems'],
                    'low' => ['All systems']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How frequently are security updates applied?',
                'description' => 'Review patch management processes',
                'category' => 'System Security',
                'possible_answers' => ['Within 24 hours', 'Within 1 week', 'Within 1 month', 'Irregular', 'Others'],
                'risk_criteria' => [
                    'high' => ['Irregular'],
                    'medium' => ['Within 1 month'],
                    'low' => ['Within 24 hours', 'Within 1 week']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are backups tested regularly?',
                'description' => 'Assess backup and recovery procedures',
                'category' => 'Data Protection',
                'possible_answers' => ['Monthly', 'Quarterly', 'Annually', 'Never', 'Others'],
                'risk_criteria' => [
                    'high' => ['Never'],
                    'medium' => ['Annually', 'Quarterly'],
                    'low' => ['Monthly']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is employee security training conducted?',
                'description' => 'Evaluate security awareness programs',
                'category' => 'Security Training',
                'possible_answers' => ['Quarterly', 'Annually', 'Ad-hoc', 'Never', 'Others'],
                'risk_criteria' => [
                    'high' => ['Never'],
                    'medium' => ['Annually', 'Ad-hoc'],
                    'low' => ['Quarterly']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Do you have an incident response plan in place?',
                'description' => 'Assess incident response preparedness',
                'category' => 'Incident Management',
                'possible_answers' => ['Comprehensive plan with regular testing', 'Basic plan exists', 'Plan exists but not tested', 'No plan', 'Others'],
                'risk_criteria' => [
                    'high' => ['No plan'],
                    'medium' => ['Plan exists but not tested', 'Basic plan exists'],
                    'low' => ['Comprehensive plan with regular testing']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are network access controls implemented?',
                'description' => 'Evaluate network segmentation and access controls',
                'category' => 'Network Security',
                'possible_answers' => ['Comprehensive controls', 'Basic controls', 'Limited controls', 'No controls', 'Others'],
                'risk_criteria' => [
                    'high' => ['No controls'],
                    'medium' => ['Limited controls', 'Basic controls'],
                    'low' => ['Comprehensive controls']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How often do you conduct security assessments?',
                'description' => 'Review frequency of security evaluations',
                'category' => 'Security Assessment',
                'possible_answers' => ['Quarterly', 'Semi-annually', 'Annually', 'Ad-hoc', 'Never', 'Others'],
                'risk_criteria' => [
                    'high' => ['Never'],
                    'medium' => ['Ad-hoc', 'Annually'],
                    'low' => ['Quarterly', 'Semi-annually']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is data encryption implemented for sensitive information?',
                'description' => 'Assess data protection through encryption',
                'category' => 'Data Protection',
                'possible_answers' => ['All sensitive data encrypted', 'Most data encrypted', 'Some data encrypted', 'No encryption', 'Others'],
                'risk_criteria' => [
                    'high' => ['No encryption'],
                    'medium' => ['Some data encrypted', 'Most data encrypted'],
                    'low' => ['All sensitive data encrypted']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Do you maintain an inventory of all IT assets?',
                'description' => 'Evaluate asset management practices',
                'category' => 'Asset Management',
                'possible_answers' => ['Complete and up-to-date inventory', 'Partial inventory', 'Outdated inventory', 'No inventory', 'Others'],
                'risk_criteria' => [
                    'high' => ['No inventory'],
                    'medium' => ['Outdated inventory', 'Partial inventory'],
                    'low' => ['Complete and up-to-date inventory']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Clear existing questions first (optional - remove if you want to keep existing data)
        // AuditQuestion::truncate();

        foreach ($questions as $questionData) {
            AuditQuestion::create($questionData);
        }
    }
}