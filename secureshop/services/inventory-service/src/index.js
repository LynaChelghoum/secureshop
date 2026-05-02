const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const PORT = 8006;

const db = new Database('./inventory.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT PRIMARY KEY,
    stock INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0
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
  res.json({ status: 'ok', service: 'inventory-service' });
});

app.get('/inventory/:productId', authenticate, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE product_id = ?')
    .get(req.params.productId);
  if (!item) return res.status(404).json({ error: 'Product not found in inventory' });
  res.json({ product_id: item.product_id, available: item.stock - item.reserved });
});

app.post('/inventory/:productId/reserve', authenticate, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });
  const item = db.prepare('SELECT * FROM inventory WHERE product_id = ?')
    .get(req.params.productId);
  if (!item || (item.stock - item.reserved) < quantity) {
    return res.status(409).json({ error: 'Insufficient stock' });
  }
  db.prepare('UPDATE inventory SET reserved = reserved + ? WHERE product_id = ?')
    .run(quantity, req.params.productId);
  res.json({ message: 'Reserved', product_id: req.params.productId, quantity });
});

app.post('/inventory/:productId/release', authenticate, (req, res) => {
  const { quantity } = req.body;
  db.prepare('UPDATE inventory SET reserved = MAX(0, reserved - ?) WHERE product_id = ?')
    .run(quantity, req.params.productId);
  res.json({ message: 'Released', product_id: req.params.productId, quantity });
});

app.listen(PORT, () => console.log(`Inventory service listening on port ${PORT}`));
