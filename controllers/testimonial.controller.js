import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import * as testimonialModel from "../models/testimonial.model.js";

const ALLOWED_THEMES = [
    "lavender",
    "sky",
    "rose",
    "white",
    "purple",
    "mint",
];

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

/**
 * Upload an image buffer to Cloudinary under folder 'rhs/testimonials'
 * @param {Buffer} buffer
 * @returns {Promise<Object>}
 */
function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "rhs/testimonials",
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
 * Upload a testimonial author photo to Cloudinary (Admin only)
 * POST /api/testimonials/upload-image
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function uploadTestimonialImage(req, res) {
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
            image_url: result.secure_url,
            cloudinary_public_id: result.public_id,
        });
    } catch (error) {
        console.error("Testimonial image upload failed:", error.message);
        return res.status(500).json({
            message: "Unable to upload image",
        });
    }
}

/**
 * Create a new testimonial (Admin only)
 * POST /api/testimonials
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createTestimonial(req, res) {
    try {
        const {
            author_name,
            quote,
            bg_theme = "lavender",
            image_url = null,
            cloudinary_public_id = null,
            is_active = true,
        } = req.body;

        if (
            typeof author_name !== "string" ||
            !author_name.trim() ||
            typeof quote !== "string" ||
            !quote.trim()
        ) {
            return res.status(400).json({
                message: "Author name and testimonial quote are required",
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

        let finalImageUrl = null;
        let finalPublicId = null;

        if (image_url || cloudinary_public_id) {
            if (
                typeof image_url !== "string" ||
                !image_url.startsWith("https://res.cloudinary.com/") ||
                typeof cloudinary_public_id !== "string" ||
                !cloudinary_public_id.startsWith("rhs/testimonials/")
            ) {
                return res.status(400).json({
                    message: "Invalid image URL or Cloudinary public ID",
                });
            }
            finalImageUrl = image_url;
            finalPublicId = cloudinary_public_id;
        }

        const testimonial = await testimonialModel.createTestimonial({
            author_name: author_name.trim(),
            quote: quote.trim(),
            bg_theme,
            image_url: finalImageUrl,
            cloudinary_public_id: finalPublicId,
            is_active,
        });

        return res.status(201).json({
            message: "Testimonial created successfully",
            testimonial,
        });
    } catch (error) {
        console.error("Create testimonial failed:", error.message);
        return res.status(500).json({
            message: "Unable to create testimonial",
        });
    }
}

/**
 * Get testimonials list with optional status filtering
 * GET /api/testimonials
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getTestimonials(req, res) {
    try {
        const { status } = req.query;
        const isAdmin = Boolean(req.isAdmin || req.admin);

        if (!isAdmin) {
            if (status && status !== "active") {
                return res.status(403).json({
                    message: "Admin login is required to view inactive or all testimonials",
                });
            }
        } else if (status && !["active", "inactive", "all"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Use active, inactive or all",
            });
        }

        const testimonials = await testimonialModel.getTestimonials({
            status,
            isAdmin,
        });

        return res.status(200).json({
            message: "Testimonials fetched successfully",
            count: testimonials.length,
            testimonials,
        });
    } catch (error) {
        console.error("Get testimonials failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch testimonials",
        });
    }
}

/**
 * Get a single testimonial by ID (Admin only)
 * GET /api/testimonials/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getTestimonialById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid testimonial ID",
            });
        }

        const testimonial = await testimonialModel.getTestimonialById(id);

        if (!testimonial) {
            return res.status(404).json({
                message: "Testimonial not found",
            });
        }

        return res.status(200).json({
            message: "Testimonial fetched successfully",
            testimonial,
        });
    } catch (error) {
        console.error("Get testimonial failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch testimonial",
        });
    }
}

/**
 * Update a testimonial by ID (Admin only)
 * PUT /api/testimonials/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateTestimonial(req, res) {
    try {
        const id = Number(req.params.id);
        const {
            author_name,
            quote,
            bg_theme,
            image_url = null,
            cloudinary_public_id = null,
            is_active,
        } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid testimonial ID",
            });
        }

        if (
            typeof author_name !== "string" ||
            !author_name.trim() ||
            typeof quote !== "string" ||
            !quote.trim()
        ) {
            return res.status(400).json({
                message: "Author name and testimonial quote are required",
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

        let finalImageUrl = null;
        let finalPublicId = null;

        if (image_url || cloudinary_public_id) {
            if (
                typeof image_url !== "string" ||
                !image_url.startsWith("https://res.cloudinary.com/") ||
                typeof cloudinary_public_id !== "string" ||
                !cloudinary_public_id.startsWith("rhs/testimonials/")
            ) {
                return res.status(400).json({
                    message: "Invalid image URL or Cloudinary public ID",
                });
            }
            finalImageUrl = image_url;
            finalPublicId = cloudinary_public_id;
        }

        const updatedTestimonial = await testimonialModel.updateTestimonial(id, {
            author_name: author_name.trim(),
            quote: quote.trim(),
            bg_theme,
            image_url: finalImageUrl,
            cloudinary_public_id: finalPublicId,
            is_active,
        });

        if (!updatedTestimonial) {
            return res.status(404).json({
                message: "Testimonial not found",
            });
        }

        return res.status(200).json({
            message: "Testimonial updated successfully",
            testimonial: updatedTestimonial,
        });
    } catch (error) {
        console.error("Update testimonial failed:", error.message);
        return res.status(500).json({
            message: "Unable to update testimonial",
        });
    }
}

/**
 * Soft delete a testimonial by ID (Admin only)
 * DELETE /api/testimonials/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteTestimonial(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid testimonial ID",
            });
        }

        const deleted = await testimonialModel.softDeleteTestimonial(id);

        if (!deleted) {
            return res.status(404).json({
                message: "Testimonial not found",
            });
        }

        return res.status(200).json({
            message: "Testimonial deleted successfully",
        });
    } catch (error) {
        console.error("Delete testimonial failed:", error.message);
        return res.status(500).json({
            message: "Unable to delete testimonial",
        });
    }
}
