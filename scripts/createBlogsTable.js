import "dotenv/config";
import db from "../config/db.js";

/**
 * Database Migration Script: Create Blogs Table
 * Creates the blogs table supporting both card previews and the complete article reader.
 */
async function createBlogsTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS blogs (
                id INT NOT NULL AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL,
                thumbnail_url VARCHAR(2048) DEFAULT NULL,
                thumbnail_public_id VARCHAR(255) DEFAULT NULL,
                category VARCHAR(100) DEFAULT NULL,
                excerpt TEXT NOT NULL,
                article_subtitle VARCHAR(500) DEFAULT NULL,
                key_takeaways JSON DEFAULT NULL,
                article_content LONGTEXT DEFAULT NULL,
                article_sections JSON DEFAULT NULL,
                benchmark_specs JSON DEFAULT NULL,
                enquiry_cta JSON DEFAULT NULL,
                author_name VARCHAR(150) DEFAULT NULL,
                author_role VARCHAR(150) DEFAULT NULL,
                author_avatar_url VARCHAR(2048) DEFAULT NULL,
                author_avatar_public_id VARCHAR(255) DEFAULT NULL,
                published_at VARCHAR(100) DEFAULT NULL,
                reading_time VARCHAR(50) DEFAULT NULL,
                read_count INT NOT NULL DEFAULT 0,
                is_featured TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uk_blogs_slug (slug),
                INDEX idx_blogs_active (is_active, deleted_at),
                INDEX idx_blogs_featured (is_featured),
                INDEX idx_blogs_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `;

        await db.execute(query);
        console.log("Blogs table created or verified successfully.");
    } catch (error) {
        console.error("Failed to create blogs table:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

createBlogsTable();
