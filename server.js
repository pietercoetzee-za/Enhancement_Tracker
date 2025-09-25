const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:"],
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

// Database setup
const db = new sqlite3.Database('./enhancements.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS enhancements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requestName TEXT NOT NULL,
            requestDescription TEXT NOT NULL,
            rationale TEXT NOT NULL,
            requestorName TEXT NOT NULL,
            dateOfRequest TEXT NOT NULL,
            stakeholder TEXT,
            typeOfRequest TEXT NOT NULL,
            areaOfProduct TEXT NOT NULL,
            linkToDocument TEXT,
            desireLevel TEXT NOT NULL,
            impactLevel TEXT NOT NULL,
            difficultyLevel TEXT,
            whoBenefits TEXT NOT NULL,
            status TEXT DEFAULT 'submitted',
            priorityLevel TEXT DEFAULT 'medium',
            acceptedDeniedReason TEXT,
            timeline TEXT,
            documentationUpdated BOOLEAN DEFAULT 0,
            storylanesUpdated BOOLEAN DEFAULT 0,
            releaseNotes BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Database table initialized');
            // Insert sample data if table is empty
            db.get("SELECT COUNT(*) as count FROM enhancements", (err, row) => {
                if (err) {
                    console.error('Error checking table:', err.message);
                } else if (row.count === 0) {
                    insertSampleData();
                }
            });
        }
    });
}

// Insert sample data
function insertSampleData() {
    const sampleData = [
        {
            requestName: "Mobile App Dark Mode",
            requestDescription: "Implement dark mode theme for mobile application",
            rationale: "User feedback indicates strong preference for dark mode, especially for night usage",
            requestorName: "Sarah Johnson",
            dateOfRequest: "2025-01-20",
            stakeholder: "Product Team",
            typeOfRequest: "feature",
            areaOfProduct: "mobile",
            linkToDocument: "https://docs.company.com/dark-mode-spec",
            desireLevel: "high",
            impactLevel: "medium",
            difficultyLevel: "medium",
            whoBenefits: "end-users",
            status: "development",
            priorityLevel: "high",
            acceptedDeniedReason: "Approved due to high user demand",
            timeline: "3 weeks"
        },
        {
            requestName: "API Rate Limiting",
            requestDescription: "Add rate limiting to prevent API abuse",
            rationale: "Current API has no protection against excessive requests, causing performance issues",
            requestorName: "Mike Chen",
            dateOfRequest: "2025-01-18",
            stakeholder: "DevOps Team",
            typeOfRequest: "enhancement",
            areaOfProduct: "api",
            linkToDocument: "",
            desireLevel: "critical",
            impactLevel: "high",
            difficultyLevel: "medium",
            whoBenefits: "all",
            status: "review",
            priorityLevel: "high",
            acceptedDeniedReason: "",
            timeline: "1 week"
        }
    ];

    const insertQuery = `
        INSERT INTO enhancements (
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            impactLevel, difficultyLevel, whoBenefits, status, priorityLevel,
            acceptedDeniedReason, timeline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    sampleData.forEach(data => {
        db.run(insertQuery, [
            data.requestName, data.requestDescription, data.rationale, data.requestorName,
            data.dateOfRequest, data.stakeholder, data.typeOfRequest, data.areaOfProduct,
            data.linkToDocument, data.desireLevel, data.impactLevel, data.difficultyLevel,
            data.whoBenefits, data.status, data.priorityLevel, data.acceptedDeniedReason, data.timeline
        ]);
    });
}

// API Routes

// Get all enhancements
app.get('/api/enhancements', (req, res) => {
    const { status, search } = req.query;
    let query = 'SELECT * FROM enhancements';
    let params = [];

    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }

    if (search) {
        const searchCondition = status ? ' AND' : ' WHERE';
        query += `${searchCondition} (requestName LIKE ? OR requestDescription LIKE ? OR requestorName LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY createdAt DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get enhancement by ID
app.get('/api/enhancements/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM enhancements WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Enhancement not found' });
            return;
        }
        res.json(row);
    });
});

// Create new enhancement
app.post('/api/enhancements', (req, res) => {
    const {
        requestName, requestDescription, rationale, requestorName, dateOfRequest,
        stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
        impactLevel, difficultyLevel, whoBenefits, timeline
    } = req.body;

    const query = `
        INSERT INTO enhancements (
            requestName, requestDescription, rationale, requestorName, dateOfRequest,
            stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
            impactLevel, difficultyLevel, whoBenefits, timeline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        requestName, requestDescription, rationale, requestorName, dateOfRequest,
        stakeholder, typeOfRequest, areaOfProduct, linkToDocument, desireLevel,
        impactLevel, difficultyLevel, whoBenefits, timeline
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Enhancement created successfully' });
    });
});

// Update enhancement
app.put('/api/enhancements/:id', (req, res) => {
    const { id } = req.params;
    const {
        status, priorityLevel, acceptedDeniedReason, documentationUpdated,
        storylanesUpdated, releaseNotes
    } = req.body;

    const query = `
        UPDATE enhancements 
        SET status = ?, priorityLevel = ?, acceptedDeniedReason = ?, 
            documentationUpdated = ?, storylanesUpdated = ?, releaseNotes = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(query, [
        status, priorityLevel, acceptedDeniedReason, documentationUpdated,
        storylanesUpdated, releaseNotes, id
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Enhancement not found' });
            return;
        }
        res.json({ message: 'Enhancement updated successfully' });
    });
});

// Delete enhancement
app.delete('/api/enhancements/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM enhancements WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Enhancement not found' });
            return;
        }
        res.json({ message: 'Enhancement deleted successfully' });
    });
});

// Get workflow statistics
app.get('/api/workflow/stats', (req, res) => {
    const query = `
        SELECT status, COUNT(*) as count 
        FROM enhancements 
        GROUP BY status
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
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
    const server = app.listen(PORT, () => {
        console.log(`🚀 Enhancement Tracker server running on http://localhost:${PORT}`);
        console.log(`📱 Access from any device on your network: http://[YOUR_IP]:${PORT}`);
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
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
