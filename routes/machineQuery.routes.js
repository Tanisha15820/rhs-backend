import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import * as machineQueryController from "../controllers/machineQuery.controller.js";

const router = Router();

/**
 * Public endpoints for submitting a Product Enquiry / Machine Query from the RHS website:
 * - POST /api/product-enquiries
 * - POST /api/queries/machine-query
 */
router.post("/", machineQueryController.submitMachineQuery);
router.post("/machine-query", machineQueryController.submitMachineQuery);

/**
 * Protected Admin endpoints for fetching Product Enquiries / Machine Queries:
 * - GET /api/product-enquiries
 * - GET /api/queries/machine-queries
 * - GET /api/queries/machine-query
 */
router.get("/", authMiddleware, machineQueryController.getMachineQueries);
router.get(
    "/machine-query",
    authMiddleware,
    machineQueryController.getMachineQueries
);
router.get(
    "/machine-queries",
    authMiddleware,
    machineQueryController.getMachineQueries
);

/**
 * Protected Admin endpoints for updating status and admin notes:
 * - PATCH /api/product-enquiries/:id/status
 * - PATCH /api/product-enquiries/:id/notes
 */
router.patch(
    "/:id/status",
    authMiddleware,
    machineQueryController.updateEnquiryStatus
);
router.patch(
    "/:id/notes",
    authMiddleware,
    machineQueryController.updateEnquiryNotes
);

export default router;
