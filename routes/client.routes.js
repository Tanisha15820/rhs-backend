import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.middleware.js";
import * as clientController from "../controllers/client.controller.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPEG, PNG and WebP images are allowed")
            );
        }

        callback(null, true);
    },
});

/**
 * Middleware wrapper for single image upload to catch Multer errors safely
 */
function handleUpload(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Image file size exceeds the 5 MB limit",
                });
            }
            return res.status(400).json({
                message: err.message || "Invalid image upload",
            });
        }
        next();
    });
}

/**
 * Optional authentication middleware for dual-mode routes.
 * If an Authorization header is provided, verifies it with authMiddleware.
 * If valid, marks req.isAdmin = true.
 * If invalid or malformed, authMiddleware halts execution with 401.
 * If no Authorization header is provided, marks req.isAdmin = false and continues.
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.trim()) {
        return authMiddleware(req, res, (err) => {
            if (err) return next(err);
            req.isAdmin = true;
            next();
        });
    }
    req.isAdmin = false;
    next();
}

/**
 * @swagger
 * /api/clients/upload-image:
 *   post:
 *     summary: Upload a client or partner logo
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 logo_url:
 *                   type: string
 *                 cloudinary_public_id:
 *                   type: string
 *       400:
 *         description: Invalid image file or size limit exceeded
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Unable to upload image
 */
router.post(
    "/upload-image",
    authMiddleware,
    handleUpload,
    clientController.uploadClientLogo
);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create a new client or partner card
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: MAX Hospital
 *               logo_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://res.cloudinary.com/l7toc9qp/image/upload/rhs/clients/sample.png
 *               cloudinary_public_id:
 *                 type: string
 *                 nullable: true
 *                 example: rhs/clients/sample
 *               bg_theme:
 *                 type: string
 *                 enum: [soft-blue, sky-tint, mint-tint, lavender-tint, ice-blue, seafoam, warm-peach, pure-white]
 *                 default: soft-blue
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               display_order:
 *                 type: integer
 *                 default: 0
 *                 example: 1
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Invalid client input details
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post("/", authMiddleware, clientController.createClient);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: List clients
 *     description: Public requests return only active, non-deleted clients. Admin requests can filter by status using active, inactive, or all. Results are sorted by display_order ASC, then created_at DESC.
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter clients by status (Admin authentication required for inactive or all)
 *     responses:
 *       200:
 *         description: Clients fetched successfully
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Invalid or expired token supplied
 *       403:
 *         description: Admin authentication required for viewing inactive or all clients
 *       500:
 *         description: Server error
 */
router.get("/", optionalAuth, clientController.getClients);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get a single client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client fetched successfully
 *       400:
 *         description: Invalid client ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, clientController.getClientById);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update an existing client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Fortis Healthcare
 *               logo_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://res.cloudinary.com/l7toc9qp/image/upload/rhs/clients/sample.png
 *               cloudinary_public_id:
 *                 type: string
 *                 nullable: true
 *                 example: rhs/clients/sample
 *               bg_theme:
 *                 type: string
 *                 enum: [soft-blue, sky-tint, mint-tint, lavender-tint, ice-blue, seafoam, warm-peach, pure-white]
 *                 example: sky-tint
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               display_order:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Invalid client input details
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.put("/:id", authMiddleware, clientController.updateClient);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Soft delete a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       400:
 *         description: Invalid client ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, clientController.deleteClient);

export default router;
