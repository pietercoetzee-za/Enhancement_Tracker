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

async function removeWhoBenefitsConstraint() {
    try {
        console.log('🔧 Removing who_benefits CHECK constraint...');
        
        // Remove the constraint
        const { error } = await supabase.rpc('exec_sql', { 
            sql: 'ALTER TABLE enhancements DROP CONSTRAINT IF EXISTS check_who_benefits;' 
        });
        
        if (error) {
            console.error('❌ Error removing constraint:', error);
            console.log('📋 Please remove the constraint manually in Supabase dashboard:');
            console.log('');
            console.log('1. Go to your Supabase project dashboard');
            console.log('2. Click on "SQL Editor"');
            console.log('3. Run this SQL:');
            console.log('');
            console.log('ALTER TABLE enhancements DROP CONSTRAINT IF EXISTS check_who_benefits;');
            console.log('');
        } else {
            console.log('✅ Successfully removed who_benefits constraint');
            console.log('🎯 The database now allows comma-separated values for who_benefits');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

removeWhoBenefitsConstraint();
