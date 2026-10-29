
import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

/**
 * Create a new client
 */
export async function createClient({
    name,
    logo_url = null,
    cloudinary_public_id = null,
    bg_theme = "soft-blue",
    is_active = true,
    display_order = 0,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("name", sql.NVarChar(255), name.trim())
        .input("logo_url", sql.NVarChar(sql.MAX), logo_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("bg_theme", sql.NVarChar(100), bg_theme)
        .input("is_active", sql.Bit, is_active)
        .input("display_order", sql.Int, display_order)
        .query(`
            INSERT INTO clients
                (name, logo_url, cloudinary_public_id, bg_theme,
                 is_active, display_order)
            OUTPUT INSERTED.id
            VALUES
                (@name, @logo_url, @cloudinary_public_id, @bg_theme,
                 @is_active, @display_order)
        `);

    return getClientById(result.recordset[0].id);
}

/**
 * Get clients, excluding soft-deleted records
 */
export async function getClients({
    status = "active",
    isAdmin = false,
} = {}) {
    const pool = await db;
    const request = pool.request();

    let query = `
        SELECT
            id,
            name,
            logo_url,
            cloudinary_public_id,
            bg_theme,
            is_active,
            display_order,
            created_at,
            updated_at
        FROM clients
        WHERE deleted_at IS NULL
    `;

    if (!isAdmin) {
        query += " AND is_active = @is_active";
        request.input("is_active", sql.Bit, true);
    } else if (status === "active" || status === "inactive") {
        query += " AND is_active = @is_active";
        request.input("is_active", sql.Bit, status === "active");
    }

    query += " ORDER BY display_order ASC, created_at DESC";

    const result = await request.query(query);

    return result.recordset;
}

/**
 * Get one client by ID
 */
export async function getClientById(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            SELECT
                id,
                name,
                logo_url,
                cloudinary_public_id,
                bg_theme,
                is_active,
                display_order,
                created_at,
                updated_at
            FROM clients
            WHERE id = @id
                AND deleted_at IS NULL
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    return result.recordset[0];
}

/**
 * Update a client
 */
export async function updateClient(id, {
    name,
    logo_url,
    cloudinary_public_id,
    bg_theme,
    is_active,
    display_order,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("name", sql.NVarChar(255), name.trim())
        .input("logo_url", sql.NVarChar(sql.MAX), logo_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("bg_theme", sql.NVarChar(100), bg_theme)
        .input("is_active", sql.Bit, is_active)
        .input("display_order", sql.Int, display_order)
        .query(`
            UPDATE clients
            SET
                name = @name,
                logo_url = @logo_url,
                cloudinary_public_id = @cloudinary_public_id,
                bg_theme = @bg_theme,
                is_active = @is_active,
                display_order = @display_order,
                updated_at = SYSDATETIME()
            WHERE id = @id
                AND deleted_at IS NULL
        `);

    if (result.rowsAffected[0] === 0) {
        return null;
    }

    return getClientById(id);
}

/**
 * Soft delete a client
 */
export async function softDeleteClient(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            UPDATE clients
            SET
                deleted_at = SYSDATETIME(),
                is_active = 0,
                updated_at = SYSDATETIME()
            WHERE id = @id
                AND deleted_at IS NULL
        `);

    return result.rowsAffected[0] > 0;
}
