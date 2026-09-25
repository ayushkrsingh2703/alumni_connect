import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// MySQL Connection Pool
// ============================================================
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alumni_connect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+05:30',
  multipleStatements: true, // schema.sql ke liye
  dateStrings: true,        // Date objects ko string ki tarah return kare
});

// ============================================================
// Test Connection
// ============================================================
export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return false;
  }
};

// ============================================================
// Helper: Run query (returns all rows)
// ============================================================
export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// ============================================================
// Helper: Get single row
// ============================================================
export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export default pool;