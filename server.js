require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- MySQL connection pool ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Fields a client is allowed to set
const FIELDS = ['first_name', 'last_name', 'email', 'age', 'city', 'created_at'];

// Small helper so we don't need try/catch in every route
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Routes ----------

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Users API is running - CI/CD test' });
});

// READ ALL -> GET /users
app.get(
  '/users',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(rows);
  })
);

// READ ONE -> GET /users/:id
app.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  })
);

// CREATE -> POST /users
app.post(
  '/users',
  asyncHandler(async (req, res) => {
    const { id, first_name, last_name, email, age, city, created_at } = req.body;

    if (!first_name || !last_name || !email) {
      return res
        .status(400)
        .json({ error: 'first_name, last_name and email are required' });
    }

    const columns = ['first_name', 'last_name', 'email', 'age', 'city', 'created_at'];
    const values = [
      first_name,
      last_name,
      email,
      age ?? null,
      city ?? null,
      created_at ?? new Date().toISOString().slice(0, 10),
    ];

    if (id !== undefined) {
      columns.unshift('id');
      values.unshift(id);
    }

    const [result] = await pool.query(
      `INSERT INTO users (${columns.join(', ')}) VALUES (${columns
        .map(() => '?')
        .join(', ')})`,
      values
    );

    const newId = id !== undefined ? id : result.insertId;
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
    res.status(201).json(rows[0]);
  })
);

// UPDATE -> PUT /users/:id
app.put(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const updates = FIELDS.filter((f) => req.body[f] !== undefined);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const setClause = updates.map((f) => `${f} = ?`).join(', ');
    const values = updates.map((f) => req.body[f]);

    const [result] = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      [...values, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [
      req.params.id,
    ]);
    res.json(rows[0]);
  })
);

// DELETE -> DELETE /users/:id
app.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  })
);

// ---------- 404 + Error Handling ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A user with that id or email already exists' });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// ---------- Start Server ----------
(async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('Connected to MySQL');
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  }
})();
