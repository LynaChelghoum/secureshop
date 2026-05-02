const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const PORT = 8004;

const db = new Database('./payments.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.post('/payments', authenticate, (req, res) => {
  const { order_id, amount } = req.body;
  if (!order_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'order_id and positive amount required' });
  }
  const id = uuidv4();
  // Simulate payment processing
  const status = 'completed';
  db.prepare(
    'INSERT INTO transactions (id, order_id, user_id, amount, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, order_id, req.user.sub, amount, status);

  res.status(201).json({ transaction_id: id, status, amount });
});

app.get('/payments/:orderId', authenticate, (req, res) => {
  const tx = db.prepare(
    'SELECT * FROM transactions WHERE order_id = ? AND user_id = ?'
  ).get(req.params.orderId, req.user.sub);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

app.listen(PORT, () => console.log(`Payment service listening on port ${PORT}`));
