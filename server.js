const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// التأكد من وجود مجلد للداتا
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// إعداد قاعدة البيانات (ملف محلي)
const dbPath = path.resolve(__dirname, 'data', 'orders.db');
const db = new sqlite3.Database(dbPath);

// إنشاء الجدول إذا لم يكن موجوداً
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        address TEXT,
        product TEXT,
        status TEXT DEFAULT 'new',
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // للملفات الثابتة (HTML/CSS)

// API: استقبال الطلب
app.post('/api/order', (req, res) => {
    const { name, phone, address, product } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ error: 'الاسم والهاتف ضروريان' });
    }

    const stmt = db.prepare("INSERT INTO orders (name, phone, address, product) VALUES (?, ?, ?, ?)");
    stmt.run(name, phone, address, product || 'منتج عام', function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
        console.log(`New Order: ${name} - ${phone}`);
    });
    stmt.finalize();
});

// API: عرض الطلبات (سنحتاجها لاحقاً للوحة التحكم)
app.get('/api/orders', (req, res) => {
    // حماية بسيطة جداً (سنحسنها لاحقاً)
    const secret = req.query.secret;
    if(secret !== 'admin123') return res.status(403).send("غير مسموح");

    db.all("SELECT * FROM orders ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
