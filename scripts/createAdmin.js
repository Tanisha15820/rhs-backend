
import "dotenv/config";
import bcrypt from "bcrypt";
import db from "../config/db.js";

const username = "admin";
const password = "admin@123";

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            `INSERT INTO admins (username, password)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
            [username, hashedPassword]
        );

        console.log("Admin account created successfully.");
        console.log("Username:", username);
        console.log("Change the default password before production.");
    } catch (error) {
        console.error("Failed to create admin:", error.message);
    } finally {
        await db.end();
    }
}

createAdmin();
