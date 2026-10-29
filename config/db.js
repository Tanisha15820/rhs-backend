import sql from "mssql/msnodesqlv8.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
dotenv.config({ path: envPath });

const server = `${process.env.DB_SERVER || "TANISHA"}\\${process.env.DB_INSTANCE || "SQLEXPRESS"}`;

const config = {
    connectionString:
        `Driver={ODBC Driver 18 for SQL Server};` +
        `Server=${server};` +
        `Database=${process.env.DB_NAME || "rhs_db"};` +
        `Trusted_Connection=yes;` +
        `TrustServerCertificate=yes;`,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const db = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
        console.log("Microsoft SQL Server connected successfully");
        return pool;
    })
    .catch((error) => {
        console.error("Database connection failed:", error.message);
        throw error;
    });

export default db;
