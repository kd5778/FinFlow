const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '253748@KRISH',
    database: 'finflow_db'
  });
  const [rows] = await connection.query("SELECT * FROM portfolio");
  console.log(rows);
  connection.end();
}
check();
