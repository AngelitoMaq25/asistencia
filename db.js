const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'diseno_canva',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;