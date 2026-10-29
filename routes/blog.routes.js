import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.middleware.js";
import * as blogController from "../controllers/blog.controller.js";

const router = Router();

// Multer memory storage configuration for 5MB images
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPEG, PNG and WebP images are allowed")
            );
        }
        callback(null, true);
    },
});

/**
 * Dual-mode optional authentication middleware for listing endpoint.
 * If Bearer token is provided, verifies it with authMiddleware and sets req.isAdmin = true.
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
 * components:
 *   schemas:
 *     Blog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: The Rise of Bipolar Plasma Technology in Modern OTs
 *         slug:
 *           type: string
 *           example: the-rise-of-bipolar-plasma-technology-in-modern-ots
 *         thumbnail_url:
 *           type: string
 *           nullable: true
 *           example: https://res.cloudinary.com/demo/image/upload/v1234/rhs/blogs/plasma.jpg
 *         thumbnail_public_id:
 *           type: string
 *           nullable: true
 *           example: rhs/blogs/plasma
 *         category:
 *           type: string
 *           nullable: true
 *           example: Surgical Innovation
 *         excerpt:
 *           type: string
 *           example: How bipolar plasma generators are reducing thermal spread and improving precision in modern OTs.
 *         article_subtitle:
 *           type: string
 *           nullable: true
 *           example: Clinical considerations for surgical leaders and OT committees
 *         key_takeaways:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Thermal spread <0.8mm", "Reduced postoperative edema"]
 *         article_content:
 *           type: string
 *           nullable: true
 *           example: Full formatted clinical article content...
 *         article_sections:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               heading:
 *                 type: string
 *               paragraphs:
 *                 type: array
 *                 items:
 *                   type: string
 *           example: [{"heading": "Introduction", "paragraphs": ["Paragraph 1"]}]
 *         benchmark_specs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               value:
 *                 type: string
 *           example: [{"label": "Thermal Margin", "value": "<0.8 mm"}]
 *         author_name:
 *           type: string
 *           nullable: true
 *           example: Dr. Arvind Mehta
 *         author_role:
 *           type: string
 *           nullable: true
 *           example: Sr. Laparoscopic Surgeon
 *         published_at:
 *           type: string
 *           nullable: true
 *           example: 24 Oct 2026
 *         reading_time:
 *           type: string
 *           nullable: true
 *           example: 5 min read
 *         read_count:
 *           type: integer
 *           example: 1200
 *         is_featured:
 *           type: boolean
 *           example: true
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/blogs/upload-image:
 *   post:
 *     summary: Upload blog thumbnail image
 *     description: Uploads a blog thumbnail to Cloudinary folder rhs/blogs. Requires admin authentication.
 *     tags: [Blogs]
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
 *                 description: Image file (JPEG, PNG, WebP up to 5MB)
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 thumbnail_url:
 *                   type: string
 *                 thumbnail_public_id:
 *                   type: string
 *       400:
 *         description: Invalid file format or missing image
 *       401:
 *         description: Admin authentication required
 *       500:
 *         description: Server error uploading image
 */
router.post(
    "/upload-image",
    authMiddleware,
    upload.single("image"),
    blogController.uploadImage
);

/**
 * @swagger
 * /api/blogs:
 *   post:
 *     summary: Create a new blog post
 *     description: Creates a new blog article in the database. Requires admin authentication.
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - excerpt
 *             properties:
 *               title:
 *                 type: string
 *                 example: The Rise of Bipolar Plasma Technology in Modern OTs
 *               slug:
 *                 type: string
 *                 description: Optional custom slug. If omitted, will be auto-generated from title.
 *                 example: the-rise-of-bipolar-plasma-technology
 *               thumbnail_url:
 *                 type: string
 *                 example: https://res.cloudinary.com/demo/image/upload/v1234/rhs/blogs/plasma.jpg
 *               thumbnail_public_id:
 *                 type: string
 *                 example: rhs/blogs/plasma
 *               category:
 *                 type: string
 *                 example: Surgical Innovation
 *               excerpt:
 *                 type: string
 *                 example: How bipolar plasma generators are reducing thermal spread.
 *               article_subtitle:
 *                 type: string
 *                 example: A deep dive into surgical precision and hemostasis
 *               key_takeaways:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Sub-millimeter thermal margin", "High cutting velocity"]
 *               article_content:
 *                 type: string
 *                 example: Full article body text...
 *               article_sections:
 *                 type: array
 *                 items:
 *                   type: object
 *               benchmark_specs:
 *                 type: array
 *                 items:
 *                   type: object
 *               author_name:
 *                 type: string
 *                 example: Dr. Arvind Mehta
 *               author_role:
 *                 type: string
 *                 example: Sr. Laparoscopic Surgeon
 *               published_at:
 *                 type: string
 *                 example: 24 Oct 2026
 *               reading_time:
 *                 type: string
 *                 example: 5 min read
 *               is_featured:
 *                 type: boolean
 *                 default: false
 *               is_active:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Blog created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 blog:
 *                   $ref: '#/components/schemas/Blog'
 *       400:
 *         description: Missing or invalid required fields
 *       401:
 *         description: Admin authentication required
 *       409:
 *         description: Duplicate slug collision
 *       500:
 *         description: Server error
 */
router.post("/", authMiddleware, blogController.createBlog);

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: List blogs
 *     description: Public requests return only active, non-deleted blogs. Admin requests can filter by status using active, inactive, or all. Featured blogs are ordered first.
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter blogs by status (Admin authentication required for inactive or all)
 *     responses:
 *       200:
 *         description: Blogs fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 blogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Blog'
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Invalid or expired token supplied
 *       403:
 *         description: Admin login required for inactive or all blogs
 *       500:
 *         description: Server error
 */
router.get("/", optionalAuth, blogController.getBlogs);

/**
 * @swagger
 * /api/blogs/slug/{slug}:
 *   get:
 *     summary: Get public blog article by slug
 *     description: Public endpoint to fetch full article content for the reader popup. Only active, non-deleted blogs are accessible. Increments read counter.
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: the-rise-of-bipolar-plasma-technology-in-modern-ots
 *     responses:
 *       200:
 *         description: Blog article fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 blog:
 *                   $ref: '#/components/schemas/Blog'
 *       400:
 *         description: Missing or invalid slug
 *       404:
 *         description: Blog article not found or inactive
 *       500:
 *         description: Server error
 */
router.get("/slug/:slug", blogController.getBlogBySlug);

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     summary: Get single blog details by ID
 *     description: Retrieves complete blog details including inactive state. Requires admin authentication.
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Blog fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 blog:
 *                   $ref: '#/components/schemas/Blog'
 *       400:
 *         description: Invalid blog ID
 *       401:
 *         description: Admin authentication required
 *       404:
 *         description: Blog not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, blogController.getBlogById);

/**
 * @swagger
 * /api/blogs/{id}:
 *   put:
 *     summary: Update an existing blog
 *     description: Updates specified blog fields. Preserves omitted fields. Requires admin authentication.
 *     tags: [Blogs]
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
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               article_subtitle:
 *                 type: string
 *               key_takeaways:
 *                 type: array
 *                 items:
 *                   type: string
 *               article_content:
 *                 type: string
 *               article_sections:
 *                 type: array
 *                 items:
 *                   type: object
 *               benchmark_specs:
 *                 type: array
 *                 items:
 *                   type: object
 *               is_featured:
 *                 type: boolean
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Blog updated successfully
 *       400:
 *         description: Invalid input or blog ID
 *       401:
 *         description: Admin authentication required
 *       404:
 *         description: Blog not found
 *       409:
 *         description: Duplicate slug collision with another blog
 *       500:
 *         description: Server error
 */
router.put("/:id", authMiddleware, blogController.updateBlog);

/**
 * @swagger
 * /api/blogs/{id}:
 *   delete:
 *     summary: Soft-delete a blog
 *     description: Sets deleted_at = CURRENT_TIMESTAMP and is_active = FALSE. Row is preserved. Requires admin authentication.
 *     tags: [Blogs]
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
 *         description: Blog deleted successfully
 *       400:
 *         description: Invalid blog ID
 *       401:
 *         description: Admin authentication required
 *       404:
 *         description: Blog not found or already deleted
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, blogController.deleteBlog);

export default router;
