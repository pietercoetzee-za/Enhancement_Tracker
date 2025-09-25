// Backup script for Enhancement Tracker data
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create backup directory
const backupDir = './backups';
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Backup SQLite database
function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `enhancements-backup-${timestamp}.db`);
    
    // Copy database file
    fs.copyFileSync('./enhancements.db', backupFile);
    console.log(`✅ Database backed up to: ${backupFile}`);
    
    return backupFile;
}

// Export data to JSON
function exportToJSON() {
    const db = new sqlite3.Database('./enhancements.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = path.join(backupDir, `enhancements-export-${timestamp}.json`);
    
    db.all('SELECT * FROM enhancements', [], (err, rows) => {
        if (err) {
            console.error('Error exporting data:', err);
            return;
        }
        
        fs.writeFileSync(jsonFile, JSON.stringify(rows, null, 2));
        console.log(`✅ Data exported to JSON: ${jsonFile}`);
        console.log(`📊 Exported ${rows.length} enhancement requests`);
        
        db.close();
    });
}

// Run backup
console.log('🔄 Starting data backup...');
backupDatabase();
exportToJSON();
console.log('✅ Backup completed!');
