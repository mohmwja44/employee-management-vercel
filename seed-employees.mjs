import { drizzle } from "drizzle-orm/mysql2";
import { employees, shifts } from "./drizzle/schema.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const employeeData = [
  { ibsId: "392848", name: "Akram Mostafa" },
  { ibsId: "407280", name: "M.Ehab Nilo" },
  { ibsId: "410029", name: "Ziad Ahmed" },
  { ibsId: "420045", name: "Mazen Mahdy" },
  { ibsId: "423305", name: "Waleed Mohamed" },
  { ibsId: "397660", name: "Basel Emad" },
  { ibsId: "439287", name: "Mohamed Haggag" },
  { ibsId: "434446", name: "Ahmed Hany" },
  { ibsId: "435084", name: "Ahmed Ezzat" },
  { ibsId: "436999", name: "Youssef Sami" },
  { ibsId: "439284", name: "Amr Khaled" },
  { ibsId: "435430", name: "Nawal Ahmed" },
  { ibsId: "441472", name: "Mobsher Mahmoud" },
  { ibsId: "422558", name: "Amir Selim" },
  { ibsId: "447144", name: "Mohamed Awad" },
  { ibsId: "447140", name: "Ronza" },
  { ibsId: "447141", name: "Ahmed Hawkas" },
  { ibsId: "417441", name: "Basmala" },
  { ibsId: "449527", name: "M.Ashraf Hamzawy" },
  { ibsId: "449529", name: "Felopateer" },
  { ibsId: "435083", name: "Saber Ramadan" },
  { ibsId: "440784", name: "Mohamed Gaber" },
  { ibsId: "440783", name: "Malak Abdelsalam" },
  { ibsId: "451729", name: "Abdullah Ahmed Saeed" },
  { ibsId: "449528", name: "Ibrahim Wael" },
  { ibsId: "425299", name: "Adham Elshandour" },
  { ibsId: "427408", name: "Mohanad Hatem" },
  { ibsId: "442605", name: "Ziad Mohamed Ibrahim" },
  { ibsId: "453222", name: "Abdelrahman Mohsen" },
  { ibsId: "453219", name: "Mohamed Tamer" },
  { ibsId: "420040", name: "Ashraf Elsayed" },
  { ibsId: "440778", name: "Mohamed Eissa" },
];

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Create connection
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    let addedCount = 0;
    let skippedCount = 0;

    for (const emp of employeeData) {
      try {
        // Check if employee already exists
        const existing = await db
          .select()
          .from(employees)
          .where(eq(employees.ibsId, emp.ibsId))
          .limit(1);

        if (existing.length === 0) {
          // Insert new employee
          await db.insert(employees).values({
            ibsId: emp.ibsId,
            name: emp.name,
            isAdmin: 0,
          });
          addedCount++;
          console.log(`✅ Added: ${emp.name} (${emp.ibsId})`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped: ${emp.name} (${emp.ibsId}) - already exists`);
        }
      } catch (err) {
        console.error(`❌ Error adding ${emp.name}:`, err.message);
      }
    }

    console.log(`\n📊 Seeding complete!`);
    console.log(`✅ Added: ${addedCount} employees`);
    console.log(`⏭️  Skipped: ${skippedCount} employees`);
    console.log(`📈 Total employees in system: ${addedCount + skippedCount}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Import eq for the query
import { eq } from "drizzle-orm";

seedDatabase();
