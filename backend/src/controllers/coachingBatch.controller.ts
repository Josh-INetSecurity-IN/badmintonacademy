import { Request, Response } from 'express';
import { PrismaClient, Prisma, CoachingBatch } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function hasDayOverlap(days1: string[], days2: string[]): boolean {
  if (!days1.length || !days2.length) return false;
  return days1.some((day) => days2.includes(day));
}

export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map((part) => parseInt(part, 10));
    return (h || 0) * 60 + (m || 0);
  };
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return false;
  return s1 < e2 && s2 < e1;
}

function parseDays(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseDecimal(value: any): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0);
}

function parseDate(value: any): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export const checkConflicts = async (
  courtId: number,
  daysOfWeek: string[],
  startTime: string,
  endTime: string,
  excludeBatchId?: number
): Promise<{ id: number; name: string; daysOfWeek: string; startTime: string; endTime: string }[]> => {
  if (!courtId || !daysOfWeek.length || !startTime || !endTime) return [];

  const batches = await prisma.coachingBatch.findMany({
    where: {
      courtId,
      status: { in: ['active', 'full'] },
      ...(excludeBatchId ? { id: { not: excludeBatchId } } : {}),
    },
    select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true },
  });

  return batches.filter((batch) => {
    const batchDays = parseDays(batch.daysOfWeek);
    return (
      hasDayOverlap(batchDays, daysOfWeek) &&
      hasTimeOverlap(batch.startTime, batch.endTime, startTime, endTime)
    );
  });
};

export const getBatches = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: Prisma.CoachingBatchWhereInput = {};
    if (status) where.status = status as string;
    if (search) where.name = { contains: search as string };

    const [batches, total] = await Promise.all([
      prisma.coachingBatch.findMany({
        where,
        include: {
          coach: { select: { id: true, firstName: true, lastName: true } },
          court: { select: { id: true, name: true } },
          _count: { select: { students: { where: { status: 'active' } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coachingBatch.count({ where }),
    ]);

    const data = batches.map((batch) => ({ ...batch, daysOfWeek: parseDays(batch.daysOfWeek) }));
    return ApiResponse.paginated(res, data, total, page, limit);
  } catch (error: any) {
    logger.error('getBatches error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch batches', 500);
  }
};

export const getBatch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid batch id', 400);

    const batch = await prisma.coachingBatch.findUnique({
      where: { id },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        court: { select: { id: true, name: true, location: true } },
        students: {
          where: { status: 'active' },
          orderBy: { joiningDate: 'asc' },
          include: { student: true },
        },
      },
    });

    if (!batch) return ApiResponse.error(res, 'Batch not found', 404);
    return ApiResponse.success(res, 'Batch retrieved', { ...batch, daysOfWeek: parseDays(batch.daysOfWeek) });
  } catch (error: any) {
    logger.error('getBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch batch', 500);
  }
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.name) return ApiResponse.error(res, 'name is required', 400);
    if (body.monthlyFee === undefined || body.monthlyFee === null || body.monthlyFee === '') {
      return ApiResponse.error(res, 'monthlyFee is required', 400);
    }
    if (!body.startDate) return ApiResponse.error(res, 'startDate is required', 400);
    if (!body.startTime || !body.endTime) {
      return ApiResponse.error(res, 'startTime and endTime are required', 400);
    }

    const days = parseDays(body.daysOfWeek);
    if (!days.length) return ApiResponse.error(res, 'daysOfWeek must contain at least one day', 400);

    const courtId = body.courtId ? parseInt(body.courtId) : null;
    if (courtId) {
      const conflicts = await checkConflicts(courtId, days, body.startTime, body.endTime);
      if (conflicts.length) {
        const names = conflicts.map((c) => c.name).join(', ');
        return ApiResponse.error(res, `Court is already booked by batch: ${names}`, 409);
      }
    }

    const batch = await prisma.coachingBatch.create({
      data: {
        name: body.name,
        programType: body.programType || 'beginners',
        skillLevel: body.skillLevel || 'beginner',
        ageGroup: body.ageGroup || undefined,
        coachId: body.coachId ? parseInt(body.coachId) : undefined,
        courtId: courtId || undefined,
        maxCapacity: body.maxCapacity ? parseInt(body.maxCapacity) : 20,
        daysOfWeek: JSON.stringify(days),
        startTime: body.startTime,
        endTime: body.endTime,
        startDate: parseDate(body.startDate) || new Date(),
        endDate: parseDate(body.endDate),
        monthlyFee: parseDecimal(body.monthlyFee),
        registrationFee: parseDecimal(body.registrationFee),
        description: body.description || undefined,
        color: body.color || '#3B82F6',
        status: body.status || 'active',
      },
    });

    return ApiResponse.created(res, 'Batch created successfully', batch);
  } catch (error: any) {
    logger.error('createBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to create batch', 500);
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid batch id', 400);

    const existing = await prisma.coachingBatch.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Batch not found', 404);

    const body = req.body;
    const days = body.daysOfWeek !== undefined ? parseDays(body.daysOfWeek) : parseDays(existing.daysOfWeek);

    const courtId = body.courtId !== undefined ? (body.courtId ? parseInt(body.courtId) : null) : existing.courtId;
    if (courtId) {
      const conflicts = await checkConflicts(
        courtId,
        days,
        body.startTime ?? existing.startTime,
        body.endTime ?? existing.endTime,
        id
      );
      if (conflicts.length) {
        const names = conflicts.map((c) => c.name).join(', ');
        return ApiResponse.error(res, `Court is already booked by batch: ${names}`, 409);
      }
    }

    const data: Prisma.CoachingBatchUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.programType !== undefined) data.programType = body.programType;
    if (body.skillLevel !== undefined) data.skillLevel = body.skillLevel;
    if (body.ageGroup !== undefined) data.ageGroup = body.ageGroup;
    if (body.coachId !== undefined) {
      data.coach = body.coachId ? { connect: { id: parseInt(body.coachId) } } : { disconnect: true };
    }
    if (body.courtId !== undefined) {
      data.court = body.courtId ? { connect: { id: parseInt(body.courtId) } } : { disconnect: true };
    }
    if (body.maxCapacity !== undefined) data.maxCapacity = parseInt(body.maxCapacity);
    if (body.daysOfWeek !== undefined) data.daysOfWeek = JSON.stringify(days);
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.startDate !== undefined) {
      const parsed = parseDate(body.startDate);
      if (parsed) data.startDate = parsed;
    }
    if (body.endDate !== undefined) {
      const parsed = parseDate(body.endDate);
      data.endDate = parsed ?? null;
    }
    if (body.monthlyFee !== undefined) data.monthlyFee = parseDecimal(body.monthlyFee);
    if (body.registrationFee !== undefined) data.registrationFee = parseDecimal(body.registrationFee);
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.color = body.color;
    if (body.status !== undefined) data.status = body.status;

    const batch = await prisma.coachingBatch.update({ where: { id }, data });
    return ApiResponse.success(res, 'Batch updated successfully', batch);
  } catch (error: any) {
    logger.error('updateBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to update batch', 500);
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid batch id', 400);

    const existing = await prisma.coachingBatch.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Batch not found', 404);

    await prisma.coachingBatch.update({ where: { id }, data: { status: 'inactive' } });
    return ApiResponse.success(res, 'Batch archived successfully');
  } catch (error: any) {
    logger.error('deleteBatch error:', error.message);
    return ApiResponse.error(res, 'Failed to delete batch', 500);
  }
};

export const assignStudents = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { studentIds } = req.body;
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid batch id', 400);

    const batch = await prisma.coachingBatch.findUnique({ where: { id } });
    if (!batch) return ApiResponse.error(res, 'Batch not found', 404);

    if (!Array.isArray(studentIds) || !studentIds.length) {
      return ApiResponse.error(res, 'studentIds array is required', 400);
    }
    const ids = Array.from(new Set(studentIds.map((s) => parseInt(s)).filter((s) => !isNaN(s))));
    if (!ids.length) return ApiResponse.error(res, 'Invalid studentIds', 400);

    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const validIds = students.map((s) => s.id);
    if (!validIds.length) return ApiResponse.error(res, 'No valid students found', 400);

    const activeCount = await prisma.batchStudent.count({ where: { batchId: id, status: 'active' } });
    const alreadyActive = await prisma.batchStudent.count({
      where: { batchId: id, status: 'active', studentId: { in: validIds } },
    });
    const newStudents = validIds.length - alreadyActive;
    if (activeCount + newStudents > batch.maxCapacity) {
      return ApiResponse.error(res, 'Adding these students would exceed batch capacity', 400);
    }

    const data = validIds.map((studentId) => ({
      batchId: id,
      studentId,
      status: 'active' as const,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.batchStudent.updateMany({
        where: { batchId: id, studentId: { in: validIds }, status: 'inactive' },
        data: { status: 'active', leavingDate: null },
      });
      return tx.batchStudent.createMany({ data, skipDuplicates: true });
    });

    const newActiveCount = activeCount + newStudents;
    if (newActiveCount >= batch.maxCapacity && batch.status === 'active') {
      await prisma.coachingBatch.update({ where: { id }, data: { status: 'full' } });
    }

    return ApiResponse.created(res, `${newStudents} students assigned to batch successfully`, { count: newStudents });
  } catch (error: any) {
    logger.error('assignStudents error:', error.message);
    return ApiResponse.error(res, 'Failed to assign students to batch', 500);
  }
};

export const removeStudent = async (req: Request, res: Response) => {
  try {
    const batchId = parseInt(req.params.id);
    const studentId = parseInt(req.params.studentId);
    if (isNaN(batchId) || isNaN(studentId)) {
      return ApiResponse.error(res, 'Invalid batch id or student id', 400);
    }

    const existing = await prisma.batchStudent.findUnique({
      where: { batchId_studentId: { batchId, studentId } },
    });
    if (!existing) return ApiResponse.error(res, 'Student is not assigned to this batch', 404);

    const updated = await prisma.batchStudent.update({
      where: { batchId_studentId: { batchId, studentId } },
      data: { status: 'inactive', leavingDate: new Date() },
    });

    await prisma.coachingBatch.updateMany({
      where: { id: batchId, status: 'full' },
      data: { status: 'active' },
    });

    return ApiResponse.success(res, 'Student removed from batch successfully', updated);
  } catch (error: any) {
    logger.error('removeStudent error:', error.message);
    return ApiResponse.error(res, 'Failed to remove student from batch', 500);
  }
};

export const getBatchRoster = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid batch id', 400);

    const batch = await prisma.coachingBatch.findUnique({
      where: { id },
      include: {
        students: {
          where: { status: 'active' },
          orderBy: { joiningDate: 'asc' },
          include: {
            student: {
              select: {
                id: true,
                admissionNumber: true,
                firstName: true,
                lastName: true,
                photo: true,
                phone: true,
                parentPhone: true,
                email: true,
                skillLevel: true,
                status: true,
                monthlyFee: true,
                feeInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!batch) return ApiResponse.error(res, 'Batch not found', 404);

    const roster = batch.students.map((bs) => {
      const latestInvoice = bs.student.feeInvoices[0];
      const paymentStatus = !latestInvoice
        ? 'no_invoice'
        : latestInvoice.status === 'paid'
          ? 'paid'
          : latestInvoice.status;

      return {
        batchStudentId: bs.id,
        studentId: bs.student.id,
        admissionNumber: bs.student.admissionNumber,
        firstName: bs.student.firstName,
        lastName: bs.student.lastName,
        photo: bs.student.photo,
        phone: bs.student.phone,
        parentPhone: bs.student.parentPhone,
        email: bs.student.email,
        skillLevel: bs.student.skillLevel,
        monthlyFee: bs.student.monthlyFee,
        joiningDate: bs.joiningDate,
        paymentStatus,
        latestInvoice: latestInvoice
          ? {
              id: latestInvoice.id,
              invoiceNumber: latestInvoice.invoiceNumber,
              billingMonth: latestInvoice.billingMonth,
              amount: latestInvoice.amount,
              paidAmount: latestInvoice.paidAmount,
              totalAmount: latestInvoice.totalAmount,
              dueDate: latestInvoice.dueDate,
              status: latestInvoice.status,
            }
          : null,
      };
    });

    return ApiResponse.success(res, 'Batch roster retrieved', {
      batch: {
        id: batch.id,
        name: batch.name,
        maxCapacity: batch.maxCapacity,
        currentStudents: roster.length,
      },
      roster,
    });
  } catch (error: any) {
    logger.error('getBatchRoster error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch batch roster', 500);
  }
};

export const getBatchCalendar = async (req: Request, res: Response) => {
  try {
    const batches = await prisma.coachingBatch.findMany({
      where: { status: { in: ['active', 'full'] } },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true } },
        court: { select: { id: true, name: true } },
        _count: { select: { students: { where: { status: 'active' } } } },
      },
      orderBy: { startTime: 'asc' },
    });

    const calendar: Record<string, any[]> = {};
    for (const day of DAYS) calendar[day] = [];

    for (const batch of batches) {
      const days = parseDays(batch.daysOfWeek);
      for (const day of days) {
        calendar[day].push({
          id: batch.id,
          name: batch.name,
          programType: batch.programType,
          skillLevel: batch.skillLevel,
          ageGroup: batch.ageGroup,
          startTime: batch.startTime,
          endTime: batch.endTime,
          coach: batch.coach,
          court: batch.court,
          color: batch.color,
          status: batch.status,
          maxCapacity: batch.maxCapacity,
          currentStudents: batch._count.students,
        });
      }
    }

    return ApiResponse.success(res, 'Batch calendar retrieved', calendar);
  } catch (error: any) {
    logger.error('getBatchCalendar error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch batch calendar', 500);
  }
};