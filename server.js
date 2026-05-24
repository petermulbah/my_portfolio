const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));

// Database configuration
const dbConfig = {
    server: 'localhost',
    database: 'PortfolioMessages',
    user: 'PortfolioUser',
    password: 'YourStrongPassword123!',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

// ============================================
// TEST ROUTE - Visit: http://localhost:3000/api/test-db
// ============================================
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing database connection...');
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .query('SELECT DB_NAME() as dbName, @@VERSION as version');
        
        console.log('Connected! Database:', result.recordset[0].dbName);
        
        res.json({
            success: true,
            message: 'Database connection successful!',
            database: result.recordset[0].dbName,
            sqlVersion: result.recordset[0].version
        });
        
    } catch (err) {
        console.error('Database test failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            code: err.code || 'UNKNOWN'
        });
    }
});

// ============================================
// CONTACT FORM ROUTE
// ============================================
app.post('/api/contact', async (req, res) => {
    console.log('\n📨 Received form data:', req.body);
    
    try {
        const { name, email, subject, message } = req.body;
        
        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }

        // Connect and insert
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('name', sql.NVarChar(100), name)
            .input('email', sql.NVarChar(255), email)
            .input('subject', sql.NVarChar(200), subject)
            .input('message', sql.NVarChar(sql.MAX), message)
            .query(`
                INSERT INTO ContactMessages (Name, Email, Subject, Message)
                OUTPUT INSERTED.MessageID, INSERTED.CreatedAt
                VALUES (@name, @email, @subject, @message)
            `);

        console.log('✅ Saved to database! ID:', result.recordset[0].MessageID);
        
        res.json({ 
            success: true, 
            message: 'Message saved to database!',
            messageId: result.recordset[0].MessageID,
            createdAt: result.recordset[0].CreatedAt
        });

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// GET ALL MESSAGES ROUTE
// ============================================
app.get('/api/messages', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM ContactMessages ORDER BY CreatedAt DESC');
        
        res.json({ 
            success: true, 
            count: result.recordset.length,
            data: result.recordset 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`\nTest database: http://localhost:${PORT}/api/test-db`);
    console.log(`Submit form to: http://localhost:${PORT}/api/contact`);
    console.log(`View messages: http://localhost:${PORT}/api/messages\n`);
});