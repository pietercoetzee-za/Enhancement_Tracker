const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTestData() {
    try {
        console.log('🗑️  Clearing all test data from enhancements table...');
        
        // Delete all records from the enhancements table
        const { error } = await supabase
            .from('enhancements')
            .delete()
            .neq('id', 0); // Delete all records (id is never 0)
        
        if (error) {
            console.error('❌ Error clearing data:', error);
            return;
        }
        
        console.log('✅ All test data cleared successfully');
        console.log('📝 You can now upload new data with the correct enums');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

clearTestData();
