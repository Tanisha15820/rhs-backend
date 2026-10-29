import "dotenv/config";
import db from "../config/db.js";

async function createClientsTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS clients (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                logo_url VARCHAR(2048) DEFAULT NULL,
                cloudinary_public_id VARCHAR(255) DEFAULT NULL,
                bg_theme ENUM('soft-blue', 'sky-tint', 'mint-tint', 'lavender-tint', 'ice-blue', 'seafoam', 'warm-peach', 'pure-white') NOT NULL DEFAULT 'soft-blue',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                display_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `;

        await db.execute(query);
        console.log("Clients table created or verified successfully.");
    } catch (error) {
        console.error("Failed to create clients table:", error.message);
    } finally {
        await db.end();
    }
}

createClientsTable();
