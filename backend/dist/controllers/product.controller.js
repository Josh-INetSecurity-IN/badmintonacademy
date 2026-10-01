"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePhoto = exports.getCategories = exports.getLowStock = exports.deleteProduct = exports.stockAdjust = exports.stockIn = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const prisma = new client_1.PrismaClient();
const toPlain = (p) => ({
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
});
const getProducts = async (req, res) => {
    try {
        const { page = '1', limit = '20', search = '', category = '', status = '', lowStock, } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { sku: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (category) {
            where.category = String(category);
        }
        if (status) {
            where.status = String(status);
        }
        else {
            where.status = { not: 'inactive' };
        }
        if (lowStock === 'true') {
            where.stockQuantity = { lte: prisma.product.fields.lowStockThreshold };
        }
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take,
                orderBy: { name: 'asc' },
            }),
            prisma.product.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, products.map(toPlain), total, Number(page), take);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch products', 500, error.message);
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
            include: {
                saleItems: {
                    take: 50,
                    orderBy: { sale: { saleDate: 'desc' } },
                    include: { sale: true },
                },
            },
        });
        if (!product) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        return apiResponse_1.ApiResponse.success(res, 'Product retrieved successfully', {
            ...toPlain(product),
            saleItems: product.saleItems.map((si) => ({
                ...si,
                unitPrice: Number(si.unitPrice),
                total: Number(si.total),
            })),
        });
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch product', 500, error.message);
    }
};
exports.getProduct = getProduct;
const createProduct = async (req, res) => {
    try {
        const { name, category, brand, description, image, purchasePrice, sellingPrice, stockQuantity = 0, lowStockThreshold = 10, supplier, status = 'active', } = req.body;
        if (!name || sellingPrice === undefined || sellingPrice === null) {
            return apiResponse_1.ApiResponse.error(res, 'Name and selling price are required', 400);
        }
        const sku = req.body.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const existingSku = await prisma.product.findUnique({ where: { sku } });
        if (existingSku) {
            return apiResponse_1.ApiResponse.error(res, 'SKU already exists', 400);
        }
        const product = await prisma.product.create({
            data: {
                name,
                sku,
                category: category || null,
                brand: brand || null,
                description: description || null,
                image: image || null,
                purchasePrice: new client_1.Prisma.Decimal(purchasePrice || 0),
                sellingPrice: new client_1.Prisma.Decimal(sellingPrice),
                stockQuantity: Number(stockQuantity),
                lowStockThreshold: Number(lowStockThreshold),
                supplier: supplier || null,
                status,
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Product created successfully', toPlain(product), 201);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to create product', 500, error.message);
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, category, brand, description, image, purchasePrice, sellingPrice, stockQuantity, lowStockThreshold, supplier, status, } = req.body;
        const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        if (sku && sku !== existing.sku) {
            const skuExists = await prisma.product.findUnique({ where: { sku } });
            if (skuExists) {
                return apiResponse_1.ApiResponse.error(res, 'SKU already exists', 400);
            }
        }
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (sku !== undefined)
            data.sku = sku;
        if (category !== undefined)
            data.category = category;
        if (brand !== undefined)
            data.brand = brand;
        if (description !== undefined)
            data.description = description;
        if (image !== undefined)
            data.image = image;
        if (purchasePrice !== undefined)
            data.purchasePrice = new client_1.Prisma.Decimal(purchasePrice);
        if (sellingPrice !== undefined)
            data.sellingPrice = new client_1.Prisma.Decimal(sellingPrice);
        if (stockQuantity !== undefined)
            data.stockQuantity = Number(stockQuantity);
        if (lowStockThreshold !== undefined)
            data.lowStockThreshold = Number(lowStockThreshold);
        if (supplier !== undefined)
            data.supplier = supplier;
        if (status !== undefined)
            data.status = status;
        const product = await prisma.product.update({
            where: { id: Number(id) },
            data,
        });
        return apiResponse_1.ApiResponse.success(res, 'Product updated successfully', toPlain(product));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to update product', 500, error.message);
    }
};
exports.updateProduct = updateProduct;
const stockIn = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, purchasePrice } = req.body;
        if (!quantity || Number(quantity) <= 0) {
            return apiResponse_1.ApiResponse.error(res, 'Quantity must be positive', 400);
        }
        const product = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!product) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        const data = {
            stockQuantity: product.stockQuantity + Number(quantity),
        };
        if (purchasePrice !== undefined && purchasePrice !== null) {
            data.purchasePrice = new client_1.Prisma.Decimal(purchasePrice);
        }
        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data,
        });
        return apiResponse_1.ApiResponse.success(res, `Stock increased by ${quantity}`, toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to stock in', 500, error.message);
    }
};
exports.stockIn = stockIn;
const stockAdjust = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, type, reason } = req.body;
        if (!quantity || Number(quantity) <= 0) {
            return apiResponse_1.ApiResponse.error(res, 'Quantity must be positive', 400);
        }
        if (!['add', 'subtract'].includes(type)) {
            return apiResponse_1.ApiResponse.error(res, 'Type must be add or subtract', 400);
        }
        const product = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!product) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        const newQuantity = type === 'add'
            ? product.stockQuantity + Number(quantity)
            : product.stockQuantity - Number(quantity);
        if (newQuantity < 0) {
            return apiResponse_1.ApiResponse.error(res, 'Stock cannot go below zero', 400);
        }
        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data: { stockQuantity: newQuantity },
        });
        return apiResponse_1.ApiResponse.success(res, `Stock ${type === 'add' ? 'increased' : 'decreased'} by ${quantity}${reason ? `. Reason: ${reason}` : ''}`, toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to adjust stock', 500, error.message);
    }
};
exports.stockAdjust = stockAdjust;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!product) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        if (product.status === 'inactive') {
            await prisma.product.delete({ where: { id: Number(id) } });
            return apiResponse_1.ApiResponse.success(res, 'Product permanently deleted');
        }
        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data: { status: 'inactive' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Product deactivated', toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete product', 500, error.message);
    }
};
exports.deleteProduct = deleteProduct;
const getLowStock = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                status: 'active',
                stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
            },
            orderBy: { stockQuantity: 'asc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Low stock products retrieved successfully', products.map(toPlain));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch low stock products', 500, error.message);
    }
};
exports.getLowStock = getLowStock;
const getCategories = async (req, res) => {
    try {
        const result = await prisma.product.findMany({
            where: { status: { not: 'inactive' } },
            distinct: ['category'],
            select: { category: true },
        });
        const categories = result.map((r) => r.category).filter((c) => Boolean(c));
        return apiResponse_1.ApiResponse.success(res, 'Categories retrieved successfully', categories);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch categories', 500, error.message);
    }
};
exports.getCategories = getCategories;
const updatePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!product) {
            return apiResponse_1.ApiResponse.error(res, 'Product not found', 404);
        }
        if (!req.file) {
            return apiResponse_1.ApiResponse.error(res, 'No photo uploaded', 400);
        }
        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data: { image: `/uploads/${req.file.filename}` },
        });
        return apiResponse_1.ApiResponse.success(res, 'Product photo updated successfully', toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to update photo', 500, error.message);
    }
};
exports.updatePhoto = updatePhoto;
//# sourceMappingURL=product.controller.js.map