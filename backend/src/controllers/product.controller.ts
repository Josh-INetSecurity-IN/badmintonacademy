import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';

const prisma = new PrismaClient();

const toPlain = (p: any) => ({
  ...p,
  purchasePrice: Number(p.purchasePrice),
  sellingPrice: Number(p.sellingPrice),
});

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      category = '',
      status = '',
      lowStock,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

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
    } else {
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

    return ApiResponse.paginated(
      res,
      products.map(toPlain),
      total,
      Number(page),
      take
    );
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch products', 500, error.message);
  }
};

export const getProduct = async (req: Request, res: Response) => {
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
      return ApiResponse.error(res, 'Product not found', 404);
    }

    return ApiResponse.success(res, 'Product retrieved successfully', {
      ...toPlain(product),
      saleItems: product.saleItems.map((si) => ({
        ...si,
        unitPrice: Number(si.unitPrice),
        total: Number(si.total),
      })),
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch product', 500, error.message);
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      category,
      brand,
      description,
      image,
      purchasePrice,
      sellingPrice,
      stockQuantity = 0,
      lowStockThreshold = 10,
      supplier,
      status = 'active',
    } = req.body;

    if (!name || sellingPrice === undefined || sellingPrice === null) {
      return ApiResponse.error(res, 'Name and selling price are required', 400);
    }

    const sku = req.body.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return ApiResponse.error(res, 'SKU already exists', 400);
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || null,
        brand: brand || null,
        description: description || null,
        image: image || null,
        purchasePrice: new Prisma.Decimal(purchasePrice || 0),
        sellingPrice: new Prisma.Decimal(sellingPrice),
        stockQuantity: Number(stockQuantity),
        lowStockThreshold: Number(lowStockThreshold),
        supplier: supplier || null,
        status,
      },
    });

    return ApiResponse.success(res, 'Product created successfully', toPlain(product), 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to create product', 500, error.message);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      category,
      brand,
      description,
      image,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      lowStockThreshold,
      supplier,
      status,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    if (sku && sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku } });
      if (skuExists) {
        return ApiResponse.error(res, 'SKU already exists', 400);
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (sku !== undefined) data.sku = sku;
    if (category !== undefined) data.category = category;
    if (brand !== undefined) data.brand = brand;
    if (description !== undefined) data.description = description;
    if (image !== undefined) data.image = image;
    if (purchasePrice !== undefined) data.purchasePrice = new Prisma.Decimal(purchasePrice);
    if (sellingPrice !== undefined) data.sellingPrice = new Prisma.Decimal(sellingPrice);
    if (stockQuantity !== undefined) data.stockQuantity = Number(stockQuantity);
    if (lowStockThreshold !== undefined) data.lowStockThreshold = Number(lowStockThreshold);
    if (supplier !== undefined) data.supplier = supplier;
    if (status !== undefined) data.status = status;

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data,
    });

    return ApiResponse.success(res, 'Product updated successfully', toPlain(product));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update product', 500, error.message);
  }
};

export const stockIn = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, purchasePrice } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return ApiResponse.error(res, 'Quantity must be positive', 400);
    }

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    const data: any = {
      stockQuantity: product.stockQuantity + Number(quantity),
    };

    if (purchasePrice !== undefined && purchasePrice !== null) {
      data.purchasePrice = new Prisma.Decimal(purchasePrice);
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
    });

    return ApiResponse.success(res, `Stock increased by ${quantity}`, toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to stock in', 500, error.message);
  }
};

export const stockAdjust = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return ApiResponse.error(res, 'Quantity must be positive', 400);
    }

    if (!['add', 'subtract'].includes(type)) {
      return ApiResponse.error(res, 'Type must be add or subtract', 400);
    }

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    const newQuantity = type === 'add'
      ? product.stockQuantity + Number(quantity)
      : product.stockQuantity - Number(quantity);

    if (newQuantity < 0) {
      return ApiResponse.error(res, 'Stock cannot go below zero', 400);
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: { stockQuantity: newQuantity },
    });

    return ApiResponse.success(
      res,
      `Stock ${type === 'add' ? 'increased' : 'decreased'} by ${quantity}${reason ? `. Reason: ${reason}` : ''}`,
      toPlain(updated)
    );
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to adjust stock', 500, error.message);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    if (product.status === 'inactive') {
      await prisma.product.delete({ where: { id: Number(id) } });
      return ApiResponse.success(res, 'Product permanently deleted');
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: { status: 'inactive' },
    });

    return ApiResponse.success(res, 'Product deactivated', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to delete product', 500, error.message);
  }
};

export const getLowStock = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    return ApiResponse.success(res, 'Low stock products retrieved successfully', products.map(toPlain));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch low stock products', 500, error.message);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await prisma.product.findMany({
      where: { status: { not: 'inactive' } },
      distinct: ['category'],
      select: { category: true },
    });

    const categories = result.map((r) => r.category).filter((c): c is string => Boolean(c));

    return ApiResponse.success(res, 'Categories retrieved successfully', categories);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch categories', 500, error.message);
  }
};

export const updatePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    if (!req.file) {
      return ApiResponse.error(res, 'No photo uploaded', 400);
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: { image: `/uploads/${req.file.filename}` },
    });

    return ApiResponse.success(res, 'Product photo updated successfully', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update photo', 500, error.message);
  }
};