const mysql = require('mysql2/promise');

async function fixDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '253748@KRISH',
    database: 'finflow_db'
  });
  
  await connection.query("DROP TABLE IF EXISTS portfolio");
  
  await connection.query(`
    CREATE TABLE portfolio (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      asset_symbol VARCHAR(50) NOT NULL,
      asset_name VARCHAR(255) NOT NULL,
      asset_type VARCHAR(50) NOT NULL,
      units DECIMAL(18,8) NOT NULL,
      buy_price DECIMAL(18,2) NOT NULL,
      current_value DECIMAL(18,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_asset (user_id, asset_symbol)
    )
  `);
  
  console.log("Portfolio table fixed.");
  connection.end();
}
fixDB();
