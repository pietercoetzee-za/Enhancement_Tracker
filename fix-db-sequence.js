// Fix database sequence issue
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSequence() {
    try {
        console.log('Fixing database sequence...');
        
        // Get the current max ID
        const { data: maxId, error: maxIdError } = await supabase
            .from('enhancements')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
            
        if (maxIdError) {
            console.error('Error getting max ID:', maxIdError);
            return;
        }
        
        const currentMaxId = maxId.id;
        console.log('Current max ID:', currentMaxId);
        
        // Reset the sequence to start from the next ID
        const nextId = currentMaxId + 1;
        console.log('Setting sequence to start from:', nextId);
        
        // Use raw SQL to reset the sequence
        const { error: sequenceError } = await supabase.rpc('exec_sql', {
            sql: `SELECT setval('enhancements_id_seq', ${currentMaxId}, true);`
        });
        
        if (sequenceError) {
            console.error('Error resetting sequence:', sequenceError);
            console.log('Trying alternative approach...');
            
            // Alternative: try to insert a dummy record and delete it to advance the sequence
            const { data: dummyData, error: dummyError } = await supabase
                .from('enhancements')
                .insert([{
                    request_name: 'DUMMY_RECORD_FOR_SEQUENCE_FIX',
                    request_description: 'This will be deleted',
                    rationale: 'Sequence fix',
                    requestor_name: 'System',
                    date_of_request: '2024-01-01',
                    type_of_request: 'System',
                    area_of_product: 'System',
                    desire_level: 'Low',
                    impact_level: 'Low',
                    who_benefits: 'System'
                }])
                .select()
                .single();
                
            if (dummyError) {
                console.error('Could not insert dummy record:', dummyError);
            } else {
                console.log('Dummy record created with ID:', dummyData.id);
                
                // Delete the dummy record
                const { error: deleteError } = await supabase
                    .from('enhancements')
                    .delete()
                    .eq('id', dummyData.id);
                    
                if (deleteError) {
                    console.error('Error deleting dummy record:', deleteError);
                } else {
                    console.log('Dummy record deleted, sequence should be fixed');
                }
            }
        } else {
            console.log('Sequence reset successfully');
        }
        
        // Test the fix
        console.log('\nTesting the fix...');
        const testData = {
            request_name: 'Test After Fix ' + Date.now(),
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
            console.error('Insert still failing:', insertError);
        } else {
            console.log('✅ Fix successful! Insert worked with ID:', insertData.id);
            
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
        console.error('Fix failed:', error);
    }
}

fixSequence();
