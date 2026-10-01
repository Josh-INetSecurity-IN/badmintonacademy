"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitEnquiry = exports.getPublicGallery = exports.getPublicTournaments = exports.getPublicBatches = exports.getAcademyInfo = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const safeParseJson = (value, fallback) => {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
};
const parseValue = (value, type) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (type === 'json') {
        return safeParseJson(value, value);
    }
    if (type === 'number') {
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
    if (type === 'boolean') {
        return value === 'true' || value === '1';
    }
    return value;
};
const getAcademyInfo = async (req, res) => {
    try {
        const [settings, heroSlides, programs, facilities, testimonials] = await Promise.all([
            prisma.academySetting.findMany(),
            prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
            prisma.coachingProgram.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
            prisma.facility.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
            prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } }),
        ]);
        const flat = {};
        for (const s of settings) {
            if (s.group === 'website' || s.group === 'general') {
                flat[s.key] = parseValue(s.value, s.type);
            }
        }
        return apiResponse_1.ApiResponse.success(res, 'Academy info retrieved', {
            settings: flat,
            heroSlides,
            programs,
            facilities,
            testimonials,
        });
    }
    catch (error) {
        logger_1.logger.error('getAcademyInfo error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch academy info', 500, error.message);
    }
};
exports.getAcademyInfo = getAcademyInfo;
const getPublicBatches = async (req, res) => {
    try {
        const [coachingBatches, regularBatches] = await Promise.all([
            prisma.coachingBatch.findMany({
                where: { status: 'active' },
                include: {
                    coach: { select: { id: true, firstName: true, lastName: true } },
                    court: { select: { id: true, name: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.regularBatch.findMany({
                where: { status: 'active' },
                include: {
                    court: { select: { id: true, name: true } },
                },
                orderBy: { name: 'asc' },
            }),
        ]);
        const coaching = coachingBatches.map((b) => ({
            id: b.id,
            type: 'coaching',
            name: b.name,
            programType: b.programType,
            skillLevel: b.skillLevel,
            ageGroup: b.ageGroup,
            coach: b.coach
                ? { id: b.coach.id, name: `${b.coach.firstName} ${b.coach.lastName}`.trim() }
                : null,
            court: b.court ? { id: b.court.id, name: b.court.name } : null,
            daysOfWeek: safeParseJson(b.daysOfWeek, []),
            startTime: b.startTime,
            endTime: b.endTime,
            startDate: b.startDate,
            maxCapacity: b.maxCapacity,
            monthlyFee: Number(b.monthlyFee),
            registrationFee: Number(b.registrationFee),
            description: b.description,
            color: b.color,
        }));
        const regular = regularBatches.map((b) => ({
            id: b.id,
            type: 'regular',
            name: b.name,
            coach: null,
            court: b.court ? { id: b.court.id, name: b.court.name } : null,
            daysOfWeek: safeParseJson(b.daysOfWeek, []),
            startTime: b.startTime,
            endTime: b.endTime,
            startDate: b.startDate,
            maxPlayers: b.maxPlayers,
            monthlyPrice: Number(b.monthlyPrice),
            notes: b.notes,
        }));
        return apiResponse_1.ApiResponse.success(res, 'Public batches retrieved', {
            coaching,
            regular,
            batches: [...coaching, ...regular],
        });
    }
    catch (error) {
        logger_1.logger.error('getPublicBatches error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch public batches', 500, error.message);
    }
};
exports.getPublicBatches = getPublicBatches;
const getPublicTournaments = async (req, res) => {
    try {
        const tournaments = await prisma.tournament.findMany({
            where: { status: { in: ['published', 'registration_open'] } },
            include: { _count: { select: { registrations: true } } },
            orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
        });
        const data = tournaments.map((t) => ({
            id: t.id,
            name: t.name,
            poster: t.poster,
            description: t.description,
            startDate: t.startDate,
            endDate: t.endDate,
            registrationDeadline: t.registrationDeadline,
            venue: t.venue,
            categories: safeParseJson(t.categories, []),
            entryFee: Number(t.entryFee),
            prizeDetails: t.prizeDetails,
            registrationUrl: t.registrationUrl,
            status: t.status,
            isFeatured: t.isFeatured,
            registrationsCount: t._count.registrations,
        }));
        return apiResponse_1.ApiResponse.success(res, 'Public tournaments retrieved', data);
    }
    catch (error) {
        logger_1.logger.error('getPublicTournaments error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch public tournaments', 500, error.message);
    }
};
exports.getPublicTournaments = getPublicTournaments;
const getPublicGallery = async (req, res) => {
    try {
        const images = await prisma.galleryImage.findMany({
            where: { isPublished: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                title: true,
                image: true,
                category: true,
                caption: true,
                sortOrder: true,
            },
        });
        return apiResponse_1.ApiResponse.success(res, 'Public gallery retrieved', images);
    }
    catch (error) {
        logger_1.logger.error('getPublicGallery error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch public gallery', 500, error.message);
    }
};
exports.getPublicGallery = getPublicGallery;
const submitEnquiry = async (req, res) => {
    try {
        const { name, phone, email, subject, message, source } = req.body;
        if (!name || !name.toString().trim()) {
            return apiResponse_1.ApiResponse.error(res, 'Name is required', 400);
        }
        if (!phone || !phone.toString().trim()) {
            return apiResponse_1.ApiResponse.error(res, 'Phone number is required', 400);
        }
        if (!message || !message.toString().trim()) {
            return apiResponse_1.ApiResponse.error(res, 'Message is required', 400);
        }
        const enquiry = await prisma.contactEnquiry.create({
            data: {
                name: String(name).trim(),
                phone: String(phone).trim(),
                email: email ? String(email).trim() : null,
                subject: subject ? String(subject).trim() : null,
                message: String(message).trim(),
                source: source || 'website',
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Enquiry submitted successfully', enquiry);
    }
    catch (error) {
        logger_1.logger.error('submitEnquiry error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to submit enquiry', 500, error.message);
    }
};
exports.submitEnquiry = submitEnquiry;
//# sourceMappingURL=public.controller.js.map