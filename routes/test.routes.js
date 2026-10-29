
import express from "express";

const router = express.Router();

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test the RHS API
 *     description: Checks whether the test API is working.
 *     tags:
 *       - Test
 *     responses:
 *       200:
 *         description: API is working successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Test API is working successfully
 */
router.get("/", (req, res) => {
    res.json({
        message: "Test API is working successfully"
    });
});

export default router;
