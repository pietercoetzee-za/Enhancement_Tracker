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

async function checkRLSStatus() {
    try {
        console.log('🔍 Checking RLS status and table permissions...');
        
        // Try to insert a test record to see what error we get
        const testData = {
            request_id: `TEST-RLS-${Date.now()}`,
            request_name: 'RLS Test',
            request_description: 'Testing RLS',
            rationale: 'Test',
            requestor_name: 'Test User',
            date_of_request: '2024-01-01',
            type_of_request: 'New Feature',
            area_of_product: 'Frontend',
            desire_level: 'High',
            impact_level: 'High',
            who_benefits: 'Suppliers',
            timeline: '1 month'
        };
        
        console.log('🧪 Testing insert with current RLS settings...');
        const { data, error } = await supabase
            .from('enhancements')
            .insert([testData])
            .select()
            .single();
            
        if (error) {
            console.error('❌ Insert failed:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error hint:', error.hint);
            
            if (error.code === '42501') {
                console.log('🔒 This is an RLS (Row Level Security) error!');
                console.log('📋 Solution: Enable RLS on the enhancements table in Supabase dashboard');
                console.log('');
                console.log('Steps to fix:');
                console.log('1. Go to your Supabase project dashboard');
                console.log('2. Navigate to Authentication > Policies');
                console.log('3. Find the "enhancements" table');
                console.log('4. Enable RLS (Row Level Security)');
                console.log('5. Create a policy to allow INSERT operations');
                console.log('');
                console.log('Or run this SQL in the SQL Editor:');
                console.log('ALTER TABLE enhancements ENABLE ROW LEVEL SECURITY;');
                console.log('CREATE POLICY "Allow all operations on enhancements" ON enhancements FOR ALL USING (true);');
            }
        } else {
            console.log('✅ Insert successful:', data);
            
            // Clean up test data
            await supabase
                .from('enhancements')
                .delete()
                .eq('id', data.id);
            console.log('🧹 Test data cleaned up');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkRLSStatus();
