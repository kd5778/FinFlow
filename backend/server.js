const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
// const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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
database: process.env.DB_NAME || "finflow_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const jwtSecret = process.env.JWT_SECRET || "replace_with_a_strong_secret";
const resetTokenExpiryMinutes = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15);

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

const createMailTransporter = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendResetPasswordEmail = async (email, resetToken) => {
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const resetLink = `${frontendOrigin}/reset/${resetToken}`;
  const transporter = createMailTransporter();
  const fromEmail =
    process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@finflow.local";

  if (!transporter) {
    console.log(`Password reset link for ${email}: ${resetLink}`);
    return { delivered: false, resetLink };
  }

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: "FinFlow password reset",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your FinFlow password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background: #007b60; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Reset password
          </a>
        </p>
        <p>This link expires in ${resetTokenExpiryMinutes} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>${resetLink}</p>
      </div>
    `,
  });

  return { delivered: true, resetLink };
};

const ensureResetColumns = async () => {
  const connection = await pool.getConnection();

  try {
    const [columns] = await connection.query(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME IN ('reset_token', 'reset_token_expires_at')
      `
    );

    const existingColumns = columns.map((column) => column.COLUMN_NAME);

    if (!existingColumns.includes("reset_token")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL"
      );
    }

    if (!existingColumns.includes("reset_token_expires_at")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME NULL"
      );
    }
  } finally {
    connection.release();
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
const ifsc_code = `IFSC${Math.floor(100000 + Math.random() * 900000).toString()}`;
    const account_name = `${firstName} ${lastName}`;
    const balance = 1000;

    await connection.query(
      `INSERT INTO users
(first_name, last_name, phone, email, dob, password, account_name, account_number, ifsc_code, balance, currency_code, currency_country, currency_name, currency_symbol)
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
        ifsc_code,
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

app.post("/user/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ status: 0, reason: "Email is required" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT id, email FROM users WHERE email = ?", [email]);

    if (rows.length) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + resetTokenExpiryMinutes * 60 * 1000);

      await connection.query(
        "UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?",
        [hashedResetToken, expiresAt, rows[0].id]
      );

      await sendResetPasswordEmail(rows[0].email, resetToken);
    }

    connection.release();

    return res.json({
      status: 1,
      message: "If an account exists for this email, a reset link has been sent",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.get("/user/reset-password/:token", async (req, res) => {
  const hashedResetToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id FROM users
       WHERE reset_token = ?
         AND reset_token_expires_at IS NOT NULL
         AND reset_token_expires_at > NOW()`,
      [hashedResetToken]
    );
    connection.release();

    if (!rows.length) {
      return res.status(400).json({ status: 0, reason: "Invalid or expired reset link" });
    }

    return res.json({ status: 1, message: "Reset link is valid" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.post("/user/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ status: 0, reason: "Password is required" });
  }

  const hashedResetToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id FROM users
       WHERE reset_token = ?
         AND reset_token_expires_at IS NOT NULL
         AND reset_token_expires_at > NOW()`,
      [hashedResetToken]
    );

    if (!rows.length) {
      connection.release();
      return res.status(400).json({ status: 0, reason: "Invalid or expired reset link" });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    await connection.query(
      `UPDATE users
       SET password = ?, reset_token = NULL, reset_token_expires_at = NULL
       WHERE id = ?`,
      [hashedPassword, rows[0].id]
    );

    connection.release();

    return res.json({ status: 1, message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
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
      ifsc_code: user.ifsc_code,
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

app.put("/account/", authenticate, async (req, res) => {
  const { firstName, lastName, dob, phoneNumber } = req.body;

  if (!firstName || !lastName || !dob || !phoneNumber) {
    return res.status(400).json({ status: 0, reason: "Missing required fields" });
  }

  try {
    const connection = await pool.getConnection();

    const [existing] = await connection.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [phoneNumber, req.user.userId]
    );

    if (existing.length > 0) {
      connection.release();
      return res.json({ status: 0, reason: "Phone number already registered" });
    }

    const account_name = `${firstName} ${lastName}`.trim();

    await connection.query(
      `UPDATE users
       SET first_name = ?, last_name = ?, phone = ?, dob = ?, account_name = ?
       WHERE id = ?`,
      [firstName, lastName, phoneNumber, dob, account_name, req.user.userId]
    );

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
      ifsc_code: user.ifsc_code,
      first_name: user.first_name,
      last_name: user.last_name,
      dob: user.dob,
      number: user.phone,
    };

    return res.json({ status: 1, message: "Profile updated", result });
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

ensureResetColumns()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare password reset columns:", error);
    process.exit(1);
  });
