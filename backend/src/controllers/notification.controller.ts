import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { formatIndianCurrency, generateWhatsAppLink, normalizePhone } from '../utils/generateId';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 50;

interface CreateNotificationData {
  userId?: number | null;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

export const createNotification = async (data: CreateNotificationData): Promise<any> => {
  return prisma.notification.create({
    data: {
      userId: data.userId ?? null,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
    },
  });
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const { isRead } = req.query;

    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: req.user?.id ?? -1 }, { userId: null }],
    };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return ApiResponse.paginated(res, notifications, total, page, limit);
  } catch (error: any) {
    logger.error('getNotifications error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch notifications', 500);
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid notification id', 400);

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return ApiResponse.error(res, 'Notification not found', 404);

    const isOwner = notification.userId === null || notification.userId === req.user?.id;
    if (!isOwner && req.user?.role !== 'super_admin') {
      return ApiResponse.error(res, 'Insufficient permissions.', 403);
    }

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return ApiResponse.success(res, 'Notification marked as read', updated);
  } catch (error: any) {
    logger.error('markRead error:', error.message);
    return ApiResponse.error(res, 'Failed to mark notification read', 500);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    let updateMany: Prisma.NotificationUpdateManyArgs;
    if (req.user?.role === 'super_admin') {
      updateMany = { where: { isRead: false }, data: { isRead: true } };
    } else {
      updateMany = { where: { userId: req.user?.id ?? -1, isRead: false }, data: { isRead: true } };
    }

    const result = await prisma.notification.updateMany(updateMany);
    return ApiResponse.success(res, 'All notifications marked as read', { updated: result.count });
  } catch (error: any) {
    logger.error('markAllRead error:', error.message);
    return ApiResponse.error(res, 'Failed to mark all notifications read', 500);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        OR: [{ userId: req.user?.id ?? -1 }, { userId: null }],
        isRead: false,
      },
    });
    return ApiResponse.success(res, 'Unread count retrieved', { count });
  } catch (error: any) {
    logger.error('getUnreadCount error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch unread count', 500);
  }
};

export const getDashboardNotifications = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;

    const [overdueFees, dueSoonFees, expiredSubscriptions, newEnquiries, recent] = await Promise.all([
      prisma.feeInvoice.count({ where: { status: 'overdue' } }),
      prisma.feeInvoice.count({
        where: { status: { in: ['pending', 'partial'] }, dueDate: { gte: today, lte: weekEnd } },
      }),
      prisma.subscription.count({ where: { paymentStatus: 'active', endDate: { lt: today } } }),
      prisma.contactEnquiry.count({ where: { status: 'new' } }),
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return ApiResponse.success(res, 'Dashboard notifications retrieved', {
      summary: {
        overdueFees,
        dueSoonFees,
        expiredSubscriptions,
        lowStockProducts,
        newEnquiries,
      },
      notifications: recent,
    });
  } catch (error: any) {
    logger.error('getDashboardNotifications error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch dashboard notifications', 500);
  }
};

export const getReminderTemplate = async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.body.invoiceId ?? req.query.invoiceId as string, 10);
    if (isNaN(invoiceId)) return ApiResponse.error(res, 'Valid invoiceId is required', 400);

    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, phone: true, parentPhone: true } },
        regularPlayer: {
          select: { id: true, firstName: true, lastName: true, phone: true, whatsappNumber: true },
        },
      },
    });
    if (!invoice) return ApiResponse.error(res, 'Fee invoice not found', 404);

    const settingsRows = await prisma.academySetting.findMany();
    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      if (s.key && s.value) settings[s.key] = s.value;
    }
    const academyName = settings['academy_name'] || settings['academyName'] || 'Badminton Academy';

    const name = invoice.student
      ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
      : invoice.regularPlayer
        ? `${invoice.regularPlayer.firstName} ${invoice.regularPlayer.lastName}`.trim()
        : 'Member';
    const phone =
      invoice.student?.phone ||
      invoice.student?.parentPhone ||
      invoice.regularPlayer?.whatsappNumber ||
      invoice.regularPlayer?.phone ||
      '';

    const amount = formatIndianCurrency(Number(invoice.totalAmount));
    let billingMonth = invoice.billingMonth;
    try {
      const [y, m] = invoice.billingMonth.split('-').map(Number);
      billingMonth = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      // keep raw month string
    }
    const dueDate = invoice.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const message =
      `Hello ${name}, this is a reminder from ${academyName}. ` +
      `Your fee of ${amount} for the month of ${billingMonth} is due on ${dueDate}. ` +
      `Kindly complete the payment to keep your membership active. Thank you.`;

    const whatsappLink = phone ? generateWhatsAppLink(phone, message) : null;

    return ApiResponse.success(res, 'Reminder template generated', {
      message,
      whatsappLink,
      phone: phone ? normalizePhone(phone) : null,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingMonth: invoice.billingMonth,
        totalAmount: Number(invoice.totalAmount),
        dueDate: invoice.dueDate,
      },
    });
  } catch (error: any) {
    logger.error('getReminderTemplate error:', error.message);
    return ApiResponse.error(res, 'Failed to generate reminder template', 500);
  }
};