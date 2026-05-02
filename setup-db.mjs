import { drizzle } from "drizzle-orm/mysql2";
import { employees, systemSettings } from "./drizzle/schema.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

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

async function setup() {
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
    const db = drizzle(connection);

    console.log("🛠️  Setting up system settings...");
    await db.insert(systemSettings).values({
      key: "shifts_open",
      value: "true"
    }).onDuplicateKeyUpdate({
      set: { value: "true" }
    });
    console.log("✅ System settings ready.");

    console.log("👥 Seeding employees...");
    let added = 0;
    let skipped = 0;

    for (const emp of employeeData) {
      const existing = await db.select().from(employees).where(eq(employees.ibsId, emp.ibsId)).limit(1);
      if (existing.length === 0) {
        await db.insert(employees).values(emp);
        console.log(`  ✓ Added: ${emp.name} (${emp.ibsId})`);
        added++;
      } else {
        skipped++;
      }
    }

    console.log(`\n📊 Done! Added: ${added}, Skipped: ${skipped}`);
    await connection.end();
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setup();
