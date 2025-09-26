// Test script to check database structure and submission
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmission() {
    try {
        console.log('Testing database structure...');
        
        // First, let's see what the current table structure looks like
        const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'enhancements');
            
        if (tableError) {
            console.log('Could not get table info, trying direct query...');
        } else {
            console.log('Table structure:', tableInfo);
        }
        
        // Try to get existing records
        const { data: existing, error: fetchError } = await supabase
            .from('enhancements')
            .select('id, request_id')
            .limit(5);
            
        if (fetchError) {
            console.error('Error fetching existing records:', fetchError);
        } else {
            console.log('Existing records:', existing);
        }
        
        // Try a simple insert without request_id first
        console.log('Testing simple insert...');
        const testData = {
            request_name: 'Test Request',
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
            
            // Now try to add request_id
            const requestId = `REQ-${String(insertData.id).padStart(6, '0')}`;
            const { error: updateError } = await supabase
                .from('enhancements')
                .update({ request_id: requestId })
                .eq('id', insertData.id);
                
            if (updateError) {
                console.error('Update error:', updateError);
            } else {
                console.log('Request ID added successfully:', requestId);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSubmission();


