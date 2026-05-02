import sqlite3 from "sqlite3";

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

function seed() {
  const db = new sqlite3.Database("sqlite.db");
  const now = Date.now();
  
  db.serialize(() => {
    // Ensure table exists
    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ibsId TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        isAdmin INTEGER DEFAULT 0 NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    const stmt = db.prepare('INSERT OR IGNORE INTO employees (ibsId, name, isAdmin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)');
    
    for (const emp of employeeData) {
      stmt.run(emp.ibsId, emp.name, 0, now, now);
      console.log(`Added/Skipped: ${emp.name}`);
    }
    
    stmt.finalize();
  });
  
  db.close(() => {
    console.log("Seeding complete!");
  });
}

seed();
