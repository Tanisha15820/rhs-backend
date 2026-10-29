import "dotenv/config";
import db from "../config/db.js";

/**
 * Standalone Database Migration Script: create_machine_queries_table
 * Creates or updates the `machine_queries` table in Microsoft SQL Server (rhs_db)
 * so it stores all Product Enquiry / Machine Query fields submitted from the RHS website.
 */
async function createMachineQueriesTable() {
    let pool;
    try {
        pool = await db;

        const query = `
            IF OBJECT_ID('dbo.machine_queries', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.machine_queries (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_id NVARCHAR(255) NULL,
                    machine_name NVARCHAR(500) NOT NULL,
                    products_json NVARCHAR(MAX) NULL,
                    hospital NVARCHAR(255) NULL,
                    user_name NVARCHAR(255) NOT NULL,
                    user_email NVARCHAR(255) NULL,
                    user_phone NVARCHAR(50) NOT NULL,
                    address NVARCHAR(500) NULL,
                    country NVARCHAR(100) NULL DEFAULT 'INDIA',
                    state NVARCHAR(100) NULL,
                    city NVARCHAR(100) NULL,
                    pin_code NVARCHAR(50) NULL,
                    query_reason NVARCHAR(MAX) NOT NULL,
                    message NVARCHAR(MAX) NULL,
                    status NVARCHAR(50) NOT NULL DEFAULT 'New',
                    admin_notes NVARCHAR(MAX) NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );

                CREATE INDEX idx_machine_queries_machine_name
                    ON dbo.machine_queries (machine_name);

                CREATE INDEX idx_machine_queries_created_at
                    ON dbo.machine_queries (created_at DESC);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.machine_queries', 'products_json') IS NULL
                    ALTER TABLE dbo.machine_queries ADD products_json NVARCHAR(MAX) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'hospital') IS NULL
                    ALTER TABLE dbo.machine_queries ADD hospital NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'address') IS NULL
                    ALTER TABLE dbo.machine_queries ADD address NVARCHAR(500) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'country') IS NULL
                    ALTER TABLE dbo.machine_queries ADD country NVARCHAR(100) NULL DEFAULT 'INDIA';

                IF COL_LENGTH('dbo.machine_queries', 'state') IS NULL
                    ALTER TABLE dbo.machine_queries ADD state NVARCHAR(100) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'city') IS NULL
                    ALTER TABLE dbo.machine_queries ADD city NVARCHAR(100) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'pin_code') IS NULL
                    ALTER TABLE dbo.machine_queries ADD pin_code NVARCHAR(50) NULL;

                IF COL_LENGTH('dbo.machine_queries', 'status') IS NULL
                    ALTER TABLE dbo.machine_queries ADD status NVARCHAR(50) NOT NULL DEFAULT 'New';

                IF COL_LENGTH('dbo.machine_queries', 'admin_notes') IS NULL
                    ALTER TABLE dbo.machine_queries ADD admin_notes NVARCHAR(MAX) NULL;
            END
        `;

        await pool.request().query(query);
        console.log("machine_queries table created or updated successfully.");
    } catch (error) {
        console.error("Failed to create/update machine_queries table:", error.message);
        process.exitCode = 1;
    } finally {
        if (pool && typeof pool.close === "function") {
            await pool.close();
        }
    }
}

createMachineQueriesTable();
