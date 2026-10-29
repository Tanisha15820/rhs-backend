import "dotenv/config";
import db from "../config/db.js";

async function createTestimonialsTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS testimonials (
                id INT NOT NULL AUTO_INCREMENT,
                author_name VARCHAR(255) NOT NULL,
                quote TEXT NOT NULL,
                bg_theme ENUM('lavender', 'sky', 'rose', 'white', 'purple', 'mint') NOT NULL DEFAULT 'lavender',
                image_url VARCHAR(2048) DEFAULT NULL,
                cloudinary_public_id VARCHAR(255) DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `;

        await db.execute(query);
        console.log("Testimonials table created or verified successfully.");
    } catch (error) {
        console.error("Failed to create testimonials table:", error.message);
    } finally {
        await db.end();
    }
}

createTestimonialsTable();
