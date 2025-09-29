-- Create new table with updated field names and constraints
CREATE TABLE IF NOT EXISTS enhancements_v2 (
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
ALTER TABLE enhancements_v2 ADD CONSTRAINT check_desire_level 
    CHECK (desire_level IN ('Must-have', 'Nice-to-have'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_difficulty_level 
    CHECK (difficulty_level IN ('Simple', 'Complex', 'Involved'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_status 
    CHECK (status IN ('submitted', 'review', 'rejected', 'approved', 'development', 'testing', 'complete'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_priority_level 
    CHECK (priority_level IN ('Critical', 'High', 'Medium', 'Low'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_type_of_request 
    CHECK (type_of_request IN ('Bug Fix', 'New Feature', 'Enhancement (UI)', 'Enhancement (Feature)'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_area_of_product 
    CHECK (area_of_product IN ('Buyer Portal', 'Supplier Hub', 'Procurement', 'Guides', 'Documentation'));

ALTER TABLE enhancements_v2 ADD CONSTRAINT check_who_benefits 
    CHECK (who_benefits ~ '^(Clients - procurement|Clients - end users|Suppliers|Internal)(,\s*(Clients - procurement|Clients - end users|Suppliers|Internal))*$');

-- Add constraint for effort_level (must be positive number)
ALTER TABLE enhancements_v2 ADD CONSTRAINT check_effort_level 
    CHECK (effort_level IS NULL OR effort_level >= 0);

-- Copy existing data to new table with generated request_ids
-- Note: This will need manual data transformation for the new enum values
INSERT INTO enhancements_v2 (
    id, request_id, request_name, request_description, rationale, 
    requestor_name, date_of_request, stakeholder, type_of_request, 
    area_of_product, link_to_document, desire_level, effort_level, 
    difficulty_level, who_benefits, status, priority_level, 
    accepted_denied_reason, timeline, documentation_updated, 
    storylanes_updated, release_notes, created_at, updated_at
)
SELECT 
    id,
    'REQ-' || LPAD(id::text, 6, '0') as request_id,
    request_name, 
    request_description, 
    COALESCE(rationale, 'Not specified') as rationale, -- Handle null rationale
    requestor_name, 
    date_of_request, 
    stakeholder, -- This will be "Benefactor" data
    CASE 
        WHEN type_of_request = 'UI/UX Improvement' THEN 'Enhancement (UI)'
        WHEN type_of_request = 'Enhancement' THEN 'Enhancement (Feature)'
        ELSE type_of_request
    END as type_of_request,
    CASE 
        WHEN area_of_product = 'Guides' THEN 'Guides' -- Keep Guides
        WHEN area_of_product = 'Buyer Portal' THEN 'Buyer Portal'
        WHEN area_of_product = 'Procurement' THEN 'Procurement'
        WHEN area_of_product = 'Supplier Hub' THEN 'Supplier Hub'
        ELSE 'Documentation' -- Default fallback
    END as area_of_product,
    link_to_document, 
    CASE 
        WHEN desire_level IN ('Critical', 'High') THEN 'Must-have'
        WHEN desire_level IN ('Medium', 'Low') THEN 'Nice-to-have'
        ELSE 'Nice-to-have' -- Default fallback
    END as desire_level,
    CASE 
        WHEN impact_level = 'High' THEN 5.0
        WHEN impact_level = 'Medium' THEN 3.0
        WHEN impact_level = 'Low' THEN 1.0
        ELSE 2.0 -- Default fallback
    END as effort_level,
    CASE 
        WHEN difficulty_level IN ('Hard', 'Complex') THEN 'Complex'
        WHEN difficulty_level = 'Medium' THEN 'Involved'
        WHEN difficulty_level = 'Low' THEN 'Simple'
        ELSE 'Involved' -- Default fallback
    END as difficulty_level,
    CASE 
        WHEN who_benefits LIKE '%Suppliers%' AND who_benefits LIKE '%Internal Team%' THEN 'Suppliers, Internal'
        WHEN who_benefits LIKE '%Suppliers%' THEN 'Suppliers'
        WHEN who_benefits LIKE '%Internal Team%' THEN 'Internal'
        WHEN who_benefits LIKE '%Procurement%' THEN 'Clients - procurement'
        WHEN who_benefits LIKE '%All Users%' THEN 'Clients - end users'
        ELSE 'Internal' -- Default fallback
    END as who_benefits,
    CASE 
        WHEN status = 'backlog' THEN 'approved'
        WHEN status = 'testing' THEN 'testing' -- Keep as is, will be "In Testing" in UI
        ELSE status
    END as status,
    CASE 
        WHEN priority_level = 'urgent' THEN 'urgent' -- Will display as "Critical" in UI
        ELSE priority_level
    END as priority_level,
    accepted_denied_reason, 
    NULL as timeline, -- Old timeline was text, new is date
    documentation_updated, 
    storylanes_updated, 
    release_notes, 
    created_at, 
    updated_at
FROM enhancements;

-- Drop old table and rename new one
DROP TABLE enhancements;
ALTER TABLE enhancements_v2 RENAME TO enhancements;

-- Create indexes for better performance
CREATE INDEX idx_enhancements_status ON enhancements(status);
CREATE INDEX idx_enhancements_priority ON enhancements(priority_level);
CREATE INDEX idx_enhancements_area ON enhancements(area_of_product);
CREATE INDEX idx_enhancements_created_at ON enhancements(created_at);
