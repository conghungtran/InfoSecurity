const Database = require('better-sqlite3');
const db = new Database('./shop.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    balance REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    game TEXT NOT NULL,
    rank TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 1,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    account_credentials TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
`);

// Seed data
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  db.prepare(`INSERT INTO users (username, password, email, role, balance) VALUES (?, ?, ?, ?, ?)`)
    .run('admin', 'admin123', 'admin@shop.com', 'admin', 9999);

  db.prepare(`INSERT INTO users (username, password, email, role, balance) VALUES (?, ?, ?, ?, ?)`)
    .run('alice', 'alice123', 'alice@gmail.com', 'user', 500);

  db.prepare(`INSERT INTO users (username, password, email, role, balance) VALUES (?, ?, ?, ?, ?)`)
    .run('bob', 'bob123', 'bob@gmail.com', 'user', 200);

  db.prepare(`INSERT INTO users (username, password, email, role, balance) VALUES (?, ?, ?, ?, ?)`)
    .run('charlie', 'charlie123', 'charlie@gmail.com', 'user', 350);

  // Accounts for sale
  const accounts = [
    ['Valorant Diamond III', 'Account Valorant rank Diamond III, 85 skins, 200 win.', 'Valorant', 'Diamond III', 180, 3, '/img/valorant.svg'],
    ['LMHT Thách Đấu', 'Account Liên Minh Huyền Thoại rank Thách Đấu, 120 champions.', 'LMHT', 'Thách Đấu', 450, 2, '/img/lol.svg'],
    ['CS2 Global Elite', 'Counter-Strike 2, Global Elite rank, 2500 hours, Prime Status.', 'CS2', 'Global Elite', 320, 1, '/img/cs2.svg'],
    ['Genshin Impact AR60', 'Genshin Impact Adventure Rank 60, Raiden Shogun C2, Hu Tao C1.', 'Genshin Impact', 'AR 60', 550, 2, '/img/genshin.svg'],
    ['Valorant Bronze II', 'Account mới, Valorant rank Bronze II, 10 skins cơ bản.', 'Valorant', 'Bronze II', 35, 5, '/img/valorant.svg'],
    ['LMHT Vàng I', 'Account LMHT rank Vàng I, 80 champions, 15 skin.', 'LMHT', 'Vàng I', 95, 4, '/img/lol.svg'],
  ];
  const insAcc = db.prepare(`INSERT INTO accounts (title, description, game, rank, price, stock, image_url) VALUES (?,?,?,?,?,?,?)`);
  accounts.forEach(a => insAcc.run(...a));

  // Seed orders with sensitive credentials
  db.prepare(`INSERT INTO orders (user_id, account_id, total_price, status, account_credentials) VALUES (?,?,?,?,?)`)
    .run(2, 1, 180, 'completed', '{"username":"valorant_acc_diamond","password":"V@l0rant#2024!"}');
  db.prepare(`INSERT INTO orders (user_id, account_id, total_price, status, account_credentials) VALUES (?,?,?,?,?)`)
    .run(3, 3, 320, 'completed', '{"username":"cs2_globalelite","password":"CS2#G10b@lEl1te"}');
  db.prepare(`INSERT INTO orders (user_id, account_id, total_price, status, account_credentials) VALUES (?,?,?,?,?)`)
    .run(4, 2, 450, 'completed', '{"username":"lol_challen","password":"L0L!Ch@ll3ng3r"}');

  // Seed reviews
  db.prepare(`INSERT INTO reviews (user_id, account_id, content, rating) VALUES (?,?,?,?)`)
    .run(2, 1, 'Account chất lượng, giao hàng nhanh! Rất hài lòng 🔥', 5);
  db.prepare(`INSERT INTO reviews (user_id, account_id, content, rating) VALUES (?,?,?,?)`)
    .run(3, 3, 'Shop uy tín, account như mô tả.', 5);

  console.log('[DB] Seeded demo data successfully.');
}

module.exports = db;
