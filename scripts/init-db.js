const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database with sample data
const db = new sqlite3.Database('./enhancements.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

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
            process.exit(1);
        } else {
            console.log('Database table initialized');
            insertSampleData();
        }
    });
}

function insertSampleData() {
    const sampleData = [
        {
            requestName: "Mobile App Dark Mode",
            requestDescription: "Implement dark mode theme for mobile application to improve user experience during night usage",
            rationale: "User feedback indicates strong preference for dark mode, especially for night usage. This will reduce eye strain and improve battery life on OLED displays.",
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
            acceptedDeniedReason: "Approved due to high user demand and positive impact on user experience",
            timeline: "3 weeks"
        },
        {
            requestName: "API Rate Limiting",
            requestDescription: "Add rate limiting to prevent API abuse and ensure fair usage across all clients",
            rationale: "Current API has no protection against excessive requests, causing performance issues and potential service degradation for other users.",
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
        },
        {
            requestName: "Database Query Optimization",
            requestDescription: "Optimize slow database queries to improve application performance",
            rationale: "Several database queries are taking too long to execute, causing timeouts and poor user experience. This optimization will improve overall system performance.",
            requestorName: "Alex Rodriguez",
            dateOfRequest: "2025-01-15",
            stakeholder: "Backend Team",
            typeOfRequest: "performance",
            areaOfProduct: "database",
            linkToDocument: "https://docs.company.com/query-optimization",
            desireLevel: "high",
            impactLevel: "high",
            difficultyLevel: "hard",
            whoBenefits: "end-users",
            status: "backlog",
            priorityLevel: "medium",
            acceptedDeniedReason: "Added to backlog for next sprint planning",
            timeline: "2 weeks"
        },
        {
            requestName: "User Dashboard Redesign",
            requestDescription: "Redesign the user dashboard with modern UI components and improved navigation",
            rationale: "Current dashboard feels outdated and doesn't provide optimal user experience. New design will improve usability and user satisfaction.",
            requestorName: "Emma Wilson",
            dateOfRequest: "2025-01-12",
            stakeholder: "Design Team",
            typeOfRequest: "ui",
            areaOfProduct: "frontend",
            linkToDocument: "https://figma.com/dashboard-redesign",
            desireLevel: "medium",
            impactLevel: "medium",
            difficultyLevel: "medium",
            whoBenefits: "end-users",
            status: "testing",
            priorityLevel: "medium",
            acceptedDeniedReason: "Design approved, moved to testing phase",
            timeline: "4 weeks"
        },
        {
            requestName: "Automated Backup System",
            requestDescription: "Implement automated daily backups for all critical data",
            rationale: "Current manual backup process is error-prone and time-consuming. Automated system will ensure data safety and reduce operational overhead.",
            requestorName: "David Kim",
            dateOfRequest: "2025-01-10",
            stakeholder: "Infrastructure Team",
            typeOfRequest: "enhancement",
            areaOfProduct: "infrastructure",
            linkToDocument: "",
            desireLevel: "critical",
            impactLevel: "high",
            difficultyLevel: "complex",
            whoBenefits: "internal-team",
            status: "complete",
            priorityLevel: "urgent",
            acceptedDeniedReason: "Critical for data safety, approved immediately",
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

    let completed = 0;
    sampleData.forEach((data, index) => {
        db.run(insertQuery, [
            data.requestName, data.requestDescription, data.rationale, data.requestorName,
            data.dateOfRequest, data.stakeholder, data.typeOfRequest, data.areaOfProduct,
            data.linkToDocument, data.desireLevel, data.impactLevel, data.difficultyLevel,
            data.whoBenefits, data.status, data.priorityLevel, data.acceptedDeniedReason, data.timeline
        ], function(err) {
            if (err) {
                console.error('Error inserting sample data:', err.message);
            } else {
                console.log(`Inserted sample data ${index + 1}/${sampleData.length}`);
            }
            completed++;
            if (completed === sampleData.length) {
                console.log('✅ Database initialization complete!');
                db.close();
            }
        });
    });
}

