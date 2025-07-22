const mysql = require('mysql2/promise');

async function checkTables() {
  let connection;
  try {
    console.log('Attempting to connect to database...');
    connection = await mysql.createConnection({
      host: '117.72.123.17',
      user: 'fanjk-ward',
      password: 'xiaokai123',
      database: 'ward',
      port: 3306
    });
    console.log('Connected to database');
    
    try {
      console.log('Querying medicines table...');
      const [medicinesColumns] = await connection.query('SHOW COLUMNS FROM medicines');
      console.log('\nMedicines table structure:');
      medicinesColumns.forEach(col => console.log(`${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));
    } catch (tableError) {
      console.error('Error querying medicines table:', tableError);
    }
    
    try {
      console.log('Querying supplies table...');
      const [suppliesColumns] = await connection.query('SHOW COLUMNS FROM supplies');
      console.log('\nSupplies table structure:');
      suppliesColumns.forEach(col => console.log(`${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));
    } catch (tableError) {
      console.error('Error querying supplies table:', tableError);
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}

checkTables();
console.log('Script started...');