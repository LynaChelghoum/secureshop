const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const PORT = 8003;

const db = new Database('./orders.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
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
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function publishEvent(event) {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue('order_events', { durable: true });
    channel.sendToQueue('order_events', Buffer.from(JSON.stringify(event)));
    await channel.close();
    await conn.close();
  } catch (err) {
    console.error('RabbitMQ publish error:', err.message);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.post('/orders', authenticate, async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const id = uuidv4();
  db.prepare(
    'INSERT INTO orders (id, user_id, items, total) VALUES (?, ?, ?, ?)'
  ).run(id, req.user.sub, JSON.stringify(items), total);

  await publishEvent({ type: 'ORDER_CREATED', orderId: id, userId: req.user.sub, total });

  res.status(201).json({ message: 'Order created', id, total });
});

app.get('/orders', authenticate, (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.sub);
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

app.get('/orders/:id', authenticate, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.user.sub) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ ...order, items: JSON.parse(order.items) });
});

app.listen(PORT, () => console.log(`Order service listening on port ${PORT}`));
