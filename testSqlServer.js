
import dotenv from "dotenv";
import sql from "mssql/msnodesqlv8.js";

dotenv.config();

const server = `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`;

const config = {
    connectionString:
        `Driver={ODBC Driver 18 for SQL Server};` +
        `Server=${server};` +
        `Database=${process.env.DB_NAME};` +
        `Trusted_Connection=yes;` +
        `TrustServerCertificate=yes;`
};

try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(
        "SELECT DB_NAME() AS databaseName, @@SERVERNAME AS serverName"
    );

    console.log("SQL Server connection successful!");
    console.log(result.recordset[0]);

    await pool.close();
} catch (error) {
    console.error("SQL Server connection failed:", error.message);
    process.exitCode = 1;
}
