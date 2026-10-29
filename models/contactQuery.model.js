import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

export const MAX_QUERIES_PER_DATE = 50;

let tableInitialized = false;

/**
 * Ensures the ContactQueries table exists in the database.
 */
export async function ensureContactQueriesTable() {
    if (tableInitialized) return;

    const pool = await db;
    await pool.request().query(`
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
    `);

    tableInitialized = true;
}

/**
 * Count existing contact queries for a specific date (YYYY-MM-DD)
 * @param {string} selectedDate
 * @returns {Promise<number>}
 */
export async function countQueriesByDate(selectedDate) {
    await ensureContactQueriesTable();
    const pool = await db;

    const result = await pool
        .request()
        .input("selected_date", sql.Date, selectedDate)
        .query(`
            SELECT COUNT(*) AS query_count
            FROM dbo.ContactQueries
            WHERE selected_date = @selected_date
        `);

    return Number(result.recordset[0]?.query_count || 0);
}

/**
 * Insert a new contact query into ContactQueries
 */
export async function createContactQuery({
    client_name,
    client_email = null,
    client_phone = null,
    query_message,
    selected_date,
    status = "Pending",
}) {
    await ensureContactQueriesTable();
    const pool = await db;

    const result = await pool
        .request()
        .input("client_name", sql.NVarChar(255), client_name.trim())
        .input(
            "client_email",
            sql.NVarChar(255),
            client_email ? client_email.trim() : null
        )
        .input(
            "client_phone",
            sql.NVarChar(50),
            client_phone ? client_phone.trim() : null
        )
        .input("query_message", sql.NVarChar(sql.MAX), query_message.trim())
        .input("selected_date", sql.Date, selected_date)
        .input("status", sql.VarChar(50), status)
        .query(`
            INSERT INTO dbo.ContactQueries
                (client_name, client_email, client_phone, query_message, selected_date, status)
            OUTPUT
                INSERTED.id,
                INSERTED.client_name,
                INSERTED.client_email,
                INSERTED.client_phone,
                INSERTED.query_message,
                CONVERT(VARCHAR(10), INSERTED.selected_date, 23) AS selected_date,
                INSERTED.status,
                INSERTED.created_at
            VALUES
                (@client_name, @client_email, @client_phone, @query_message, @selected_date, @status)
        `);

    return result.recordset[0];
}

/**
 * Get dates where the query count has reached or exceeded maxCapacity (50),
 * along with per-date booking counts for calendar availability indicators.
 * @param {number} maxCapacity
 */
export async function getBookedDatesSummary(maxCapacity = MAX_QUERIES_PER_DATE) {
    await ensureContactQueriesTable();
    const pool = await db;

    const bookedResult = await pool
        .request()
        .input("maxCapacity", sql.Int, maxCapacity)
        .query(`
            SELECT
                CONVERT(VARCHAR(10), selected_date, 23) AS selected_date,
                COUNT(*) AS query_count
            FROM dbo.ContactQueries
            GROUP BY selected_date
            HAVING COUNT(*) >= @maxCapacity
            ORDER BY selected_date ASC
        `);

    const allCountsResult = await pool.request().query(`
        SELECT
            CONVERT(VARCHAR(10), selected_date, 23) AS selected_date,
            COUNT(*) AS query_count
        FROM dbo.ContactQueries
        GROUP BY selected_date
        ORDER BY selected_date ASC
    `);

    const bookedDates = bookedResult.recordset.map((row) => row.selected_date);
    const dateCounts = {};

    for (const row of allCountsResult.recordset) {
        if (row.selected_date) {
            dateCounts[row.selected_date] = Number(row.query_count || 0);
        }
    }

    return {
        bookedDates,
        dateCounts,
        maxCapacity,
    };
}

/**
 * Get all contact queries for the Admin Dashboard with optional filtering and pagination
 */
export async function getContactQueries({
    selected_date = null,
    status = null,
    search = null,
    page = null,
    limit = null,
} = {}) {
    await ensureContactQueriesTable();
    const pool = await db;
    const request = pool.request();

    let whereClause = "WHERE 1 = 1";

    if (selected_date && selected_date !== "All") {
        whereClause += " AND selected_date = @selected_date";
        request.input("selected_date", sql.Date, selected_date);
    }

    if (status && status !== "All") {
        whereClause += " AND status = @status";
        request.input("status", sql.VarChar(50), status);
    }

    if (search && search.trim()) {
        whereClause += ` AND (
            client_name LIKE @search OR
            client_email LIKE @search OR
            client_phone LIKE @search OR
            query_message LIKE @search
        )`;
        request.input("search", sql.NVarChar(255), `%${search.trim()}%`);
    }

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM dbo.ContactQueries
        ${whereClause}
    `;
    const countResult = await request.query(countQuery);
    const total = Number(countResult.recordset[0]?.total || 0);

    let dataQuery = `
        SELECT
            id,
            client_name,
            client_email,
            client_phone,
            query_message,
            CONVERT(VARCHAR(10), selected_date, 23) AS selected_date,
            status,
            created_at
        FROM dbo.ContactQueries
        ${whereClause}
        ORDER BY created_at DESC, id DESC
    `;

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    if (
        Number.isInteger(parsedPage) &&
        parsedPage > 0 &&
        Number.isInteger(parsedLimit) &&
        parsedLimit > 0
    ) {
        const offset = (parsedPage - 1) * parsedLimit;
        request.input("offset", sql.Int, offset);
        request.input("limit", sql.Int, parsedLimit);
        dataQuery += " OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    }

    const dataResult = await request.query(dataQuery);

    return {
        queries: dataResult.recordset,
        total,
    };
}

/**
 * Update the status of a specific contact query
 */
export async function updateContactQueryStatus(id, status) {
    await ensureContactQueriesTable();
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("status", sql.VarChar(50), status)
        .query(`
            UPDATE dbo.ContactQueries
            SET status = @status
            OUTPUT
                INSERTED.id,
                INSERTED.client_name,
                INSERTED.client_email,
                INSERTED.client_phone,
                INSERTED.query_message,
                CONVERT(VARCHAR(10), INSERTED.selected_date, 23) AS selected_date,
                INSERTED.status,
                INSERTED.created_at
            WHERE id = @id
        `);

    return result.recordset[0] || null;
}

