const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
// const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["token"],
  })
);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "finflow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const jwtSecret = process.env.JWT_SECRET || "replace_with_a_strong_secret";

const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
};

const authenticate = async (req, res, next) => {
  const token = req.headers.token;
  if (!token) {
    return res.status(401).json({ status: 0, reason: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ status: 0, reason: "Invalid token" });
  }
};

app.post("/user/register", async (req, res) => {
  const {
    firstName,
    lastName,
    number,
    email,
    dob,
    password,
    currency_code,
    currency_country,
    currency_name,
    currency_symbol,
  } = req.body;

  if (!firstName || !lastName || !number || !email || !dob || !password) {
    return res.status(400).json({ status: 0, reason: "Missing required fields" });
  }

  try {
    const connection = await pool.getConnection();

    const [existing] = await connection.query(
      "SELECT id FROM users WHERE email = ? OR phone = ?",
      [email, number]
    );

    if (existing.length > 0) {
      connection.release();
      return res.json({ status: 0, reason: "Email or phone number already registered" });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const account_number = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const sort_code = `IFSC${Math.floor(100000 + Math.random() * 900000).toString()}`;
    const account_name = `${firstName} ${lastName}`;
    const balance = 1000;

    await connection.query(
      `INSERT INTO users
      (first_name, last_name, phone, email, dob, password, account_name, account_number, sort_code, balance, currency_code, currency_country, currency_name, currency_symbol)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        number,
        email,
        dob,
        hashedPassword,
        account_name,
        account_number,
        sort_code,
        balance,
        currency_code || "INR",
        currency_country || "India",
        currency_name || "Indian Rupee",
        currency_symbol || "₹",
      ]
    );

    connection.release();
    return res.json({ status: 1, message: "Registration complete" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 0, reason: "Missing email or password" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
    connection.release();

    if (!rows.length) {
      return res.json({ status: 0, reason: "Incorrect email or password" });
    }

    const user = rows[0];
    const passwordMatches = crypto.createHash('sha256').update(password).digest('hex') === user.password;
    if (!passwordMatches) {
      return res.json({ status: 0, reason: "Incorrect email or password" });
    }

    const token = generateToken(user);
    return res.json({ status: 1, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.post("/user/logout", authenticate, async (req, res) => {
  return res.json({ status: 1, message: "Logged out" });
});

app.get("/account/", authenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM users WHERE id = ?", [req.user.userId]);
    connection.release();

    if (!rows.length) {
      return res.json({ status: 0, reason: "User not found" });
    }

    const user = rows[0];
    const result = {
      account_name: user.account_name,
      account_number: user.account_number,
      balance: user.balance,
      currency_code: user.currency_code,
      currency_country: user.currency_country,
      currency_name: user.currency_name,
      currency_symbol: user.currency_symbol,
      sort_code: user.sort_code,
      first_name: user.first_name,
      last_name: user.last_name,
      dob: user.dob,
      number: user.phone,
    };

    return res.json({ status: 1, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.get("/transaction/", authenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT type, details, amount, created_at as created FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.userId]
    );
    connection.release();
    return res.json({ status: 1, results: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.post("/transaction/pay", authenticate, async (req, res) => {
  const { amount, payeeName } = req.body;
  const parsedAmount = Number(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    return res.json({ status: 0, reason: "Invalid payment amount" });
  }

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query("SELECT balance, currency_symbol FROM users WHERE id = ?", [req.user.userId]);
    if (!users.length) {
      connection.release();
      return res.json({ status: 0, reason: "User not found" });
    }

    const user = users[0];
    if (user.balance < parsedAmount) {
      connection.release();
      return res.json({ status: 0, reason: "Insufficient balance" });
    }

    const newBalance = user.balance - parsedAmount;
    await connection.query("UPDATE users SET balance = ? WHERE id = ?", [newBalance, req.user.userId]);
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, "sent", payeeName || "payment", parsedAmount, user.currency_symbol]
    );
    connection.release();

    return res.json({ status: 1, message: "Payment successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.post("/transaction/receive", authenticate, async (req, res) => {
  const { amount, payeeName } = req.body;
  const parsedAmount = Number(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    return res.json({ status: 0, reason: "Invalid amount" });
  }

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query("SELECT balance, currency_symbol FROM users WHERE id = ?", [req.user.userId]);
    if (!users.length) {
      connection.release();
      return res.json({ status: 0, reason: "User not found" });
    }

    const user = users[0];
    const newBalance = user.balance + parsedAmount;
    await connection.query("UPDATE users SET balance = ? WHERE id = ?", [newBalance, req.user.userId]);
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, "received", payeeName || "deposit", parsedAmount, user.currency_symbol]
    );
    connection.release();

    return res.json({ status: 1, message: "Funds received" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
