const { Pool } = require('pg');

// Only load .env if we're NOT on Render  
// Render provides environment variables directly, doesn't use .env
if (!process.env.RENDER) {
  require('dotenv').config();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
