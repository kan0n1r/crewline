require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    role TEXT,
    email TEXT
  )`);
  db.run(`CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    owner_id INTEGER
  )`);
  db.run(`CREATE TABLE deals (
    id INTEGER PRIMARY KEY,
    title TEXT,
    amount REAL,
    customer_id INTEGER,
    status TEXT
  )`);

  db.run(`INSERT INTO users VALUES (1, 'admin', 'admin123', 'admin', 'admin@crm.local')`);
  db.run(`INSERT INTO users VALUES (2, 'alice', 'alice123', 'user', 'alice@crm.local')`);
  db.run(`INSERT INTO users VALUES (3, 'bob', 'bob123', 'user', 'bob@crm.local')`);
  db.run(`INSERT INTO customers VALUES (1, 'Acme Corp', 'contact@acme.com', '+380501112233', 'Important client', 1)`);
  db.run(`INSERT INTO customers VALUES (2, 'Beta LLC', 'info@beta.com', '+380672223344', 'Follow up next week', 2)`);
  db.run(`INSERT INTO customers VALUES (3, 'Gamma Inc', 'hello@gamma.io', '+380933334455', 'Potential upsell', 3)`);
  db.run(`INSERT INTO deals VALUES (1, 'Enterprise license', 15000, 1, 'negotiation')`);
  db.run(`INSERT INTO deals VALUES (2, 'Support package', 3200, 2, 'won')`);
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

function getUserFromToken(req) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  db.get(query, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('token', token, { httpOnly: false });
    res.json({
      message: 'Logged in',
      user: { id: user.id, username: user.username, role: user.role },
      token
    });
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user });
});

app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/customers/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM customers WHERE id = ${id}`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.get('/api/search', (req, res) => {
  const q = req.query.q || '';
  db.all(
    `SELECT * FROM customers WHERE name LIKE '%${q}%' OR notes LIKE '%${q}%'`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.send(`
        <html><body>
          <h2>Search results for: ${q}</h2>
          <pre>${JSON.stringify(rows, null, 2)}</pre>
          <a href="/">Back</a>
        </body></html>
      `);
    }
  );
});

app.post('/api/customers/:id/notes', (req, res) => {
  const { notes } = req.body;
  const id = req.params.id;
  db.run(`UPDATE customers SET notes = '${notes}' WHERE id = ${id}`, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Notes updated', id, changes: this.changes });
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const original = req.file.originalname;
  const target = path.join('uploads', original);
  try {
    fs.renameSync(req.file.path, target);
    res.json({ message: 'Uploaded', path: target, originalName: original });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/export', (req, res) => {
  const format = req.query.format || 'csv';
  exec(
    `echo "id,name,email" > /tmp/report.${format} && cat /tmp/report.${format}`,
    (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: err.message, stderr });
      res.type('text/plain').send(stdout);
    }
  );
});

app.get('/api/debug', (req, res) => {
  res.json({
    env: process.env,
    jwtSecret: JWT_SECRET,
    slackWebhook: process.env.SLACK_WEBHOOK,
    powerbiToken: process.env.POWERBI_TOKEN,
    googleDriveToken: process.env.GOOGLE_DRIVE_TOKEN,
    nodeVersion: process.version,
    cwd: process.cwd()
  });
});

app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, password, role, email FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/integrations/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const response = await axios.get(url, { timeout: 5000, maxRedirects: 5 });
    res.json({
      status: response.status,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data.slice(0, 2000) : response.data
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/integrations/slack', (req, res) => {
  const { message, channel } = req.body;
  console.log('[Slack]', { channel, message });
  res.json({
    ok: true,
    channel: channel || '#general',
    sent: message,
    webhook: process.env.SLACK_WEBHOOK
  });
});

app.get('/api/integrations/powerbi', (req, res) => {
  res.json({
    dashboard: 'Sales Overview',
    embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=fake-report-id',
    accessToken: process.env.POWERBI_TOKEN || 'fake-powerbi-token-abc123',
    lastRefresh: new Date().toISOString()
  });
});

app.get('/api/integrations/gdrive', (req, res) => {
  const folder = req.query.folder || 'root';
  res.json({
    folder,
    files: [
      { id: '1a', name: 'Q3-Report.pdf', mimeType: 'application/pdf' },
      { id: '1b', name: 'Contracts.docx', mimeType: 'application/vnd.openxmlformats' }
    ],
    accessToken: process.env.GOOGLE_DRIVE_TOKEN || 'fake-gdrive-token-xyz789'
  });
});

app.post('/api/users/update', (req, res) => {
  const user = getUserFromToken(req);
  const { id, username, email, role, password } = req.body;
  const targetId = id || (user && user.id) || 2;

  const updates = [];
  if (username !== undefined) updates.push(`username = '${username}'`);
  if (email !== undefined) updates.push(`email = '${email}'`);
  if (role !== undefined) updates.push(`role = '${role}'`);
  if (password !== undefined) updates.push(`password = '${password}'`);

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ${targetId}`;
  db.run(sql, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User updated', id: targetId, changes: this.changes });
  });
});

app.get('/api/deals', (req, res) => {
  db.all(
    `SELECT d.*, c.name as customer_name FROM deals d LEFT JOIN customers c ON d.customer_id = c.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'team-crm' });
});

app.listen(PORT, () => {
  console.log(`Team CRM running on http://localhost:${PORT}`);
});
