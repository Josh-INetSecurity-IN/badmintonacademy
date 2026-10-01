"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoach = exports.updateCoach = exports.createCoach = exports.getCoaches = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const toBoolean = (value) => value === true || value === 'true';
const getCoaches = async (req, res) => {
    try {
        const { search, includeInactive } = req.query;
        const where = {};
        if (includeInactive !== 'true')
            where.isActive = true;
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
            ];
        }
        const coaches = await prisma.coach.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Coaches retrieved', coaches);
    }
    catch (error) {
        logger_1.logger.error('getCoaches error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch coaches', 500);
    }
};
exports.getCoaches = getCoaches;
const createCoach = async (req, res) => {
    try {
        const body = req.body;
        if (!body.firstName || !body.lastName) {
            return apiResponse_1.ApiResponse.error(res, 'firstName and lastName are required', 400);
        }
        const coach = await prisma.coach.create({
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone || undefined,
                email: body.email || undefined,
                specialization: body.specialization || undefined,
                qualification: body.qualification || undefined,
                experience: body.experience || undefined,
                bio: body.bio || undefined,
                avatar: body.avatar || undefined,
                isActive: body.isActive !== undefined ? toBoolean(body.isActive) : true,
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Coach created successfully', coach);
    }
    catch (error) {
        logger_1.logger.error('createCoach error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to create coach', 500);
    }
};
exports.createCoach = createCoach;
const updateCoach = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid coach id', 400);
        const existing = await prisma.coach.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Coach not found', 404);
        const body = req.body;
        const data = {};
        if (body.firstName !== undefined)
            data.firstName = body.firstName;
        if (body.lastName !== undefined)
            data.lastName = body.lastName;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.email !== undefined)
            data.email = body.email;
        if (body.specialization !== undefined)
            data.specialization = body.specialization;
        if (body.qualification !== undefined)
            data.qualification = body.qualification;
        if (body.experience !== undefined)
            data.experience = body.experience;
        if (body.bio !== undefined)
            data.bio = body.bio;
        if (body.avatar !== undefined)
            data.avatar = body.avatar;
        if (body.isActive !== undefined)
            data.isActive = toBoolean(body.isActive);
        const coach = await prisma.coach.update({ where: { id }, data });
        return apiResponse_1.ApiResponse.success(res, 'Coach updated successfully', coach);
    }
    catch (error) {
        logger_1.logger.error('updateCoach error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update coach', 500);
    }
};
exports.updateCoach = updateCoach;
const deleteCoach = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid coach id', 400);
        const existing = await prisma.coach.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Coach not found', 404);
        const coach = await prisma.coach.update({ where: { id }, data: { isActive: false } });
        return apiResponse_1.ApiResponse.success(res, 'Coach deactivated successfully', coach);
    }
    catch (error) {
        logger_1.logger.error('deleteCoach error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete coach', 500);
    }
};
exports.deleteCoach = deleteCoach;
//# sourceMappingURL=coach.controller.js.map