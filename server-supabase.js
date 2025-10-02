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
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

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
// Use the high-privilege Service Role Key for server operations.
// Falls back to Anon Key if not set, but SUPABASE_SERVICE_ROLE_KEY is required for full functionality.
const clientKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

// Debug logging
console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
// Added Service Role Key check. This key is necessary for privileged API calls.
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
// Removed old SUPABASE_KEY log for clarity.
console.log('Final client key (Service/Anon):', clientKey ? 'SET' : 'NOT SET');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));

// Add this helper function near the top of your server-supabase.js file
// Place it after your imports and before your route definitions

/**
 * Process and validate the "Who Benefits" field for CSV import
 * @param {string} whoBenefitsValue - Raw value from CSV
 * @param {number} rowNum - Row number for error reporting
 * @returns {Object} { isValid: boolean, value: string, error: string }
 */
function processWhoBenefitsField(whoBenefitsValue, rowNum = 0) {
    const validValues = ['Clients - procurement', 'Clients - end users', 'Suppliers', 'Internal'];
    
    if (!whoBenefitsValue || whoBenefitsValue.trim() === '') {
        return {
            isValid: false,
            value: '',
            error: 'Who Benefits field is required'
        };
    }
    
    let value = whoBenefitsValue.trim();
    console.log(`Processing Who Benefits for row ${rowNum}: "${value}"`);
    
    // Remove outer quotes if present (CSV formatting)
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        console.log(`Removed quotes: "${value}"`);
    }
    
    // Split by comma and clean each value
    const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
    console.log(`Split values:`, values);
    
    // Check for invalid values
    const invalidValues = values.filter(v => !validValues.includes(v));
    if (invalidValues.length > 0) {
        return {
            isValid: false,
            value: '',
            error: `Invalid Who Benefits values: ${invalidValues.join(', ')}. Must be one or more of: ${validValues.join(', ')}`
        };
    }
    
    if (values.length === 0) {
        return {
            isValid: false,
            value: '',
            error: 'At least one Who Benefits value must be specified'
        };
    }
    
    // Format for database (consistent spacing)
    const formattedValue = values.join(', ');
    console.log(`Final formatted Who Benefits value: "${formattedValue}"`);
    
    // Test against database regex pattern
    const regex = /^(Clients - procurement|Clients - end users|Suppliers|Internal)(,\s*(Clients - procurement|Clients - end users|Suppliers|Internal))*$/;
    if (!regex.test(formattedValue)) {
        return {
            isValid: false,
            value: '',
            error: `Who Benefits format doesn't match database constraint: "${formattedValue}"`
        };
    }
    
    return {
        isValid: true,
        value: formattedValue,
        error: null
    };
}

// Initialize Supabase client with the Service Role Key (if set) for server ops
const supabase = createClient(supabaseUrl, clientKey);

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

// CORS Configuration - restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://enhancement-tracker.vercel.app'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate Limiting Configuration
// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Very strict rate limiter for MFA verification - 10 attempts per hour (prevents brute force)
const mfaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many MFA verification attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for Slack webhook - 50 requests per 15 minutes per IP
const slackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: 'Too many Slack requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

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

 // Middleware to protect API routes by validating the Supabase JWT.
async function authMiddleware(req, res, next) {
    console.log('🛡️ Running authMiddleware...');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Auth header missing or malformed.');
        return res.status(401).json({ error: 'Authorization header required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Use the Supabase Service Role client to verify the JWT token
        // The token verification internally checks validity, expiry, and signature
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('❌ Token validation failed:', error?.message || 'No user found.');
            return res.status(401).json({ error: 'Invalid or expired token.', details: error?.message });
        }

        // Attach the authenticated user object to the request for use in later routes
        req.user = user;
        console.log(`✅ Token valid. User ID: ${user.id}`);

        // Proceed to the next middleware or route handler
        next();
    } catch (e) {
        console.error('❌ Unexpected token validation error:', e);
        return res.status(500).json({ error: 'Internal server error during token validation.' });
    }
}

// Middleware to enforce MFA for protected routes (MANDATORY 2FA)
async function enforceMfaMiddleware(req, res, next) {
    console.log('🔒 Running enforceMfaMiddleware...');

    try {
        const userId = req.user.id;

        // Check if user has MFA enabled using REST API
        const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${clientKey}`,
                'apikey': clientKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Error checking MFA status:', response.status);
            return res.status(500).json({ error: 'Failed to verify MFA status' });
        }

        const data = await response.json();
        console.log(`🔍 MFA Factors for user ${userId}:`, JSON.stringify(data, null, 2));

        // Check if user has any verified TOTP factors
        const verifiedFactors = data?.factors?.filter(f => f.factor_type === 'totp' && f.status === 'verified') || [];
        const unverifiedFactors = data?.factors?.filter(f => f.factor_type === 'totp' && f.status === 'unverified') || [];

        console.log(`📊 MFA Status - Verified: ${verifiedFactors.length}, Unverified: ${unverifiedFactors.length}`);

        const hasVerifiedMfa = verifiedFactors.length > 0;

        if (!hasVerifiedMfa) {
            console.log(`❌ User ${userId} attempted to access protected resource without verified MFA`);
            console.log(`   Available factors:`, data?.factors || 'none');
            return res.status(403).json({
                error: 'MFA_REQUIRED',
                message: 'Two-Factor Authentication must be enabled to access this resource.',
                debug: {
                    totalFactors: data?.factors?.length || 0,
                    verifiedFactors: verifiedFactors.length,
                    unverifiedFactors: unverifiedFactors.length
                }
            });
        }

        console.log(`✅ User ${userId} has ${verifiedFactors.length} verified MFA factor(s). Access granted.`);
        next();
    } catch (e) {
        console.error('❌ Unexpected error in enforceMfaMiddleware:', e);
        return res.status(500).json({ error: 'Internal server error during MFA verification.' });
    }
}


// MFA Management Endpoints

// Check MFA status for the authenticated user
app.get('/api/mfa/status', mfaLimiter, authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Use REST API to list factors
        const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${clientKey}`,
                'apikey': clientKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to list factors:', errorText);
            throw new Error(`Failed to list factors: ${response.status}`);
        }

        const data = await response.json();
        console.log('MFA Factors for user:', userId, data);

        // Check if user has any verified TOTP factors
        const verifiedFactor = data?.factors?.find(f => f.factor_type === 'totp' && f.status === 'verified');

        res.json({
            success: true,
            mfaEnabled: !!verifiedFactor,
            factorId: verifiedFactor?.id || null,
            friendlyName: verifiedFactor?.friendly_name || null
        });
    } catch (error) {
        console.error('MFA Status Check Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check MFA status',
            details: error.message
        });
    }
});

// Start MFA enrollment process
// NOTE: MFA enrollment must be done client-side by the user, not server-side
// This endpoint just validates the user is authenticated
app.post('/api/mfa/enroll', mfaLimiter, authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user already has a verified factor
        const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${clientKey}`,
                'apikey': clientKey,
                'Content-Type': 'application/json'
            }
        });

        if (listResponse.ok) {
            const existingFactors = await listResponse.json();
            const hasVerifiedFactor = existingFactors?.factors?.some(f => f.factor_type === 'totp' && f.status === 'verified');

            if (hasVerifiedFactor) {
                return res.status(400).json({
                    success: false,
                    error: 'MFA is already enabled for this account. Please disable it first before re-enrolling.'
                });
            }
        }

        // Return success - the actual enrollment will happen client-side
        res.json({
            success: true,
            message: 'Ready to enroll MFA. Use client-side enrollment.',
            userId: userId
        });

    } catch (error) {
        console.error('MFA Enrollment Validation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate MFA enrollment',
            details: error.message
        });
    }
});

// Verify enrollment and activate MFA
app.post('/api/mfa/verify-enrollment', mfaLimiter, authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { factorId, code } = req.body;

        if (!factorId || !code) {
            return res.status(400).json({
                success: false,
                error: 'Factor ID and verification code are required'
            });
        }

        // Verify the TOTP code using REST API
        const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors/${factorId}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clientKey}`,
                'apikey': clientKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text();
            console.error('MFA Verification Error:', errorText);
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code. Please check your authenticator app and try again.',
                details: errorText
            });
        }

        const data = await verifyResponse.json();
        console.log('Verification response:', data);

        res.json({
            success: true,
            message: '2FA has been successfully enabled for your account!'
        });

    } catch (error) {
        console.error('MFA Verification Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify MFA code',
            details: error.message
        });
    }
});

// Disable MFA for the authenticated user
app.delete('/api/mfa/disable', mfaLimiter, authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all factors for this user
        const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${clientKey}`,
                'apikey': clientKey,
                'Content-Type': 'application/json'
            }
        });

        if (!listResponse.ok) {
            throw new Error(`Failed to list factors: ${listResponse.status}`);
        }

        const factorsData = await listResponse.json();

        // Find verified TOTP factors
        const verifiedFactors = factorsData?.factors?.filter(f => f.factor_type === 'totp' && f.status === 'verified') || [];

        if (verifiedFactors.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No MFA factors are currently enabled'
            });
        }

        // Unenroll all verified TOTP factors
        for (const factor of verifiedFactors) {
            const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors/${factor.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${clientKey}`,
                    'apikey': clientKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!deleteResponse.ok) {
                console.error(`Failed to unenroll factor ${factor.id}:`, await deleteResponse.text());
            }
        }

        res.json({
            success: true,
            message: '2FA has been disabled for your account'
        });

    } catch (error) {
        console.error('MFA Disable Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disable MFA',
            details: error.message
        });
    }
});

// API Routes

// Get all enhancements
app.get('/api/enhancements', authMiddleware, async (req, res) => {
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
            effortLevel: enhancement.effort_level != null ? parseFloat(enhancement.effort_level) : null,
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
app.get('/api/enhancements/:id', authMiddleware, async (req, res) => {
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
            effortLevel: data.effort_level,
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
app.post('/api/enhancements', authMiddleware, async (req, res) => {
    try {
        console.log('POST /api/enhancements - Request body:', req.body);
        console.log('Request headers:', req.headers);
        console.log('Content-Type:', req.get('Content-Type'));
        
        const {
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            effortLevel, difficultyLevel, whoBenefits, timeline, priorityLevel
        } = req.body;

        console.log('Extracted fields:');
        console.log('- requestName:', requestName);
        console.log('- requestDescription:', requestDescription);
        console.log('- requestorName:', requestorName);
        console.log('- dateOfRequest:', dateOfRequest);
        console.log('- typeOfRequest:', typeOfRequest);
        console.log('- areaOfProduct:', areaOfProduct);
        console.log('- desireLevel:', desireLevel);
        console.log('- effortLevel:', effortLevel);
        console.log('- whoBenefits:', whoBenefits);

        // Validate required fields
        if (!requestName || !requestDescription || !requestorName || !dateOfRequest || 
            !typeOfRequest || !areaOfProduct || !desireLevel || !whoBenefits) {
            console.log('❌ Missing required fields validation failed');
            console.log('Field validation:', {
                requestName: !!requestName,
                requestDescription: !!requestDescription,
                requestorName: !!requestorName,
                dateOfRequest: !!dateOfRequest,
                typeOfRequest: !!typeOfRequest,
                areaOfProduct: !!areaOfProduct,
                desireLevel: !!desireLevel,
                effortLevel: !!effortLevel,
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
                    effortLevel: !!effortLevel,
                    whoBenefits: !!whoBenefits
                }
            });
        }

        // Validate Who Benefits field
        try {
            const validWhoBenefits = ['Clients - procurement', 'Clients - end users', 'Suppliers', 'Internal'];
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
        
        // Date handling - HTML5 date input already provides YYYY-MM-DD format
        let formattedDate = dateOfRequest;
        if (dateOfRequest && dateOfRequest.includes('-')) {
            const dateParts = dateOfRequest.split('-');
            if (dateParts.length === 3) {
                if (dateParts[0].length === 4) {
                    // Already in YYYY-MM-DD format from HTML5 date input
                    formattedDate = dateOfRequest;
                    console.log(`Date already in correct format: ${formattedDate}`);
                } else if (dateParts[0].length === 2) {
                    // Legacy DD-MM-YYYY format (for CSV imports), convert to YYYY-MM-DD
                    formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                    console.log(`Date converted from DD-MM-YYYY: ${dateOfRequest} -> ${formattedDate}`);
                }
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
            effort_level: effortLevel,
            difficulty_level: difficultyLevel,
            who_benefits: whoBenefits,
            timeline: timeline,
            priority_level: priorityLevel || 'Medium'  // <--- pass through or fallback
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
app.put('/api/enhancements/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            effortLevel, difficultyLevel, whoBenefits, timeline,
            status, priorityLevel, acceptedDeniedReason, documentationUpdated,
            storylanesUpdated, releaseNotes
        } = req.body;

        // Build update data object with all fields
        const updateData = {
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
            effort_level: effortLevel ? parseFloat(effortLevel) : null,
            difficulty_level: difficultyLevel,
            who_benefits: whoBenefits,
            timeline: timeline,
            status: status,
            priority_level: priorityLevel,
            accepted_denied_reason: acceptedDeniedReason,
            documentation_updated: documentationUpdated,
            storylanes_updated: storylanesUpdated,
            release_notes: releaseNotes,
            updated_at: new Date().toISOString()
        };

        console.log('Updating enhancement:', id, 'with data:', updateData);

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
            console.error('Update error:', error);
            throw error;
        }

        console.log('Successfully updated enhancement:', data);
        res.json({ message: 'Enhancement updated successfully', data });
    } catch (error) {
        console.error('Error updating enhancement:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete enhancement
app.delete('/api/enhancements/:id', authMiddleware, async (req, res) => {
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
app.get('/api/workflow/stats', authMiddleware, async (req, res) => {
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

// Slack Integration - Verify Slack request signature
function verifySlackRequest(req) {
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

    if (!slackSigningSecret) {
        console.error('❌ SLACK_SIGNING_SECRET not configured');
        return false;
    }

    const slackSignature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const body = req.rawBody; // We'll need to capture raw body

    if (!slackSignature || !timestamp) {
        console.log('❌ Missing Slack signature or timestamp');
        return false;
    }

    // Prevent replay attacks (ignore requests older than 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
        console.log('❌ Slack request timestamp too old');
        return false;
    }

    // Calculate expected signature
    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + crypto
        .createHmac('sha256', slackSigningSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');

    // Use timing-safe comparison
    const slackSigBuffer = Buffer.from(slackSignature, 'utf8');
    const mySigBuffer = Buffer.from(mySignature, 'utf8');

    if (slackSigBuffer.length !== mySigBuffer.length) {
        console.log('❌ Slack signature length mismatch');
        return false;
    }

    const isValid = crypto.timingSafeEqual(slackSigBuffer, mySigBuffer);
    console.log(isValid ? '✅ Slack signature verified' : '❌ Slack signature invalid');
    return isValid;
}

// Middleware to capture raw body for Slack signature verification
app.use('/api/slack/*', bodyParser.urlencoded({
    extended: true,
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));

// Slack Webhook - Create enhancement from Slack message
app.post('/api/slack/new-request', slackLimiter, async (req, res) => {
    try {
        console.log('📨 Slack webhook received');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);

        // Verify Slack request signature
        if (!verifySlackRequest(req)) {
            console.log('❌ Slack signature verification failed');
            return res.status(401).json({
                response_type: 'ephemeral',
                text: '❌ Invalid request signature'
            });
        }

        // Extract Slack data
        const { text, user_id, user_name, channel_name } = req.body;

        if (!text || text.trim() === '') {
            return res.status(200).json({
                response_type: 'ephemeral',
                text: '❌ Please provide a description for your enhancement request.\nUsage: `/new-request Your enhancement description here`'
            });
        }

        // Generate temporary request_id
        const tempRequestId = `SLACK-${Date.now()}`;

        // Prepare enhancement data with smart defaults
        const enhancementData = {
            request_id: tempRequestId,
            request_name: `Slack Request: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
            request_description: text.trim(),
            rationale: `Submitted via Slack by ${user_name || 'Unknown User'} (ID: ${user_id || 'N/A'}) - to be enriched`,
            requestor_name: user_name || 'Slack User',
            date_of_request: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
            stakeholder: channel_name || null,
            type_of_request: 'Enhancement (Feature)', // Default type
            area_of_product: 'Buyer Portal', // Default area - adjust as needed
            link_to_document: null,
            desire_level: 'Nice-to-have', // Default desire level
            effort_level: null, // To be filled later
            difficulty_level: null, // To be filled later
            who_benefits: 'Internal', // Default - to be updated later
            timeline: null,
            status: 'submitted',
            priority_level: 'Medium' // Default priority
        };

        console.log('Inserting Slack enhancement:', enhancementData);

        // Insert into database
        const { data, error } = await supabase
            .from('enhancements')
            .insert([enhancementData])
            .select()
            .single();

        if (error) {
            console.error('❌ Database error:', error);
            return res.status(200).json({
                response_type: 'ephemeral',
                text: `❌ Failed to create enhancement request: ${error.message}`
            });
        }

        // Update with final request_id
        const requestId = `REQ-${String(data.id).padStart(6, '0')}`;
        await supabase
            .from('enhancements')
            .update({ request_id: requestId })
            .eq('id', data.id);

        console.log(`✅ Created enhancement ${requestId} from Slack`);

        // Respond to Slack
        return res.status(200).json({
            response_type: 'ephemeral',
            text: `✅ Enhancement request created: *${requestId}*\n\n*Description:* ${text}\n\n_Note: This request has been created with default values. Please enrich it in the tracker webapp._`
        });

    } catch (error) {
        console.error('❌ Slack webhook error:', error);
        return res.status(200).json({
            response_type: 'ephemeral',
            text: `❌ An error occurred: ${error.message}`
        });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CSV Import endpoint
app.post('/api/enhancements/import-csv', authMiddleware, upload.single('csvFile'), async (req, res) => {
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
        
        // Process each row - start
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const rowNum = i + 1;
            
            try {
                // Validate required fields
                const requiredFields = [
                    'Request Name', 'Request Description', 'Requestor Name',
                    'Date of Request (DD-MM-YYYY)', 'Type of Request', 'Area of Product',
                    'Desire Level', 'Who Benefits'
                ];
                
                const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
                if (missingFields.length > 0) {
                    errors.push(`Row ${rowNum}: Missing required fields: ${missingFields.join(', ')}`);
                    failed++;
                    continue;
                }
                
                // Validate enum values
                const enumValidations = {
                    'Type of Request': ['Bug Fix', 'New Feature', 'Enhancement (UI)', 'Enhancement (Feature)'],
                    'Desire Level': ['Must-have', 'Nice-to-have'],
                    'Difficulty Level': ['Simple', 'Complex', 'Involved'],
                    'Who Benefits': ['Clients - procurement', 'Clients - end users', 'Suppliers', 'Internal'],
                    'Area of Product': ['Buyer Portal', 'Supplier Hub', 'Procurement', 'Guides', 'Documentation'],
                    'Priority Level': ['Critical', 'High', 'Medium', 'Low']
                };
                
                let validationErrors = [];
                for (const [field, validValues] of Object.entries(enumValidations)) {
                    if (row[field] && row[field].trim() !== '') {
                        let value = row[field].trim();
                        
                        if (field === 'Who Benefits') {
                            // CRITICAL FIX: Proper handling of quoted comma-separated values
                            console.log(`Processing Who Benefits for row ${rowNum}: "${value}"`);
                            
                            // Remove outer quotes if present (CSV formatting)
                            if (value.startsWith('"') && value.endsWith('"')) {
                                value = value.slice(1, -1);
                                console.log(`Removed quotes: "${value}"`);
                            }
                            
                            // Split by comma and clean each value
                            const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
                            console.log(`Split values:`, values);
                            
                            // Check for invalid values
                            const invalidValues = values.filter(v => !validValues.includes(v));
                            if (invalidValues.length > 0) {
                                validationErrors.push(`${field} contains invalid values: ${invalidValues.join(', ')}. Must be one or more of: ${validValues.join(', ')}`);
                                console.log(`Invalid values found:`, invalidValues);
                            }
                            
                            // Format for database (consistent spacing)
                            const formattedValue = values.join(', ');
                            row[field] = formattedValue; // Update the row data
                            console.log(`Final formatted value: "${formattedValue}"`);
                            
                        } else if (field === 'Priority Level') {
                            if (!validValues.includes(value)) {
                                validationErrors.push(`${field} must be one of: ${validValues.join(', ')}`);
                            }
                        } else {
                            if (!validValues.includes(value)) {
                                validationErrors.push(`${field} must be one of: ${validValues.join(', ')}`);
                            }
                        }
                    }
                }
                
                // Validate effort level if present
                if (row['Effort Level'] && row['Effort Level'].trim() !== '') {
                    const effortValue = parseFloat(row['Effort Level'].trim());
                    if (isNaN(effortValue) || effortValue < 0) {
                        validationErrors.push(`Effort Level must be a positive number`);
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
                
                // Convert due date if present
                let formattedTimeline = null;
                if (row['Due Date'] && row['Due Date'].trim() !== '') {
                    const timelineValue = row['Due Date'].trim();
                    if (timelineValue.includes('-')) {
                        const [tDay, tMonth, tYear] = timelineValue.split('-');
                        if (tDay && tMonth && tYear) {
                            formattedTimeline = `${tYear}-${tMonth}-${tDay}`;
                        }
                    } else {
                        formattedTimeline = timelineValue; // Assume it's already in correct format
                    }
                }
                
                // Prepare data for insertion with proper field mapping
                const enhancementData = {
                    request_name: row['Request Name'].trim(),
                    request_description: row['Request Description'].trim(),
                    rationale: row['Rationale'] && row['Rationale'].trim() !== '' ? row['Rationale'].trim() : 'Not specified',
                    requestor_name: row['Requestor Name'].trim(),
                    date_of_request: formattedDate,
                    stakeholder: row['Benefactor'] ? row['Benefactor'].trim() : null, // Note: CSV uses "Benefactor" but DB uses "stakeholder"
                    type_of_request: row['Type of Request'].trim(),
                    area_of_product: row['Area of Product'].trim(),
                    link_to_document: row['Link to Document'] ? row['Link to Document'].trim() : null,
                    desire_level: row['Desire Level'].trim(),
                    effort_level: row['Effort Level'] ? parseFloat(row['Effort Level'].trim()) : null,
                    difficulty_level: row['Difficulty Level'] ? row['Difficulty Level'].trim() : null,
                    who_benefits: row['Who Benefits'].trim(), // This now contains the properly formatted value
                    timeline: formattedTimeline,
                    status: 'submitted',
                    priority_level: row['Priority Level'] ? row['Priority Level'].trim() : 'Medium'
                };
                
                console.log(`Inserting row ${rowNum} with who_benefits: "${enhancementData.who_benefits}"`);
                
                // Insert into database
                const { data, error } = await supabase
                    .from('enhancements')
                    .insert([enhancementData])
                    .select();
                
                if (error) {
                    console.error(`Database error for row ${rowNum}:`, error);
                    console.error(`Data that caused error:`, enhancementData);
                    errors.push(`Row ${rowNum}: Database error - ${error.message}`);
                    failed++;
                } else {
                    // Generate request_id after successful insert
                    const requestId = `REQ-${String(data[0].id).padStart(6, '0')}`;
                    await supabase
                        .from('enhancements')
                        .update({ request_id: requestId })
                        .eq('id', data[0].id);
                    
                    console.log(`Successfully inserted row ${rowNum} with ID ${data[0].id}`);
                    successful++;
                }
                
            } catch (error) {
                console.error(`Error processing row ${rowNum}:`, error);
                errors.push(`Row ${rowNum}: ${error.message}`);
                failed++;
            }
        } // Process each row - end
        
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
module.exports = app;

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});