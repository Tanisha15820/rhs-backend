
import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

/**
 * Create a new product
 */
export async function createProduct({
    name,
    color_palette,
    image_url,
    cloudinary_public_id,
    is_active = true,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("name", sql.NVarChar(255), name.trim())
        .input("color_palette", sql.NVarChar(100), color_palette)
        .input("image_url", sql.NVarChar(sql.MAX), image_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("is_active", sql.Bit, is_active)
        .query(`
            INSERT INTO products
                (name, color_palette, image_url, cloudinary_public_id, is_active)
            OUTPUT
                INSERTED.id,
                INSERTED.name,
                INSERTED.color_palette,
                INSERTED.image_url,
                INSERTED.cloudinary_public_id,
                INSERTED.is_active,
                INSERTED.created_at,
                INSERTED.updated_at
            VALUES
                (@name, @color_palette, @image_url, @cloudinary_public_id, @is_active)
        `);

    return result.recordset[0];
}

/**
 * Get products, excluding soft-deleted records
 */
export async function getProducts({
    status = "active",
    isAdmin = false,
} = {}) {
    const pool = await db;
    const request = pool.request();

    let query = `
        SELECT
            id, name, color_palette, image_url,
            cloudinary_public_id, is_active, created_at, updated_at
        FROM products
        WHERE deleted_at IS NULL
    `;

    if (!isAdmin) {
        query += " AND is_active = @is_active";
        request.input("is_active", sql.Bit, true);
    } else if (status === "active" || status === "inactive") {
        query += " AND is_active = @is_active";
        request.input("is_active", sql.Bit, status === "active");
    }

    query += " ORDER BY created_at DESC";

    const result = await request.query(query);

    return result.recordset;
}

/**
 * Get one product by ID, excluding soft-deleted records
 */
export async function getProductById(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            SELECT
                id, name, color_palette, image_url,
                cloudinary_public_id, is_active, created_at, updated_at
            FROM products
            WHERE id = @id AND deleted_at IS NULL
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    return result.recordset[0];
}

/**
 * Update a product and return the updated record
 */
export async function updateProduct(id, {
    name,
    color_palette,
    image_url,
    cloudinary_public_id,
    is_active,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("name", sql.NVarChar(255), name.trim())
        .input("color_palette", sql.NVarChar(100), color_palette)
        .input("image_url", sql.NVarChar(sql.MAX), image_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("is_active", sql.Bit, is_active)
        .query(`
            UPDATE products
            SET
                name = @name,
                color_palette = @color_palette,
                image_url = @image_url,
                cloudinary_public_id = @cloudinary_public_id,
                is_active = @is_active,
                updated_at = SYSDATETIME()
            WHERE id = @id AND deleted_at IS NULL
        `);

    if (result.rowsAffected[0] === 0) {
        return null;
    }

    return getProductById(id);
}

/**
 * Soft delete a product
 */
export async function softDeleteProduct(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            UPDATE products
            SET
                deleted_at = SYSDATETIME(),
                is_active = 0,
                updated_at = SYSDATETIME()
            WHERE id = @id AND deleted_at IS NULL
        `);

    return result.rowsAffected[0] > 0;
}
