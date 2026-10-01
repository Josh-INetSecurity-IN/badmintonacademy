"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePlayer = exports.assignPlayers = exports.getWeeklySchedule = exports.deleteBatch = exports.updateBatch = exports.createBatch = exports.getBatch = exports.getBatches = exports.checkConflicts = void 0;
exports.hasDayOverlap = hasDayOverlap;
exports.hasTimeOverlap = hasTimeOverlap;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function hasDayOverlap(days1, days2) {
    if (!days1.length || !days2.length)
        return false;
    return days1.some((day) => days2.includes(day));
}
function hasTimeOverlap(start1, end1, start2, end2) {
    const toMinutes = (time) => {
        const [h, m] = time.split(':').map((part) => parseInt(part, 10));
        return (h || 0) * 60 + (m || 0);
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2))
        return false;
    return s1 < e2 && s2 < e1;
}
function parseDays(raw) {
    if (Array.isArray(raw))
        return raw.map(String);
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    catch {
        return [];
    }
}
function parseDecimal(value) {
    return new client_1.Prisma.Decimal(value ?? 0);
}
function parseDate(value) {
    if (!value)
        return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
}
const checkConflicts = async (courtId, daysOfWeek, startTime, endTime, excludeBatchId) => {
    if (!courtId || !daysOfWeek.length || !startTime || !endTime)
        return [];
    const batches = await prisma.regularBatch.findMany({
        where: {
            courtId,
            status: { in: ['active', 'full'] },
            ...(excludeBatchId ? { id: { not: excludeBatchId } } : {}),
        },
        select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true },
    });
    return batches.filter((batch) => {
        const batchDays = parseDays(batch.daysOfWeek);
        return (hasDayOverlap(batchDays, daysOfWeek) &&
            hasTimeOverlap(batch.startTime, batch.endTime, startTime, endTime));
    });
};
exports.checkConflicts = checkConflicts;
const getBatches = async (req, res) => {
    try {
        const { status, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (search)
            where.name = { contains: search };
        const [batches, total] = await Promise.all([
            prisma.regularBatch.findMany({
                where,
                include: {
                    court: { select: { id: true, name: true, location: true } },
                    _count: { select: { players: { where: { status: 'active' } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.regularBatch.count({ where }),
        ]);
        const data = batches.map((batch) => ({ ...batch, daysOfWeek: parseDays(batch.daysOfWeek) }));
        return apiResponse_1.ApiResponse.paginated(res, data, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getBatches error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch batches', 500);
    }
};
exports.getBatches = getBatches;
const getBatch = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id', 400);
        const batch = await prisma.regularBatch.findUnique({
            where: { id },
            include: {
                court: { select: { id: true, name: true, location: true, hourlyRate: true } },
                players: {
                    orderBy: { joiningDate: 'asc' },
                    include: {
                        player: {
                            select: {
                                id: true,
                                playerId: true,
                                firstName: true,
                                lastName: true,
                                phone: true,
                                whatsappNumber: true,
                                email: true,
                                photo: true,
                                status: true,
                                monthlyFee: true,
                                joiningDate: true,
                            },
                        },
                    },
                },
            },
        });
        if (!batch)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        return apiResponse_1.ApiResponse.success(res, 'Batch retrieved', { ...batch, daysOfWeek: parseDays(batch.daysOfWeek) });
    }
    catch (error) {
        logger_1.logger.error('getBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch batch', 500);
    }
};
exports.getBatch = getBatch;
const createBatch = async (req, res) => {
    try {
        const body = req.body;
        if (!body.name)
            return apiResponse_1.ApiResponse.error(res, 'name is required', 400);
        if (body.monthlyPrice === undefined || body.monthlyPrice === null || body.monthlyPrice === '') {
            return apiResponse_1.ApiResponse.error(res, 'monthlyPrice is required', 400);
        }
        if (!body.startDate)
            return apiResponse_1.ApiResponse.error(res, 'startDate is required', 400);
        if (!body.startTime || !body.endTime) {
            return apiResponse_1.ApiResponse.error(res, 'startTime and endTime are required', 400);
        }
        const days = parseDays(body.daysOfWeek);
        if (!days.length)
            return apiResponse_1.ApiResponse.error(res, 'daysOfWeek must contain at least one day', 400);
        const courtId = body.courtId ? parseInt(body.courtId) : null;
        if (courtId) {
            const conflicts = await (0, exports.checkConflicts)(courtId, days, body.startTime, body.endTime);
            if (conflicts.length) {
                const names = conflicts.map((c) => c.name).join(', ');
                return apiResponse_1.ApiResponse.error(res, `Court is already booked by batch: ${names}`, 409);
            }
        }
        const batch = await prisma.regularBatch.create({
            data: {
                name: body.name,
                courtId: courtId || undefined,
                daysOfWeek: JSON.stringify(days),
                startTime: body.startTime,
                endTime: body.endTime,
                maxPlayers: body.maxPlayers ? parseInt(body.maxPlayers) : 8,
                monthlyPrice: parseDecimal(body.monthlyPrice),
                startDate: parseDate(body.startDate) || new Date(),
                status: body.status || 'active',
                notes: body.notes || undefined,
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Batch created successfully', batch);
    }
    catch (error) {
        logger_1.logger.error('createBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create batch', 500);
    }
};
exports.createBatch = createBatch;
const updateBatch = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id', 400);
        const existing = await prisma.regularBatch.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        const body = req.body;
        const days = body.daysOfWeek !== undefined ? parseDays(body.daysOfWeek) : parseDays(existing.daysOfWeek);
        const courtId = body.courtId !== undefined ? (body.courtId ? parseInt(body.courtId) : null) : existing.courtId;
        if (courtId) {
            const conflicts = await (0, exports.checkConflicts)(courtId, days, body.startTime ?? existing.startTime, body.endTime ?? existing.endTime, id);
            if (conflicts.length) {
                const names = conflicts.map((c) => c.name).join(', ');
                return apiResponse_1.ApiResponse.error(res, `Court is already booked by batch: ${names}`, 409);
            }
        }
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.courtId !== undefined) {
            data.court = body.courtId ? { connect: { id: parseInt(body.courtId) } } : { disconnect: true };
        }
        if (body.daysOfWeek !== undefined)
            data.daysOfWeek = JSON.stringify(days);
        if (body.startTime !== undefined)
            data.startTime = body.startTime;
        if (body.endTime !== undefined)
            data.endTime = body.endTime;
        if (body.maxPlayers !== undefined)
            data.maxPlayers = parseInt(body.maxPlayers);
        if (body.monthlyPrice !== undefined)
            data.monthlyPrice = parseDecimal(body.monthlyPrice);
        if (body.startDate !== undefined) {
            const parsed = parseDate(body.startDate);
            if (parsed)
                data.startDate = parsed;
        }
        if (body.status !== undefined)
            data.status = body.status;
        if (body.notes !== undefined)
            data.notes = body.notes;
        const batch = await prisma.regularBatch.update({ where: { id }, data });
        return apiResponse_1.ApiResponse.success(res, 'Batch updated successfully', batch);
    }
    catch (error) {
        logger_1.logger.error('updateBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update batch', 500);
    }
};
exports.updateBatch = updateBatch;
const deleteBatch = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id', 400);
        const existing = await prisma.regularBatch.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        await prisma.$transaction([
            prisma.regularBatch.update({ where: { id }, data: { status: 'inactive' } }),
            prisma.regularPlayerAssignment.updateMany({
                where: { batchId: id, status: 'active' },
                data: { status: 'inactive', leavingDate: new Date() },
            }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Batch deleted successfully');
    }
    catch (error) {
        logger_1.logger.error('deleteBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete batch', 500);
    }
};
exports.deleteBatch = deleteBatch;
const getWeeklySchedule = async (req, res) => {
    try {
        const batches = await prisma.regularBatch.findMany({
            where: { status: { in: ['active', 'full'] } },
            include: {
                court: { select: { id: true, name: true } },
                _count: { select: { players: { where: { status: 'active' } } } },
            },
            orderBy: { startTime: 'asc' },
        });
        const schedule = {};
        for (const day of DAYS)
            schedule[day] = [];
        for (const batch of batches) {
            const days = parseDays(batch.daysOfWeek);
            const playerCount = batch._count.players;
            const monthlyPrice = parseFloat(batch.monthlyPrice.toString());
            const revenue = Math.round(playerCount * monthlyPrice * 100) / 100;
            for (const day of days) {
                schedule[day].push({
                    id: batch.id,
                    name: batch.name,
                    startTime: batch.startTime,
                    endTime: batch.endTime,
                    court: batch.court,
                    status: batch.status,
                    maxPlayers: batch.maxPlayers,
                    playerCount,
                    capacity: batch.maxPlayers,
                    revenue,
                });
            }
        }
        return apiResponse_1.ApiResponse.success(res, 'Weekly schedule retrieved', schedule);
    }
    catch (error) {
        logger_1.logger.error('getWeeklySchedule error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch weekly schedule', 500);
    }
};
exports.getWeeklySchedule = getWeeklySchedule;
const assignPlayers = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { playerIds } = req.body;
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id', 400);
        const batch = await prisma.regularBatch.findUnique({ where: { id } });
        if (!batch)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        if (!Array.isArray(playerIds) || !playerIds.length) {
            return apiResponse_1.ApiResponse.error(res, 'playerIds array is required', 400);
        }
        const ids = Array.from(new Set(playerIds.map((p) => parseInt(p)).filter((p) => !isNaN(p))));
        if (!ids.length)
            return apiResponse_1.ApiResponse.error(res, 'Invalid playerIds', 400);
        const players = await prisma.regularPlayer.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });
        const validIds = players.map((p) => p.id);
        if (!validIds.length)
            return apiResponse_1.ApiResponse.error(res, 'No valid players found', 400);
        const activeCount = await prisma.regularPlayerAssignment.count({
            where: { batchId: id, status: 'active' },
        });
        const alreadyActive = await prisma.regularPlayerAssignment.count({
            where: { batchId: id, status: 'active', playerId: { in: validIds } },
        });
        const newPlayers = validIds.length - alreadyActive;
        if (activeCount + newPlayers > batch.maxPlayers) {
            return apiResponse_1.ApiResponse.error(res, 'Adding these players would exceed batch capacity', 400);
        }
        const data = validIds.map((playerId) => ({ batchId: id, playerId, status: 'active' }));
        await prisma.$transaction(async (tx) => {
            await tx.regularPlayerAssignment.updateMany({
                where: { batchId: id, playerId: { in: validIds }, status: 'inactive' },
                data: { status: 'active', leavingDate: null },
            });
            return tx.regularPlayerAssignment.createMany({ data, skipDuplicates: true });
        });
        const newActiveCount = activeCount + newPlayers;
        if (newActiveCount >= batch.maxPlayers && batch.status === 'active') {
            await prisma.regularBatch.update({ where: { id }, data: { status: 'full' } });
        }
        return apiResponse_1.ApiResponse.created(res, `${newPlayers} players assigned to batch successfully`, { count: newPlayers });
    }
    catch (error) {
        logger_1.logger.error('assignPlayers error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to assign players to batch', 500);
    }
};
exports.assignPlayers = assignPlayers;
const removePlayer = async (req, res) => {
    try {
        const batchId = parseInt(req.params.id);
        const playerId = parseInt(req.params.playerId);
        if (isNaN(batchId) || isNaN(playerId)) {
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id or player id', 400);
        }
        const existing = await prisma.regularPlayerAssignment.findUnique({
            where: { playerId_batchId: { playerId, batchId } },
        });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player is not assigned to this batch', 404);
        const updated = await prisma.regularPlayerAssignment.update({
            where: { playerId_batchId: { playerId, batchId } },
            data: { status: 'inactive', leavingDate: new Date() },
        });
        await prisma.regularBatch.updateMany({
            where: { id: batchId, status: 'full' },
            data: { status: 'active' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Player removed from batch successfully', updated);
    }
    catch (error) {
        logger_1.logger.error('removePlayer error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to remove player from batch', 500);
    }
};
exports.removePlayer = removePlayer;
//# sourceMappingURL=regularBatch.controller.js.map