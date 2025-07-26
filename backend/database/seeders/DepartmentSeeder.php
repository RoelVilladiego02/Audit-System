<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            'IT Security',
            'Human Resources',
            'Finance',
            'Operations',
            'Legal',
            'Research & Development',
            'Customer Service',
            'Marketing',
            'Sales',
            'Infrastructure'
        ];

        foreach ($departments as $department) {
            Department::create(['name' => $department]);
        }
    }
}
