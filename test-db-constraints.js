// Test database constraints and ID generation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConstraints() {
    try {
        console.log('Testing database constraints...');
        
        // Check current table structure
        const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'enhancements')
            .order('ordinal_position');
            
        if (columnError) {
            console.log('Could not get column info directly, trying alternative...');
        } else {
            console.log('Table columns:', columns);
        }
        
        // Check existing records and their IDs
        const { data: existing, error: fetchError } = await supabase
            .from('enhancements')
            .select('id, request_id')
            .order('id', { ascending: false })
            .limit(10);
            
        if (fetchError) {
            console.error('Error fetching records:', fetchError);
        } else {
            console.log('Existing records (last 10):', existing);
        }
        
        // Try to get the next ID that would be generated
        const { data: maxId, error: maxIdError } = await supabase
            .from('enhancements')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
            
        if (maxIdError) {
            console.error('Error getting max ID:', maxIdError);
        } else {
            console.log('Max existing ID:', maxId?.id);
            console.log('Next ID would be:', (maxId?.id || 0) + 1);
        }
        
        // Test a simple insert
        console.log('\nTesting simple insert...');
        const testData = {
            request_name: 'Test Request ' + Date.now(),
            request_description: 'Test Description',
            rationale: 'Test Rationale',
            requestor_name: 'Test User',
            date_of_request: '2024-01-01',
            type_of_request: 'Feature',
            area_of_product: 'Frontend',
            desire_level: 'High',
            impact_level: 'High',
            who_benefits: 'Users'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('enhancements')
            .insert([testData])
            .select()
            .single();
            
        if (insertError) {
            console.error('Insert error:', insertError);
        } else {
            console.log('Insert successful:', insertData);
            
            // Clean up test record
            const { error: deleteError } = await supabase
                .from('enhancements')
                .delete()
                .eq('id', insertData.id);
                
            if (deleteError) {
                console.error('Error deleting test record:', deleteError);
            } else {
                console.log('Test record cleaned up');
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testDatabaseConstraints();
