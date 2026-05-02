import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const employeeData = [
  { ibsId: "000000", name: "Mohamed Hany", isAdmin: 1 },
  { ibsId: "392848", name: "Akram Mostafa", isAdmin: 0 },
  { ibsId: "407280", name: "M.Ehab Nilo", isAdmin: 0 },
  { ibsId: "410029", name: "Ziad Ahmed", isAdmin: 0 },
  { ibsId: "420045", name: "Mazen Mahdy", isAdmin: 0 },
  { ibsId: "423305", name: "Waleed Mohamed", isAdmin: 0 },
  { ibsId: "397660", name: "Basel Emad", isAdmin: 0 },
  { ibsId: "439287", name: "Mohamed Haggag", isAdmin: 0 },
  { ibsId: "434446", name: "Ahmed Hany", isAdmin: 0 },
  { ibsId: "435084", name: "Ahmed Ezzat", isAdmin: 0 },
  { ibsId: "436999", name: "Youssef Sami", isAdmin: 0 },
  { ibsId: "439284", name: "Amr Khaled", isAdmin: 0 },
  { ibsId: "435430", name: "Nawal Ahmed", isAdmin: 0 },
  { ibsId: "441472", name: "Mobsher Mahmoud", isAdmin: 0 },
  { ibsId: "422558", name: "Amir Selim", isAdmin: 0 },
  { ibsId: "447144", name: "Mohamed Awad", isAdmin: 0 },
  { ibsId: "447140", name: "Ronza", isAdmin: 0 },
  { ibsId: "447141", name: "Ahmed Hawkas", isAdmin: 0 },
  { ibsId: "417441", name: "Basmala", isAdmin: 0 },
  { ibsId: "449527", name: "M.Ashraf Hamzawy", isAdmin: 0 },
  { ibsId: "449529", name: "Felopateer", isAdmin: 0 },
  { ibsId: "435083", name: "Saber Ramadan", isAdmin: 0 },
  { ibsId: "440784", name: "Mohamed Gaber", isAdmin: 0 },
  { ibsId: "440783", name: "Malak Abdelsalam", isAdmin: 0 },
  { ibsId: "451729", name: "Abdullah Ahmed Saeed", isAdmin: 0 },
  { ibsId: "449528", name: "Ibrahim Wael", isAdmin: 0 },
  { ibsId: "425299", name: "Adham Elshandour", isAdmin: 0 },
  { ibsId: "427408", name: "Mohanad Hatem", isAdmin: 0 },
  { ibsId: "442605", name: "Ziad Mohamed Ibrahim", isAdmin: 0 },
  { ibsId: "453222", name: "Abdelrahman Mohsen", isAdmin: 0 },
  { ibsId: "453219", name: "Mohamed Tamer", isAdmin: 0 },
  { ibsId: "420040", name: "Ashraf Elsayed", isAdmin: 0 },
  { ibsId: "440778", name: "Mohamed Eissa", isAdmin: 0 },
];

async function initDatabase() {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }

  // Add SSL parameters for TiDB Cloud
  if (dbUrl && dbUrl.includes('tidbcloud.com')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = dbUrl + separator + 'ssl={"rejectUnauthorized":false}';
  }

  try {
    console.log("🚀 Connecting to database...");
    const connection = await mysql.createConnection(dbUrl);

    // Create tables
    console.log("🛠️  Creating tables...");
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ibsId VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        isAdmin INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId INT NOT NULL,
        saturday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        sunday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        monday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        tuesday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        wednesday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        thursday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        friday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS shiftArchives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId INT NOT NULL,
        weekStartDate TIMESTAMP NOT NULL,
        saturday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        sunday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        monday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        tuesday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        wednesday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        thursday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        friday VARCHAR(50) NOT NULL DEFAULT 'OFF',
        archivedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        archivedBy VARCHAR(255)
      )`,
      
      `CREATE TABLE IF NOT EXISTS systemSettings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value VARCHAR(255) NOT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255),
        loginMethod VARCHAR(50),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      try {
        await connection.execute(sql);
        console.log("  ✓ Table created successfully");
      } catch (error) {
        if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
          throw error;
        }
      }
    }

    // Insert system settings
    console.log("🛠️  Setting up system settings...");
    try {
      await connection.execute(
        `INSERT INTO systemSettings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?`,
        ['shifts_open', 'true', 'true']
      );
      console.log("  ✓ System settings ready");
    } catch (error) {
      console.log("  ℹ System settings already exist");
    }

    // Seed employees
    console.log("👥 Seeding employees...");
    let added = 0;
    let skipped = 0;

    for (const emp of employeeData) {
      try {
        const [existing] = await connection.execute(
          `SELECT id FROM employees WHERE ibsId = ?`,
          [emp.ibsId]
        );
        
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO employees (ibsId, name, isAdmin) VALUES (?, ?, ?)`,
            [emp.ibsId, emp.name, emp.isAdmin]
          );
          console.log(`  ✓ Added: ${emp.name} (${emp.ibsId})`);
          added++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error adding ${emp.name}:`, error.message);
      }
    }

    console.log(`\n📊 Done! Added: ${added}, Skipped: ${skipped}`);
    await connection.end();
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

initDatabase();
