// Simple script to add request_id to existing records
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRequestIds() {
    try {
        console.log('Fetching existing enhancements...');
        
        // Get all enhancements without request_id
        const { data: enhancements, error: fetchError } = await supabase
            .from('enhancements')
            .select('id')
            .is('request_id', null);

        if (fetchError) {
            console.error('Error fetching enhancements:', fetchError);
            return;
        }

        if (!enhancements || enhancements.length === 0) {
            console.log('No enhancements found without request_id');
            return;
        }

        console.log(`Found ${enhancements.length} enhancements without request_id`);

        // Update each enhancement with a request_id
        for (const enhancement of enhancements) {
            const requestId = `REQ-${String(enhancement.id).padStart(6, '0')}`;
            
            const { error: updateError } = await supabase
                .from('enhancements')
                .update({ request_id: requestId })
                .eq('id', enhancement.id);

            if (updateError) {
                console.error(`Error updating enhancement ${enhancement.id}:`, updateError);
            } else {
                console.log(`✅ Updated enhancement ${enhancement.id} with request_id: ${requestId}`);
            }
        }

        console.log('✅ Request ID migration completed successfully');

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

addRequestIds();


