import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.middleware.js";
import * as productController from "../controllers/product.controller.js";

const router = Router();

// Multer memory storage configuration for 5MB images
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
            return res.status(400).json({
                message: err.message || "Invalid image file",
            });
        }
        next();
    });
}

/**
 * Optional authentication middleware for listing endpoint.
 * If Authorization header is provided, verifies it with authMiddleware and sets req.isAdmin = true.
 * If token is invalid or expired, authMiddleware halts execution with 401.
 * If no token is provided, marks req.isAdmin = false and allows public access.
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
 * /api/products/upload-image:
 *   post:
 *     summary: Upload a product image
 *     tags: [Products]
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
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid image file
 *       401:
 *         description: Authentication required
 */
router.post(
    "/upload-image",
    authMiddleware,
    handleUpload,
    productController.uploadProductImage
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
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
 *               - color_palette
 *               - image_url
 *               - cloudinary_public_id
 *             properties:
 *               name:
 *                 type: string
 *               color_palette:
 *                 type: string
 *                 enum: [royal-purple, medical-teal, rhs-sky-blue, surgical-rose]
 *               image_url:
 *                 type: string
 *               cloudinary_public_id:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid product details
 *       401:
 *         description: Authentication required
 */
router.post("/", authMiddleware, productController.createProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter products by status
 *     responses:
 *       200:
 *         description: Products fetched successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Authentication required
 */
router.get("/", optionalAuth, productController.getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product
 *     tags: [Products]
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
 *         description: Product fetched successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 */
router.get("/:id", authMiddleware, productController.getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
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
 *             required:
 *               - name
 *               - color_palette
 *               - image_url
 *               - cloudinary_public_id
 *               - is_active
 *             properties:
 *               name:
 *                 type: string
 *               color_palette:
 *                 type: string
 *                 enum: [royal-purple, medical-teal, rhs-sky-blue, surgical-rose]
 *               image_url:
 *                 type: string
 *               cloudinary_public_id:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid product details
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 */
router.put("/:id", authMiddleware, productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Soft delete a product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 */
router.delete("/:id", authMiddleware, productController.deleteProduct);

export default router;
