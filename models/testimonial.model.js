
import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

/**
 * Create a new testimonial
 */
export async function createTestimonial({
    author_name,
    quote,
    bg_theme = "lavender",
    image_url = null,
    cloudinary_public_id = null,
    is_active = true,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("author_name", sql.NVarChar(255), author_name.trim())
        .input("quote", sql.NVarChar(sql.MAX), quote.trim())
        .input("bg_theme", sql.NVarChar(100), bg_theme)
        .input("image_url", sql.NVarChar(sql.MAX), image_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("is_active", sql.Bit, is_active)
        .query(`
            INSERT INTO testimonials
                (author_name, quote, bg_theme, image_url,
                 cloudinary_public_id, is_active)
            OUTPUT
                INSERTED.id,
                INSERTED.author_name,
                INSERTED.quote,
                INSERTED.bg_theme,
                INSERTED.image_url,
                INSERTED.cloudinary_public_id,
                INSERTED.is_active,
                INSERTED.created_at,
                INSERTED.updated_at
            VALUES
                (@author_name, @quote, @bg_theme, @image_url,
                 @cloudinary_public_id, @is_active)
        `);

    return result.recordset[0];
}

/**
 * Get testimonials, excluding soft-deleted records
 */
export async function getTestimonials({
    status = "active",
    isAdmin = false,
} = {}) {
    const pool = await db;
    const request = pool.request();

    let query = `
        SELECT
            id, author_name, quote, bg_theme, image_url,
            cloudinary_public_id, is_active, created_at, updated_at
        FROM testimonials
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
 * Get one testimonial by ID
 */
export async function getTestimonialById(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            SELECT
                id, author_name, quote, bg_theme, image_url,
                cloudinary_public_id, is_active, created_at, updated_at
            FROM testimonials
            WHERE id = @id AND deleted_at IS NULL
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    return result.recordset[0];
}

/**
 * Update a testimonial and return the updated record
 */
export async function updateTestimonial(id, {
    author_name,
    quote,
    bg_theme,
    image_url = null,
    cloudinary_public_id = null,
    is_active,
}) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("author_name", sql.NVarChar(255), author_name.trim())
        .input("quote", sql.NVarChar(sql.MAX), quote.trim())
        .input("bg_theme", sql.NVarChar(100), bg_theme)
        .input("image_url", sql.NVarChar(sql.MAX), image_url)
        .input("cloudinary_public_id", sql.NVarChar(255), cloudinary_public_id)
        .input("is_active", sql.Bit, is_active)
        .query(`
            UPDATE testimonials
            SET
                author_name = @author_name,
                quote = @quote,
                bg_theme = @bg_theme,
                image_url = @image_url,
                cloudinary_public_id = @cloudinary_public_id,
                is_active = @is_active,
                updated_at = SYSDATETIME()
            WHERE id = @id AND deleted_at IS NULL
        `);

    if (result.rowsAffected[0] === 0) {
        return null;
    }

    return getTestimonialById(id);
}

/**
 * Soft delete a testimonial
 */
export async function softDeleteTestimonial(id) {
    const pool = await db;

    const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
            UPDATE testimonials
            SET
                deleted_at = SYSDATETIME(),
                is_active = 0,
                updated_at = SYSDATETIME()
            WHERE id = @id AND deleted_at IS NULL
        `);

    return result.rowsAffected[0] > 0;
}
