import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import * as contactQueryController from "../controllers/contactQuery.controller.js";

const router = Router();

/**
 * @swagger
 * /api/contact-us:
 *   post:
 *     summary: Submit a Contact Us query and book a preferred date (max 50 per date)
 *     tags: [Contact Us]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_name
 *               - query_message
 *               - selected_date
 *             properties:
 *               client_name:
 *                 type: string
 *               client_email:
 *                 type: string
 *               client_phone:
 *                 type: string
 *               query_message:
 *                 type: string
 *               selected_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Contact query submitted successfully
 *       400:
 *         description: Validation error or selected date is fully booked (>= 50 queries)
 *       500:
 *         description: Server error
 */
router.post("/", contactQueryController.submitContactQuery);

/**
 * @swagger
 * /api/contact-us/booked-dates:
 *   get:
 *     summary: Get dates that have reached 50 or more queries
 *     tags: [Contact Us]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional specific date (YYYY-MM-DD) to check slot count
 *     responses:
 *       200:
 *         description: List of fully booked dates and per-date counts
 */
router.get("/booked-dates", contactQueryController.getBookedDates);

/**
 * @swagger
 * /api/contact-us/queries:
 *   get:
 *     summary: Fetch all Contact Us queries for Admin Dashboard
 *     tags: [Contact Us]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: selected_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact queries fetched successfully
 *       401:
 *         description: Authentication required
 */
router.get("/queries", authMiddleware, contactQueryController.getContactQueries);

/**
 * @swagger
 * /api/contact-us/queries/{id}/status:
 *   patch:
 *     summary: Update the status of a Contact Us query
 *     tags: [Contact Us]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, New, Contacted, In Progress, Completed, Resolved]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
    "/queries/:id/status",
    authMiddleware,
    contactQueryController.updateContactQueryStatus
);
router.put(
    "/queries/:id",
    authMiddleware,
    contactQueryController.updateContactQueryStatus
);

export default router;

