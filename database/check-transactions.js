const path = require("path");
const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
require(path.join(__dirname, "../backend/node_modules/dotenv")).config({ path: path.join(__dirname, "../backend/.env") });

async function showTransactions() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "finflow_db",
    });

    console.log("Connected to database...\n");

    // Get all transactions with user details
    const [transactions] = await connection.query(`
      SELECT
        t.id,
        t.type,
        t.details,
        t.amount,
        t.currency_symbol,
        t.created,
        u.first_name,
        u.last_name,
        u.account_number
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created DESC
    `);

    if (transactions.length === 0) {
      console.log("📭 No transactions found.");
      console.log("Make some payments or deposits to see transactions here!");
    } else {
      console.log("💸 ALL TRANSACTIONS:");
      console.log("=".repeat(80));

      transactions.forEach((transaction, index) => {
        console.log(`${index + 1}. ${transaction.type.toUpperCase()}`);
        console.log(`   User: ${transaction.first_name} ${transaction.last_name}`);
        console.log(`   Account: ${transaction.account_number}`);
        console.log(`   Details: ${transaction.details}`);
        console.log(`   Amount: ${transaction.currency_symbol}${transaction.amount}`);
        console.log(`   Date: ${transaction.created}`);
        console.log("-".repeat(40));
      });
    }

    await connection.end();
  } catch (error) {
    console.error("Database error:", error.message);
  }
}

showTransactions();