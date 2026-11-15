require('dotenv').config();
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const allowedServices = new Set([
  'Full move (pack, load & transport)',
  'Packing only',
  'Loading / unloading only',
  'Storage'
]);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const quoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many quote requests. Please try again in 15 minutes.' }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'movemate-api' }));

app.post('/api/quotes', quoteLimiter, (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 25);
  const from = clean(body.from, 160);
  const to = clean(body.to, 160);
  const service = clean(body.service, 100);
  const message = clean(body.message, 2000);
  const date = body.date ? clean(body.date, 10) : null;

  if (!name || name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!phone || !/^[+0-9() .-]{7,25}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!from || !to) return res.status(400).json({ error: 'Please enter both moving locations.' });
  if (!allowedServices.has(service)) return res.status(400).json({ error: 'Please choose a valid service.' });
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) {
    return res.status(400).json({ error: 'Please enter a valid moving date.' });
  }

  try {
    const insert = db.prepare(`INSERT INTO quotes (name, phone, from_location, to_location, move_date, service, message)
      VALUES (@name, @phone, @from, @to, @date, @service, @message)`);
    const result = insert.run({ name, phone, from, to, date, service, message: message || null });
    return res.status(201).json({ message: 'Quote request received.', id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error('Quote save failed:', error);
    return res.status(500).json({ error: 'Unable to save your request right now. Please try again.' });
  }
});

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'Admin access is not configured. Set ADMIN_TOKEN on the server.' });
  const supplied = req.get('authorization') || '';
  if (supplied !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

// Admin: GET /api/admin/quotes?status=new&limit=50
app.get('/api/admin/quotes', requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
  const status = req.query.status;
  const validStatuses = ['new', 'contacted', 'quoted', 'booked', 'closed'];
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
  const rows = status
    ? db.prepare('SELECT * FROM quotes WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit)
    : db.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json({ quotes: rows });
});

// Admin: PATCH /api/admin/quotes/:id with { "status": "contacted" }
app.patch('/api/admin/quotes/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const status = req.body && req.body.status;
  const validStatuses = ['new', 'contacted', 'quoted', 'booked', 'closed'];
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid quote ID.' });
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const result = db.prepare("UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  if (!result.changes) return res.status(404).json({ error: 'Quote not found.' });
  res.json({ message: 'Quote status updated.', id, status });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

app.listen(PORT, () => console.log(`MoveMate server listening on port ${PORT}`));
