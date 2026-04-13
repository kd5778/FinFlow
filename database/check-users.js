const path = require("path");
const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
require(path.join(__dirname, "../backend/node_modules/dotenv")).config({ path: path.join(__dirname, "../backend/.env") });

async function showUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "finflow_db",
    });

    console.log("Connected to database...\n");

    // Get all users
    const [users] = await connection.query("SELECT id, first_name, last_name, email, phone, dob, account_name, account_number, sort_code, balance, created_at FROM users ORDER BY created_at DESC");

    if (users.length === 0) {
      console.log("No users registered yet.");
    } else {
      console.log("📋 REGISTERED USERS:");
      console.log("=".repeat(80));

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   DOB: ${user.dob}`);
        console.log(`   Account Name: ${user.account_name}`);
        console.log(`   Account Number: ${user.account_number}`);
        console.log(`   Sort Code: ${user.sort_code}`);
        console.log(`   Balance: ₹${user.balance}`);
        console.log(`   Registered: ${user.created_at}`);
        console.log("-".repeat(40));
      });
    }

    // Get transaction count for each user
    const [transactions] = await connection.query(`
      SELECT u.first_name, u.last_name, COUNT(t.id) as transaction_count
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY u.created_at DESC
    `);

    console.log("\n💳 USER TRANSACTION SUMMARY:");
    console.log("=".repeat(40));
    transactions.forEach((user) => {
      console.log(`${user.first_name} ${user.last_name}: ${user.transaction_count} transactions`);
    });

    await connection.end();
  } catch (error) {
    console.error("Database error:", error.message);
  }
}

showUsers();