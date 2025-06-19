const express = require('express');
const mariadb = require('mariadb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'lechibang', // Change this to your database user
    password: '1212', // Change this to your database password
    database: 'master_specs_db',
    connectionLimit: 5,
    bigIntAsNumber: true  // Convert BigInt to Number
};

// Create connection pool
const pool = mariadb.createPool(dbConfig);

// Helper function to convert BigInt values to numbers
function convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'bigint') {
        return Number(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToNumber);
    }
    
    if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntToNumber(value);
        }
        return converted;
    }
    
    return obj;
}

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes

// Home page - display all phone specs
app.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        
        let query = 'SELECT * FROM phone_specs';
        let countQuery = 'SELECT COUNT(*) as total FROM phone_specs';
        let params = [];
        
        if (search) {
            query += ' WHERE sm_name LIKE ? OR sm_maker LIKE ?';
            countQuery += ' WHERE sm_name LIKE ? OR sm_maker LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }
        
        // Get total count
        const countResult = await conn.query(countQuery, params);
        const total = convertBigIntToNumber(countResult[0].total);
        
        // Get paginated results
        query += ' ORDER BY id LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const phonesResult = await conn.query(query, params);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('index', {
            phones,
            currentPage: page,
            totalPages,
            limit,
            search,
            total
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', { error: 'Database connection failed' });
    }
});

// Phone details page
app.get('/phone/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [req.params.id]);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        
        if (phones.length === 0) {
            return res.status(404).render('error', { error: 'Phone not found' });
        }
        
        res.render('details', { phone: phones[0] });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', { error: 'Database connection failed' });
    }
});

// API endpoint to get all phones (JSON)
app.get('/api/phones', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs');
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        res.json(phones);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// API endpoint to get phone by ID (JSON)
app.get('/api/phones/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [req.params.id]);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        
        if (phones.length === 0) {
            return res.status(404).json({ error: 'Phone not found' });
        }
        
        res.json(phones[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { error: 'Page not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});
