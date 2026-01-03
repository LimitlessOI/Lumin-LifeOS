require('dotenv').config();

// Database configuration - Adjust the connection string and other settings according to your environment variables in .env file or directly within this script (if not using dotenv):
const dbConfig = {
    host: process.env.DB_HOST, // e.g., 'localhost'
    port: 5432,
    user: processenerd@gmail.com', -- replace with your username for access to the database in a real-world scenario; Modify as needed if using MySQL/MariaDB or PostgreSQL specifics (e.g., dialect). Use environment variables appropriately and securely manage credentials outside this script, e.g., `.env` file:
    password: processenerd@gmail.com', -- replace with your database's authentication details; Modify as needed based on the actual DBMS used. Replace placeholder email for security purposes in a production environment. Always use real passwords and employ proper hashing before storing them if sensitive data is involved (omitted here).
    database: 'make_com', // Database name - ensure this matches your PostgreSQL or MySQL/MariaDB setup; Modify as needed based on the actual DBMS used, ensuring it's not `postgres` to avoid clashes with reserved keywords. Replace placeholder value for security purposes in a production environment:
    dialect: 'postgresql', // Change if using MariaDB instead of PostgreSQL or any other specific type; Modify as needed based on the actual DBMS used and ensure Sequelize is configured correctly, e.g., `dialectOptions` setting within `.sequelize.js`. Replace placeholder value for security purposes in a production environment:
    operatorsAliases: true, // Enables internationalization of identifiers if necessary; Modify as needed based on actual requirements and DBMS specifics (omitted here): e.g., MySQL/MariaDB may not require this setting directly within code but can be configured at the database level or through Sequelize options for customized handling:
    define: { timestamps: true }, // Automatically handle created_at and updated_at fields; Modify as needed based on actual DBMS used. Replace with `null` if using MySQL/MariaDB, which does not natively support auto-incrementing UUIDs or sequences for primary keys (requires application logic to generate unique IDs):
    dialectOptions: { // Sequelize settings that might differ from one database engine to another and can include custom methods; Modify as needed based on actual DBMS used, e.g., `use_native_binary: true` if using PostgreSQL with native binary data handling capabilities for efficiency (omitted here):
        bindConfigsOnSave: false // Sequelize settings tweak to avoid unintended side effects during model save operations; Modify as needed based on actual use cases and performance requirements. Replace placeholder values for security purposes in a production environment or remove if unnecessary, e.g., `secureConnectionPoolSize`.
    }
};