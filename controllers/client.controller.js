import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import * as clientModel from "../models/client.model.js";

const ALLOWED_THEMES = [
    "soft-blue",
    "sky-tint",
    "mint-tint",
    "lavender-tint",
    "ice-blue",
    "seafoam",
    "warm-peach",
    "pure-white",
];

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

/**
 * Validate logo URL and Cloudinary public ID formats
 * @param {string|null} logo_url
 * @param {string|null} cloudinary_public_id
 * @returns {boolean}
 */
function validateLogoFields(logo_url, cloudinary_public_id) {
    if (logo_url || cloudinary_public_id) {
        if (
            typeof logo_url !== "string" ||
            !logo_url.startsWith("https://res.cloudinary.com/") ||
            typeof cloudinary_public_id !== "string" ||
            !cloudinary_public_id.startsWith("rhs/clients/")
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Upload an image buffer to Cloudinary under folder 'rhs/clients'
 * @param {Buffer} buffer
 * @returns {Promise<Object>}
 */
function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "rhs/clients",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        );

        Readable.from(buffer).pipe(stream);
    });
}

/**
 * Upload a client or partner logo to Cloudinary (Admin only)
 * POST /api/clients/upload-image
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function uploadClientLogo(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select an image",
            });
        }

        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: "Only JPEG, PNG and WebP images are allowed",
            });
        }

        const result = await uploadToCloudinary(req.file.buffer);

        return res.status(200).json({
            message: "Image uploaded successfully",
            logo_url: result.secure_url,
            cloudinary_public_id: result.public_id,
        });
    } catch (error) {
        console.error("Client logo upload failed:", error.message);
        return res.status(500).json({
            message: "Unable to upload image",
        });
    }
}

/**
 * Create a new client or partner card (Admin only)
 * POST /api/clients
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createClient(req, res) {
    try {
        const {
            name,
            logo_url = null,
            cloudinary_public_id = null,
            bg_theme = "soft-blue",
            is_active = true,
            display_order = 0,
        } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Client name is required",
            });
        }

        if (!ALLOWED_THEMES.includes(bg_theme)) {
            return res.status(400).json({
                message: `Invalid background theme. Allowed values: ${ALLOWED_THEMES.join(", ")}`,
            });
        }

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                message: "Status must be a boolean value",
            });
        }

        if (!Number.isInteger(display_order) || display_order < 0) {
            return res.status(400).json({
                message: "Display order must be a non-negative integer",
            });
        }

        let finalLogoUrl = null;
        let finalPublicId = null;

        if (logo_url || cloudinary_public_id) {
            if (!validateLogoFields(logo_url, cloudinary_public_id)) {
                return res.status(400).json({
                    message: "Invalid logo URL or Cloudinary public ID",
                });
            }
            finalLogoUrl = logo_url;
            finalPublicId = cloudinary_public_id;
        }

        const client = await clientModel.createClient({
            name: name.trim(),
            logo_url: finalLogoUrl,
            cloudinary_public_id: finalPublicId,
            bg_theme,
            is_active,
            display_order,
        });

        return res.status(201).json({
            message: "Client created successfully",
            client,
        });
    } catch (error) {
        console.error("Create client failed:", error.message);
        return res.status(500).json({
            message: "Unable to create client",
        });
    }
}

/**
 * Get clients list with optional status filtering
 * GET /api/clients
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getClients(req, res) {
    try {
        const { status } = req.query;
        const isAdmin = Boolean(req.isAdmin || req.admin);

        if (!isAdmin) {
            if (status && status !== "active") {
                return res.status(403).json({
                    message: "Admin login is required to view inactive or all clients",
                });
            }
        } else if (status && !["active", "inactive", "all"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Use active, inactive or all",
            });
        }

        const clients = await clientModel.getClients({
            status,
            isAdmin,
        });

        return res.status(200).json({
            message: "Clients fetched successfully",
            count: clients.length,
            clients,
        });
    } catch (error) {
        console.error("Get clients failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch clients",
        });
    }
}

/**
 * Get a single client by ID (Admin only)
 * GET /api/clients/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getClientById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const client = await clientModel.getClientById(id);

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        return res.status(200).json({
            message: "Client fetched successfully",
            client,
        });
    } catch (error) {
        console.error("Get client failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch client",
        });
    }
}

/**
 * Update an existing client (Admin only, supports partial update)
 * PUT /api/clients/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateClient(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const existing = await clientModel.getClientById(id);

        if (!existing) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        const {
            name,
            logo_url,
            cloudinary_public_id,
            bg_theme,
            is_active,
            display_order,
        } = req.body;

        const updatedName = name !== undefined ? name : existing.name;
        if (typeof updatedName !== "string" || !updatedName.trim()) {
            return res.status(400).json({
                message: "Client name is required",
            });
        }

        const updatedTheme = bg_theme !== undefined ? bg_theme : existing.bg_theme;
        if (!ALLOWED_THEMES.includes(updatedTheme)) {
            return res.status(400).json({
                message: `Invalid background theme. Allowed values: ${ALLOWED_THEMES.join(", ")}`,
            });
        }

        const updatedActive =
            is_active !== undefined ? is_active : Boolean(existing.is_active);
        if (typeof updatedActive !== "boolean") {
            return res.status(400).json({
                message: "Status must be a boolean value",
            });
        }

        const updatedDisplayOrder =
            display_order !== undefined ? display_order : existing.display_order;
        if (!Number.isInteger(updatedDisplayOrder) || updatedDisplayOrder < 0) {
            return res.status(400).json({
                message: "Display order must be a non-negative integer",
            });
        }

        let finalLogoUrl = existing.logo_url;
        let finalPublicId = existing.cloudinary_public_id;

        // If explicitly set to null/empty, clear the logo
        if (logo_url === null && cloudinary_public_id === null) {
            finalLogoUrl = null;
            finalPublicId = null;
        } else if (logo_url !== undefined || cloudinary_public_id !== undefined) {
            const checkUrl = logo_url !== undefined ? logo_url : existing.logo_url;
            const checkId =
                cloudinary_public_id !== undefined
                    ? cloudinary_public_id
                    : existing.cloudinary_public_id;

            if (checkUrl || checkId) {
                if (!validateLogoFields(checkUrl, checkId)) {
                    return res.status(400).json({
                        message: "Invalid logo URL or Cloudinary public ID",
                    });
                }
            }
            finalLogoUrl = checkUrl;
            finalPublicId = checkId;
        }

        const updatedClient = await clientModel.updateClient(id, {
            name: updatedName.trim(),
            logo_url: finalLogoUrl,
            cloudinary_public_id: finalPublicId,
            bg_theme: updatedTheme,
            is_active: updatedActive,
            display_order: updatedDisplayOrder,
        });

        if (!updatedClient) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        return res.status(200).json({
            message: "Client updated successfully",
            client: updatedClient,
        });
    } catch (error) {
        console.error("Update client failed:", error.message);
        return res.status(500).json({
            message: "Unable to update client",
        });
    }
}

/**
 * Soft delete a client by ID (Admin only)
 * DELETE /api/clients/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteClient(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const deleted = await clientModel.softDeleteClient(id);

        if (!deleted) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        return res.status(200).json({
            message: "Client deleted successfully",
        });
    } catch (error) {
        console.error("Delete client failed:", error.message);
        return res.status(500).json({
            message: "Unable to delete client",
        });
    }
}
