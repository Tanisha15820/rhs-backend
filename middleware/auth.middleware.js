import jwt from "jsonwebtoken";

// In-memory store of logged-out / revoked JWT tokens mapped to their expiration timestamp (ms)
const revokedTokens = new Map();

/**
 * Remove expired tokens from the in-memory revocation map
 */
function pruneExpiredTokens() {
    const now = Date.now();
    for (const [token, expiresAt] of revokedTokens.entries()) {
        if (expiresAt <= now) {
            revokedTokens.delete(token);
        }
    }
}

/**
 * Revoke a JWT token upon admin logout
 * @param {string} token
 */
export function revokeToken(token) {
    if (!token || typeof token !== "string") return;

    pruneExpiredTokens();

    let expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours TTL
    try {
        const decoded = jwt.decode(token);
        if (decoded && typeof decoded.exp === "number") {
            expiresAt = decoded.exp * 1000;
        }
    } catch {
        // Use default TTL

    }
    revokedTokens.set(token.trim(), expiresAt);
}

/**
 * Check whether a JWT token has been revoked via logout
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenRevoked(token) {
    if (!token || typeof token !== "string") return false;
    pruneExpiredTokens();
    return revokedTokens.has(token.trim());
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required. Please log in.",
        });
    }

    const token = authHeader.split(" ")[1];
    if (isTokenRevoked(token)) {
        return res.status(401).json({
            message: "Session has been logged out. Please log in again.",
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "Authentication configuration error",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.admin = {
            id: decoded.id,
            username: decoded.username,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token. Please log in again.",
        });
    }
}

export default authMiddleware;
