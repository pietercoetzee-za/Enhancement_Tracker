// Check and setup Supabase database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    try {
        console.log('🔍 Checking Supabase database...');
        console.log('URL:', supabaseUrl);
        console.log('Key:', supabaseKey ? 'SET' : 'NOT SET');
        
        // Check if table exists by trying to query it
        const { data, error } = await supabase
            .from('enhancements')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Database error:', error);
            
            if (error.code === 'PGRST116') {
                console.log('📋 Table does not exist. Creating table...');
                await createTable();
            } else {
                console.error('❌ Unexpected error:', error.message);
            }
        } else {
            console.log('✅ Table exists');
            console.log('📊 Current records:', data.length);
            if (data.length > 0) {
                console.log('📝 Sample record:', data[0]);
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

async function createTable() {
    try {
        console.log('🔨 Creating enhancements table...');
        
        // Note: We can't create tables directly with the anon key
        // This needs to be done in the Supabase dashboard or with service role key
        console.log('⚠️  Cannot create table with anon key.');
        console.log('📋 Please create the table manually in Supabase dashboard:');
        console.log('');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Click on "SQL Editor"');
        console.log('3. Run this SQL:');
        console.log('');
        console.log(`CREATE TABLE IF NOT EXISTS enhancements (
    id SERIAL PRIMARY KEY,
    request_name TEXT NOT NULL,
    request_description TEXT NOT NULL,
    rationale TEXT NOT NULL,
    requestor_name TEXT NOT NULL,
    date_of_request DATE NOT NULL,
    stakeholder TEXT,
    type_of_request TEXT NOT NULL,
    area_of_product TEXT NOT NULL,
    link_to_document TEXT,
    desire_level TEXT NOT NULL,
    impact_level TEXT NOT NULL,
    difficulty_level TEXT,
    who_benefits TEXT NOT NULL,
    status TEXT DEFAULT 'submitted',
    priority_level TEXT DEFAULT 'medium',
    accepted_denied_reason TEXT,
    timeline TEXT,
    documentation_updated BOOLEAN DEFAULT FALSE,
    storylanes_updated BOOLEAN DEFAULT FALSE,
    release_notes BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        
    } catch (error) {
        console.error('❌ Error creating table:', error);
    }
}

checkDatabase();


