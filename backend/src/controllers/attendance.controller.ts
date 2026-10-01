import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';

const prisma = new PrismaClient();

const VALID_STATUSES = ['present', 'absent', 'late', 'leave', 'holiday', 'cancelled'];

const toDateOnly = (d: Date | string) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const monthRange = (month: string): { gte: Date; lt: Date } => {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);
  return { gte: start, lt: end };
};

async function upsertStudentAttendance(
  date: Date,
  studentId: number,
  batchId: number | null,
  status: string,
  notes: string | null,
  markedBy: number | null
) {
  const existing = await prisma.attendance.findFirst({
    where: {
      date,
      studentId,
      batchId: batchId ?? null,
    },
  });

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { status, notes, markedBy },
    });
  }

  return prisma.attendance.create({
    data: { date, studentId, batchId, status, notes, markedBy },
  });
}

async function upsertPlayerAttendance(
  date: Date,
  regularPlayerId: number,
  status: string,
  notes: string | null,
  markedBy: number | null
) {
  const existing = await prisma.attendance.findFirst({
    where: { date, regularPlayerId },
  });

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { status, notes, markedBy },
    });
  }

  return prisma.attendance.create({
    data: { date, regularPlayerId, status, notes, markedBy },
  });
}

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      date,
      batchId,
      studentId,
      regularPlayerId,
      status,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (date) where.date = toDateOnly(String(date));
    if (batchId) where.batchId = Number(batchId);
    if (studentId) where.studentId = Number(studentId);
    if (regularPlayerId) where.regularPlayerId = Number(regularPlayerId);
    if (status) where.status = String(status);

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          regularPlayer: { select: { id: true, firstName: true, lastName: true, playerId: true } },
          batch: { select: { id: true, name: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return ApiResponse.paginated(res, records, total, Number(page), take);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch attendance', 500, error.message);
  }
};

export const getTodayBatchAttendance = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { date } = req.query;

    const today = date ? toDateOnly(String(date)) : toDateOnly(new Date());

    const batch = await prisma.coachingBatch.findUnique({
      where: { id: Number(batchId) },
      include: {
        students: {
          where: { status: 'active' },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNumber: true, photo: true },
            },
          },
          orderBy: {
            student: { firstName: 'asc' },
          },
        },
      },
    });

    if (!batch) {
      return ApiResponse.error(res, 'Batch not found', 404);
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: today,
        batchId: Number(batchId),
      },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((a) => [a.studentId, a])
    );

    const students = batch.students.map((bs) => ({
      student: bs.student,
      attendance: attendanceMap.get(bs.studentId) || null,
    }));

    return ApiResponse.success(res, 'Batch attendance retrieved successfully', {
      batch: { id: batch.id, name: batch.name },
      date: today,
      students,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch batch attendance', 500, error.message);
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { date, records } = req.body;

    if (!date || !records || !Array.isArray(records) || records.length === 0) {
      return ApiResponse.error(res, 'Date and records are required', 400);
    }

    const attendanceDate = toDateOnly(date);
    const markedBy = req.user?.id ?? null;
    const results: any[] = [];

    for (const record of records) {
      const { studentId, regularPlayerId, batchId, status, notes } = record;

      if (!status || !VALID_STATUSES.includes(status)) {
        return ApiResponse.error(res, `Invalid status: ${status}`, 400);
      }

      if (!studentId && !regularPlayerId) {
        return ApiResponse.error(res, 'Each record must have a studentId or regularPlayerId', 400);
      }

      if (regularPlayerId) {
        const result = await upsertPlayerAttendance(
          attendanceDate,
          Number(regularPlayerId),
          status,
          notes || null,
          markedBy
        );
        results.push(result);
        continue;
      }

      const result = await upsertStudentAttendance(
        attendanceDate,
        Number(studentId),
        batchId ? Number(batchId) : null,
        status,
        notes || null,
        markedBy
      );
      results.push(result);
    }

    return ApiResponse.success(res, 'Attendance marked successfully', results);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to mark attendance', 500, error.message);
  }
};

export const markBulkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { date, batchId, studentIds, status } = req.body;

    if (!date || !batchId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return ApiResponse.error(res, 'Date, batchId, and studentIds are required', 400);
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return ApiResponse.error(res, `Invalid status: ${status}`, 400);
    }

    const attendanceDate = toDateOnly(date);
    const markedBy = req.user?.id ?? null;
    const results: any[] = [];

    const batch = await prisma.coachingBatch.findUnique({ where: { id: Number(batchId) } });
    if (!batch) {
      return ApiResponse.error(res, 'Batch not found', 404);
    }

    for (const rawStudentId of studentIds) {
      const studentId = Number(rawStudentId);

      const enrollment = await prisma.batchStudent.findUnique({
        where: {
          batchId_studentId: {
            batchId: Number(batchId),
            studentId,
          },
        },
      });

      if (!enrollment) {
        continue;
      }

      const result = await upsertStudentAttendance(
        attendanceDate,
        studentId,
        Number(batchId),
        status,
        `Bulk marked: ${status}`,
        markedBy
      );
      results.push(result);
    }

    return ApiResponse.success(res, 'Bulk attendance marked successfully', {
      marked: results.length,
      records: results,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to mark bulk attendance', 500, error.message);
  }
};

export const getStudentAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { month } = req.query;

    if (!month) {
      return ApiResponse.error(res, 'Month (YYYY-MM) is required', 400);
    }

    const { gte, lt } = monthRange(String(month));

    const records = await prisma.attendance.findMany({
      where: {
        studentId: Number(studentId),
        date: { gte, lt },
      },
      orderBy: { date: 'asc' },
      include: {
        batch: { select: { id: true, name: true } },
      },
    });

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      leave: records.filter((r) => r.status === 'leave').length,
      total: records.length,
    };

    return ApiResponse.success(res, 'Student attendance retrieved successfully', {
      studentId: Number(studentId),
      month: String(month),
      records,
      summary,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch student attendance', 500, error.message);
  }
};

export const getPlayerAttendance = async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { month } = req.query;

    if (!month) {
      return ApiResponse.error(res, 'Month (YYYY-MM) is required', 400);
    }

    const { gte, lt } = monthRange(String(month));

    const records = await prisma.attendance.findMany({
      where: {
        regularPlayerId: Number(playerId),
        date: { gte, lt },
      },
      orderBy: { date: 'asc' },
    });

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      leave: records.filter((r) => r.status === 'leave').length,
      total: records.length,
    };

    return ApiResponse.success(res, 'Player attendance retrieved successfully', {
      playerId: Number(playerId),
      month: String(month),
      records,
      summary,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch player attendance', 500, error.message);
  }
};

export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { from, to, batchId } = req.query;

    if (!from || !to) {
      return ApiResponse.error(res, 'From and to dates are required', 400);
    }

    const gte = toDateOnly(String(from));
    const lte = toDateOnly(String(to));
    lte.setDate(lte.getDate() + 1);

    const studentIds = new Set<number>();

    if (batchId) {
      const enrollments = await prisma.batchStudent.findMany({
        where: { batchId: Number(batchId), status: 'active' },
        select: { studentId: true },
      });
      enrollments.forEach((e) => studentIds.add(e.studentId));
    } else {
      const students = await prisma.student.findMany({
        where: { status: 'active' },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      });
      students.forEach((s) => studentIds.add(s.id));
    }

    const attendanceWhere: any = {
      date: { gte, lt: lte },
      studentId: { in: [...studentIds] },
    };

    if (batchId) {
      attendanceWhere.batchId = Number(batchId);
    }

    const records = await prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
      orderBy: [{ studentId: 'asc' }, { date: 'asc' }],
    });

    const studentMap: Record<number, any> = {};
    for (const studentId of studentIds) {
      const sample = records.find((r) => r.studentId === studentId)?.student;
      if (sample) {
        studentMap[studentId] = {
          studentId,
          firstName: sample.firstName,
          lastName: sample.lastName,
          admissionNumber: sample.admissionNumber,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        };
      } else {
        studentMap[studentId] = {
          studentId,
          firstName: 'Unknown',
          lastName: '',
          admissionNumber: '',
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        };
      }
    }

    for (const record of records) {
      if (record.studentId === null) continue;
      const entry = studentMap[record.studentId];
      if (!entry) continue;
      entry.total += 1;
      if (record.status === 'present') entry.present += 1;
      else if (record.status === 'absent') entry.absent += 1;
      else if (record.status === 'late') entry.late += 1;
      else if (record.status === 'leave') entry.leave += 1;
    }

    const students = Object.values(studentMap).map((s: any) => {
      const marked = s.present + s.absent + s.late + s.leave;
      return {
        ...s,
        presentPercentage: marked > 0 ? (s.present / marked) * 100 : 0,
        latePercentage: marked > 0 ? ((s.present + s.late) / marked) * 100 : 0,
        absentPercentage: marked > 0 ? (s.absent / marked) * 100 : 0,
      };
    });

    const totalRecords = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const leave = records.filter((r) => r.status === 'leave').length;

    const overall = {
      totalRecords,
      present,
      absent,
      late,
      leave,
      presentPercentage: totalRecords > 0 ? (present / totalRecords) * 100 : 0,
      absentPercentage: totalRecords > 0 ? (absent / totalRecords) * 100 : 0,
      latePercentage: totalRecords > 0 ? (late / totalRecords) * 100 : 0,
    };

    return ApiResponse.success(res, 'Attendance report generated successfully', {
      from: gte,
      to,
      studentCount: students.length,
      students,
      overall,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to generate attendance report', 500, error.message);
  }
};

export const getAttendanceOverview = async (req: Request, res: Response) => {
  try {
    const today = toDateOnly(new Date());

    const records = await prisma.attendance.findMany({
      where: { date: today },
    });

    const counts: Record<string, number> = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      holiday: 0,
      cancelled: 0,
    };

    for (const record of records) {
      if (counts[record.status] !== undefined) {
        counts[record.status] += 1;
      }
    }

    return ApiResponse.success(res, 'Attendance overview retrieved successfully', {
      date: today,
      ...counts,
      totalMarked: records.length,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch attendance overview', 500, error.message);
  }
};