import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import * as blogModel from "../models/blog.model.js";

/**
 * Upload image buffer to Cloudinary in folder rhs/blogs
 * @param {Buffer} buffer
 */
function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "rhs/blogs",
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
 * Convert string into a URL-friendly slug
 * @param {string} text
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Ensure a unique slug by appending counter if necessary
 * @param {string} baseSlug
 * @param {number|null} excludeId
 */
async function generateUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug || "blog-post";
    let counter = 1;

    while (await blogModel.checkSlugExists(slug, excludeId)) {
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }

    return slug;
}

/**
 * Safely parse JSON if passed as string, or return as is if already array/object
 */
function parseJsonField(val, fieldName) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === "object") return val;
    try {
        return JSON.parse(val);
    } catch {
        throw new Error(`Invalid JSON format for ${fieldName}`);
    }
}

/**
 * POST /api/blogs/upload-image
 * Upload a blog thumbnail to Cloudinary (Admin only)
 */
export async function uploadImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No image file provided. Please upload an image using field 'image'.",
            });
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: "Only JPEG, PNG and WebP images are allowed.",
            });
        }

        const result = await uploadToCloudinary(req.file.buffer);

        return res.status(200).json({
            message: "Blog thumbnail uploaded successfully",
            thumbnail_url: result.secure_url,
            thumbnail_public_id: result.public_id,
        });
    } catch (error) {
        console.error("Blog image upload failed:", error.message);
        return res.status(500).json({
            message: "Unable to upload blog image",
        });
    }
}

/**
 * POST /api/blogs
 * Create a new blog post (Admin only)
 */
export async function createBlog(req, res) {
    try {
        const {
            title,
            slug: userSlug,
            thumbnail_url,
            thumbnail_public_id,
            category,
            excerpt,
            article_subtitle,
            key_takeaways,
            article_content,
            article_sections,
            benchmark_specs,
            enquiry_cta,
            author_name,
            author_role,
            author_avatar_url,
            author_avatar_public_id,
            published_at,
            reading_time,
            is_featured = false,
            is_active = false,
        } = req.body;

        // Required field validation
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                message: "Blog title is required",
            });
        }

        if (!excerpt || typeof excerpt !== "string" || !excerpt.trim()) {
            return res.status(400).json({
                message: "Blog excerpt is required",
            });
        }

        // Slug handling
        let finalSlug;
        if (userSlug && typeof userSlug === "string" && userSlug.trim()) {
            const formattedSlug = slugify(userSlug);
            const exists = await blogModel.checkSlugExists(formattedSlug);
            if (exists) {
                return res.status(409).json({
                    message: `A blog with slug '${formattedSlug}' already exists`,
                });
            }
            finalSlug = formattedSlug;
        } else {
            const baseSlug = slugify(title);
            finalSlug = await generateUniqueSlug(baseSlug);
        }

        // Parse optional JSON fields
        let parsedTakeaways = null;
        let parsedSections = null;
        let parsedSpecs = null;
        let parsedCta = null;

        try {
            parsedTakeaways = parseJsonField(key_takeaways, "key_takeaways");
            parsedSections = parseJsonField(article_sections, "article_sections");
            parsedSpecs = parseJsonField(benchmark_specs, "benchmark_specs");
            parsedCta = parseJsonField(enquiry_cta, "enquiry_cta");
        } catch (jsonErr) {
            return res.status(400).json({
                message: jsonErr.message,
            });
        }

        if (parsedTakeaways && !Array.isArray(parsedTakeaways)) {
            return res.status(400).json({
                message: "key_takeaways must be an array of strings",
            });
        }

        if (parsedSections && !Array.isArray(parsedSections)) {
            return res.status(400).json({
                message: "article_sections must be an array of section objects",
            });
        }

        if (parsedSpecs && !Array.isArray(parsedSpecs)) {
            return res.status(400).json({
                message: "benchmark_specs must be an array of spec objects",
            });
        }

        const newBlog = await blogModel.createBlog({
            title: title.trim(),
            slug: finalSlug,
            thumbnail_url: thumbnail_url ? thumbnail_url.trim() : null,
            thumbnail_public_id: thumbnail_public_id ? thumbnail_public_id.trim() : null,
            category: category ? category.trim() : null,
            excerpt: excerpt.trim(),
            article_subtitle: article_subtitle ? article_subtitle.trim() : null,
            key_takeaways: parsedTakeaways,
            article_content: article_content ? article_content.trim() : null,
            article_sections: parsedSections,
            benchmark_specs: parsedSpecs,
            enquiry_cta: parsedCta,
            author_name: author_name ? author_name.trim() : null,
            author_role: author_role ? author_role.trim() : null,
            author_avatar_url: author_avatar_url ? author_avatar_url.trim() : null,
            author_avatar_public_id: author_avatar_public_id ? author_avatar_public_id.trim() : null,
            published_at: published_at ? published_at.trim() : null,
            reading_time: reading_time ? reading_time.trim() : null,
            is_featured: Boolean(is_featured),
            is_active: Boolean(is_active),
        });

        return res.status(201).json({
            message: "Blog created successfully",
            blog: newBlog,
        });
    } catch (error) {
        console.error("Create blog failed:", error.message);
        return res.status(500).json({
            message: "Unable to create blog post",
        });
    }
}

/**
 * GET /api/blogs
 * List blogs (Public: active only; Admin: active, inactive, or all)
 */
export async function getBlogs(req, res) {
    try {
        const { status } = req.query;
        const isAdmin = Boolean(req.isAdmin || req.admin);

        if (!isAdmin) {
            if (status && status !== "active") {
                return res.status(403).json({
                    message: "Admin login is required to view inactive or all blogs",
                });
            }
        } else if (status && !["active", "inactive", "all"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Use active, inactive or all",
            });
        }

        const filterStatus = status || (isAdmin ? "all" : "active");
        const blogs = await blogModel.getBlogs({
            status: filterStatus,
            isAdmin,
        });

        return res.status(200).json({
            message: "Blogs fetched successfully",
            count: blogs.length,
            blogs,
        });
    } catch (error) {
        console.error("Get blogs failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch blogs",
        });
    }
}

/**
 * GET /api/blogs/:id
 * Get full blog details by ID (Admin only)
 */
export async function getBlogById(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid blog ID. Must be a positive integer.",
            });
        }

        const blog = await blogModel.getBlogById(id, { isAdmin: true });
        if (!blog) {
            return res.status(404).json({
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            message: "Blog details fetched successfully",
            blog,
        });
    } catch (error) {
        console.error("Get blog by ID failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch blog details",
        });
    }
}

/**
 * GET /api/blogs/slug/:slug
 * Public article reader: Get active blog by slug
 */
export async function getBlogBySlug(req, res) {
    try {
        const { slug } = req.params;
        if (!slug || typeof slug !== "string" || !slug.trim()) {
            return res.status(400).json({
                message: "Valid blog slug is required",
            });
        }

        const cleanSlug = slug.trim();
        const blog = await blogModel.getBlogBySlug(cleanSlug, { activeOnly: true });

        if (!blog) {
            return res.status(404).json({
                message: "Blog article not found or inactive",
            });
        }

        // Increment view/read counter asynchronously
        blogModel.incrementReadCount(blog.id).catch((err) => {
            console.warn("Failed to increment blog read count:", err.message);
        });

        return res.status(200).json({
            message: "Blog article fetched successfully",
            blog,
        });
    } catch (error) {
        console.error("Get blog by slug failed:", error.message);
        return res.status(500).json({
            message: "Unable to fetch blog article",
        });
    }
}

/**
 * PUT /api/blogs/:id
 * Update an existing blog (Admin only)
 */
export async function updateBlog(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid blog ID. Must be a positive integer.",
            });
        }

        // Check if blog exists
        const existing = await blogModel.getBlogById(id, { isAdmin: true });
        if (!existing) {
            return res.status(404).json({
                message: "Blog not found or already deleted",
            });
        }

        const updateData = {};
        const {
            title,
            slug: userSlug,
            thumbnail_url,
            thumbnail_public_id,
            category,
            excerpt,
            article_subtitle,
            key_takeaways,
            article_content,
            article_sections,
            benchmark_specs,
            enquiry_cta,
            author_name,
            author_role,
            author_avatar_url,
            author_avatar_public_id,
            published_at,
            reading_time,
            is_featured,
            is_active,
        } = req.body;

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({ message: "Blog title cannot be empty" });
            }
            updateData.title = title.trim();
        }

        if (userSlug !== undefined) {
            if (typeof userSlug !== "string" || !userSlug.trim()) {
                return res.status(400).json({ message: "Slug cannot be empty" });
            }
            const cleanSlug = slugify(userSlug);
            const exists = await blogModel.checkSlugExists(cleanSlug, id);
            if (exists) {
                return res.status(409).json({
                    message: `A blog with slug '${cleanSlug}' already exists`,
                });
            }
            updateData.slug = cleanSlug;
        }

        if (excerpt !== undefined) {
            if (typeof excerpt !== "string" || !excerpt.trim()) {
                return res.status(400).json({ message: "Blog excerpt cannot be empty" });
            }
            updateData.excerpt = excerpt.trim();
        }

        // Preserve existing images if omitted or set if provided
        if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
        if (thumbnail_public_id !== undefined) updateData.thumbnail_public_id = thumbnail_public_id;
        if (category !== undefined) updateData.category = category ? category.trim() : null;
        if (article_subtitle !== undefined) updateData.article_subtitle = article_subtitle ? article_subtitle.trim() : null;
        if (article_content !== undefined) updateData.article_content = article_content ? article_content.trim() : null;
        if (author_name !== undefined) updateData.author_name = author_name ? author_name.trim() : null;
        if (author_role !== undefined) updateData.author_role = author_role ? author_role.trim() : null;
        if (author_avatar_url !== undefined) updateData.author_avatar_url = author_avatar_url;
        if (author_avatar_public_id !== undefined) updateData.author_avatar_public_id = author_avatar_public_id;
        if (published_at !== undefined) updateData.published_at = published_at;
        if (reading_time !== undefined) updateData.reading_time = reading_time;
        if (is_featured !== undefined) updateData.is_featured = Boolean(is_featured);
        if (is_active !== undefined) updateData.is_active = Boolean(is_active);

        // Parse JSON fields if provided
        try {
            if (key_takeaways !== undefined) {
                const parsed = parseJsonField(key_takeaways, "key_takeaways");
                if (parsed && !Array.isArray(parsed)) {
                    return res.status(400).json({ message: "key_takeaways must be an array" });
                }
                updateData.key_takeaways = parsed;
            }

            if (article_sections !== undefined) {
                const parsed = parseJsonField(article_sections, "article_sections");
                if (parsed && !Array.isArray(parsed)) {
                    return res.status(400).json({ message: "article_sections must be an array" });
                }
                updateData.article_sections = parsed;
            }

            if (benchmark_specs !== undefined) {
                const parsed = parseJsonField(benchmark_specs, "benchmark_specs");
                if (parsed && !Array.isArray(parsed)) {
                    return res.status(400).json({ message: "benchmark_specs must be an array" });
                }
                updateData.benchmark_specs = parsed;
            }

            if (enquiry_cta !== undefined) {
                updateData.enquiry_cta = parseJsonField(enquiry_cta, "enquiry_cta");
            }
        } catch (jsonErr) {
            return res.status(400).json({ message: jsonErr.message });
        }

        const updatedBlog = await blogModel.updateBlog(id, updateData);

        return res.status(200).json({
            message: "Blog updated successfully",
            blog: updatedBlog,
        });
    } catch (error) {
        console.error("Update blog failed:", error.message);
        return res.status(500).json({
            message: "Unable to update blog post",
        });
    }
}

/**
 * DELETE /api/blogs/:id
 * Soft-delete a blog (Admin only)
 */
export async function deleteBlog(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid blog ID. Must be a positive integer.",
            });
        }

        const success = await blogModel.softDeleteBlog(id);
        if (!success) {
            return res.status(404).json({
                message: "Blog not found or already deleted",
            });
        }

        return res.status(200).json({
            message: "Blog deleted successfully",
        });
    } catch (error) {
        console.error("Delete blog failed:", error.message);
        return res.status(500).json({
            message: "Unable to delete blog post",
        });
    }
}
