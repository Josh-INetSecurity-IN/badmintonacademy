"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePhoto = exports.deletePlayer = exports.exportPlayers = exports.getUpcomingSessions = exports.getExpired = exports.renewSubscription = exports.resumeMembership = exports.pauseMembership = exports.removeFromBatch = exports.assignBatch = exports.updatePlayer = exports.createPlayer = exports.getPlayer = exports.getPlayers = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const generateId_1 = require("../utils/generateId");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCY_MONTHS = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
};
const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};
const parseDecimal = (value) => new client_1.Prisma.Decimal(value ?? 0);
const parseDate = (value) => {
    if (!value)
        return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
};
const parseDays = (raw) => {
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
};
const computeSubscriptionDates = (frequency, from = new Date()) => {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const months = FREQUENCY_MONTHS[frequency] ?? 1;
    const subscriptionEnd = addMonths(start, months);
    const nextPaymentDue = addMonths(start, 1);
    return { subscriptionStart: start, subscriptionEnd, nextPaymentDue };
};
const buildPlayerWhere = (query) => {
    const { search, status, paymentFrequency } = query;
    const where = {};
    if (search) {
        where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { playerId: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
        ];
    }
    if (status)
        where.status = status;
    if (paymentFrequency)
        where.paymentFrequency = paymentFrequency;
    return where;
};
const getPlayers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
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
        return apiResponse_1.ApiResponse.paginated(res, players, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getPlayers error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch players', 500);
    }
};
exports.getPlayers = getPlayers;
const getPlayer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
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
        if (!player)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        return apiResponse_1.ApiResponse.success(res, 'Player retrieved', player);
    }
    catch (error) {
        logger_1.logger.error('getPlayer error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch player', 500);
    }
};
exports.getPlayer = getPlayer;
const createPlayer = async (req, res) => {
    try {
        const body = req.body;
        if (!body.firstName || !body.lastName) {
            return apiResponse_1.ApiResponse.error(res, 'firstName and lastName are required', 400);
        }
        if (!body.phone) {
            return apiResponse_1.ApiResponse.error(res, 'phone is required', 400);
        }
        if (body.monthlyFee === undefined || body.monthlyFee === null || body.monthlyFee === '') {
            return apiResponse_1.ApiResponse.error(res, 'monthlyFee is required', 400);
        }
        let playerId = (0, generateId_1.generatePlayerId)();
        let exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
        for (let attempt = 0; attempt < 3 && exists; attempt++) {
            playerId = (0, generateId_1.generatePlayerId)();
            exists = await prisma.regularPlayer.findUnique({ where: { playerId } });
        }
        if (exists) {
            return apiResponse_1.ApiResponse.error(res, 'Failed to generate a unique player id, please retry', 500);
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
        return apiResponse_1.ApiResponse.created(res, 'Player created successfully', player);
    }
    catch (error) {
        logger_1.logger.error('createPlayer error:', error.message);
        if (error.code === 'P2002') {
            return apiResponse_1.ApiResponse.error(res, 'A player with this player id already exists', 409);
        }
        return apiResponse_1.ApiResponse.error(res, 'Failed to create player', 500);
    }
};
exports.createPlayer = createPlayer;
const updatePlayer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const body = req.body;
        const data = {};
        if (body.firstName !== undefined)
            data.firstName = body.firstName;
        if (body.lastName !== undefined)
            data.lastName = body.lastName;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.whatsappNumber !== undefined)
            data.whatsappNumber = body.whatsappNumber;
        if (body.email !== undefined)
            data.email = body.email;
        if (body.address !== undefined)
            data.address = body.address;
        if (body.emergencyContact !== undefined)
            data.emergencyContact = body.emergencyContact;
        if (body.joiningDate !== undefined) {
            const parsed = parseDate(body.joiningDate);
            if (parsed)
                data.joiningDate = parsed;
        }
        if (body.monthlyFee !== undefined)
            data.monthlyFee = parseDecimal(body.monthlyFee);
        if (body.securityDeposit !== undefined)
            data.securityDeposit = parseDecimal(body.securityDeposit);
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
        if (body.status !== undefined)
            data.status = body.status;
        if (body.notes !== undefined)
            data.notes = body.notes;
        const player = await prisma.regularPlayer.update({ where: { id }, data });
        return apiResponse_1.ApiResponse.success(res, 'Player updated successfully', player);
    }
    catch (error) {
        logger_1.logger.error('updatePlayer error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update player', 500);
    }
};
exports.updatePlayer = updatePlayer;
const assignBatch = async (req, res) => {
    try {
        const playerId = parseInt(req.params.id);
        const batchId = parseInt(req.body.batchId);
        if (isNaN(playerId) || isNaN(batchId)) {
            return apiResponse_1.ApiResponse.error(res, 'Valid player id and batchId are required', 400);
        }
        const player = await prisma.regularPlayer.findUnique({ where: { id: playerId } });
        if (!player)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const batch = await prisma.regularBatch.findUnique({
            where: { id: batchId },
            include: { _count: { select: { players: { where: { status: 'active' } } } } },
        });
        if (!batch)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        const existing = await prisma.regularPlayerAssignment.findUnique({
            where: { playerId_batchId: { playerId, batchId } },
        });
        if (existing && existing.status === 'active') {
            return apiResponse_1.ApiResponse.success(res, 'Player is already assigned to this batch', existing);
        }
        if (batch._count.players >= batch.maxPlayers) {
            return apiResponse_1.ApiResponse.error(res, 'Batch is at full capacity', 400);
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
        return apiResponse_1.ApiResponse.success(res, 'Player assigned to batch successfully', assignment);
    }
    catch (error) {
        logger_1.logger.error('assignBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to assign player to batch', 500);
    }
};
exports.assignBatch = assignBatch;
const removeFromBatch = async (req, res) => {
    try {
        const playerId = parseInt(req.params.id);
        const batchId = parseInt(req.body.batchId);
        if (isNaN(playerId) || isNaN(batchId)) {
            return apiResponse_1.ApiResponse.error(res, 'Valid player id and batchId are required', 400);
        }
        const result = await prisma.regularPlayerAssignment.updateMany({
            where: { playerId, batchId, status: 'active' },
            data: { status: 'inactive', leavingDate: new Date() },
        });
        if (result.count === 0) {
            return apiResponse_1.ApiResponse.error(res, 'Player is not actively assigned to this batch', 404);
        }
        await prisma.regularBatch.updateMany({
            where: { id: batchId, status: 'full' },
            data: { status: 'active' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Player removed from batch successfully');
    }
    catch (error) {
        logger_1.logger.error('removeFromBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to remove player from batch', 500);
    }
};
exports.removeFromBatch = removeFromBatch;
const pauseMembership = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const player = await prisma.regularPlayer.update({ where: { id }, data: { status: 'paused' } });
        return apiResponse_1.ApiResponse.success(res, 'Membership paused successfully', player);
    }
    catch (error) {
        logger_1.logger.error('pauseMembership error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to pause membership', 500);
    }
};
exports.pauseMembership = pauseMembership;
const resumeMembership = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
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
        return apiResponse_1.ApiResponse.success(res, 'Membership resumed successfully', player);
    }
    catch (error) {
        logger_1.logger.error('resumeMembership error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to resume membership', 500);
    }
};
exports.resumeMembership = resumeMembership;
const renewSubscription = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
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
        return apiResponse_1.ApiResponse.success(res, 'Subscription renewed successfully', player);
    }
    catch (error) {
        logger_1.logger.error('renewSubscription error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to renew subscription', 500);
    }
};
exports.renewSubscription = renewSubscription;
const getExpired = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const where = {
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
        return apiResponse_1.ApiResponse.paginated(res, players, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getExpired error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch expired players', 500);
    }
};
exports.getExpired = getExpired;
const getUpcomingSessions = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
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
        if (!player)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const sessions = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = DAY_NAMES[date.getDay()];
            for (const assignment of player.assignments) {
                const batchDays = parseDays(assignment.batch.daysOfWeek);
                if (!batchDays.includes(dayName))
                    continue;
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
        return apiResponse_1.ApiResponse.success(res, 'Upcoming sessions retrieved', sessions);
    }
    catch (error) {
        logger_1.logger.error('getUpcomingSessions error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch upcoming sessions', 500);
    }
};
exports.getUpcomingSessions = getUpcomingSessions;
const exportPlayers = async (req, res) => {
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
        return apiResponse_1.ApiResponse.success(res, 'Players exported successfully', players);
    }
    catch (error) {
        logger_1.logger.error('exportPlayers error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export players', 500);
    }
};
exports.exportPlayers = exportPlayers;
const deletePlayer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const player = await prisma.$transaction([
            prisma.regularPlayer.update({ where: { id }, data: { status: 'cancelled' } }),
            prisma.regularPlayerAssignment.updateMany({
                where: { playerId: id, status: 'active' },
                data: { status: 'inactive', leavingDate: new Date() },
            }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Player deleted successfully', player[0]);
    }
    catch (error) {
        logger_1.logger.error('deletePlayer error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete player', 500);
    }
};
exports.deletePlayer = deletePlayer;
const updatePhoto = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid player id', 400);
        const file = req.file;
        if (!file)
            return apiResponse_1.ApiResponse.error(res, 'No photo uploaded', 400);
        const existing = await prisma.regularPlayer.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Player not found', 404);
        const photoPath = `/uploads/profiles/${file.filename}`;
        const player = await prisma.regularPlayer.update({ where: { id }, data: { photo: photoPath } });
        return apiResponse_1.ApiResponse.success(res, 'Profile photo updated successfully', player);
    }
    catch (error) {
        logger_1.logger.error('updatePhoto error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update profile photo', 500);
    }
};
exports.updatePhoto = updatePhoto;
//# sourceMappingURL=regularPlayer.controller.js.map