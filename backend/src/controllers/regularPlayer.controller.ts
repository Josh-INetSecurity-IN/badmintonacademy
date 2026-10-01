import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { generatePlayerId } from '../utils/generateId';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const parseDecimal = (value: any): Prisma.Decimal => new Prisma.Decimal(value ?? 0);

const parseDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
};

const parseDays = (raw: string | string[] | undefined | null): string[] => {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

interface SubscriptionDates {
  subscriptionStart: Date;
  subscriptionEnd: Date;
  nextPaymentDue: Date;
}

const computeSubscriptionDates = (frequency: string, from: Date = new Date()): SubscriptionDates => {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const months = FREQUENCY_MONTHS[frequency] ?? 1;
  const subscriptionEnd = addMonths(start, months);
  const nextPaymentDue = addMonths(start, 1);
  return { subscriptionStart: start, subscriptionEnd, nextPaymentDue };
};

const buildPlayerWhere = (query: any): Prisma.RegularPlayerWhereInput => {
  const { search, status, paymentFrequency } = query;
  const where: Prisma.RegularPlayerWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { playerId: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status) where.status = status as string;
  if (paymentFrequency) where.paymentFrequency = paymentFrequency as string;

  return where;
};

export const getPlayers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const where = buildPlayerWhere(req.query);

    const [players, total] = await Promise.all([
      prisma.regularPlayer.findMany({
        where,
        include: {
          assignments: {
            where: { status: 'active' },
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                  daysOfWeek: true,
                  startTime: true,
                  endTime: true,
                  maxPlayers: true,
                  status: true,
                  court: { select: { id: true, name: true } },
                },
              },
            },
          },
          feeInvoices: { orderBy: { createdAt: 'desc' } },
          payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.regularPlayer.count({ where }),
    ]);

    return ApiResponse.paginated(res, players, total, page, limit);
  } catch (error: any) {
    logger.error('getPlayers error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch players', 500);
  }
};

export const getPlayer = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const player = await prisma.regularPlayer.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { joiningDate: 'desc' },
          include: {
            batch: {
              include: {
                court: { select: { id: true, name: true, location: true } },
                _count: { select: { players: { where: { status: 'active' } } } },
              },
            },
          },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
        feeInvoices: { orderBy: { createdAt: 'desc' } },
        subscriptions: { orderBy: { startDate: 'desc' } },
        attendances: { orderBy: { date: 'desc' }, take: 50 },
      },
    });

    if (!player) return ApiResponse.error(res, 'Player not found', 404);
    return ApiResponse.success(res, 'Player retrieved', player);
  } catch (error: any) {
    logger.error('getPlayer error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch player', 500);
  }
};

export const createPlayer = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.firstName || !body.lastName) {
      return ApiResponse.error(res, 'firstName and lastName are required', 400);
    }
    if (!body.phone) {
      return ApiResponse.error(res, 'phone is required', 400);
    }
    if (body.monthlyFee === undefined || body.monthlyFee === null || body.monthlyFee === '') {
      return ApiResponse.error(res, 'monthlyFee is required', 400);
    }

    let playerId = generatePlayerId();
    let exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
    for (let attempt = 0; attempt < 3 && exists; attempt++) {
      playerId = generatePlayerId();
      exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
    }
    if (exists) {
      return ApiResponse.error(res, 'Failed to generate a unique player id, please retry', 500);
    }

    const frequency = ['monthly', 'quarterly', 'yearly'].includes(body.paymentFrequency)
      ? body.paymentFrequency
      : 'monthly';
    const status = body.status || 'active';
    const dates = status === 'active' ? computeSubscriptionDates(frequency) : null;

    const player = await prisma.regularPlayer.create({
      data: {
        playerId,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        whatsappNumber: body.whatsappNumber || undefined,
        email: body.email || undefined,
        address: body.address || undefined,
        emergencyContact: body.emergencyContact || undefined,
        joiningDate: parseDate(body.joiningDate) || new Date(),
        monthlyFee: parseDecimal(body.monthlyFee),
        securityDeposit: parseDecimal(body.securityDeposit),
        paymentFrequency: frequency,
        subscriptionStart: dates ? dates.subscriptionStart : parseDate(body.subscriptionStart),
        subscriptionEnd: dates ? dates.subscriptionEnd : parseDate(body.subscriptionEnd),
        nextPaymentDue: dates ? dates.nextPaymentDue : parseDate(body.nextPaymentDue),
        photo: body.photo || undefined,
        status,
        notes: body.notes || undefined,
      },
    });

    return ApiResponse.created(res, 'Player created successfully', player);
  } catch (error: any) {
    logger.error('createPlayer error:', error.message);
    if (error.code === 'P2002') {
      return ApiResponse.error(res, 'A player with this player id already exists', 409);
    }
    return ApiResponse.error(res, 'Failed to create player', 500);
  }
};

export const updatePlayer = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const body = req.body;
    const data: Prisma.RegularPlayerUpdateInput = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.whatsappNumber !== undefined) data.whatsappNumber = body.whatsappNumber;
    if (body.email !== undefined) data.email = body.email;
    if (body.address !== undefined) data.address = body.address;
    if (body.emergencyContact !== undefined) data.emergencyContact = body.emergencyContact;
    if (body.joiningDate !== undefined) {
      const parsed = parseDate(body.joiningDate);
      if (parsed) data.joiningDate = parsed;
    }
    if (body.monthlyFee !== undefined) data.monthlyFee = parseDecimal(body.monthlyFee);
    if (body.securityDeposit !== undefined) data.securityDeposit = parseDecimal(body.securityDeposit);
    if (body.paymentFrequency !== undefined && ['monthly', 'quarterly', 'yearly'].includes(body.paymentFrequency)) {
      data.paymentFrequency = body.paymentFrequency;
    }
    if (body.subscriptionStart !== undefined) {
      data.subscriptionStart = body.subscriptionStart ? parseDate(body.subscriptionStart) : null;
    }
    if (body.subscriptionEnd !== undefined) {
      data.subscriptionEnd = body.subscriptionEnd ? parseDate(body.subscriptionEnd) : null;
    }
    if (body.nextPaymentDue !== undefined) {
      data.nextPaymentDue = body.nextPaymentDue ? parseDate(body.nextPaymentDue) : null;
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;

    const player = await prisma.regularPlayer.update({ where: { id }, data });
    return ApiResponse.success(res, 'Player updated successfully', player);
  } catch (error: any) {
    logger.error('updatePlayer error:', error.message);
    return ApiResponse.error(res, 'Failed to update player', 500);
  }
};

export const assignBatch = async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id);
    const batchId = parseInt(req.body.batchId);
    if (isNaN(playerId) || isNaN(batchId)) {
      return ApiResponse.error(res, 'Valid player id and batchId are required', 400);
    }

    const player = await prisma.regularPlayer.findUnique({ where: { id: playerId } });
    if (!player) return ApiResponse.error(res, 'Player not found', 404);

    const batch = await prisma.regularBatch.findUnique({
      where: { id: batchId },
      include: { _count: { select: { players: { where: { status: 'active' } } } } },
    });
    if (!batch) return ApiResponse.error(res, 'Batch not found', 404);

    const existing = await prisma.regularPlayerAssignment.findUnique({
      where: { playerId_batchId: { playerId, batchId } },
    });
    if (existing && existing.status === 'active') {
      return ApiResponse.success(res, 'Player is already assigned to this batch', existing);
    }
    if (batch._count.players >= batch.maxPlayers) {
      return ApiResponse.error(res, 'Batch is at full capacity', 400);
    }

    const assignment = await prisma.regularPlayerAssignment.upsert({
      where: { playerId_batchId: { playerId, batchId } },
      update: { status: 'active', leavingDate: null },
      create: { playerId, batchId, status: 'active' },
    });

    const activeCount = await prisma.regularPlayerAssignment.count({
      where: { batchId, status: 'active' },
    });
    if (activeCount >= batch.maxPlayers && batch.status === 'active') {
      await prisma.regularBatch.update({ where: { id: batchId }, data: { status: 'full' } });
    }

    return ApiResponse.success(res, 'Player assigned to batch successfully', assignment);
  } catch (error: any) {
    logger.error('assignBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to assign player to batch', 500);
  }
};

export const removeFromBatch = async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id);
    const batchId = parseInt(req.body.batchId);
    if (isNaN(playerId) || isNaN(batchId)) {
      return ApiResponse.error(res, 'Valid player id and batchId are required', 400);
    }

    const result = await prisma.regularPlayerAssignment.updateMany({
      where: { playerId, batchId, status: 'active' },
      data: { status: 'inactive', leavingDate: new Date() },
    });
    if (result.count === 0) {
      return ApiResponse.error(res, 'Player is not actively assigned to this batch', 404);
    }

    await prisma.regularBatch.updateMany({
      where: { id: batchId, status: 'full' },
      data: { status: 'active' },
    });

    return ApiResponse.success(res, 'Player removed from batch successfully');
  } catch (error: any) {
    logger.error('removeFromBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to remove player from batch', 500);
  }
};

export const pauseMembership = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const player = await prisma.regularPlayer.update({ where: { id }, data: { status: 'paused' } });
    return ApiResponse.success(res, 'Membership paused successfully', player);
  } catch (error: any) {
    logger.error('pauseMembership error:', error.message);
    return ApiResponse.error(res, 'Failed to pause membership', 500);
  }
};

export const resumeMembership = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const dates = computeSubscriptionDates(existing.paymentFrequency, new Date());
    const player = await prisma.regularPlayer.update({
      where: { id },
      data: {
        status: 'active',
        subscriptionStart: dates.subscriptionStart,
        subscriptionEnd: dates.subscriptionEnd,
        nextPaymentDue: dates.nextPaymentDue,
      },
    });
    return ApiResponse.success(res, 'Membership resumed successfully', player);
  } catch (error: any) {
    logger.error('resumeMembership error:', error.message);
    return ApiResponse.error(res, 'Failed to resume membership', 500);
  }
};

export const renewSubscription = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const dates = computeSubscriptionDates(existing.paymentFrequency, new Date());
    const player = await prisma.regularPlayer.update({
      where: { id },
      data: {
        status: 'active',
        subscriptionStart: dates.subscriptionStart,
        subscriptionEnd: dates.subscriptionEnd,
        nextPaymentDue: dates.nextPaymentDue,
      },
    });
    return ApiResponse.success(res, 'Subscription renewed successfully', player);
  } catch (error: any) {
    logger.error('renewSubscription error:', error.message);
    return ApiResponse.error(res, 'Failed to renew subscription', 500);
  }
};

export const getExpired = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: Prisma.RegularPlayerWhereInput = {
      status: { in: ['expired', 'overdue'] },
      subscriptionEnd: { lt: new Date() },
    };

    const [players, total] = await Promise.all([
      prisma.regularPlayer.findMany({
        where,
        include: {
          assignments: {
            where: { status: 'active' },
            include: { batch: { select: { id: true, name: true, startTime: true, endTime: true } } },
          },
          payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
        },
        orderBy: { subscriptionEnd: 'asc' },
        skip,
        take: limit,
      }),
      prisma.regularPlayer.count({ where }),
    ]);

    return ApiResponse.paginated(res, players, total, page, limit);
  } catch (error: any) {
    logger.error('getExpired error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch expired players', 500);
  }
};

export const getUpcomingSessions = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const player = await prisma.regularPlayer.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { status: 'active' },
          include: {
            batch: {
              include: { court: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!player) return ApiResponse.error(res, 'Player not found', 404);

    const sessions: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = DAY_NAMES[date.getDay()];

      for (const assignment of player.assignments) {
        const batchDays = parseDays(assignment.batch.daysOfWeek);
        if (!batchDays.includes(dayName)) continue;
        sessions.push({
          date: date.toISOString().slice(0, 10),
          day: dayName,
          startTime: assignment.batch.startTime,
          endTime: assignment.batch.endTime,
          status: assignment.batch.status,
          batch: {
            id: assignment.batch.id,
            name: assignment.batch.name,
            maxPlayers: assignment.batch.maxPlayers,
            court: assignment.batch.court,
          },
        });
      }
    }

    sessions.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    return ApiResponse.success(res, 'Upcoming sessions retrieved', sessions);
  } catch (error: any) {
    logger.error('getUpcomingSessions error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch upcoming sessions', 500);
  }
};

export const exportPlayers = async (req: Request, res: Response) => {
  try {
    const where = buildPlayerWhere(req.query);

    const players = await prisma.regularPlayer.findMany({
      where,
      include: {
        assignments: {
          where: { status: 'active' },
          include: { batch: { select: { id: true, name: true, startTime: true, endTime: true } } },
        },
        feeInvoices: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Players exported successfully', players);
  } catch (error: any) {
    logger.error('exportPlayers error:', error.message);
    return ApiResponse.error(res, 'Failed to export players', 500);
  }
};

export const deletePlayer = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const player = await prisma.$transaction([
      prisma.regularPlayer.update({ where: { id }, data: { status: 'cancelled' } }),
      prisma.regularPlayerAssignment.updateMany({
        where: { playerId: id, status: 'active' },
        data: { status: 'inactive', leavingDate: new Date() },
      }),
    ]);

    return ApiResponse.success(res, 'Player deleted successfully', player[0]);
  } catch (error: any) {
    logger.error('deletePlayer error:', error.message);
    return ApiResponse.error(res, 'Failed to delete player', 500);
  }
};

export const updatePhoto = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid player id', 400);

    const file = (req as any).file;
    if (!file) return ApiResponse.error(res, 'No photo uploaded', 400);

    const existing = await prisma.regularPlayer.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Player not found', 404);

    const photoPath = `/uploads/profiles/${file.filename}`;
    const player = await prisma.regularPlayer.update({ where: { id }, data: { photo: photoPath } });
    return ApiResponse.success(res, 'Profile photo updated successfully', player);
  } catch (error: any) {
    logger.error('updatePhoto error:', error.message);
    return ApiResponse.error(res, 'Failed to update profile photo', 500);
  }
};