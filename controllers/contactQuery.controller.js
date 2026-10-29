import * as contactQueryModel from "../models/contactQuery.model.js";

const ALLOWED_STATUSES = [
    "Pending",
    "New",
    "Contacted",
    "In Progress",
    "Completed",
    "Resolved",
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to validate YYYY-MM-DD string
 */
function isValidDateString(dateStr) {
    if (typeof dateStr !== "string" || !DATE_REGEX.test(dateStr.trim())) {
        return false;
    }
    const [year, month, day] = dateStr.trim().split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
    );
}

/**
 * Submit a new Contact Us query with date-based call booking
 * POST /api/contact-us
 */
export async function submitContactQuery(req, res) {
    try {
        const body = req.body || {};

        // Support both snake_case schema fields and camelCase website form fields
        const derivedName =
            body.client_name ||
            [body.title, body.firstName, body.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();

        const client_name = typeof derivedName === "string" ? derivedName.trim() : "";
        const client_email =
            typeof (body.client_email ?? body.email) === "string"
                ? (body.client_email ?? body.email).trim()
                : "";
        const client_phone =
            typeof (body.client_phone ?? body.mobile ?? body.phone) === "string"
                ? (body.client_phone ?? body.mobile ?? body.phone).trim()
                : "";
        const query_message =
            typeof (body.query_message ?? body.requirements ?? body.message) === "string"
                ? (body.query_message ?? body.requirements ?? body.message).trim()
                : "";
        const selected_date =
            typeof (body.selected_date ?? body.preferredCallDate ?? body.callDate) === "string"
                ? (body.selected_date ?? body.preferredCallDate ?? body.callDate).trim()
                : "";

        if (!client_name) {
            return res.status(400).json({
                success: false,
                message: "Client name is required.",
            });
        }

        if (!query_message) {
            return res.status(400).json({
                success: false,
                message: "Query message / requirements are required.",
            });
        }

        if (!isValidDateString(selected_date)) {
            return res.status(400).json({
                success: false,
                message: "A valid selected_date (YYYY-MM-DD) is required.",
            });
        }

        // Check existing submissions for selected_date before inserting
        const existingCount = await contactQueryModel.countQueriesByDate(selected_date);

        if (existingCount >= contactQueryModel.MAX_QUERIES_PER_DATE) {
            return res.status(400).json({
                success: false,
                code: "DATE_FULLY_BOOKED",
                message:
                    "This selected date is fully booked (maximum 50 queries reached). Please select another date.",
                selected_date,
                bookedCount: existingCount,
                maxCapacity: contactQueryModel.MAX_QUERIES_PER_DATE,
                remainingSlots: 0,
            });
        }

        const queryRecord = await contactQueryModel.createContactQuery({
            client_name,
            client_email: client_email || null,
            client_phone: client_phone || null,
            query_message,
            selected_date,
            status: "Pending",
        });

        const updatedCount = existingCount + 1;
        const remainingSlots = Math.max(
            0,
            contactQueryModel.MAX_QUERIES_PER_DATE - updatedCount
        );

        return res.status(201).json({
            success: true,
            message: "Your query and call booking have been submitted successfully.",
            query: queryRecord,
            bookedCount: updatedCount,
            remainingSlots,
            maxCapacity: contactQueryModel.MAX_QUERIES_PER_DATE,
        });
    } catch (error) {
        console.error("Submit contact query failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to submit contact query at this time.",
        });
    }
}

/**
 * Return dates where the query count has reached 50 or more
 * GET /api/contact-us/booked-dates
 */
export async function getBookedDates(req, res) {
    try {
        const summary = await contactQueryModel.getBookedDatesSummary(
            contactQueryModel.MAX_QUERIES_PER_DATE
        );

        const requestedDate =
            typeof req.query.date === "string" && isValidDateString(req.query.date)
                ? req.query.date.trim()
                : null;

        const responsePayload = {
            success: true,
            bookedDates: summary.bookedDates,
            dateCounts: summary.dateCounts,
            maxCapacity: summary.maxCapacity,
        };

        if (requestedDate) {
            const bookedCount = Number(summary.dateCounts[requestedDate] || 0);
            const remainingSlots = Math.max(0, summary.maxCapacity - bookedCount);
            responsePayload.date = requestedDate;
            responsePayload.bookedCount = bookedCount;
            responsePayload.remainingSlots = remainingSlots;
            responsePayload.isFullyBooked = bookedCount >= summary.maxCapacity;
        }

        return res.status(200).json(responsePayload);
    } catch (error) {
        console.error("Get booked dates failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch booked dates.",
            bookedDates: [],
            dateCounts: {},
            maxCapacity: contactQueryModel.MAX_QUERIES_PER_DATE,
        });
    }
}

/**
 * Fetch all contact queries for the Admin Dashboard (Protected)
 * GET /api/contact-us/queries
 */
export async function getContactQueries(req, res) {
    try {
        const selected_date =
            req.query.selected_date || req.query.date || null;
        const status = req.query.status || null;
        const search = req.query.search || null;
        const page = req.query.page || null;
        const limit = req.query.limit || null;

        if (
            selected_date &&
            selected_date !== "All" &&
            !isValidDateString(selected_date)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid date filter format. Expected YYYY-MM-DD.",
            });
        }

        const { queries, total } = await contactQueryModel.getContactQueries({
            selected_date,
            status,
            search,
            page,
            limit,
        });

        return res.status(200).json({
            success: true,
            message: "Contact queries fetched successfully.",
            count: queries.length,
            total,
            queries,
        });
    } catch (error) {
        console.error("Get contact queries failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch contact queries.",
        });
    }
}

/**
 * Update the status of a contact query (Protected)
 * PATCH /api/contact-us/queries/:id/status
 */
export async function updateContactQueryStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid query ID.",
            });
        }

        if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status.trim())) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
            });
        }

        const updated = await contactQueryModel.updateContactQueryStatus(
            id,
            status.trim()
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Contact query not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Query status updated successfully.",
            query: updated,
        });
    } catch (error) {
        console.error("Update contact query status failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update contact query status.",
        });
    }
}

