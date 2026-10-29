import * as machineQueryModel from "../models/machineQuery.model.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Submit a new Product Enquiry / Machine Query from the RHS Website
 * Public endpoint:
 * - POST /api/product-enquiries
 * - POST /api/queries/machine-query
 */
export async function submitMachineQuery(req, res) {
    try {
        const body = req.body || {};

        const rawProducts = Array.isArray(body.products) ? body.products : [];
        const validProducts = rawProducts.filter(
            (p) => p && (p.name || p.machine_name)
        );

        const machine_id =
            body.machine_id ??
            body.machineId ??
            body.productId ??
            (validProducts.length > 0
                ? validProducts
                      .map((p) => p.machine_id ?? p.id)
                      .filter(Boolean)
                      .join(", ")
                : null);

        const derivedMachineName =
            body.machine_name ||
            body.machineName ||
            body.productName ||
            (validProducts.length > 0
                ? validProducts
                      .map((p) => {
                          const pName = (p.machine_name || p.name || "").trim();
                          const qty = Number(p.quantity) || 1;
                          return qty > 1 ? `${pName} (Qty: ${qty})` : pName;
                      })
                      .filter(Boolean)
                      .join(", ")
                : "");

        const machine_name =
            typeof derivedMachineName === "string"
                ? derivedMachineName.trim()
                : "";

        const hospital =
            typeof body.hospital === "string" ? body.hospital.trim() : "";

        const user_name =
            typeof (body.user_name ?? body.userName ?? body.name) === "string"
                ? (body.user_name ?? body.userName ?? body.name).trim()
                : "";

        const user_email =
            typeof (body.user_email ?? body.userEmail ?? body.email) === "string"
                ? (body.user_email ?? body.userEmail ?? body.email).trim()
                : "";

        const user_phone =
            typeof (
                body.user_phone ??
                body.userPhone ??
                body.contact ??
                body.phone
            ) === "string"
                ? (
                      body.user_phone ??
                      body.userPhone ??
                      body.contact ??
                      body.phone
                  ).trim()
                : "";

        const address =
            typeof body.address === "string" ? body.address.trim() : "";

        const country =
            typeof body.country === "string" && body.country.trim()
                ? body.country.trim()
                : "INDIA";

        const state = typeof body.state === "string" ? body.state.trim() : "";

        const city = typeof body.city === "string" ? body.city.trim() : "";

        const pin_code =
            typeof (body.pinCode ?? body.pin_code) === "string"
                ? (body.pinCode ?? body.pin_code).trim()
                : "";

        const rawReason =
            body.details ??
            body.query_reason ??
            body.queryReason ??
            body.message ??
            body.reason ??
            "";

        const query_reason =
            typeof rawReason === "string" ? rawReason.trim() : "";

        // Server-side validation
        if (!machine_name) {
            return res.status(400).json({
                success: false,
                message:
                    "Please select at least one product or machine before submitting.",
            });
        }

        if (!user_name) {
            return res.status(400).json({
                success: false,
                message: "Name is required.",
            });
        }

        if (!user_email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        if (!EMAIL_REGEX.test(user_email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        if (!user_phone) {
            return res.status(400).json({
                success: false,
                message: "Contact number is required.",
            });
        }

        const resolvedReason =
            query_reason ||
            (hospital
                ? `Product enquiry for ${machine_name} from ${hospital}`
                : `Product enquiry for ${machine_name}`);

        const record = await machineQueryModel.createMachineQuery({
            machine_id,
            machine_name,
            products:
                validProducts.length > 0
                    ? validProducts
                    : [
                          {
                              id: machine_id || 1,
                              machine_id: String(machine_id || "1"),
                              name: machine_name,
                              quantity: 1,
                              image: "",
                          },
                      ],
            hospital: hospital || null,
            user_name,
            user_email,
            user_phone,
            address: address || null,
            country,
            state: state || null,
            city: city || null,
            pin_code: pin_code || null,
            query_reason: resolvedReason,
            message: body.message ? String(body.message).trim() : resolvedReason,
        });

        return res.status(201).json({
            success: true,
            message:
                "Your product enquiry has been submitted and saved successfully.",
            enquiry: record,
            query: record,
        });
    } catch (error) {
        console.error("Submit product/machine enquiry failed:", error.message);
        return res.status(500).json({
            success: false,
            message:
                "Unable to save your product enquiry at this time. Please try again.",
        });
    }
}

/**
 * Fetch all Product Enquiries / Machine Queries for the Admin Dashboard
 * Protected endpoint:
 * - GET /api/product-enquiries
 * - GET /api/queries/machine-queries
 * - GET /api/queries/machine-query
 */
export async function getMachineQueries(req, res) {
    try {
        const machine_name =
            req.query.machine_name ||
            req.query.machineName ||
            req.query.product ||
            null;
        const status = req.query.status || null;
        const search = req.query.search || null;

        const { queries, total, machineNames } =
            await machineQueryModel.getMachineQueries({
                machine_name,
                status,
                search,
            });

        return res.status(200).json({
            success: true,
            message: "Product enquiries fetched successfully.",
            count: queries.length,
            total,
            machineNames,
            enquiries: queries,
            queries,
        });
    } catch (error) {
        console.error("Get product/machine enquiries failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch product enquiries from the database.",
        });
    }
}

/**
 * Update status of a Product Enquiry / Machine Query
 * Protected endpoint:
 * - PATCH /api/product-enquiries/:id/status
 */
export async function updateEnquiryStatus(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid enquiry ID is required.",
            });
        }

        const status =
            typeof req.body?.status === "string" ? req.body.status.trim() : "";

        if (!machineQueryModel.ALLOWED_ENQUIRY_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${machineQueryModel.ALLOWED_ENQUIRY_STATUSES.join(", ")}.`,
            });
        }

        const updated = await machineQueryModel.updateMachineQueryStatus(
            id,
            status
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Enquiry record not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Enquiry status updated successfully.",
            enquiry: updated,
            query: updated,
        });
    } catch (error) {
        console.error("Update enquiry status failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update enquiry status.",
        });
    }
}

/**
 * Update internal admin notes of a Product Enquiry / Machine Query
 * Protected endpoint:
 * - PATCH /api/product-enquiries/:id/notes
 */
export async function updateEnquiryNotes(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid enquiry ID is required.",
            });
        }

        const adminNotes =
            req.body?.adminNotes ?? req.body?.admin_notes ?? "";

        const updated = await machineQueryModel.updateMachineQueryNotes(
            id,
            adminNotes
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Enquiry record not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Admin notes saved successfully.",
            enquiry: updated,
            query: updated,
        });
    } catch (error) {
        console.error("Update enquiry notes failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to save admin notes.",
        });
    }
}
