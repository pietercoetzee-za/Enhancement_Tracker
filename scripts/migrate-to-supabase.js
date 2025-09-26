// Migration script to move data from SQLite to Supabase
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: './env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY in env.local file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read data from SQLite
function readFromSQLite() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./enhancements.db');
        db.all('SELECT * FROM enhancements', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
            db.close();
        });
    });
}

// Migrate data to Supabase
async function migrateToSupabase() {
    try {
        console.log('🔄 Starting migration from SQLite to Supabase...');
        
        // Read data from SQLite
        const sqliteData = await readFromSQLite();
        console.log(`📊 Found ${sqliteData.length} records in SQLite`);
        
        if (sqliteData.length === 0) {
            console.log('ℹ️ No data to migrate');
            return;
        }
        
        // Transform data for Supabase
        const supabaseData = sqliteData.map(item => ({
            request_name: item.requestName,
            request_description: item.requestDescription,
            rationale: item.rationale,
            requestor_name: item.requestorName,
            date_of_request: item.dateOfRequest,
            stakeholder: item.stakeholder,
            type_of_request: item.typeOfRequest,
            area_of_product: item.areaOfProduct,
            link_to_document: item.linkToDocument,
            desire_level: item.desireLevel,
            impact_level: item.impactLevel,
            difficulty_level: item.difficultyLevel,
            who_benefits: item.whoBenefits,
            status: item.status,
            priority_level: item.priorityLevel,
            accepted_denied_reason: item.acceptedDeniedReason,
            timeline: item.timeline,
            documentation_updated: item.documentationUpdated || false,
            storylanes_updated: item.storylanesUpdated || false,
            release_notes: item.releaseNotes || false
        }));
        
        // Insert data into Supabase
        const { data, error } = await supabase
            .from('enhancements')
            .insert(supabaseData);
            
        if (error) {
            throw error;
        }
        
        console.log(`✅ Successfully migrated ${sqliteData.length} records to Supabase`);
        console.log('🎉 Migration completed!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
migrateToSupabase();

