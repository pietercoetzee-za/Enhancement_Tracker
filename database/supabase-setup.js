// Supabase Database Setup for Enhancement Tracker
// This file contains the database schema and setup for Supabase

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    module.exports = supabase;
} else {
    console.log('Supabase not configured, using SQLite fallback');
    module.exports = null;
}

// Database schema for Supabase
const createTableSQL = `
CREATE TABLE IF NOT EXISTS enhancements (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(20) UNIQUE,
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
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhancements_status ON enhancements(status);
CREATE INDEX IF NOT EXISTS idx_enhancements_priority ON enhancements(priority_level);
CREATE INDEX IF NOT EXISTS idx_enhancements_created_at ON enhancements(created_at);
CREATE INDEX IF NOT EXISTS idx_enhancements_request_id ON enhancements(request_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enhancements_updated_at 
    BEFORE UPDATE ON enhancements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`;

module.exports.createTableSQL = createTableSQL;
