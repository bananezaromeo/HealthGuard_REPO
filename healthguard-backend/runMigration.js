const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const migrationsDir = path.join(__dirname, 'src/migrations');
  
  try {
    // Get all SQL migration files and sort them
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('ℹ️ No migration files found');
      process.exit(0);
    }

    console.log(`📋 Found ${files.length} migration file(s)\n`);

    for (const file of files) {
      const sqlFile = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlFile, 'utf8');

      try {
        console.log(`🔄 Running migration: ${file}`);
        
        // Split SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            console.log(`  ✓ Executing: ${statement.trim().substring(0, 60)}...`);
            await pool.query(statement);
          }
        }
        
        console.log(`✅ ${file} completed successfully!\n`);
      } catch (error) {
        console.error(`❌ ${file} failed:`, error.message);
        process.exit(1);
      }
    }
    
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

runMigration();
