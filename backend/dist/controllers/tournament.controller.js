"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTournamentRevenue = exports.exportParticipants = exports.updateRegistration = exports.registerPlayer = exports.publishTournament = exports.uploadPoster = exports.deleteTournament = exports.updateTournament = exports.createTournament = exports.getTournament = exports.getTournaments = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const prisma = new client_1.PrismaClient();
const toPlain = (t) => {
    let parsedCategories = [];
    try {
        parsedCategories = JSON.parse(t.categories || '[]');
    }
    catch {
        parsedCategories = [];
    }
    return {
        ...t,
        entryFee: Number(t.entryFee),
        categories: parsedCategories,
    };
};
const getTournaments = async (req, res) => {
    try {
        const { page = '1', limit = '20', status, featured, } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (status) {
            where.status = String(status);
        }
        if (featured === 'true') {
            where.isFeatured = true;
        }
        const [tournaments, total] = await Promise.all([
            prisma.tournament.findMany({
                where,
                skip,
                take,
                orderBy: { startDate: 'desc' },
                include: {
                    _count: {
                        select: { registrations: true },
                    },
                },
            }),
            prisma.tournament.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, tournaments.map(toPlain), total, Number(page), take);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch tournaments', 500, error.message);
    }
};
exports.getTournaments = getTournaments;
const getTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await prisma.tournament.findUnique({
            where: { id: Number(id) },
            include: {
                registrations: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!tournament) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        return apiResponse_1.ApiResponse.success(res, 'Tournament retrieved successfully', {
            ...toPlain(tournament),
            registrations: tournament.registrations.map((r) => ({
                ...r,
                amount: Number(r.amount),
            })),
        });
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch tournament', 500, error.message);
    }
};
exports.getTournament = getTournament;
const createTournament = async (req, res) => {
    try {
        const { name, description, startDate, endDate, registrationDeadline, venue, categories, entryFee, prizeDetails, rules, contactDetails, registrationUrl, status = 'draft', isFeatured = false, } = req.body;
        if (!name || !startDate || !endDate || entryFee === undefined) {
            return apiResponse_1.ApiResponse.error(res, 'Name, start date, end date, and entry fee are required', 400);
        }
        const tournament = await prisma.tournament.create({
            data: {
                name,
                description: description || null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
                venue: venue || null,
                categories: JSON.stringify(categories || []),
                entryFee: new client_1.Prisma.Decimal(entryFee),
                prizeDetails: prizeDetails || null,
                rules: rules || null,
                contactDetails: contactDetails || null,
                registrationUrl: registrationUrl || null,
                status,
                isFeatured: Boolean(isFeatured),
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Tournament created successfully', toPlain(tournament), 201);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to create tournament', 500, error.message);
    }
};
exports.createTournament = createTournament;
const updateTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, registrationDeadline, venue, categories, entryFee, prizeDetails, rules, contactDetails, registrationUrl, status, isFeatured, } = req.body;
        const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (description !== undefined)
            data.description = description;
        if (startDate !== undefined)
            data.startDate = new Date(startDate);
        if (endDate !== undefined)
            data.endDate = new Date(endDate);
        if (registrationDeadline !== undefined) {
            data.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
        }
        if (venue !== undefined)
            data.venue = venue;
        if (categories !== undefined)
            data.categories = JSON.stringify(categories);
        if (entryFee !== undefined)
            data.entryFee = new client_1.Prisma.Decimal(entryFee);
        if (prizeDetails !== undefined)
            data.prizeDetails = prizeDetails;
        if (rules !== undefined)
            data.rules = rules;
        if (contactDetails !== undefined)
            data.contactDetails = contactDetails;
        if (registrationUrl !== undefined)
            data.registrationUrl = registrationUrl;
        if (status !== undefined)
            data.status = status;
        if (isFeatured !== undefined)
            data.isFeatured = Boolean(isFeatured);
        const tournament = await prisma.tournament.update({
            where: { id: Number(id) },
            data,
        });
        return apiResponse_1.ApiResponse.success(res, 'Tournament updated successfully', toPlain(tournament));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to update tournament', 500, error.message);
    }
};
exports.updateTournament = updateTournament;
const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;
        const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        if (force === 'true') {
            await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: Number(id) } });
            await prisma.tournament.delete({ where: { id: Number(id) } });
            return apiResponse_1.ApiResponse.success(res, 'Tournament permanently deleted');
        }
        const updated = await prisma.tournament.update({
            where: { id: Number(id) },
            data: { status: 'completed' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Tournament marked as completed', toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete tournament', 500, error.message);
    }
};
exports.deleteTournament = deleteTournament;
const uploadPoster = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        if (!req.file) {
            return apiResponse_1.ApiResponse.error(res, 'No poster uploaded', 400);
        }
        const updated = await prisma.tournament.update({
            where: { id: Number(id) },
            data: { poster: `/uploads/${req.file.filename}` },
        });
        return apiResponse_1.ApiResponse.success(res, 'Poster uploaded successfully', toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to upload poster', 500, error.message);
    }
};
exports.uploadPoster = uploadPoster;
const publishTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        const updated = await prisma.tournament.update({
            where: { id: Number(id) },
            data: { status: 'published' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Tournament published successfully', toPlain(updated));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to publish tournament', 500, error.message);
    }
};
exports.publishTournament = publishTournament;
const registerPlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantName, phone, email, category, teamName, partnerName, amount, paymentStatus = 'paid', notes, } = req.body;
        if (!participantName || !phone || !category) {
            return apiResponse_1.ApiResponse.error(res, 'Participant name, phone, and category are required', 400);
        }
        const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!tournament) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        const registration = await prisma.tournamentRegistration.create({
            data: {
                tournamentId: Number(id),
                participantName,
                phone,
                email: email || null,
                category,
                teamName: teamName || null,
                partnerName: partnerName || null,
                amount: new client_1.Prisma.Decimal(amount !== undefined ? amount : Number(tournament.entryFee)),
                paymentStatus,
                notes: notes || null,
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Player registered successfully', {
            ...registration,
            amount: Number(registration.amount),
        }, 201);
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to register player', 500, error.message);
    }
};
exports.registerPlayer = registerPlayer;
const updateRegistration = async (req, res) => {
    try {
        const { id, regId } = req.params;
        const { paymentStatus, notes, participantName, phone, email, category, teamName, partnerName } = req.body;
        const existing = await prisma.tournamentRegistration.findFirst({
            where: { id: Number(regId), tournamentId: Number(id) },
        });
        if (!existing) {
            return apiResponse_1.ApiResponse.error(res, 'Registration not found', 404);
        }
        const data = {};
        if (paymentStatus !== undefined)
            data.paymentStatus = paymentStatus;
        if (notes !== undefined)
            data.notes = notes;
        if (participantName !== undefined)
            data.participantName = participantName;
        if (phone !== undefined)
            data.phone = phone;
        if (email !== undefined)
            data.email = email;
        if (category !== undefined)
            data.category = category;
        if (teamName !== undefined)
            data.teamName = teamName;
        if (partnerName !== undefined)
            data.partnerName = partnerName;
        const updated = await prisma.tournamentRegistration.update({
            where: { id: Number(regId) },
            data,
        });
        return apiResponse_1.ApiResponse.success(res, 'Registration updated successfully', {
            ...updated,
            amount: Number(updated.amount),
        });
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to update registration', 500, error.message);
    }
};
exports.updateRegistration = updateRegistration;
const exportParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!tournament) {
            return apiResponse_1.ApiResponse.error(res, 'Tournament not found', 404);
        }
        const registrations = await prisma.tournamentRegistration.findMany({
            where: { tournamentId: Number(id) },
            orderBy: { createdAt: 'desc' },
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${tournament.name.replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}-participants.csv`);
        const csvHeader = 'Participant Name,Phone,Email,Category,Team Name,Partner Name,Amount,Payment Status,Registered At,Notes\n';
        const csvRows = registrations.map((r) => [
            `"${r.participantName}"`,
            r.phone,
            r.email || '',
            `"${r.category}"`,
            `"${r.teamName || ''}"`,
            `"${r.partnerName || ''}"`,
            Number(r.amount),
            r.paymentStatus,
            new Date(r.createdAt).toISOString(),
            `"${r.notes || ''}"`,
        ].join(','));
        return res.send(csvHeader + csvRows.join('\n'));
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to export participants', 500, error.message);
    }
};
exports.exportParticipants = exportParticipants;
const getTournamentRevenue = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = String(status);
        }
        const tournaments = await prisma.tournament.findMany({
            where,
            include: {
                registrations: {
                    select: { amount: true, paymentStatus: true },
                },
            },
        });
        const revenue = tournaments.map((t) => {
            const paidRegistrations = t.registrations.filter((r) => r.paymentStatus === 'paid');
            const totalRevenue = paidRegistrations.reduce((sum, r) => sum + Number(r.amount), 0);
            return {
                id: t.id,
                name: t.name,
                entryFee: Number(t.entryFee),
                registrationCount: t.registrations.length,
                paidRegistrations: paidRegistrations.length,
                totalRevenue,
            };
        });
        const totalRevenue = revenue.reduce((sum, t) => sum + t.totalRevenue, 0);
        return apiResponse_1.ApiResponse.success(res, 'Tournament revenue retrieved successfully', {
            tournaments: revenue,
            totalRevenue,
        });
    }
    catch (error) {
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch tournament revenue', 500, error.message);
    }
};
exports.getTournamentRevenue = getTournamentRevenue;
//# sourceMappingURL=tournament.controller.js.map