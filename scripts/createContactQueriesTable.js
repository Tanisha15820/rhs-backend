import "dotenv/config";
import db from "../config/db.js";

/**
 * Database Migration / Table Creation Script: ContactQueries
 * Builds the ContactQueries table in Microsoft SQL Server (rhs_db).
 */
async function createContactQueriesTable() {
    let pool;
    try {
        pool = await db;

        const query = `
            IF OBJECT_ID('dbo.ContactQueries', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ContactQueries (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    client_name NVARCHAR(255) NOT NULL,
                    client_email NVARCHAR(255) NULL,
                    client_phone NVARCHAR(50) NULL,
                    query_message NVARCHAR(MAX) NOT NULL,
                    selected_date DATE NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );

                CREATE INDEX idx_contact_queries_selected_date
                    ON dbo.ContactQueries (selected_date);

                CREATE INDEX idx_contact_queries_status
                    ON dbo.ContactQueries (status);

                CREATE INDEX idx_contact_queries_created_at
                    ON dbo.ContactQueries (created_at DESC);
            END
        `;

        await pool.request().query(query);
        console.log("ContactQueries table created or verified successfully.");
    } catch (error) {
        console.error("Failed to create ContactQueries table:", error.message);
        process.exitCode = 1;
    } finally {
        if (pool && typeof pool.close === "function") {
            await pool.close();
        }
    }
}

createContactQueriesTable();

