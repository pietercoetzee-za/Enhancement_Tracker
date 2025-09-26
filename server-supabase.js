const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Load environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: './env.local' });
}

// Polyfill fetch for Node.js
global.fetch = fetch;

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key-here';

// Debug logging
console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'SET' : 'NOT SET');
console.log('Final supabaseKey:', supabaseKey ? 'SET' : 'NOT SET');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads (using memory storage for Vercel)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('enhancements').select('count').limit(1);
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
            return false;
        }
        console.log('✅ Connected to Supabase database');
        return true;
    } catch (err) {
        console.error('❌ Supabase connection error:', err.message);
        return false;
    }
}

// API Routes

// Get all enhancements
app.get('/api/enhancements', async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = supabase.from('enhancements').select('*');

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`request_name.ilike.%${search}%,request_description.ilike.%${search}%,requestor_name.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        console.log('Fetched enhancements:', data?.length || 0, 'records');
        if (data && data.length > 0) {
            console.log('Sample enhancement:', data[0]);
        }
        
        // Transform database fields to frontend format
        const transformedData = (data || []).map(enhancement => ({
            id: enhancement.id,
            requestId: enhancement.request_id,
            requestName: enhancement.request_name,
            requestDescription: enhancement.request_description,
            rationale: enhancement.rationale,
            requestorName: enhancement.requestor_name,
            dateOfRequest: enhancement.date_of_request,
            stakeholder: enhancement.stakeholder,
            typeOfRequest: enhancement.type_of_request,
            areaOfProduct: enhancement.area_of_product,
            linkToDocument: enhancement.link_to_document,
            desireLevel: enhancement.desire_level,
            impactLevel: enhancement.impact_level,
            difficultyLevel: enhancement.difficulty_level,
            whoBenefits: enhancement.who_benefits,
            status: enhancement.status,
            priorityLevel: enhancement.priority_level,
            acceptedDeniedReason: enhancement.accepted_denied_reason,
            timeline: enhancement.timeline,
            documentationUpdated: enhancement.documentation_updated,
            storylanesUpdated: enhancement.storylanes_updated,
            releaseNotes: enhancement.release_notes,
            createdAt: enhancement.created_at,
            updatedAt: enhancement.updated_at
        }));
        
        res.json(transformedData);
    } catch (error) {
        console.error('Error fetching enhancements:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get enhancement by ID
app.get('/api/enhancements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('enhancements')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Enhancement not found' });
            }
            throw error;
        }

        // Transform database fields to frontend format
        const transformedData = {
            id: data.id,
            requestName: data.request_name,
            requestDescription: data.request_description,
            rationale: data.rationale,
            requestorName: data.requestor_name,
            dateOfRequest: data.date_of_request,
            stakeholder: data.stakeholder,
            typeOfRequest: data.type_of_request,
            areaOfProduct: data.area_of_product,
            linkToDocument: data.link_to_document,
            desireLevel: data.desire_level,
            impactLevel: data.impact_level,
            difficultyLevel: data.difficulty_level,
            whoBenefits: data.who_benefits,
            status: data.status,
            priorityLevel: data.priority_level,
            acceptedDeniedReason: data.accepted_denied_reason,
            timeline: data.timeline,
            documentationUpdated: data.documentation_updated,
            storylanesUpdated: data.storylanes_updated,
            releaseNotes: data.release_notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        res.json(transformedData);
    } catch (error) {
        console.error('Error fetching enhancement:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new enhancement
app.post('/api/enhancements', async (req, res) => {
    try {
        console.log('POST /api/enhancements - Request body:', req.body);
        console.log('Request headers:', req.headers);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const {
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            impactLevel, difficultyLevel, whoBenefits, timeline
        } = req.body;

        console.log('Extracted fields:');
        console.log('- requestName:', requestName);
        console.log('- requestDescription:', requestDescription);
        console.log('- requestorName:', requestorName);
        console.log('- dateOfRequest:', dateOfRequest);
        console.log('- typeOfRequest:', typeOfRequest);
        console.log('- areaOfProduct:', areaOfProduct);
        console.log('- desireLevel:', desireLevel);
        console.log('- impactLevel:', impactLevel);
        console.log('- whoBenefits:', whoBenefits);

        // Validate required fields
        if (!requestName || !requestDescription || !requestorName || !dateOfRequest || 
            !typeOfRequest || !areaOfProduct || !desireLevel || !impactLevel || !whoBenefits) {
            console.log('❌ Missing required fields validation failed');
            console.log('Field validation:', {
                requestName: !!requestName,
                requestDescription: !!requestDescription,
                requestorName: !!requestorName,
                dateOfRequest: !!dateOfRequest,
                typeOfRequest: !!typeOfRequest,
                areaOfProduct: !!areaOfProduct,
                desireLevel: !!desireLevel,
                impactLevel: !!impactLevel,
                whoBenefits: !!whoBenefits
            });
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: {
                    requestName: !!requestName,
                    requestDescription: !!requestDescription,
                    requestorName: !!requestorName,
                    dateOfRequest: !!dateOfRequest,
                    typeOfRequest: !!typeOfRequest,
                    areaOfProduct: !!areaOfProduct,
                    desireLevel: !!desireLevel,
                    impactLevel: !!impactLevel,
                    whoBenefits: !!whoBenefits
                }
            });
        }

        // Validate Who Benefits field
        try {
            const validWhoBenefits = ['Suppliers', 'All Users', 'Procurement', 'Buyers/ Requestors', 'Internal Team', 'Admins'];
            console.log('Validating whoBenefits:', whoBenefits);
            
            if (typeof whoBenefits !== 'string') {
                return res.status(400).json({ 
                    error: 'Invalid Who Benefits format',
                    details: 'Who Benefits must be a string'
                });
            }
            
            const whoBenefitsArray = whoBenefits.split(',').map(v => v.trim()).filter(v => v !== '');
            console.log('Who Benefits array:', whoBenefitsArray);
            
            const invalidWhoBenefits = whoBenefitsArray.filter(v => !validWhoBenefits.includes(v));
            console.log('Invalid Who Benefits:', invalidWhoBenefits);
            
            if (invalidWhoBenefits.length > 0) {
                return res.status(400).json({ 
                    error: 'Invalid Who Benefits values',
                    details: `Who Benefits must be one or more of: ${validWhoBenefits.join(', ')}. Invalid values: ${invalidWhoBenefits.join(', ')}`
                });
            }
        } catch (validationError) {
            console.error('Who Benefits validation error:', validationError);
            return res.status(400).json({ 
                error: 'Who Benefits validation failed',
                details: validationError.message
            });
        }

        // Generate a temporary request ID first
        const tempRequestId = `TEMP-${Date.now()}`;
        
        // Convert date from DD-MM-YYYY to YYYY-MM-DD format
        let formattedDate = dateOfRequest;
        if (dateOfRequest && dateOfRequest.includes('-')) {
            const dateParts = dateOfRequest.split('-');
            if (dateParts.length === 3 && dateParts[0].length === 2) {
                // DD-MM-YYYY format, convert to YYYY-MM-DD
                formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                console.log(`Date converted: ${dateOfRequest} -> ${formattedDate}`);
            }
        }
        
        const enhancementData = {
            request_id: tempRequestId,
            request_name: requestName,
            request_description: requestDescription,
            rationale: rationale && rationale.trim() !== '' ? rationale : 'Not specified',
            requestor_name: requestorName,
            date_of_request: formattedDate,
            stakeholder: stakeholder,
            type_of_request: typeOfRequest,
            area_of_product: areaOfProduct,
            link_to_document: linkToDocument,
            desire_level: desireLevel,
            impact_level: impactLevel,
            difficulty_level: difficultyLevel,
            who_benefits: whoBenefits,
            timeline: timeline
        };

        console.log('Enhancement data to insert:', enhancementData);
        
        const { data, error } = await supabase
            .from('enhancements')
            .insert([enhancementData])
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.error('Enhancement data that failed:', JSON.stringify(enhancementData, null, 2));
            return res.status(500).json({ 
                error: 'Database error', 
                details: error.message,
                code: error.code,
                hint: error.hint,
                data: enhancementData,
                fullError: error
            });
        }

        // Generate final request ID using the actual ID from Supabase
        const requestId = `REQ-${String(data.id).padStart(6, '0')}`;
        
        // Update the record with the final request_id
        const { error: updateError } = await supabase
            .from('enhancements')
            .update({ request_id: requestId })
            .eq('id', data.id);

        if (updateError) {
            console.error('Error updating request_id:', updateError);
            // Don't throw error here, the record was created successfully
        }

        console.log('Successfully created enhancement:', data);
        res.json({ ...data, request_id: requestId });
    } catch (error) {
        console.error('Error creating enhancement:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        res.status(500).json({ 
            error: 'Failed to create enhancement',
            details: error.message,
            stack: error.stack
        });
    }
});

// Update enhancement
app.put('/api/enhancements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status, priorityLevel, acceptedDeniedReason, documentationUpdated,
            storylanesUpdated, releaseNotes
        } = req.body;

        const updateData = {
            status: status,
            priority_level: priorityLevel,
            accepted_denied_reason: acceptedDeniedReason,
            documentation_updated: documentationUpdated,
            storylanes_updated: storylanesUpdated,
            release_notes: releaseNotes
        };

        const { data, error } = await supabase
            .from('enhancements')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Enhancement not found' });
            }
            throw error;
        }

        res.json({ message: 'Enhancement updated successfully' });
    } catch (error) {
        console.error('Error updating enhancement:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete enhancement
app.delete('/api/enhancements/:id', async (req, res) => {
    try {
        console.log('DELETE /api/enhancements/:id - ID:', req.params.id);
        const { id } = req.params;
        const { error } = await supabase
            .from('enhancements')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.json({ message: 'Enhancement deleted successfully' });
    } catch (error) {
        console.error('Error deleting enhancement:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get workflow statistics
app.get('/api/workflow/stats', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('enhancements')
            .select('status')
            .not('status', 'is', null);

        if (error) {
            throw error;
        }

        // Count by status
        const stats = data.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});

        const result = Object.entries(stats).map(([status, count]) => ({
            status,
            count
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching workflow stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CSV Import endpoint
app.post('/api/enhancements/import-csv', upload.single('csvFile'), async (req, res) => {
    try {
        console.log('CSV Import endpoint hit');
        
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }
        
        console.log('Processing CSV file from memory buffer');
        
        const results = [];
        const errors = [];
        let rowNumber = 0;
        
        // Read and parse CSV file from memory buffer
        await new Promise((resolve, reject) => {
            const csvStream = require('stream').Readable.from(req.file.buffer);
            csvStream
                .pipe(csv())
                .on('data', (row) => {
                    rowNumber++;
                    results.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        console.log(`Parsed ${results.length} rows from CSV`);
        
        // Process each row
        let successful = 0;
        let failed = 0;
        
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const rowNum = i + 1;
            
            try {
                // Validate required fields
                const requiredFields = [
                    'Request Name', 'Request Description', 'Requestor Name',
                    'Date of Request (DD-MM-YYYY)', 'Type of Request', 'Area of Product',
                    'Desire Level', 'Impact Level', 'Who Benefits'
                ];
                
                const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
                if (missingFields.length > 0) {
                    errors.push(`Row ${rowNum}: Missing required fields: ${missingFields.join(', ')}`);
                    failed++;
                    continue;
                }
                
                // Validate enum values
                const enumValidations = {
                    'Type of Request': ['New Feature', 'Enhancement', 'Bug Fix', 'Performance', 'UI/UX Improvement'],
                    'Desire Level': ['Critical', 'High', 'Medium', 'Low'],
                    'Impact Level': ['High', 'Medium', 'Low'],
                    'Difficulty Level': ['Complex', 'Hard', 'Medium', 'Low'],
                    'Who Benefits': ['Suppliers', 'All Users', 'Procurement', 'Buyers/ Requestors', 'Internal Team', 'Admins'],
                    'Area of Product': ['Frontend', 'Backend', 'Database', 'API', 'Mobile', 'Supplier Hub', 'Procurement', 'Buyer Portal', 'Guides']
                };
                
                let validationErrors = [];
                for (const [field, validValues] of Object.entries(enumValidations)) {
                    if (row[field] && row[field].trim() !== '') {
                        const value = row[field].trim();
                        
                        if (field === 'Who Benefits') {
                            // Handle multiple values separated by commas for Who Benefits
                            // Remove quotes if present and split by commas
                            const cleanValue = value.replace(/^"|"$/g, ''); // Remove leading/trailing quotes
                            const values = cleanValue.split(',').map(v => v.trim()).filter(v => v !== '');
                            const invalidValues = values.filter(v => !validValues.includes(v));
                            if (invalidValues.length > 0) {
                                validationErrors.push(`${field} must be one or more of: ${validValues.join(', ')}. Invalid values: ${invalidValues.join(', ')}`);
                            }
                        } else {
                            if (!validValues.includes(value)) {
                                validationErrors.push(`${field} must be one of: ${validValues.join(', ')}`);
                            }
                        }
                    }
                }
                
                if (validationErrors.length > 0) {
                    errors.push(`Row ${rowNum}: ${validationErrors.join('; ')}`);
                    failed++;
                    continue;
                }
                
                // Convert DD-MM-YYYY to YYYY-MM-DD for database storage
                const dateValue = row['Date of Request (DD-MM-YYYY)'].trim();
                const [day, month, year] = dateValue.split('-');
                const formattedDate = `${year}-${month}-${day}`;
                
                // Prepare data for insertion
                const enhancementData = {
                    request_name: row['Request Name'].trim(),
                    request_description: row['Request Description'].trim(),
                    rationale: row['Rationale'] && row['Rationale'].trim() !== '' ? row['Rationale'].trim() : 'Not specified',
                    requestor_name: row['Requestor Name'].trim(),
                    date_of_request: formattedDate,
                    stakeholder: row['Stakeholder'] ? row['Stakeholder'].trim() : null,
                    type_of_request: row['Type of Request'].trim(),
                    area_of_product: row['Area of Product'].trim(),
                    link_to_document: row['Link to Document'] ? row['Link to Document'].trim() : null,
                    desire_level: row['Desire Level'].trim(),
                    impact_level: row['Impact Level'].trim(),
                    difficulty_level: row['Difficulty Level'] ? row['Difficulty Level'].trim() : null,
                    who_benefits: row['Who Benefits'].trim(),
                    timeline: row['Timeline'] ? row['Timeline'].trim() : null,
                    status: 'submitted',
                    priority_level: 'medium'
                };
                
                // Insert into database
                const { data, error } = await supabase
                    .from('enhancements')
                    .insert([enhancementData])
                    .select();
                
                if (error) {
                    console.error(`Error inserting row ${rowNum}:`, error);
                    errors.push(`Row ${rowNum}: Database error - ${error.message}`);
                    failed++;
                } else {
                    // Generate request_id after successful insert
                    const requestId = `REQ-${String(data[0].id).padStart(6, '0')}`;
                    await supabase
                        .from('enhancements')
                        .update({ request_id: requestId })
                        .eq('id', data[0].id);
                    
                    successful++;
                }
                
            } catch (error) {
                console.error(`Error processing row ${rowNum}:`, error);
                errors.push(`Row ${rowNum}: ${error.message}`);
                failed++;
            }
        }
        
        res.json({
            successful,
            failed,
            total: results.length,
            errors: errors.slice(0, 50) // Limit to first 50 errors
        });
        
    } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Failed to process CSV import: ' + error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server (only if not in Vercel environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const server = app.listen(PORT, async () => {
        console.log(`🚀 Enhancement Tracker server running on http://localhost:${PORT}`);
        console.log(`📱 Access from any device on your network: http://[YOUR_IP]:${PORT}`);
        
        // Test Supabase connection
        await testSupabaseConnection();
    });

    // Handle port already in use error
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ Port ${PORT} is already in use. Trying to kill existing processes...`);
            const { exec } = require('child_process');
            exec('taskkill /F /IM node.exe', (error, stdout, stderr) => {
                if (error) {
                    console.log('Could not kill existing processes. Please manually stop the server and try again.');
                    console.log('Or try running: taskkill /F /IM node.exe');
                } else {
                    console.log('Existing processes killed. Please restart the server.');
                }
            });
        } else {
            console.error('Server error:', err);
        }
    });
}

// Export for Vercel
// Test endpoint for debugging
app.post('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    res.json({ 
        status: 'Test successful', 
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
