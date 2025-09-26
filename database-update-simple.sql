-- Simple approach: Drop and recreate the table with new schema
-- WARNING: This will delete all existing data!

-- Drop the existing table
DROP TABLE IF EXISTS enhancements;

-- Create new table with updated field names and constraints
CREATE TABLE enhancements (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(20) UNIQUE,
    request_name TEXT NOT NULL,
    request_description TEXT NOT NULL,
    rationale TEXT, -- Made optional as per requirements
    requestor_name TEXT NOT NULL,
    date_of_request DATE NOT NULL,
    stakeholder TEXT, -- This will store "Benefactor" data
    type_of_request TEXT NOT NULL,
    area_of_product TEXT NOT NULL,
    link_to_document TEXT,
    desire_level TEXT NOT NULL,
    effort_level DECIMAL(5,2), -- Changed from impact_level to effort_level (numerical)
    difficulty_level TEXT,
    who_benefits TEXT NOT NULL,
    status TEXT DEFAULT 'submitted',
    priority_level TEXT DEFAULT 'medium',
    accepted_denied_reason TEXT,
    timeline DATE, -- Changed to DATE for due date
    documentation_updated BOOLEAN DEFAULT FALSE,
    storylanes_updated BOOLEAN DEFAULT FALSE,
    release_notes BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints for the new enum values
ALTER TABLE enhancements ADD CONSTRAINT check_desire_level 
    CHECK (desire_level IN ('Must-have', 'Nice-to-have'));

ALTER TABLE enhancements ADD CONSTRAINT check_difficulty_level 
    CHECK (difficulty_level IN ('Simple', 'Complex', 'Involved'));

ALTER TABLE enhancements ADD CONSTRAINT check_status 
    CHECK (status IN ('submitted', 'review', 'rejected', 'approved', 'development', 'testing', 'complete'));

ALTER TABLE enhancements ADD CONSTRAINT check_priority_level 
    CHECK (priority_level IN ('urgent', 'high', 'medium', 'low'));

ALTER TABLE enhancements ADD CONSTRAINT check_type_of_request 
    CHECK (type_of_request IN ('Bug Fix', 'New Feature', 'Enhancement (UI)', 'Enhancement (Feature)'));

ALTER TABLE enhancements ADD CONSTRAINT check_area_of_product 
    CHECK (area_of_product IN ('Buyer Portal', 'Supplier Hub', 'Procurement', 'Guides', 'Documentation'));

ALTER TABLE enhancements ADD CONSTRAINT check_who_benefits 
    CHECK (who_benefits ~ '^(Clients - procurement|Clients - end users|Suppliers|Internal)(,\s*(Clients - procurement|Clients - end users|Suppliers|Internal))*$');

-- Add constraint for effort_level (must be positive number)
ALTER TABLE enhancements ADD CONSTRAINT check_effort_level 
    CHECK (effort_level IS NULL OR effort_level >= 0);

-- Create indexes for better performance
CREATE INDEX idx_enhancements_status ON enhancements(status);
CREATE INDEX idx_enhancements_priority ON enhancements(priority_level);
CREATE INDEX idx_enhancements_area ON enhancements(area_of_product);
CREATE INDEX idx_enhancements_created_at ON enhancements(created_at);

