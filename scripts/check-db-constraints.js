const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../env.local' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    try {
        console.log('🔍 Checking database constraints...');
        
        // Check if table exists and get its structure
        const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'enhancements');
            
        if (tableError) {
            console.error('❌ Error checking table structure:', tableError);
            return;
        }
        
        console.log('📋 Table structure:');
        tableInfo.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
        
        // Check constraints
        const { data: constraints, error: constraintError } = await supabase
            .from('information_schema.check_constraints')
            .select('constraint_name, check_clause')
            .like('constraint_name', '%enhancements%');
            
        if (constraintError) {
            console.error('❌ Error checking constraints:', constraintError);
        } else {
            console.log('🔒 Active constraints:');
            constraints.forEach(constraint => {
                console.log(`  ${constraint.constraint_name}: ${constraint.check_clause}`);
            });
        }
        
        // Test a simple insert to see what error we get
        console.log('🧪 Testing simple insert...');
        const testData = {
            request_id: `TEST-${Date.now()}`,
            request_name: 'Test Request',
            request_description: 'Test Description',
            rationale: 'Test Rationale',
            requestor_name: 'Test User',
            date_of_request: '2024-01-01',
            type_of_request: 'New Feature',
            area_of_product: 'Frontend',
            desire_level: 'High',
            impact_level: 'High',
            who_benefits: 'Suppliers, Admins',
            timeline: '1 month'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('enhancements')
            .insert([testData])
            .select()
            .single();
            
        if (insertError) {
            console.error('❌ Test insert failed:', insertError);
            console.error('Error details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log('✅ Test insert successful:', insertData);
            
            // Clean up test data
            await supabase
                .from('enhancements')
                .delete()
                .eq('id', insertData.id);
            console.log('🧹 Test data cleaned up');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkConstraints();
