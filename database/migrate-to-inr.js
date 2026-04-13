const path = require("path");
const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
require(path.join(__dirname, "../backend/node_modules/dotenv")).config({ path: path.join(__dirname, "../backend/.env") });

async function migrateToINR() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "finflow_db",
    });

    console.log("Connected to database...");

    // Update all existing users to use INR instead of GBP
    const [updateResult] = await connection.query(`
      UPDATE users
      SET
        currency_code = 'INR',
        currency_country = 'India',
        currency_name = 'Indian Rupee',
        currency_symbol = '₹'
      WHERE currency_code = 'GBP' OR currency_code IS NULL OR currency_code = ''
    `);

    console.log(`Updated ${updateResult.affectedRows} user records to INR`);

    // Update all existing transactions to use INR symbol
    const [transactionResult] = await connection.query(`
      UPDATE transactions
      SET currency_symbol = '₹'
      WHERE currency_symbol = '£' OR currency_symbol IS NULL OR currency_symbol = ''
    `);

    console.log(`Updated ${transactionResult.affectedRows} transaction records to INR`);

    await connection.end();
    console.log("Migration to INR completed successfully!");
  } catch (error) {
    console.error("Migration error:", error.message);
  }
}

migrateToINR();