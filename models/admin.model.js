
import db from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

/**
 * Find an admin record by username
 */
export async function findAdminByUsername(username) {
    const pool = await db;

    const result = await pool
        .request()
        .input("username", sql.NVarChar(255), username)
        .query(`
            SELECT TOP 1 id, username, password
            FROM admins
            WHERE username = @username
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    return result.recordset[0];
}
