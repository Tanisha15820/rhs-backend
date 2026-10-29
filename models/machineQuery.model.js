import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

let tableInitialized = false;

export const ALLOWED_ENQUIRY_STATUSES = [
    "New",
    "Contacted",
    "In Progress",
    "Completed",
];

/**
 * Ensures the `machine_queries` table and all required Product Enquiry columns exist in SQL Server.
 */
export async function ensureMachineQueriesTable() {
    if (tableInitialized) return;

    const pool = await db;
    await pool.request().query(`
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
    `);

    tableInitialized = true;
}

/**
 * Formats a database row from `dbo.machine_queries` into a unified object
 * supporting both the Admin Machine Queries table and Product Enquiry detail view.
 */
export function formatEnquiryRecord(row) {
    if (!row) return null;

    let parsedProducts = [];
    if (row.products_json) {
        try {
            const parsed = JSON.parse(row.products_json);
            if (Array.isArray(parsed)) {
                parsedProducts = parsed;
            }
        } catch {
            parsedProducts = [];
        }
    }

    if (parsedProducts.length === 0 && row.machine_name) {
        parsedProducts = row.machine_name
            .split(",")
            .map((part, idx) => ({
                id: row.machine_id || idx + 1,
                name: part.trim(),
                quantity: 1,
                image: "",
            }))
            .filter((p) => p.name);
    }

    return {
        id: row.id,
        machine_id: row.machine_id || "",
        machine_name: row.machine_name || "",
        products: parsedProducts,
        hospital: row.hospital || "",
        user_name: row.user_name || "",
        name: row.user_name || "",
        user_email: row.user_email || "",
        email: row.user_email || "",
        user_phone: row.user_phone || "",
        contact: row.user_phone || "",
        address: row.address || "",
        country: row.country || "INDIA",
        state: row.state || "",
        city: row.city || "",
        pin_code: row.pin_code || "",
        pinCode: row.pin_code || "",
        query_reason: row.query_reason || row.message || "",
        message: row.message || row.query_reason || "",
        details: row.query_reason || row.message || "",
        status: row.status || "New",
        admin_notes: row.admin_notes || "",
        adminNotes: row.admin_notes || "",
        created_at: row.created_at,
        submittedAt: row.created_at,
    };
}

/**
 * Insert a new product/machine enquiry into `dbo.machine_queries`
 */
export async function createMachineQuery({
    machine_id = null,
    machine_name,
    products = [],
    hospital = null,
    user_name,
    user_email = null,
    user_phone,
    address = null,
    country = "INDIA",
    state = null,
    city = null,
    pin_code = null,
    query_reason = "",
    message = null,
}) {
    await ensureMachineQueriesTable();
    const pool = await db;

    const resolvedReason = (query_reason || message || "").trim();
    const resolvedMessage = (message || query_reason || "").trim();
    const productsJson =
        Array.isArray(products) && products.length > 0
            ? JSON.stringify(
                  products.map((p) => ({
                      id: p.id ?? p.machine_id ?? 1,
                      machine_id: String(p.machine_id ?? p.id ?? "1"),
                      name: String(
                          p.machine_name || p.name || machine_name
                      ).trim(),
                      quantity: Number(p.quantity) > 0 ? Number(p.quantity) : 1,
                      image: typeof p.image === "string" ? p.image : "",
                  }))
              )
            : null;

    const result = await pool
        .request()
        .input(
            "machine_id",
            sql.NVarChar(255),
            machine_id !== null && machine_id !== undefined
                ? String(machine_id).trim()
                : null
        )
        .input("machine_name", sql.NVarChar(500), machine_name.trim())
        .input("products_json", sql.NVarChar(sql.MAX), productsJson)
        .input(
            "hospital",
            sql.NVarChar(255),
            hospital ? String(hospital).trim() : null
        )
        .input("user_name", sql.NVarChar(255), user_name.trim())
        .input(
            "user_email",
            sql.NVarChar(255),
            user_email ? user_email.trim() : null
        )
        .input("user_phone", sql.NVarChar(50), user_phone.trim())
        .input(
            "address",
            sql.NVarChar(500),
            address ? String(address).trim() : null
        )
        .input(
            "country",
            sql.NVarChar(100),
            country ? String(country).trim() : "INDIA"
        )
        .input("state", sql.NVarChar(100), state ? String(state).trim() : null)
        .input("city", sql.NVarChar(100), city ? String(city).trim() : null)
        .input(
            "pin_code",
            sql.NVarChar(50),
            pin_code ? String(pin_code).trim() : null
        )
        .input("query_reason", sql.NVarChar(sql.MAX), resolvedReason)
        .input("message", sql.NVarChar(sql.MAX), resolvedMessage)
        .input("status", sql.NVarChar(50), "New")
        .query(`
            INSERT INTO dbo.machine_queries (
                machine_id,
                machine_name,
                products_json,
                hospital,
                user_name,
                user_email,
                user_phone,
                address,
                country,
                state,
                city,
                pin_code,
                query_reason,
                message,
                status
            )
            OUTPUT INSERTED.*
            VALUES (
                @machine_id,
                @machine_name,
                @products_json,
                @hospital,
                @user_name,
                @user_email,
                @user_phone,
                @address,
                @country,
                @state,
                @city,
                @pin_code,
                @query_reason,
                @message,
                @status
            )
        `);

    return formatEnquiryRecord(result.recordset[0]);
}

/**
 * Fetch product/machine enquiries with optional `machine_name`, `status`, and `search` filters
 */
export async function getMachineQueries({
    machine_name = null,
    status = null,
    search = null,
} = {}) {
    await ensureMachineQueriesTable();
    const pool = await db;
    const request = pool.request();

    let whereClause = "WHERE 1 = 1";

    if (machine_name && machine_name !== "All" && machine_name !== "all") {
        whereClause +=
            " AND (machine_name = @machine_name OR machine_name LIKE @machine_name_like)";
        request.input("machine_name", sql.NVarChar(500), machine_name.trim());
        request.input(
            "machine_name_like",
            sql.NVarChar(500),
            `%${machine_name.trim()}%`
        );
    }

    if (status && status !== "All" && status !== "all") {
        whereClause += " AND status = @status";
        request.input("status", sql.NVarChar(50), status.trim());
    }

    if (search && search.trim()) {
        whereClause += ` AND (
            machine_name LIKE @search OR
            hospital LIKE @search OR
            user_name LIKE @search OR
            user_email LIKE @search OR
            user_phone LIKE @search OR
            city LIKE @search OR
            state LIKE @search OR
            pin_code LIKE @search OR
            query_reason LIKE @search OR
            message LIKE @search
        )`;
        request.input("search", sql.NVarChar(255), `%${search.trim()}%`);
    }

    const dataResult = await request.query(`
        SELECT *
        FROM dbo.machine_queries
        ${whereClause}
        ORDER BY created_at DESC, id DESC
    `);

    const distinctMachinesResult = await pool.request().query(`
        SELECT DISTINCT machine_name
        FROM dbo.machine_queries
        WHERE machine_name IS NOT NULL AND LTRIM(RTRIM(machine_name)) <> ''
        ORDER BY machine_name ASC
    `);

    const queries = dataResult.recordset.map(formatEnquiryRecord);
    const machineNamesSet = new Set();

    distinctMachinesResult.recordset.forEach((r) => {
        if (r.machine_name) {
            machineNamesSet.add(r.machine_name);
        }
    });
    queries.forEach((q) => {
        if (Array.isArray(q.products)) {
            q.products.forEach((p) => {
                if (p.name) machineNamesSet.add(p.name);
            });
        }
    });

    const machineNames = Array.from(machineNamesSet).sort();

    return {
        queries,
        enquiries: queries,
        total: queries.length,
        machineNames,
    };
}

/**
 * Update the status of a product/machine enquiry
 */
export async function updateMachineQueryStatus(id, status) {
    await ensureMachineQueriesTable();
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, Number(id))
        .input("status", sql.NVarChar(50), status.trim())
        .query(`
            UPDATE dbo.machine_queries
            SET status = @status
            OUTPUT INSERTED.*
            WHERE id = @id
        `);

    return formatEnquiryRecord(result.recordset[0] || null);
}

/**
 * Update internal admin notes for a product/machine enquiry
 */
export async function updateMachineQueryNotes(id, adminNotes) {
    await ensureMachineQueriesTable();
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, Number(id))
        .input(
            "admin_notes",
            sql.NVarChar(sql.MAX),
            adminNotes !== undefined && adminNotes !== null
                ? String(adminNotes)
                : ""
        )
        .query(`
            UPDATE dbo.machine_queries
            SET admin_notes = @admin_notes
            OUTPUT INSERTED.*
            WHERE id = @id
        `);

    return formatEnquiryRecord(result.recordset[0] || null);
}
