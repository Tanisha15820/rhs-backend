
import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

/**
 * Helper to safely parse JSON strings or return the fallback
 */
function safeJsonParse(val, fallback) {
    if (!val) return fallback;
    if (typeof val === "object") return val;

    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
}

/**
 * Format database blog row into a clean JavaScript object
 */
export function formatBlogRecord(row) {
    if (!row) return null;

    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        thumbnail_url: row.thumbnail_url,
        thumbnail_public_id: row.thumbnail_public_id,
        category: row.category,
        excerpt: row.excerpt,
        article_subtitle: row.article_subtitle,
        key_takeaways: safeJsonParse(row.key_takeaways, []),
        article_content: row.article_content,
        article_sections: safeJsonParse(row.article_sections, []),
        benchmark_specs: safeJsonParse(row.benchmark_specs, []),
        enquiry_cta: safeJsonParse(row.enquiry_cta, null),
        author_name: row.author_name,
        author_role: row.author_role,
        author_avatar_url: row.author_avatar_url,
        author_avatar_public_id: row.author_avatar_public_id,
        published_at: row.published_at,
        reading_time: row.reading_time,
        read_count: Number(row.read_count) || 0,
        is_featured: Boolean(row.is_featured),
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}

/**
 * Check whether a slug already exists
 */
export async function checkSlugExists(slug, excludeId = null) {
    const pool = await db;
    const request = pool.request()
        .input("slug", sql.NVarChar(255), slug);

    let query = `
        SELECT TOP 1 id
        FROM blogs
        WHERE slug = @slug
    `;

    if (excludeId !== null && excludeId !== undefined) {
        query += " AND id <> @excludeId";
        request.input("excludeId", sql.Int, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
}

/**
 * Create a new blog post
 */
export async function createBlog(blogData) {
    const {
        title,
        slug,
        thumbnail_url = null,
        thumbnail_public_id = null,
        category = null,
        excerpt,
        article_subtitle = null,
        key_takeaways = null,
        article_content = null,
        article_sections = null,
        benchmark_specs = null,
        enquiry_cta = null,
        author_name = null,
        author_role = null,
        author_avatar_url = null,
        author_avatar_public_id = null,
        published_at = null,
        reading_time = null,
        is_featured = false,
        is_active = false,
    } = blogData;

    const pool = await db;

    const result = await pool.request()
        .input("title", sql.NVarChar(255), title)
        .input("slug", sql.NVarChar(255), slug)
        .input("thumbnail_url", sql.NVarChar(sql.MAX), thumbnail_url)
        .input("thumbnail_public_id", sql.NVarChar(255), thumbnail_public_id)
        .input("category", sql.NVarChar(255), category)
        .input("excerpt", sql.NVarChar(sql.MAX), excerpt)
        .input("article_subtitle", sql.NVarChar(sql.MAX), article_subtitle)
        .input("key_takeaways", sql.NVarChar(sql.MAX), key_takeaways ? JSON.stringify(key_takeaways) : null)
        .input("article_content", sql.NVarChar(sql.MAX), article_content)
        .input("article_sections", sql.NVarChar(sql.MAX), article_sections ? JSON.stringify(article_sections) : null)
        .input("benchmark_specs", sql.NVarChar(sql.MAX), benchmark_specs ? JSON.stringify(benchmark_specs) : null)
        .input("enquiry_cta", sql.NVarChar(sql.MAX), enquiry_cta ? JSON.stringify(enquiry_cta) : null)
        .input("author_name", sql.NVarChar(255), author_name)
        .input("author_role", sql.NVarChar(255), author_role)
        .input("author_avatar_url", sql.NVarChar(sql.MAX), author_avatar_url)
        .input("author_avatar_public_id", sql.NVarChar(255), author_avatar_public_id)
        .input("published_at", sql.DateTime2, published_at)
        .input("reading_time", sql.NVarChar(100), reading_time)
        .input("is_featured", sql.Bit, Boolean(is_featured))
        .input("is_active", sql.Bit, Boolean(is_active))
        .query(`
            INSERT INTO blogs (
                title, slug, thumbnail_url, thumbnail_public_id,
                category, excerpt, article_subtitle, key_takeaways,
                article_content, article_sections, benchmark_specs,
                enquiry_cta, author_name, author_role, author_avatar_url,
                author_avatar_public_id, published_at, reading_time,
                is_featured, is_active
            )
            OUTPUT INSERTED.id
            VALUES (
                @title, @slug, @thumbnail_url, @thumbnail_public_id,
                @category, @excerpt, @article_subtitle, @key_takeaways,
                @article_content, @article_sections, @benchmark_specs,
                @enquiry_cta, @author_name, @author_role, @author_avatar_url,
                @author_avatar_public_id, @published_at, @reading_time,
                @is_featured, @is_active
            )
        `);

    return getBlogById(result.recordset[0].id, { isAdmin: true });
}


/**
 * Fetch blogs with status filtering and sorting
 */
export async function getBlogs({
    status = "active",
    isAdmin = false,
} = {}) {
    const pool = await db;
    const request = pool.request();

    let query = `
        SELECT *
        FROM blogs
        WHERE deleted_at IS NULL
    `;

    if (!isAdmin) {
        query += " AND is_active = 1";
    } else if (status === "active") {
        query += " AND is_active = 1";
    } else if (status === "inactive") {
        query += " AND is_active = 0";
    }

    query += " ORDER BY is_featured DESC, created_at DESC, id DESC";

    const result = await request.query(query);

    return result.recordset.map(formatBlogRecord);
}


/**
 * Fetch one blog by ID
 */
export async function getBlogById(
    id,
    { isAdmin = false, includeDeleted = false } = {}
) {
    const pool = await db;
    const request = pool.request()
        .input("id", sql.Int, id);

    let query = "SELECT * FROM blogs WHERE id = @id";

    if (!includeDeleted) {
        query += " AND deleted_at IS NULL";
    }

    if (!isAdmin) {
        query += " AND is_active = 1";
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) return null;

    return formatBlogRecord(result.recordset[0]);
}

/**
 * Fetch a blog by slug
 */
export async function getBlogBySlug(slug, { activeOnly = true } = {}) {
    const pool = await db;
    const request = pool.request()
        .input("slug", sql.NVarChar(255), slug);

    let query = `
        SELECT *
        FROM blogs
        WHERE slug = @slug
            AND deleted_at IS NULL
    `;

    if (activeOnly) {
        query += " AND is_active = 1";
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) return null;

    return formatBlogRecord(result.recordset[0]);
}

/**
 * Update an existing blog dynamically
 */
export async function updateBlog(id, updateData) {
    const pool = await db;
    const request = pool.request()
        .input("id", sql.Int, id);

    const allowedFields = [
        "title",
        "slug",
        "thumbnail_url",
        "thumbnail_public_id",
        "category",
        "excerpt",
        "article_subtitle",
        "key_takeaways",
        "article_content",
        "article_sections",
        "benchmark_specs",
        "enquiry_cta",
        "author_name",
        "author_role",
        "author_avatar_url",
        "author_avatar_public_id",
        "published_at",
        "reading_time",
        "is_featured",
        "is_active",
    ];

    const jsonFields = [
        "key_takeaways",
        "article_sections",
        "benchmark_specs",
        "enquiry_cta",
    ];

    const stringFields = [
        "title",
        "slug",
        "category",
        "excerpt",
        "article_subtitle",
        "article_content",
        "author_name",
        "author_role",
        "reading_time",
    ];

    const fields = [];

    for (const key of allowedFields) {
        if (updateData[key] === undefined) continue;

        const value = updateData[key];
        fields.push(`${key} = @${key}`);

        if (jsonFields.includes(key)) {
            request.input(
                key,
                sql.NVarChar(sql.MAX),
                value === null ? null : JSON.stringify(value)
            );
        } else if (key === "is_featured" || key === "is_active") {
            request.input(key, sql.Bit, Boolean(value));
        } else if (key === "published_at") {
            request.input(key, sql.DateTime2, value);
        } else if (stringFields.includes(key)) {
            const isLongText = [
                "excerpt",
                "article_subtitle",
                "article_content",
            ].includes(key);

            request.input(
                key,
                isLongText ? sql.NVarChar(sql.MAX) : sql.NVarChar(255),
                value
            );
        } else if (
            key === "thumbnail_url" ||
            key === "author_avatar_url"
        ) {
            request.input(key, sql.NVarChar(sql.MAX), value);
        } else {
            request.input(key, sql.NVarChar(255), value);
        }
    }

    if (fields.length === 0) {
        return getBlogById(id, { isAdmin: true });
    }

    const result = await request.query(`
        UPDATE blogs
        SET ${fields.join(", ")}
        WHERE id = @id
            AND deleted_at IS NULL
    `);

    if (result.rowsAffected[0] === 0) {
        return null;
    }

    return getBlogById(id, { isAdmin: true });
}

/**
 * Soft-delete a blog
 */
export async function softDeleteBlog(id) {
    const pool = await db;

    const result = await pool.request()
        .input("id", sql.Int, id)
        .query(`
            UPDATE blogs
            SET
                deleted_at = SYSDATETIME(),
                is_active = 0,
                updated_at = SYSDATETIME()
            WHERE id = @id
                AND deleted_at IS NULL
        `);

    return result.rowsAffected[0] > 0;
}

/**
 * Increment blog read count
 */
export async function incrementReadCount(idOrSlug) {
    const pool = await db;
    const isId = Number.isInteger(Number(idOrSlug));
    const request = pool.request();

    let query;

    if (isId) {
        request.input("id", sql.Int, Number(idOrSlug));
        query = `
            UPDATE blogs
            SET read_count = read_count + 1
            WHERE id = @id AND deleted_at IS NULL
        `;
    } else {
        request.input("slug", sql.NVarChar(255), String(idOrSlug));
        query = `
            UPDATE blogs
            SET read_count = read_count + 1
            WHERE slug = @slug AND deleted_at IS NULL
        `;
    }

    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
}
