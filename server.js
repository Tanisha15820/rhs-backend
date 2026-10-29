import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const envPath = fileURLToPath(new URL("./.env", import.meta.url));
dotenv.config({ path: envPath });

import db from "./config/db.js";
import testRoutes from "./routes/test.routes.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import testimonialRoutes from "./routes/testimonial.routes.js";
import clientRoutes from "./routes/client.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import contactQueryRoutes from "./routes/contactQuery.routes.js";
import machineQueryRoutes from "./routes/machineQuery.routes.js";

const app = express();

// Support Chrome Private Network Access (LAN IP -> localhost preflight)
app.use((req, res, next) => {
    if (req.headers["access-control-request-private-network"]) {
        res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    next();
});

app.use(
    cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/contact-us", contactQueryRoutes);
app.use("/api/product-enquiries", machineQueryRoutes);
app.use("/api/queries", machineQueryRoutes);

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "RHS Backend API",
            version: "1.0.0",
            description: "APIs for RHS website and admin panel",
        },
        servers: [
            {
                url: "http://localhost:5000",
            },
        ],
        tags: [
            {
                name: "Test",
                description: "API testing endpoints",
            },
            {
                name: "Authentication",
                description: "Admin authentication endpoints",
            },
            {
                name: "Products",
                description: "Product catalog management endpoints",
            },
            {
                name: "Testimonials",
                description: "Client testimonials and reviews",
            },
            {
                name: "Clients",
                description: "Client and partner hospital management",
            },
            {
                name: "Blogs",
                description: "Blog articles and medical content",
            },
            {
                name: "Contact Us",
                description: "Contact Us queries and date-based call booking endpoints",
            },
            {
                name: "Product Enquiries",
                description: "Product Enquiry & Machine Query endpoints",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Backend test
app.get("/", (req, res) => {
    res.json({
        message: "RHS Backend is running successfully",
    });
});

// SQL Server connection test
app.get("/api/health/db", async (req, res) => {
    try {
        const pool = await db;

        const result = await pool.request().query(
            "SELECT DB_NAME() AS databaseName, @@SERVERNAME AS serverName"
        );

        res.json({
            message: "SQL Server connected successfully",
            database: result.recordset[0].databaseName,
            server: result.recordset[0].serverName,
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message,
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/docs`);
});
