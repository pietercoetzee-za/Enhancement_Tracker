// Script to add request_id field to existing Supabase table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRequestIdField() {
    try {
        console.log('Adding request_id field to enhancements table...');
        
        // Add the request_id column
        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE enhancements 
                ADD COLUMN IF NOT EXISTS request_id VARCHAR(20) UNIQUE;
            `
        });

        if (alterError) {
            console.error('Error adding request_id column:', alterError);
            return;
        }

        console.log('✅ request_id column added successfully');

        // Generate request IDs for existing records
        console.log('Generating request IDs for existing records...');
        
        const { data: enhancements, error: fetchError } = await supabase
            .from('enhancements')
            .select('id')
            .is('request_id', null);

        if (fetchError) {
            console.error('Error fetching enhancements:', fetchError);
            return;
        }

        if (enhancements && enhancements.length > 0) {
            console.log(`Found ${enhancements.length} records without request_id`);
            
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
        }

        console.log('✅ Request ID migration completed successfully');

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

addRequestIdField();
