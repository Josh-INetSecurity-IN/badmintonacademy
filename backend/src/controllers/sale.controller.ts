import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { generateInvoiceNumber, generateReceiptNumber } from '../utils/generateId';

const prisma = new PrismaClient();

const toPlainSale = (s: any) => ({
  ...s,
  totalAmount: Number(s.totalAmount),
  discount: Number(s.discount),
  finalAmount: Number(s.finalAmount),
});

const toPlainItem = (i: any) => ({
  ...i,
  unitPrice: Number(i.unitPrice),
  total: Number(i.total),
});

export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      from,
      to,
      paymentStatus,
      search = '',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { customerName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (paymentStatus) {
      where.paymentStatus = String(paymentStatus);
    }

    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.saleDate.lte = toDate;
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          items: {
            include: { product: true },
          },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const mapped = sales.map((s) => ({
      ...toPlainSale(s),
      items: s.items.map(toPlainItem),
    }));

    return ApiResponse.paginated(res, mapped, total, Number(page), take);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch sales', 500, error.message);
  }
};

export const getSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!sale) {
      return ApiResponse.error(res, 'Sale not found', 404);
    }

    return ApiResponse.success(res, 'Sale retrieved successfully', {
      ...toPlainSale(sale),
      items: sale.items.map(toPlainItem),
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch sale', 500, error.message);
  }
};

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      studentId,
      regularPlayerId,
      items,
      discount = 0,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.error(res, 'At least one item is required', 400);
    }

    const sale = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i: any) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(Number(item.productId));
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (Number(product.stockQuantity) < Number(item.quantity)) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, requested: ${item.quantity}`);
        }
      }

      let totalAmount = 0;
      const saleItemsData = items.map((item: any) => {
        const product = productMap.get(Number(item.productId))!;
        const unitPrice = Number(product.sellingPrice);
        const total = unitPrice * Number(item.quantity);
        totalAmount += total;
        return {
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(total),
        };
      });

      const finalAmount = totalAmount - Number(discount);
      const invoiceNumber = generateInvoiceNumber();

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          studentId: studentId ? Number(studentId) : null,
          regularPlayerId: regularPlayerId ? Number(regularPlayerId) : null,
          totalAmount: new Prisma.Decimal(totalAmount),
          discount: new Prisma.Decimal(discount),
          finalAmount: new Prisma.Decimal(finalAmount),
          paymentMethod,
          paymentStatus,
          saleDate: new Date(),
          staffId: req.user?.id ?? null,
          notes: notes || null,
        },
      });

      for (const item of saleItemsData) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          },
        });

        const product = productMap.get(item.productId)!;
        if (product.stockQuantity - item.quantity < 0) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: product.stockQuantity - item.quantity },
        });
      }

      if (paymentStatus === 'paid') {
        await tx.payment.create({
          data: {
            receiptNumber: generateReceiptNumber(),
            category: 'product_sale',
            amount: new Prisma.Decimal(finalAmount),
            finalAmount: new Prisma.Decimal(finalAmount),
            paymentDate: new Date(),
            paymentMethod,
            status: 'paid',
            studentId: studentId ? Number(studentId) : null,
            regularPlayerId: regularPlayerId ? Number(regularPlayerId) : null,
            collectedBy: req.user?.id ?? null,
            notes: `Sale ${invoiceNumber}`,
          },
        });
      }

      return sale;
    });

    const saleWithItems = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: { include: { product: true } },
      },
    });

    return ApiResponse.success(res, 'Sale created successfully', {
      ...toPlainSale(saleWithItems!),
      items: saleWithItems!.items.map(toPlainItem),
    }, 201);
  } catch (error: any) {
    return ApiResponse.error(res, error.message || 'Failed to create sale', error.message ? 400 : 500);
  }
};

export const updateSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, paymentStatus } = req.body;

    const sale = await prisma.sale.findUnique({ where: { id: Number(id) } });
    if (!sale) {
      return ApiResponse.error(res, 'Sale not found', 404);
    }

    const data: any = {};
    if (notes !== undefined) data.notes = notes;
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;

    const updated = await prisma.sale.update({
      where: { id: Number(id) },
      data,
    });

    if (paymentStatus === 'paid' && sale.paymentStatus !== 'paid') {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          category: 'product_sale',
          notes: { contains: sale.invoiceNumber },
        },
      });

      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            receiptNumber: generateReceiptNumber(),
            category: 'product_sale',
            amount: sale.finalAmount,
            finalAmount: sale.finalAmount,
            paymentDate: new Date(),
            paymentMethod: sale.paymentMethod,
            status: 'paid',
            studentId: sale.studentId,
            regularPlayerId: sale.regularPlayerId,
            collectedBy: req.user?.id ?? null,
            notes: `Sale ${sale.invoiceNumber}`,
          },
        });
      }
    }

    return ApiResponse.success(res, 'Sale updated successfully', toPlainSale(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update sale', 500, error.message);
  }
};

export const deleteSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });

    if (!sale) {
      return ApiResponse.error(res, 'Sale not found', 404);
    }

    if (force === 'true') {
      await prisma.$transaction(async (tx) => {
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
        await tx.sale.delete({ where: { id: sale.id } });
      });

      return ApiResponse.success(res, 'Sale permanently deleted');
    }

    const updated = await prisma.sale.update({
      where: { id: Number(id) },
      data: {
        paymentStatus: 'cancelled',
        notes: `${sale.notes ? sale.notes + '\n' : ''}Cancelled on ${new Date().toISOString()}`,
      },
    });

    return ApiResponse.success(res, 'Sale cancelled', toPlainSale(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to delete sale', 500, error.message);
  }
};

export const getSalesSummary = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const where: any = {
      paymentStatus: { not: 'cancelled' },
    };

    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.saleDate.lte = toDate;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      select: { saleDate: true, finalAmount: true },
    });

    const dailyTotals: Record<string, { count: number; total: number }> = {};

    for (const sale of sales) {
      const dateKey = new Date(sale.saleDate).toISOString().split('T')[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { count: 0, total: 0 };
      }
      dailyTotals[dateKey].count += 1;
      dailyTotals[dateKey].total += Number(sale.finalAmount);
    }

    const totalCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.finalAmount), 0);

    return ApiResponse.success(res, 'Sales summary retrieved successfully', {
      dailyTotals,
      totalCount,
      totalRevenue,
      avgSale: totalCount > 0 ? totalRevenue / totalCount : 0,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch sales summary', 500, error.message);
  }
};

export const getProfit = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const saleWhere: any = {
      paymentStatus: { not: 'cancelled' },
    };

    if (from || to) {
      saleWhere.saleDate = {};
      if (from) saleWhere.saleDate.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        saleWhere.saleDate.lte = toDate;
      }
    }

    const saleItems = await prisma.saleItem.findMany({
      where: { sale: saleWhere },
      include: {
        product: {
          select: { purchasePrice: true },
        },
      },
    });

    let totalProfit = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    for (const item of saleItems) {
      const cost = Number(item.product.purchasePrice) * item.quantity;
      const revenue = Number(item.unitPrice) * item.quantity;
      totalRevenue += revenue;
      totalCost += cost;
      totalProfit += revenue - cost;
    }

    return ApiResponse.success(res, 'Profit calculated successfully', {
      totalProfit,
      totalRevenue,
      totalCost,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      saleCount: saleItems.length,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to calculate profit', 500, error.message);
  }
};

export const exportSales = async (req: Request, res: Response) => {
  try {
    const { from, to, paymentStatus } = req.query;

    const where: any = {};

    if (paymentStatus) {
      where.paymentStatus = String(paymentStatus);
    }

    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.saleDate.lte = toDate;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      include: {
        items: { include: { product: true } },
      },
    });

    const csvHeader = 'Invoice Number,Customer Name,Customer Phone,Date,Total Amount,Discount,Final Amount,Payment Method,Payment Status,Items\n';
    const csvRows = sales.map((s) => {
      const items = s.items.map((i) => `${i.product.name} x${i.quantity}`).join('; ');
      return [
        s.invoiceNumber,
        `"${s.customerName || ''}"`,
        s.customerPhone || '',
        new Date(s.saleDate).toISOString().split('T')[0],
        Number(s.totalAmount),
        Number(s.discount),
        Number(s.finalAmount),
        s.paymentMethod,
        s.paymentStatus,
        `"${items}"`,
      ].join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-export.csv');
    return res.send(csvHeader + csvRows.join('\n'));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to export sales', 500, error.message);
  }
};