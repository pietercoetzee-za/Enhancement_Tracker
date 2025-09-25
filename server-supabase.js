const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');

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
        const {
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            impactLevel, difficultyLevel, whoBenefits, timeline
        } = req.body;

        const enhancementData = {
            request_name: requestName,
            request_description: requestDescription,
            rationale: rationale,
            requestor_name: requestorName,
            date_of_request: dateOfRequest,
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
            throw error;
        }

        // Generate request ID using the actual ID from Supabase
        const requestId = `REQ-${String(data.id).padStart(6, '0')}`;
        
        // Update the record with the request_id
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
        res.status(500).json({ error: error.message });
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
module.exports = app;

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
