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
                'question' => 'Has a detailed inventory of all physical devices been created?',
                'description' => 'Assess the completeness of physical device inventory',
                'category' => 'Inventory Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are model numbers, serial numbers, and locations for future reference recorded?',
                'description' => 'Evaluate the documentation of device details',
                'category' => 'Inventory Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have the conditions of each device been assessed, and any physical damage or wear noted?',
                'description' => 'Assess the evaluation of device conditions',
                'category' => 'Inventory Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Has the current network setup, including configurations for routers, switches, and firewalls, been documented for configuration management?',
                'description' => 'Evaluate network configuration documentation',
                'category' => 'Configuration Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are network device configurations regularly backed up?',
                'description' => 'Assess backup practices for network configurations',
                'category' => 'Configuration Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Do network configurations adhere to industry best practices for security and performance?',
                'description' => 'Evaluate adherence to network configuration standards',
                'category' => 'Configuration Management',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Has the effectiveness of network security measures, such as firewalls, intrusion detection systems, and encryption protocols, been reviewed and validated?',
                'description' => 'Assess network security measure effectiveness',
                'category' => 'Security Protocols',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have penetration tests been conducted to evaluate the strength of the network against potential attacks?',
                'description' => 'Evaluate penetration testing practices',
                'category' => 'Security Protocols',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have security protocols been updated in accordance with new threats and vulnerabilities as they emerge?',
                'description' => 'Assess updates to security protocols',
                'category' => 'Security Protocols',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have user training programs related to IT systems and software been evaluated for availability and effectiveness?',
                'description' => 'Assess IT training program availability and effectiveness',
                'category' => 'Training Programs',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are training materials up-to-date and accessible to all relevant staff?',
                'description' => 'Evaluate accessibility and currency of training materials',
                'category' => 'Training Programs',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is participation and feedback from users being monitored to continually improve training offerings?',
                'description' => 'Assess monitoring of training participation and feedback',
                'category' => 'Training Programs',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have access controls been checked to ensure only authorized personnel can access sensitive data?',
                'description' => 'Evaluate access control measures for sensitive data',
                'category' => 'Access Controls',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have user access rights been reviewed to align with job roles and responsibilities?',
                'description' => 'Assess alignment of access rights with roles',
                'category' => 'Access Controls',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have accounts of offboarded users been cleared?',
                'description' => 'Evaluate account management for offboarded users',
                'category' => 'Access Controls',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have security measures, including antivirus, antimalware, and firewalls, been confirmed to be activated and up-to-date?',
                'description' => 'Assess activation and currency of security measures',
                'category' => 'Security Measures',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have security settings been reviewed to ensure compliance with the organization\'s security policy?',
                'description' => 'Evaluate compliance of security settings',
                'category' => 'Security Measures',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have vulnerability scans been conducted to detect potential software security weaknesses?',
                'description' => 'Assess vulnerability scanning practices',
                'category' => 'Security Measures',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Has a review confirmed that all required documentation, such as policies, procedures, and compliance reports, is complete, up-to-date, and stored securely?',
                'description' => 'Evaluate completeness and security of documentation',
                'category' => 'Documentation Review',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is documentation easily accessible to authorized personnel, especially in the event of an audit?',
                'description' => 'Assess accessibility of documentation for audits',
                'category' => 'Documentation Review',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Is documentation being regularly updated to reflect any changes in regulations or business operations?',
                'description' => 'Evaluate currency of documentation',
                'category' => 'Documentation Review',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Have checks been made to verify that IT policies, including those related to data protection, acceptable use, and security, are being actively enforced?',
                'description' => 'Assess enforcement of IT policies',
                'category' => 'Policy Enforcement',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are internal audits conducted to ensure adherence to these policies?',
                'description' => 'Evaluate internal audit practices for policy adherence',
                'category' => 'Policy Enforcement',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
                ],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Are regular policy training and updates being provided for the team?',
                'description' => 'Assess provision of policy training and updates',
                'category' => 'Policy Enforcement',
                'possible_answers' => ['Yes', 'No', 'N/A', 'Others'],
                'risk_criteria' => [
                    'high' => ['No'],
                    'medium' => ['N/A'],
                    'low' => ['Yes']
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