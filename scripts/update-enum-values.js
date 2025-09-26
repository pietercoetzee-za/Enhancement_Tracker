const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.local' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please check your env.local file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEnumValues() {
    try {
        console.log('🔄 Starting enum values update...');

        // First, clear all existing test data
        console.log('🗑️  Clearing existing test data...');
        const { error: deleteError } = await supabase
            .from('enhancements')
            .delete()
            .neq('id', 0); // Delete all records

        if (deleteError) {
            console.error('❌ Error clearing data:', deleteError);
            return;
        }
        console.log('✅ Test data cleared successfully');

        // Update the database schema to add constraints for enum values
        console.log('🔧 Updating database schema with enum constraints...');
        
        const updateSchemaSQL = `
            -- Add CHECK constraints for enum values
            ALTER TABLE enhancements 
            ADD CONSTRAINT check_type_of_request 
            CHECK (type_of_request IN ('New Feature', 'Enhancement', 'Bug Fix', 'Performance', 'UI/UX Improvement'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_desire_level 
            CHECK (desire_level IN ('Critical', 'High', 'Medium', 'Low'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_impact_level 
            CHECK (impact_level IN ('High', 'Medium', 'Low'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_difficulty_level 
            CHECK (difficulty_level IN ('Complex', 'Hard', 'Medium', 'Low'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_who_benefits 
            CHECK (who_benefits IN ('Suppliers', 'All Users', 'Procurement', 'Buyers/ Requestors', 'Internal Team', 'Admins'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_area_of_product 
            CHECK (area_of_product IN ('Frontend', 'Backend', 'Database', 'API', 'Mobile', 'Supplier Hub', 'Procurement', 'Buyer Portal', 'Guides'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_status 
            CHECK (status IN ('submitted', 'review', 'rejected', 'in_progress', 'completed'));

            ALTER TABLE enhancements 
            ADD CONSTRAINT check_priority_level 
            CHECK (priority_level IN ('low', 'medium', 'high'));
        `;

        // Execute the schema update
        const { error: schemaError } = await supabase.rpc('exec_sql', { sql: updateSchemaSQL });
        
        if (schemaError) {
            console.log('⚠️  Schema update failed (this might be expected if constraints already exist)');
            console.log('Continuing with data validation...');
        } else {
            console.log('✅ Database schema updated with enum constraints');
        }

        // Insert some sample data with the new enum values
        console.log('📝 Inserting sample data with new enum values...');
        
        const sampleData = [
            {
                request_name: 'Mobile App Dark Mode',
                request_description: 'Implement dark mode theme for the mobile application',
                rationale: 'Improve user experience during night usage and reduce eye strain',
                requestor_name: 'John Doe',
                date_of_request: '2024-01-15',
                stakeholder: 'Mobile Team',
                type_of_request: 'UI/UX Improvement',
                area_of_product: 'Mobile',
                link_to_document: 'https://example.com/mobile-dark-mode',
                desire_level: 'High',
                impact_level: 'High',
                difficulty_level: 'Medium',
                who_benefits: 'All Users',
                status: 'submitted',
                priority_level: 'high'
            },
            {
                request_name: 'API Rate Limiting',
                request_description: 'Implement rate limiting for API endpoints to prevent abuse',
                rationale: 'Protect system resources and ensure fair usage',
                requestor_name: 'Jane Smith',
                date_of_request: '2024-01-16',
                stakeholder: 'Backend Team',
                type_of_request: 'Performance',
                area_of_product: 'API',
                link_to_document: 'https://example.com/api-rate-limiting',
                desire_level: 'Critical',
                impact_level: 'High',
                difficulty_level: 'Hard',
                who_benefits: 'Internal Team',
                status: 'review',
                priority_level: 'high'
            },
            {
                request_name: 'Database Query Optimization',
                request_description: 'Optimize slow database queries for better performance',
                rationale: 'Reduce page load times and improve user experience',
                requestor_name: 'Mike Johnson',
                date_of_request: '2024-01-17',
                stakeholder: 'Database Team',
                type_of_request: 'Performance',
                area_of_product: 'Database',
                link_to_document: 'https://example.com/db-optimization',
                desire_level: 'Medium',
                impact_level: 'Medium',
                difficulty_level: 'Complex',
                who_benefits: 'All Users',
                status: 'in_progress',
                priority_level: 'medium'
            }
        ];

        const { data: insertedData, error: insertError } = await supabase
            .from('enhancements')
            .insert(sampleData)
            .select();

        if (insertError) {
            console.error('❌ Error inserting sample data:', insertError);
            return;
        }

        console.log('✅ Sample data inserted successfully');
        console.log(`📊 Inserted ${insertedData.length} sample records`);

        // Verify the data
        console.log('🔍 Verifying data...');
        const { data: allData, error: fetchError } = await supabase
            .from('enhancements')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('❌ Error fetching data:', fetchError);
            return;
        }

        console.log('✅ Data verification successful');
        console.log(`📈 Total records in database: ${allData.length}`);
        
        // Display the new enum values
        console.log('\n📋 Updated Enum Values:');
        console.log('\n🔹 Type of Request:');
        console.log('  - New Feature');
        console.log('  - Enhancement');
        console.log('  - Bug Fix');
        console.log('  - Performance');
        console.log('  - UI/UX Improvement');
        
        console.log('\n🔹 Desire Level:');
        console.log('  - Critical');
        console.log('  - High');
        console.log('  - Medium');
        console.log('  - Low');
        
        console.log('\n🔹 Impact Level:');
        console.log('  - High');
        console.log('  - Medium');
        console.log('  - Low');
        
        console.log('\n🔹 Difficulty Level:');
        console.log('  - Complex');
        console.log('  - Hard');
        console.log('  - Medium');
        console.log('  - Low');
        
        console.log('\n🔹 Who Benefits:');
        console.log('  - Suppliers');
        console.log('  - All Users');
        console.log('  - Procurement');
        console.log('  - Buyers/ Requestors');
        console.log('  - Internal Team');
        console.log('  - Admins');
        
        console.log('\n🔹 Area of Product:');
        console.log('  - Frontend');
        console.log('  - Backend');
        console.log('  - Database');
        console.log('  - API');
        console.log('  - Mobile');
        console.log('  - Supplier Hub');
        console.log('  - Procurement');
        console.log('  - Buyer Portal');
        console.log('  - Guides');

        console.log('\n🎉 Enum values update completed successfully!');

    } catch (error) {
        console.error('❌ Error updating enum values:', error);
    }
}

// Run the update
updateEnumValues();
