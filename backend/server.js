const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    // In production, use the env variable
    if (process.env.FRONTEND_ORIGIN && origin === process.env.FRONTEND_ORIGIN) {
      return callback(null, true);
    }
    // In development, allow any localhost port
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  exposedHeaders: ["token"],
}));

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

  return nodemailer.createTransporter({
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

// ── SPLITWISE ENDPOINTS ────────────────────────────────────────────────────────

// GET creator's open splits with shares
// USER SEARCH for split friends
app.get("/user/search", authenticate, async (req, res) => {
  const { q } = req.query; // phone, email, account_number, name
  if (!q || q.length < 3) {
    return res.json({ status: 1, results: [] });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, first_name, last_name, phone, email, account_number, ifsc_code, account_name
       FROM users 
       WHERE id != ?
         AND (
           phone LIKE ? OR email LIKE ? OR account_number LIKE ?
           OR account_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?
         )
       LIMIT 10`,
      [req.user.userId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
    );
    connection.release();
    return res.json({ status: 1, results: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

app.get("/split/list", authenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Return splits where user is the CREATOR or a PARTICIPANT
    const [splits] = await connection.query(`
      SELECT DISTINCT s.id, s.total_amount, s.description, s.status, s.created_at,
             s.creator_id,
             COUNT(ss2.id) as share_count, SUM(ss2.settled) as settled_count
      FROM splits s
      LEFT JOIN split_shares ss2 ON s.id = ss2.split_id
      WHERE s.status = 'open'
        AND (
          s.creator_id = ?
          OR EXISTS (SELECT 1 FROM split_shares ss3 WHERE ss3.split_id = s.id AND ss3.user_id = ?)
        )
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [req.user.userId, req.user.userId]);

    // Add share details for each split
    for (let split of splits) {
      const [shares] = await connection.query(`
        SELECT ss.id, ss.share_amount, ss.settled, ss.user_id,
               u.account_name, u.account_number, u.ifsc_code
        FROM split_shares ss
        JOIN users u ON ss.user_id = u.id
        WHERE ss.split_id = ?
      `, [split.id]);
      split.shares = shares;
      // Flag whether current user is creator
      split.is_creator = split.creator_id === req.user.userId;
      // Flag current user's own share (for settling)
      const myShare = shares.find(s => s.user_id === req.user.userId);
      split.my_share = myShare || null;
    }

    connection.release();
    return res.json({ status: 1, results: splits });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

// CREATE split
app.post("/split/create", authenticate, async (req, res) => {
  const { total_amount, description, shares } = req.body; // shares: [{account_number, ifsc_code, share_amount}]
  const parsedTotal = Number(total_amount);

  if (!parsedTotal || parsedTotal <= 0) {
    return res.json({ status: 0, reason: "Invalid total amount" });
  }
  if (!Array.isArray(shares) || shares.length < 2 || shares.length > 10) {
    return res.json({ status: 0, reason: "2-10 shares required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create split
    const [splitResult] = await connection.query(
      "INSERT INTO splits (creator_id, total_amount, description) VALUES (?, ?, ?)",
      [req.user.userId, parsedTotal, description || 'Group split']
    );
    const splitId = splitResult.insertId;

    let totalShares = 0;
    for (const share of shares) {
      const { account_number, ifsc_code, share_amount } = share;
      const parsedShare = Number(share_amount);
      if (!account_number || !ifsc_code || !parsedShare || parsedShare <= 0) {
        throw new Error("Invalid share data");
      }

      // Find receiver
      const [userRows] = await connection.query(
        "SELECT id FROM users WHERE account_number = ? AND ifsc_code = ?",
        [account_number, ifsc_code]
      );
      if (!userRows.length) {
        throw new Error(`User not found: ${account_number}`);
      }
      const userId = userRows[0].id;

      // Prevent duplicate shares
      const [existingShare] = await connection.query(
        "SELECT id FROM split_shares WHERE split_id = ? AND user_id = ?",
        [splitId, userId]
      );
      if (existingShare.length) {
        throw new Error("Duplicate share for user");
      }

      await connection.query(
        "INSERT INTO split_shares (split_id, user_id, share_amount) VALUES (?, ?, ?)",
        [splitId, userId, parsedShare]
      );
      totalShares += parsedShare;
    }

    if (Math.abs(totalShares - parsedTotal) > 0.01) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: `Shares total (${totalShares}) != split total (${parsedTotal})` });
    }

    // Auto-settle creator's own share if included (optional)
    await connection.query("UPDATE split_shares SET settled = TRUE WHERE split_id = ? AND user_id = ?", [splitId, req.user.userId]);

    await connection.commit();
    connection.release();
    return res.json({ status: 1, split_id: splitId });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return res.status(400).json({ status: 0, reason: error.message || "Failed to create split" });
  }
});

// SETTLE share (pay the amount to creator)
app.post("/split/settle/:shareId", authenticate, async (req, res) => {
  try {
    const shareId = Number(req.params.shareId);
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get share details
    const [shares] = await connection.query(`
      SELECT ss.*, s.creator_id, s.total_amount, u.account_name as creator_name
      FROM split_shares ss 
      JOIN splits s ON ss.split_id = s.id 
      JOIN users u ON s.creator_id = u.id
      WHERE ss.id = ? AND ss.settled = FALSE
    `, [shareId]);

    if (!shares.length) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Share not found or already settled" });
    }

    const share = shares[0];
    if (share.user_id !== req.user.userId) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Not your share" });
    }

    // Get payer (settler) balance
    const [payerRows] = await connection.query("SELECT balance FROM users WHERE id = ?", [req.user.userId]);
    if (payerRows[0].balance < share.share_amount) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Insufficient balance" });
    }

    // Transfer: payer -> creator (reuse pay logic style)
    const newPayerBalance = Number(payerRows[0].balance) - share.share_amount;
    await connection.query("UPDATE users SET balance = ? WHERE id = ?", [newPayerBalance, req.user.userId]);

    const [creatorRows] = await connection.query("SELECT balance FROM users WHERE id = ?", [share.creator_id]);
    const newCreatorBalance = Number(creatorRows[0].balance) + share.share_amount;
    await connection.query("UPDATE users SET balance = ? WHERE id = ?", [newCreatorBalance, share.creator_id]);

    // Mark settled
    await connection.query(
      "UPDATE split_shares SET settled = TRUE, settled_at = NOW() WHERE id = ?",
      [shareId]
    );

    // Log txns
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, 'sent', ?, ?, '₹')",
      [req.user.userId, `Settled split share ${share.split_id}`, share.share_amount]
    );
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, 'received', ?, ?, '₹')",
      [share.creator_id, `Split ${share.split_id} settled by ${payerRows[0].account_name || 'user'}`, share.share_amount]
    );

    // Check if all settled
    const [remaining] = await connection.query(
      "SELECT COUNT(*) as pending FROM split_shares WHERE split_id = ? AND settled = FALSE",
      [share.split_id]
    );
    if (remaining[0].pending === 0) {
      await connection.query("UPDATE splits SET status = 'settled' WHERE id = ?", [share.split_id]);
    }

    await connection.commit();
    connection.release();
    return res.json({ status: 1, message: "Share settled successfully" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

// ── GET PORTFOLIO ─────────────────────────────────────────────────────────────
app.get("/portfolio/", authenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM portfolio WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.userId]
    );
    connection.release();
    return res.json({ status: 1, results: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

// ── BUY ASSET ─────────────────────────────────────────────────────────────────
app.post("/portfolio/buy", authenticate, async (req, res) => {
  const { asset_symbol, asset_name, asset_type, units, buy_price } = req.body;
  const parsedUnits = Number(units);
  const parsedBuyPrice = Number(buy_price);
  const totalCost = parsedUnits * parsedBuyPrice;

  if (!asset_symbol || !asset_name || !asset_type || !parsedUnits || !parsedBuyPrice)
    return res.json({ status: 0, reason: "Missing required fields" });

  if (totalCost <= 0)
    return res.json({ status: 0, reason: "Invalid purchase amount" });

  const connection = await pool.getConnection();
  try {
    // check sender balance
    const [userRows] = await connection.query(
      "SELECT balance, currency_symbol, account_name FROM users WHERE id = ?",
      [req.user.userId]
    );
    if (!userRows.length) {
      connection.release();
      return res.json({ status: 0, reason: "User not found" });
    }

    const user = userRows[0];
    if (user.balance < totalCost) {
      connection.release();
      return res.json({ status: 0, reason: "Insufficient balance" });
    }

    await connection.beginTransaction();

    // deduct balance
    await connection.query(
      "UPDATE users SET balance = balance - ? WHERE id = ?",
      [totalCost, req.user.userId]
    );

    // check if user already owns this asset
    const [existing] = await connection.query(
      "SELECT id, units FROM portfolio WHERE user_id = ? AND asset_symbol = ?",
      [req.user.userId, asset_symbol]
    );

    if (existing.length > 0) {
      // add to existing holding
      await connection.query(
        "UPDATE portfolio SET units = units + ?, buy_price = ?, current_value = (units + ?) * ? WHERE user_id = ? AND asset_symbol = ?",
        [parsedUnits, parsedBuyPrice, parsedUnits, parsedBuyPrice, req.user.userId, asset_symbol]
      );
    } else {
      // new holding
      await connection.query(
        "INSERT INTO portfolio (user_id, asset_symbol, asset_name, asset_type, units, buy_price, current_value) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [req.user.userId, asset_symbol, asset_name, asset_type, parsedUnits, parsedBuyPrice, totalCost]
      );
    }

    // log transaction
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, "sent", `Bought ${asset_name} (${asset_symbol})`, totalCost, user.currency_symbol]
    );

    await connection.commit();
    connection.release();
    return res.json({ status: 1, message: "Purchase successful" });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

// ── SELL ASSET ────────────────────────────────────────────────────────────────
app.post("/portfolio/sell", authenticate, async (req, res) => {
  const { asset_symbol, units, current_price } = req.body;
  const parsedUnits = Number(units);
  const parsedCurrentPrice = Number(current_price);
  const totalValue = parsedUnits * parsedCurrentPrice;

  if (!asset_symbol || !parsedUnits || !parsedCurrentPrice)
    return res.json({ status: 0, reason: "Missing required fields" });

  const connection = await pool.getConnection();
  try {
    // check holding exists
    const [holding] = await connection.query(
      "SELECT * FROM portfolio WHERE user_id = ? AND asset_symbol = ?",
      [req.user.userId, asset_symbol]
    );

    if (!holding.length) {
      connection.release();
      return res.json({ status: 0, reason: "Asset not found in portfolio" });
    }

    if (holding[0].units < parsedUnits) {
      connection.release();
      return res.json({ status: 0, reason: "Not enough units to sell" });
    }

    const [userRows] = await connection.query(
      "SELECT currency_symbol FROM users WHERE id = ?",
      [req.user.userId]
    );
    const user = userRows[0];

    await connection.beginTransaction();

    // credit balance
    await connection.query(
      "UPDATE users SET balance = balance + ? WHERE id = ?",
      [totalValue, req.user.userId]
    );

    const remainingUnits = holding[0].units - parsedUnits;

    if (remainingUnits <= 0) {
      // remove from portfolio completely
      await connection.query(
        "DELETE FROM portfolio WHERE user_id = ? AND asset_symbol = ?",
        [req.user.userId, asset_symbol]
      );
    } else {
      // reduce units
      await connection.query(
        "UPDATE portfolio SET units = ?, current_value = ? * ? WHERE user_id = ? AND asset_symbol = ?",
        [remainingUnits, remainingUnits, parsedCurrentPrice, req.user.userId, asset_symbol]
      );
    }

    // log transaction
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, "received", `Sold ${asset_symbol}`, totalValue, user.currency_symbol]
    );

    await connection.commit();
    connection.release();
    return res.json({ status: 1, message: "Sale successful" });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

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
      `INSERT INTO users (first_name, last_name, phone, email, dob, password, account_name, account_number, ifsc_code, balance, currency_code, currency_country, currency_name, currency_symbol)
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

      const result = await sendResetPasswordEmail(email, resetToken);
      connection.release();

      if (result.delivered) {
        return res.json({ status: 1, message: "Reset email sent" });
      } else {
        return res.json({
          status: 1,
          message: "Email not configured. Check server logs for reset link.",
          resetLink: result.resetLink,
        });
      }
    }

    connection.release();
    return res.json({ status: 1, message: "If that email exists, a reset link has been sent" });
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
      "SELECT type, details, amount, created FROM transactions WHERE user_id = ? ORDER BY created DESC",
      [req.user.userId]
    );
    connection.release();
    return res.json({ status: 1, results: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, reason: "Server error" });
  }
});

// FIXED: This endpoint now properly handles receiver account crediting
app.post("/transaction/pay", authenticate, async (req, res) => {
  const { amount, payeeName, accountNumber, sortCode } = req.body;
  const parsedAmount = Number(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    return res.json({ status: 0, reason: "Invalid payment amount" });
  }

  if (!accountNumber || !sortCode) {
    return res.json({ status: 0, reason: "Missing receiver account details" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    // Start a transaction to ensure atomicity
    await connection.beginTransaction();

    // Get sender details
    const [senderRows] = await connection.query(
      "SELECT id, balance, currency_symbol, account_name FROM users WHERE id = ?", 
      [req.user.userId]
    );
    
    if (!senderRows.length) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Sender not found" });
    }

    const sender = senderRows[0];
    
    // Check if sender has sufficient balance
    if (sender.balance < parsedAmount) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Insufficient balance" });
    }

    // Find receiver by account number and IFSC code
    const [receiverRows] = await connection.query(
      "SELECT id, balance, currency_symbol, account_name FROM users WHERE account_number = ? AND ifsc_code = ?",
      [accountNumber, sortCode]
    );

    if (!receiverRows.length) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Receiver account not found" });
    }

    const receiver = receiverRows[0];

    // Check if sender is trying to send to themselves
    if (sender.id === receiver.id) {
      await connection.rollback();
      connection.release();
      return res.json({ status: 0, reason: "Cannot send money to yourself" });
    }

    // Deduct from sender (Explicitly converting for safety)
    const newSenderBalance = Number(sender.balance) - parsedAmount;
    await connection.query(
      "UPDATE users SET balance = ? WHERE id = ?", 
      [newSenderBalance, sender.id]
    );

    // Credit to receiver (Fixing the concatenation bug)
    const newReceiverBalance = Number(receiver.balance) + parsedAmount;
    await connection.query(
      "UPDATE users SET balance = ? WHERE id = ?", 
      [newReceiverBalance, receiver.id]
    );

    // Record transaction for sender
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [sender.id, "sent", payeeName || receiver.account_name, parsedAmount, sender.currency_symbol]
    );

    // Record transaction for receiver
    await connection.query(
      "INSERT INTO transactions (user_id, type, details, amount, currency_symbol) VALUES (?, ?, ?, ?, ?)",
      [receiver.id, "received", sender.account_name, parsedAmount, receiver.currency_symbol]
    );

    // Commit the transaction
    await connection.commit();
    connection.release();

    return res.json({ 
      status: 1, 
      message: "Payment successful",
      newBalance: newSenderBalance
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
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
    const newBalance = Number(user.balance) + parsedAmount;
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

// Auto-create splits & split_shares tables if they don't exist yet
const ensureSplitTables = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS splits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        creator_id INT NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        description VARCHAR(255),
        status ENUM('open', 'settled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS split_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        split_id INT NOT NULL,
        user_id INT NOT NULL,
        share_amount DECIMAL(12,2) NOT NULL,
        settled BOOLEAN DEFAULT FALSE,
        settled_at TIMESTAMP NULL,
        FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_share (split_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Split tables ready.');
  } finally {
    connection.release();
  }
};

// Also add portfolio table if not present
const ensurePortfolioTable = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        asset_symbol VARCHAR(20) NOT NULL,
        asset_name VARCHAR(100) NOT NULL,
        asset_type ENUM('crypto','stock') NOT NULL DEFAULT 'crypto',
        units DECIMAL(18,8) NOT NULL DEFAULT 0,
        buy_price DECIMAL(18,2) NOT NULL DEFAULT 0,
        current_value DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Portfolio table ready.');
  } finally {
    connection.release();
  }
};

ensureResetColumns()
  .then(() => ensureSplitTables())
  .then(() => ensurePortfolioTable())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup error:", error);
    process.exit(1);
  });