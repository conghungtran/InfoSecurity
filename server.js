const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super_secret_key_123'; // ❌ Hardcoded secret (bad practice)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// Middleware: parse JWT from cookie
// ─────────────────────────────────────────────
function getUser(req) {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  req.user = user;
  next();
}

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// ❌ VULNERABILITY #1: SQL INJECTION
// Input không được sanitize, trực tiếp ghép vào câu SQL
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // 🔴 SQL INJECTION: username và password được ghép thẳng vào query!
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  console.log('[SQL-INJECTION DEMO] Query:', query);

  let user;
  try {
    user = db.prepare(query).get();
  } catch (err) {
    // Trả về lỗi SQL thẳng cho client - leak thông tin cấu trúc DB!
    return res.status(400).json({ error: 'SQL Error: ' + err.message });
  }

  if (!user) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('token', token, { httpOnly: true });
  res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin' });

  try {
    db.prepare(`INSERT INTO users (username, password, email, balance) VALUES (?, ?, ?, ?)`)
      .run(username, password, email || '', 100);
    res.json({ success: true, message: 'Đăng ký thành công! Bạn nhận được 100$ khởi đầu.' });
  } catch (err) {
    res.status(400).json({ error: 'Username đã tồn tại' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUser(req);
  if (!user) return res.json({ loggedIn: false });
  const dbUser = db.prepare('SELECT id, username, email, role, balance FROM users WHERE id = ?').get(user.id);
  res.json({ loggedIn: true, user: dbUser });
});

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────
app.get('/api/accounts', (req, res) => {
  const { game } = req.query;
  let accounts;
  if (game) {
    accounts = db.prepare('SELECT * FROM accounts WHERE game = ? AND stock > 0').all(game);
  } else {
    accounts = db.prepare('SELECT * FROM accounts WHERE stock > 0').all();
  }
  res.json(accounts);
});

app.get('/api/accounts/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  res.json(account);
});

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

// ❌ VULNERABILITY #2: IDOR (Insecure Direct Object Reference)
// Không kiểm tra order thuộc về user nào → ai cũng xem được order của người khác!
app.get('/api/orders/:orderId', requireAuth, (req, res) => {
  const { orderId } = req.params;

  // 🔴 IDOR: Không check req.user.id === order.user_id
  // Bất kỳ user đang đăng nhập nào cũng có thể xem order của người khác
  const order = db.prepare(`
    SELECT o.*, a.title as account_title, a.game, u.username as buyer
    FROM orders o
    JOIN accounts a ON o.account_id = a.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(orderId);

  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

  // account_credentials chứa username/password của account đã mua - rất nhạy cảm!
  res.json(order);
});

// Lấy danh sách orders của chính mình
app.get('/api/my-orders', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.total_price, o.status, o.created_at, a.title, a.game
    FROM orders o
    JOIN accounts a ON o.account_id = a.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json(orders);
});

app.post('/api/orders', requireAuth, (req, res) => {
  const { account_id } = req.body;
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
  if (!account || account.stock < 1) return res.status(400).json({ error: 'Sản phẩm không khả dụng' });

  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (dbUser.balance < account.price) return res.status(400).json({ error: 'Số dư không đủ' });

  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(account.price, req.user.id);
  db.prepare('UPDATE accounts SET stock = stock - 1 WHERE id = ?').run(account_id);

  const result = db.prepare(
    `INSERT INTO orders (user_id, account_id, total_price, account_credentials) VALUES (?, ?, ?, ?)`
  ).run(req.user.id, account_id, account.price, JSON.stringify({ username: 'demo_acc_' + account_id, password: 'Demo@Pass#' + account_id }));

  res.json({ success: true, orderId: result.lastInsertRowid, message: 'Mua hàng thành công!' });
});

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────

// ❌ VULNERABILITY #3: XSS (Cross-Site Scripting)
// Content của review được lưu và render thẳng vào HTML mà không escape
app.post('/api/reviews', requireAuth, (req, res) => {
  const { account_id, content, rating } = req.body;
  if (!account_id || !content) return res.status(400).json({ error: 'Thiếu thông tin' });

  // 🔴 XSS: content không được sanitize. Kẻ tấn công có thể inject <script> tag!
  db.prepare(`INSERT INTO reviews (user_id, account_id, content, rating) VALUES (?, ?, ?, ?)`)
    .run(req.user.id, account_id, content, rating || 5);

  res.json({ success: true });
});

// 🔴 XSS: API trả về content thô, frontend sẽ dùng innerHTML để render → XSS!
app.get('/api/reviews/:accountId', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.username
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.account_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.accountId);
  res.json(reviews);
});

// ─────────────────────────────────────────────
// ADMIN (bonus)
// ─────────────────────────────────────────────
app.get('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const users = db.prepare('SELECT id, username, email, role, balance FROM users').all();
  res.json(users);
});

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛒 Account Shop running at http://localhost:${PORT}`);
  console.log('⚠️  This app is INTENTIONALLY VULNERABLE for security training!\n');
});
