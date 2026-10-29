import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findAdminByUsername } from "../models/admin.model.js";
import { revokeToken } from "../middleware/auth.middleware.js";

/**
 * Admin login controller
 * Handles authentication, password verification, and JWT generation
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function loginAdmin(req, res) {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Username and password are required",
            });
        }

        const admin = await findAdminByUsername(username.trim());

        if (!admin) {
            return res.status(401).json({
                message: "Invalid username or password",
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin.id,
                username: admin.username,
            },
        });
    } catch (error) {
        console.error("Admin login error:", error.message);

        return res.status(500).json({
            message: "Unable to process login",
        });
    }
}

/**
 * Admin logout controller
 * Handles token revocation, cookie invalidation, and session destruction
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function logoutAdmin(req, res) {
    try {
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.body && typeof req.body.token === "string") {
            token = req.body.token;
        }

        if (token) {
            revokeToken(token);
        }

        // Clear any authentication or session cookies if present
        res.clearCookie("token", { path: "/" });
        res.clearCookie("rhs_admin_token", { path: "/" });
        res.clearCookie("connect.sid", { path: "/" });

        // Destroy server-side session if session middleware is used
        if (req.session && typeof req.session.destroy === "function") {
            await new Promise((resolve) => {
                req.session.destroy(() => resolve());
            });
        }

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Admin logout error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process logout",
        });
    }
}
