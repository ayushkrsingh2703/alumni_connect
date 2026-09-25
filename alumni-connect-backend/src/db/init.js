import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSchema = async () => {
  console.log('🔄 Initializing database schema...\n');

  // Connect without database selected (to allow create if missing)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'alumni_connect';

  // Create database if not exists
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✅ Database "${dbName}" ready`);

  await conn.changeUser({ database: dbName });

  // Read schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Run schema
  await conn.query(schema);
  console.log('✅ All tables created successfully');

  // Count tables
  const [tables] = await conn.query(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?`,
    [dbName]
  );
  console.log(`📊 Total tables: ${tables[0].count}\n`);

  await conn.end();
  console.log('🎉 Database initialization complete!');
  process.exit(0);
};

runSchema().catch(err => {
  console.error('❌ Schema init failed:', err.message);
  process.exit(1);
});