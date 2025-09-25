// Test script to verify Supabase connection
require('dotenv').config({ path: './env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY in env.local file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Test basic connection
        const { data, error } = await supabase.from('enhancements').select('count').limit(1);
        
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
            console.log('💡 Make sure you have:');
            console.log('   1. Created the database table in Supabase SQL Editor');
            console.log('   2. Set the correct URL and API key in env.local');
            return false;
        }
        
        console.log('✅ Supabase connection successful!');
        console.log('📊 Database is ready for data migration');
        return true;
    } catch (err) {
        console.error('❌ Connection error:', err.message);
        return false;
    }
}

testConnection();
