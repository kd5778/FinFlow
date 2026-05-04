const path = require("path");
const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
const fs = require("fs");
require(path.join(__dirname, "../backend/node_modules/dotenv")).config({ path: path.join(__dirname, "../backend/.env") });

async function setupDatabase() {
  try {
    // Connect without specifying database first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    });

    console.log("Connected to MySQL server");

    // Create database if it doesn't exist
    await connection.execute("CREATE DATABASE IF NOT EXISTS finflow_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    console.log("Database created or already exists");

    // Use the database
    await connection.query("USE finflow_db");

    // Read and execute the SQL file
    // Execute multiple SQL files
    const sqlFiles = ["db-init.sql", "create-splits.sql"];
    for (const fileName of sqlFiles) {
      const sqlPath = path.join(__dirname, fileName);
      if (fs.existsSync(sqlPath)) {
        console.log(`Executing ${fileName}...`);
        const sql = fs.readFileSync(sqlPath, "utf8");
        const statements = sql.split(";").filter(stmt => stmt.trim().length > 0);
        for (const statement of statements) {
          if (statement.trim() && !statement.includes("CREATE DATABASE") && !statement.includes("USE")) {
            await connection.query(statement);
          }
        }
      } else {
        console.log(`Warning: ${sqlPath} not found`);
      }
    }

    console.log("Database tables created successfully");

    await connection.end();
    console.log("Database setup complete");
  } catch (error) {
    console.error("Database setup error:", error);
  }
}

setupDatabase();