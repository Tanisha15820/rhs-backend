import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import * as productModel from "../models/product.model.js";

const ALLOWED_COLORS = [
    "royal-purple",
    "medical-teal",
    "rhs-sky-blue",
    "surgical-rose",
];

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

/**
 * Upload an image buffer to Cloudinary under folder 'rhs/products'
 * @param {Buffer} buffer
 * @returns {Promise<Object>}
 */
function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "rhs/products",
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
 * Upload a product image to Cloudinary (Admin only)
 * POST /api/products/upload-image
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function uploadProductImage(req, res) {
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
        console.error("Product image upload failed:", error.message);

        return res.status(500).json({
            message: "Unable to upload image",
        });
    }
}

/**
 * Create a new product (Admin only)
 * POST /api/products
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createProduct(req, res) {
    try {
        const {
            name,
            color_palette,
            image_url,
            cloudinary_public_id,
            is_active = true,
        } = req.body;

        if (
            !name?.trim() ||
            !color_palette ||
            !image_url ||
            !cloudinary_public_id
        ) {
            return res.status(400).json({
                message: "Name, color, image URL and Cloudinary public ID are required",
            });
        }

        if (!ALLOWED_COLORS.includes(color_palette)) {
            return res.status(400).json({
                message: "Invalid color palette",
            });
        }

        if (
            typeof is_active !== "boolean" ||
            !image_url.startsWith("https://res.cloudinary.com/") ||
            !cloudinary_public_id.startsWith("rhs/products/")
        ) {
            return res.status(400).json({
                message: "Invalid status or product image details",
            });
        }

        const product = await productModel.createProduct({
            name: name.trim(),
            color_palette,
            image_url,
            cloudinary_public_id,
            is_active,
        });

        return res.status(201).json({
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        console.error("Create product failed:", error.message);

        return res.status(500).json({
            message: "Unable to create product",
        });
    }
}

/**
 * Get products listing with optional status filtering
 * GET /api/products
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getProducts(req, res) {
    try {
        const { status } = req.query;
        const isAdmin = Boolean(req.isAdmin || req.admin);

        if (!isAdmin) {
            if (status && status !== "active") {
                return res.status(403).json({
                    message: "Admin login is required to view inactive or all products",
                });
            }
        } else if (status && !["active", "inactive", "all"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Use active, inactive or all",
            });
        }

        const products = await productModel.getProducts({
            status,
            isAdmin,
        });

        return res.status(200).json({
            message: "Products fetched successfully",
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("Get products failed:", error.message);

        return res.status(500).json({
            message: "Unable to fetch products",
        });
    }
}

/**
 * Get a single product by ID (Admin only)
 * GET /api/products/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getProductById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        const product = await productModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        return res.status(200).json({
            message: "Product fetched successfully",
            product,
        });
    } catch (error) {
        console.error("Get product failed:", error.message);

        return res.status(500).json({
            message: "Unable to fetch product",
        });
    }
}

/**
 * Update a product by ID (Admin only)
 * PUT /api/products/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateProduct(req, res) {
    try {
        const id = Number(req.params.id);
        const {
            name,
            color_palette,
            image_url,
            cloudinary_public_id,
            is_active,
        } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        if (
            typeof name !== "string" ||
            !name.trim() ||
            !ALLOWED_COLORS.includes(color_palette) ||
            typeof image_url !== "string" ||
            !image_url.startsWith("https://res.cloudinary.com/") ||
            typeof cloudinary_public_id !== "string" ||
            !cloudinary_public_id.startsWith("rhs/products/") ||
            typeof is_active !== "boolean"
        ) {
            return res.status(400).json({
                message: "Invalid product details",
            });
        }

        const updatedProduct = await productModel.updateProduct(id, {
            name: name.trim(),
            color_palette,
            image_url,
            cloudinary_public_id,
            is_active,
        });

        if (!updatedProduct) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        return res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (error) {
        console.error("Update product failed:", error.message);

        return res.status(500).json({
            message: "Unable to update product",
        });
    }
}

/**
 * Soft delete a product by ID (Admin only)
 * DELETE /api/products/:id
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteProduct(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        const deleted = await productModel.softDeleteProduct(id);

        if (!deleted) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        return res.status(200).json({
            message: "Product deleted successfully",
        });
    } catch (error) {
        console.error("Delete product failed:", error.message);

        return res.status(500).json({
            message: "Unable to delete product",
        });
    }
}
