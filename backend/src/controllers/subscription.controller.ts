import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const serializeSubscription = (subscription: any) => ({
  ...subscription,
  amount: Number(subscription.amount),
  discount: Number(subscription.discount),
});

const SUBSCRIPTION_INCLUDE = {
  student: {
    select: { id: true, admissionNumber: true, firstName: true, lastName: true, phone: true, status: true },
  },
  regularPlayer: {
    select: { id: true, playerId: true, firstName: true, lastName: true, phone: true, status: true },
  },
} as const;

const addBillingCycle = (date: Date, billingCycle: string): Date => {
  const d = new Date(date);
  switch (billingCycle) {
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'monthly':
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
};

export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const { type, status, search } = req.query;

    const where: Prisma.SubscriptionWhereInput = {};
    if (type) where.type = type as string;
    if (status) where.paymentStatus = status as string;
    if (search) {
      const s = search as string;
      where.OR = [
        {
          student: {
            is: {
              OR: [
                { firstName: { contains: s } },
                { lastName: { contains: s } },
                { phone: { contains: s } },
                { admissionNumber: { contains: s } },
              ],
            },
          },
        },
        {
          regularPlayer: {
            is: {
              OR: [
                { firstName: { contains: s } },
                { lastName: { contains: s } },
                { phone: { contains: s } },
                { playerId: { contains: s } },
              ],
            },
          },
        },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: SUBSCRIPTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return ApiResponse.paginated(res, subscriptions.map(serializeSubscription), total, page, limit);
  } catch (error: any) {
    logger.error('getSubscriptions error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch subscriptions', 500);
  }
};

export const getSubscriptionStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    const lowStock = products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;

    const [activeCount, renewalsDueThisWeek, expired, overdue, revenuePromise, mrrPromise, churned] =
      await Promise.all([
        prisma.subscription.count({ where: { paymentStatus: 'active' } }),
        prisma.subscription.count({
          where: { paymentStatus: 'active', endDate: { gte: today, lte: weekEnd } },
        }),
        prisma.subscription.count({ where: { paymentStatus: 'active', endDate: { lt: today } } }),
        prisma.feeInvoice.count({ where: { status: 'overdue' } }),
        prisma.payment.aggregate({
          where: {
            category: { in: ['regular_membership', 'coaching_fee'] },
            paymentDate: { gte: monthStart, lte: monthEnd },
            status: { in: ['paid', 'partial'] },
          },
          _sum: { finalAmount: true },
        }),
        prisma.subscription.aggregate({
          where: { paymentStatus: 'active' },
          _sum: { amount: true },
        }),
        prisma.subscription.count({ where: { paymentStatus: 'cancelled' } }),
      ]);

    return ApiResponse.success(res, 'Subscription stats retrieved', {
      activeCount,
      renewalsDueThisWeek,
      expired,
      overdue,
      lowStock,
      revenueFromSubscriptions: Number(revenuePromise._sum.finalAmount ?? 0),
      monthlyRecurringRevenue: Number(mrrPromise._sum.amount ?? 0),
      churned,
    });
  } catch (error: any) {
    logger.error('getSubscriptionStats error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch subscription stats', 500);
  }
};

export const getStudentSubscriptions = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) return ApiResponse.error(res, 'Invalid student id', 400);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    if (!student) return ApiResponse.error(res, 'Student not found', 404);

    const subscriptions = await prisma.subscription.findMany({
      where: { studentId },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Student subscriptions retrieved', {
      student,
      subscriptions: subscriptions.map(serializeSubscription),
    });
  } catch (error: any) {
    logger.error('getStudentSubscriptions error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch student subscriptions', 500);
  }
};

export const getRegularSubscriptions = async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId);
    if (isNaN(playerId)) return ApiResponse.error(res, 'Invalid player id', 400);

    const player = await prisma.regularPlayer.findUnique({
      where: { id: playerId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    if (!player) return ApiResponse.error(res, 'Regular player not found', 404);

    const subscriptions = await prisma.subscription.findMany({
      where: { regularPlayerId: playerId },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Regular player subscriptions retrieved', {
      player,
      subscriptions: subscriptions.map(serializeSubscription),
    });
  } catch (error: any) {
    logger.error('getRegularSubscriptions error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch regular player subscriptions', 500);
  }
};

export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;

    const studentId = body.studentId ? parseInt(body.studentId, 10) : undefined;
    const regularPlayerId = body.regularPlayerId ? parseInt(body.regularPlayerId, 10) : undefined;

    if (!studentId && !regularPlayerId) {
      return ApiResponse.error(res, 'Either studentId or regularPlayerId is required', 400);
    }
    if (studentId && regularPlayerId) {
      return ApiResponse.error(res, 'Provide only one of studentId or regularPlayerId', 400);
    }
    if (!body.type || !['coaching', 'regular'].includes(body.type)) {
      return ApiResponse.error(res, "Valid type is required ('coaching' or 'regular')", 400);
    }
    if (!body.startDate || !body.endDate) {
      return ApiResponse.error(res, 'startDate and endDate are required', 400);
    }
    if (body.amount === undefined || isNaN(parseFloat(body.amount))) {
      return ApiResponse.error(res, 'Valid amount is required', 400);
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return ApiResponse.error(res, 'Invalid date provided', 400);
    }
    if (endDate <= startDate) {
      return ApiResponse.error(res, 'endDate must be after startDate', 400);
    }

    if (studentId) {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) return ApiResponse.error(res, 'Student not found', 404);
    }
    if (regularPlayerId) {
      const player = await prisma.regularPlayer.findUnique({ where: { id: regularPlayerId } });
      if (!player) return ApiResponse.error(res, 'Regular player not found', 404);
    }

    const subscription = await prisma.subscription.create({
      data: {
        studentId: studentId ?? undefined,
        regularPlayerId: regularPlayerId ?? undefined,
        type: body.type,
        startDate,
        endDate,
        amount: new Prisma.Decimal(parseFloat(body.amount)),
        discount: new Prisma.Decimal(parseFloat(body.discount ?? 0)),
        billingCycle: body.billingCycle || 'monthly',
        paymentStatus: body.paymentStatus || 'active',
        notes: body.notes || undefined,
      },
      include: SUBSCRIPTION_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'create',
        entityType: 'Subscription',
        entityId: subscription.id,
        newValues: JSON.stringify({
          studentId: subscription.studentId,
          regularPlayerId: subscription.regularPlayerId,
          type: subscription.type,
          amount: Number(subscription.amount),
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        }),
        ipAddress: req.ip,
      },
    });

    return ApiResponse.created(res, 'Subscription created successfully', serializeSubscription(subscription));
  } catch (error: any) {
    logger.error('createSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to create subscription', 500);
  }
};

export const renewSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid subscription id', 400);

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Subscription not found', 404);

    const body = req.body || {};
    const newEndDate = body.endDate ? new Date(body.endDate) : addBillingCycle(existing.endDate, existing.billingCycle);
    if (isNaN(newEndDate.getTime())) {
      return ApiResponse.error(res, 'Invalid endDate provided', 400);
    }
    if (newEndDate <= existing.endDate) {
      return ApiResponse.error(res, 'New endDate must be after the current endDate', 400);
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: { endDate: newEndDate, paymentStatus: 'active' },
      include: SUBSCRIPTION_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'Subscription',
        entityId: id,
        oldValues: JSON.stringify({ endDate: existing.endDate, paymentStatus: existing.paymentStatus }),
        newValues: JSON.stringify({ endDate: newEndDate, paymentStatus: 'active' }),
        ipAddress: req.ip,
      },
    });

    return ApiResponse.success(res, 'Subscription renewed successfully', serializeSubscription(subscription));
  } catch (error: any) {
    logger.error('renewSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to renew subscription', 500);
  }
};

const setSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  status: 'paused' | 'active' | 'cancelled'
) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid subscription id', 400);

  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) return ApiResponse.error(res, 'Subscription not found', 404);

  const subscription = await prisma.subscription.update({
    where: { id },
    data: { paymentStatus: status },
    include: SUBSCRIPTION_INCLUDE,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user?.id ?? null,
      action: 'update',
      entityType: 'Subscription',
      entityId: id,
      oldValues: JSON.stringify({ paymentStatus: existing.paymentStatus }),
      newValues: JSON.stringify({ paymentStatus: status }),
      ipAddress: req.ip,
    },
  });

  const label = status === 'paused' ? 'paused' : status === 'active' ? 'resumed' : 'cancelled';
  return ApiResponse.success(res, `Subscription ${label} successfully`, serializeSubscription(subscription));
};

export const pauseSubscription = async (req: AuthRequest, res: Response) => {
  try {
    return await setSubscriptionStatus(req, res, 'paused');
  } catch (error: any) {
    logger.error('pauseSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to pause subscription', 500);
  }
};

export const resumeSubscription = async (req: AuthRequest, res: Response) => {
  try {
    return await setSubscriptionStatus(req, res, 'active');
  } catch (error: any) {
    logger.error('resumeSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to resume subscription', 500);
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    return await setSubscriptionStatus(req, res, 'cancelled');
  } catch (error: any) {
    logger.error('cancelSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to cancel subscription', 500);
  }
};

export const getSubscriptionHistory = async (req: Request, res: Response) => {
  try {
    const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : undefined;
    const regularPlayerId = req.query.regularPlayerId ? parseInt(req.query.regularPlayerId as string, 10) : undefined;

    if (!studentId && !regularPlayerId) {
      return ApiResponse.error(res, 'Provide studentId or regularPlayerId query parameter', 400);
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(regularPlayerId ? { regularPlayerId } : {}),
      },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Subscription history retrieved', subscriptions.map(serializeSubscription));
  } catch (error: any) {
    logger.error('getSubscriptionHistory error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch subscription history', 500);
  }
};