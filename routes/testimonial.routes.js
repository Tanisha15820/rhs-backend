import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.middleware.js";
import * as testimonialController from "../controllers/testimonial.controller.js";

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
 * /api/testimonials/upload-image:
 *   post:
 *     summary: Upload a testimonial author photo
 *     tags: [Testimonials]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 image_url:
 *                   type: string
 *                 cloudinary_public_id:
 *                   type: string
 *       400:
 *         description: Invalid image file
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Unable to upload image
 */
router.post(
    "/upload-image",
    authMiddleware,
    handleUpload,
    testimonialController.uploadTestimonialImage
);

/**
 * @swagger
 * /api/testimonials:
 *   post:
 *     summary: Create a new testimonial
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - author_name
 *               - quote
 *             properties:
 *               author_name:
 *                 type: string
 *                 example: Dr. Sarah Mitchell
 *               quote:
 *                 type: string
 *                 example: The medical devices provided by RHS are dependable and top-tier.
 *               bg_theme:
 *                 type: string
 *                 enum: [lavender, sky, rose, white, purple, mint]
 *                 default: lavender
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               cloudinary_public_id:
 *                 type: string
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Testimonial created successfully
 *       400:
 *         description: Invalid testimonial details
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post("/", authMiddleware, testimonialController.createTestimonial);

/**
 * @swagger
 * /api/testimonials:
 *   get:
 *     summary: List testimonials
 *     description: Public requests return only active, non-deleted testimonials. Admin requests can filter by status using active, inactive, or all.
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter testimonials by status (Admin only)
 *     responses:
 *       200:
 *         description: Testimonials fetched successfully
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Invalid or expired token supplied
 *       403:
 *         description: Admin authentication required for viewing inactive or all testimonials
 *       500:
 *         description: Server error
 */
router.get("/", optionalAuth, testimonialController.getTestimonials);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   get:
 *     summary: Get a single testimonial by ID
 *     tags: [Testimonials]
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
 *         description: Testimonial fetched successfully
 *       400:
 *         description: Invalid testimonial ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, testimonialController.getTestimonialById);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   put:
 *     summary: Update an existing testimonial
 *     tags: [Testimonials]
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
 *               - author_name
 *               - quote
 *               - bg_theme
 *               - is_active
 *             properties:
 *               author_name:
 *                 type: string
 *               quote:
 *                 type: string
 *               bg_theme:
 *                 type: string
 *                 enum: [lavender, sky, rose, white, purple, mint]
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               cloudinary_public_id:
 *                 type: string
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Testimonial updated successfully
 *       400:
 *         description: Invalid testimonial details
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.put("/:id", authMiddleware, testimonialController.updateTestimonial);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   delete:
 *     summary: Soft delete a testimonial
 *     tags: [Testimonials]
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
 *         description: Testimonial deleted successfully
 *       400:
 *         description: Invalid testimonial ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, testimonialController.deleteTestimonial);

export default router;
