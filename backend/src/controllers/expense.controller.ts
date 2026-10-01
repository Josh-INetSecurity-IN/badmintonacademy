import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';

const prisma = new PrismaClient();

const STANDARD_CATEGORIES = [
  'Rent',
  'Electricity',
  'Water',
  'Salaries',
  'Coaching expenses',
  'Shuttlecock purchases',
  'Equipment purchases',
  'Maintenance',
  'Marketing',
  'Tournament expenses',
  'Internet',
  'Miscellaneous',
];

const toPlain = (e: any) => ({
  ...e,
  amount: Number(e.amount),
});

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      from,
      to,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (category) {
      where.category = String(category);
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);

    return ApiResponse.paginated(
      res,
      expenses.map(toPlain),
      total,
      Number(page),
      take
    );
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch expenses', 500, error.message);
  }
};

export const getExpenseCategories = async (req: Request, res: Response) => {
  try {
    const result = await prisma.expense.findMany({
      distinct: ['category'],
      select: { category: true },
    });

    const dbCategories = result.map((r) => r.category).filter(Boolean);
    const allCategories = [...new Set([...STANDARD_CATEGORIES, ...dbCategories])];

    return ApiResponse.success(res, 'Expense categories retrieved successfully', allCategories);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch expense categories', 500, error.message);
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      description,
      amount,
      date,
      paymentMethod = 'cash',
      vendor,
      notes,
    } = req.body;

    if (!category || amount === undefined || amount === null) {
      return ApiResponse.error(res, 'Category and amount are required', 400);
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description: description || '',
        amount: new Prisma.Decimal(amount),
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        vendor: vendor || null,
        addedBy: req.user?.id ?? null,
        notes: notes || null,
      },
    });

    return ApiResponse.success(res, 'Expense created successfully', toPlain(expense), 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to create expense', 500, error.message);
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { category, description, amount, date, paymentMethod, vendor, notes } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Expense not found', 404);
    }

    const data: any = {};
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = new Prisma.Decimal(amount);
    if (date !== undefined) data.date = new Date(date);
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (vendor !== undefined) data.vendor = vendor;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.expense.update({
      where: { id: Number(id) },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'expense',
        entityId: Number(id),
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify({ ...existing, ...data, amount: Number(updated.amount) }),
      },
    });

    return ApiResponse.success(res, 'Expense updated successfully', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update expense', 500, error.message);
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Expense not found', 404);
    }

    // Log audit entry BEFORE delete (schema has no soft-delete field)
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'expense',
        entityId: Number(id),
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.expense.delete({ where: { id: Number(id) } });

    return ApiResponse.success(res, 'Expense deleted successfully');
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to delete expense', 500, error.message);
  }
};

export const uploadReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Expense not found', 404);
    }

    if (!req.file) {
      return ApiResponse.error(res, 'No receipt uploaded', 400);
    }

    const updated = await prisma.expense.update({
      where: { id: Number(id) },
      data: { receipt: `/uploads/${req.file.filename}` },
    });

    return ApiResponse.success(res, 'Receipt uploaded successfully', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to upload receipt', 500, error.message);
  }
};

export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const where: any = {};

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      select: { category: true, date: true, amount: true },
    });

    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    for (const expense of expenses) {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amount);

      const monthKey = new Date(expense.date).toISOString().substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + Number(expense.amount);
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return ApiResponse.success(res, 'Expense summary retrieved successfully', {
      byCategory,
      byMonth,
      totalExpenses,
      count: expenses.length,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch expense summary', 500, error.message);
  }
};

export const exportExpenses = async (req: Request, res: Response) => {
  try {
    const { from, to, category } = req.query;

    const where: any = {};

    if (category) {
      where.category = String(category);
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) {
        const toDate = new Date(String(to));
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const csvHeader = 'Category,Description,Amount,Date,Payment Method,Vendor,Notes,Added By\n';
    const csvRows = expenses.map((e) => [
      `"${e.category}"`,
      `"${e.description || ''}"`,
      Number(e.amount),
      new Date(e.date).toISOString().split('T')[0],
      e.paymentMethod,
      `"${e.vendor || ''}"`,
      `"${e.notes || ''}"`,
      e.addedBy || '',
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses-export.csv');
    return res.send(csvHeader + csvRows.join('\n'));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to export expenses', 500, error.message);
  }
};