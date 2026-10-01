"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportStudents = exports.getStudentsByBatch = exports.updateProfilePhoto = exports.archiveStudent = exports.transferBatch = exports.removeFromBatch = exports.assignBatch = exports.deleteStudent = exports.updateStudent = exports.createStudent = exports.getStudent = exports.getStudents = void 0;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const generateId_1 = require("../utils/generateId");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const parseDecimal = (value) => new client_1.Prisma.Decimal(value ?? 0);
const parseDate = (value) => {
    if (!value)
        return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
};
const buildStudentWhere = (query) => {
    const { search, status, skillLevel, batchId } = query;
    const where = {};
    if (search) {
        where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
            { parentPhone: { contains: search } },
            { admissionNumber: { contains: search } },
        ];
    }
    if (status)
        where.status = status;
    if (skillLevel)
        where.skillLevel = skillLevel;
    if (batchId && !isNaN(parseInt(batchId))) {
        where.batchStudents = { some: { batchId: parseInt(batchId) } };
    }
    return where;
};
const getStudents = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const where = buildStudentWhere(req.query);
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                include: {
                    batchStudents: {
                        where: { status: 'active' },
                        include: { batch: { select: { id: true, name: true, color: true, startTime: true, endTime: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.student.count({ where }),
        ]);
        return apiResponse_1.ApiResponse.paginated(res, students, total, page, limit);
    }
    catch (error) {
        logger_1.logger.error('getStudents error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch students', 500);
    }
};
exports.getStudents = getStudents;
const getStudent = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                batchStudents: {
                    include: {
                        batch: {
                            include: {
                                coach: { select: { id: true, firstName: true, lastName: true } },
                                court: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
                feeInvoices: { orderBy: { createdAt: 'desc' } },
                payments: { orderBy: { paymentDate: 'desc' } },
                subscriptions: { orderBy: { startDate: 'desc' } },
                attendances: { orderBy: { date: 'desc' }, take: 50 },
            },
        });
        if (!student)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        return apiResponse_1.ApiResponse.success(res, 'Student retrieved', student);
    }
    catch (error) {
        logger_1.logger.error('getStudent error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch student', 500);
    }
};
exports.getStudent = getStudent;
const createStudent = async (req, res) => {
    try {
        const body = req.body;
        if (!body.firstName || !body.lastName) {
            return apiResponse_1.ApiResponse.error(res, 'firstName and lastName are required', 400);
        }
        if (body.monthlyFee === undefined || body.monthlyFee === null || body.monthlyFee === '') {
            return apiResponse_1.ApiResponse.error(res, 'monthlyFee is required', 400);
        }
        let admissionNumber = (0, generateId_1.generateAdmissionNumber)();
        let exists = await prisma.student.findUnique({ where: { admissionNumber } });
        for (let attempt = 0; attempt < 3 && exists; attempt++) {
            admissionNumber = (0, generateId_1.generateAdmissionNumber)();
            exists = await prisma.student.findUnique({ where: { admissionNumber } });
        }
        if (exists) {
            return apiResponse_1.ApiResponse.error(res, 'Failed to generate a unique admission number, please retry', 500);
        }
        const student = await prisma.student.create({
            data: {
                admissionNumber,
                firstName: body.firstName,
                lastName: body.lastName,
                gender: body.gender || undefined,
                dateOfBirth: parseDate(body.dateOfBirth),
                parentName: body.parentName || undefined,
                parentPhone: body.parentPhone || undefined,
                phone: body.phone || undefined,
                email: body.email || undefined,
                address: body.address || undefined,
                emergencyContact: body.emergencyContact || undefined,
                medicalNotes: body.medicalNotes || undefined,
                photo: body.photo || undefined,
                joiningDate: parseDate(body.joiningDate) || new Date(),
                skillLevel: body.skillLevel || 'beginner',
                coachingProgram: body.coachingProgram || undefined,
                monthlyFee: parseDecimal(body.monthlyFee),
                admissionFee: parseDecimal(body.admissionFee),
                discount: parseDecimal(body.discount),
                feeDueDay: body.feeDueDay !== undefined && body.feeDueDay !== '' ? parseInt(body.feeDueDay) : undefined,
                status: body.status || 'active',
                notes: body.notes || undefined,
            },
        });
        return apiResponse_1.ApiResponse.created(res, 'Student created successfully', student);
    }
    catch (error) {
        logger_1.logger.error('createStudent error:', error.message);
        if (error.code === 'P2002') {
            return apiResponse_1.ApiResponse.error(res, 'A student with this admission number already exists', 409);
        }
        return apiResponse_1.ApiResponse.error(res, 'Failed to create student', 500);
    }
};
exports.createStudent = createStudent;
const updateStudent = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const body = req.body;
        const data = {};
        if (body.firstName !== undefined)
            data.firstName = body.firstName;
        if (body.lastName !== undefined)
            data.lastName = body.lastName;
        if (body.gender !== undefined)
            data.gender = body.gender;
        if (body.dateOfBirth !== undefined)
            data.dateOfBirth = body.dateOfBirth ? parseDate(body.dateOfBirth) : null;
        if (body.parentName !== undefined)
            data.parentName = body.parentName;
        if (body.parentPhone !== undefined)
            data.parentPhone = body.parentPhone;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.email !== undefined)
            data.email = body.email;
        if (body.address !== undefined)
            data.address = body.address;
        if (body.emergencyContact !== undefined)
            data.emergencyContact = body.emergencyContact;
        if (body.medicalNotes !== undefined)
            data.medicalNotes = body.medicalNotes;
        if (body.joiningDate !== undefined) {
            const parsed = parseDate(body.joiningDate);
            if (parsed)
                data.joiningDate = parsed;
        }
        if (body.skillLevel !== undefined)
            data.skillLevel = body.skillLevel;
        if (body.coachingProgram !== undefined)
            data.coachingProgram = body.coachingProgram;
        if (body.monthlyFee !== undefined)
            data.monthlyFee = parseDecimal(body.monthlyFee);
        if (body.admissionFee !== undefined)
            data.admissionFee = parseDecimal(body.admissionFee);
        if (body.discount !== undefined)
            data.discount = parseDecimal(body.discount);
        if (body.feeDueDay !== undefined)
            data.feeDueDay = body.feeDueDay !== '' ? parseInt(body.feeDueDay) : null;
        if (body.status !== undefined)
            data.status = body.status;
        if (body.notes !== undefined)
            data.notes = body.notes;
        const student = await prisma.student.update({ where: { id }, data });
        return apiResponse_1.ApiResponse.success(res, 'Student updated successfully', student);
    }
    catch (error) {
        logger_1.logger.error('updateStudent error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update student', 500);
    }
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const student = await prisma.$transaction([
            prisma.student.update({ where: { id }, data: { status: 'left' } }),
            prisma.batchStudent.updateMany({
                where: { studentId: id, status: 'active' },
                data: { status: 'inactive', leavingDate: new Date() },
            }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Student deleted successfully', student[0]);
    }
    catch (error) {
        logger_1.logger.error('deleteStudent error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to delete student', 500);
    }
};
exports.deleteStudent = deleteStudent;
const assignBatch = async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const batchId = parseInt(req.body.batchId);
        if (isNaN(studentId) || isNaN(batchId)) {
            return apiResponse_1.ApiResponse.error(res, 'Valid student id and batchId are required', 400);
        }
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const batch = await prisma.coachingBatch.findUnique({
            where: { id: batchId },
            include: { _count: { select: { students: { where: { status: 'active' } } } } },
        });
        if (!batch)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        const existing = await prisma.batchStudent.findUnique({
            where: { batchId_studentId: { batchId, studentId } },
        });
        if (existing && existing.status === 'active') {
            return apiResponse_1.ApiResponse.success(res, 'Student is already assigned to this batch', existing);
        }
        if (batch._count.students >= batch.maxCapacity) {
            return apiResponse_1.ApiResponse.error(res, 'Batch is at full capacity', 400);
        }
        const batchStudent = await prisma.batchStudent.upsert({
            where: { batchId_studentId: { batchId, studentId } },
            update: { status: 'active', leavingDate: null },
            create: { batchId, studentId, status: 'active' },
        });
        const activeCount = await prisma.batchStudent.count({ where: { batchId, status: 'active' } });
        if (activeCount >= batch.maxCapacity && batch.status === 'active') {
            await prisma.coachingBatch.update({ where: { id: batchId }, data: { status: 'full' } });
        }
        return apiResponse_1.ApiResponse.success(res, 'Student assigned to batch successfully', batchStudent);
    }
    catch (error) {
        logger_1.logger.error('assignBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to assign student to batch', 500);
    }
};
exports.assignBatch = assignBatch;
const removeFromBatch = async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const batchId = parseInt(req.body.batchId);
        if (isNaN(studentId) || isNaN(batchId)) {
            return apiResponse_1.ApiResponse.error(res, 'Valid student id and batchId are required', 400);
        }
        const result = await prisma.batchStudent.updateMany({
            where: { studentId, batchId, status: 'active' },
            data: { status: 'inactive', leavingDate: new Date() },
        });
        if (result.count === 0) {
            return apiResponse_1.ApiResponse.error(res, 'Student is not actively assigned to this batch', 404);
        }
        await prisma.coachingBatch.updateMany({
            where: { id: batchId, status: 'full' },
            data: { status: 'active' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Student removed from batch successfully');
    }
    catch (error) {
        logger_1.logger.error('removeFromBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to remove student from batch', 500);
    }
};
exports.removeFromBatch = removeFromBatch;
const transferBatch = async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const fromBatchId = parseInt(req.body.fromBatchId);
        const toBatchId = parseInt(req.body.toBatchId);
        if (isNaN(studentId) || isNaN(fromBatchId) || isNaN(toBatchId)) {
            return apiResponse_1.ApiResponse.error(res, 'student id, fromBatchId and toBatchId are required', 400);
        }
        if (fromBatchId === toBatchId) {
            return apiResponse_1.ApiResponse.error(res, 'Source and target batches must be different', 400);
        }
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const targetBatch = await prisma.coachingBatch.findUnique({
            where: { id: toBatchId },
            include: { _count: { select: { students: { where: { status: 'active' } } } } },
        });
        if (!targetBatch)
            return apiResponse_1.ApiResponse.error(res, 'Target batch not found', 404);
        if (targetBatch._count.students >= targetBatch.maxCapacity) {
            return apiResponse_1.ApiResponse.error(res, 'Target batch is at full capacity', 400);
        }
        await prisma.$transaction([
            prisma.batchStudent.updateMany({
                where: { studentId, batchId: fromBatchId, status: 'active' },
                data: { status: 'transferred', leavingDate: new Date() },
            }),
            prisma.batchStudent.upsert({
                where: { batchId_studentId: { batchId: toBatchId, studentId } },
                update: { status: 'active', leavingDate: null, joiningDate: new Date() },
                create: { batchId: toBatchId, studentId, status: 'active' },
            }),
        ]);
        await prisma.coachingBatch.updateMany({
            where: { id: fromBatchId, status: 'full' },
            data: { status: 'active' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Student transferred successfully');
    }
    catch (error) {
        logger_1.logger.error('transferBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to transfer student', 500);
    }
};
exports.transferBatch = transferBatch;
const archiveStudent = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        await prisma.$transaction([
            prisma.student.update({ where: { id }, data: { status: 'left' } }),
            prisma.batchStudent.updateMany({
                where: { studentId: id, status: 'active' },
                data: { status: 'inactive', leavingDate: new Date() },
            }),
        ]);
        return apiResponse_1.ApiResponse.success(res, 'Student archived successfully');
    }
    catch (error) {
        logger_1.logger.error('archiveStudent error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to archive student', 500);
    }
};
exports.archiveStudent = archiveStudent;
const updateProfilePhoto = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return apiResponse_1.ApiResponse.error(res, 'Invalid student id', 400);
        const file = req.file;
        if (!file)
            return apiResponse_1.ApiResponse.error(res, 'No photo uploaded', 400);
        const existing = await prisma.student.findUnique({ where: { id } });
        if (!existing)
            return apiResponse_1.ApiResponse.error(res, 'Student not found', 404);
        const photoPath = `/uploads/profiles/${file.filename}`;
        const student = await prisma.student.update({ where: { id }, data: { photo: photoPath } });
        return apiResponse_1.ApiResponse.success(res, 'Profile photo updated successfully', student);
    }
    catch (error) {
        logger_1.logger.error('updateProfilePhoto error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to update profile photo', 500);
    }
};
exports.updateProfilePhoto = updateProfilePhoto;
const getStudentsByBatch = async (req, res) => {
    try {
        const batchId = parseInt(req.params.batchId);
        if (isNaN(batchId))
            return apiResponse_1.ApiResponse.error(res, 'Invalid batch id', 400);
        const batch = await prisma.coachingBatch.findUnique({
            where: { id: batchId },
            include: {
                students: {
                    where: { status: 'active' },
                    orderBy: { joiningDate: 'asc' },
                    include: {
                        student: {
                            include: {
                                feeInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
                                attendances: { where: { batchId }, select: { id: true, date: true, status: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!batch)
            return apiResponse_1.ApiResponse.error(res, 'Batch not found', 404);
        const students = batch.students.map((bs) => {
            const attendances = bs.student.attendances;
            const total = attendances.length;
            const present = attendances.filter((a) => a.status === 'present' || a.status === 'late').length;
            const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
            const latestInvoice = bs.student.feeInvoices[0];
            let paymentStatus = 'no_invoice';
            if (latestInvoice) {
                paymentStatus = latestInvoice.status === 'paid' ? 'paid' : latestInvoice.status;
            }
            return {
                id: bs.student.id,
                admissionNumber: bs.student.admissionNumber,
                firstName: bs.student.firstName,
                lastName: bs.student.lastName,
                photo: bs.student.photo,
                phone: bs.student.phone,
                parentName: bs.student.parentName,
                parentPhone: bs.student.parentPhone,
                skillLevel: bs.student.skillLevel,
                joiningDate: bs.joiningDate,
                paymentStatus,
                attendancePercentage,
            };
        });
        return apiResponse_1.ApiResponse.success(res, 'Batch students retrieved', {
            batch: { id: batch.id, name: batch.name, maxCapacity: batch.maxCapacity, currentStudents: students.length },
            students,
        });
    }
    catch (error) {
        logger_1.logger.error('getStudentsByBatch error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to fetch batch students', 500);
    }
};
exports.getStudentsByBatch = getStudentsByBatch;
const exportStudents = async (req, res) => {
    try {
        const where = buildStudentWhere(req.query);
        const students = await prisma.student.findMany({
            where,
            include: {
                batchStudents: {
                    where: { status: 'active' },
                    include: { batch: { select: { id: true, name: true, startTime: true, endTime: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return apiResponse_1.ApiResponse.success(res, 'Students exported successfully', students);
    }
    catch (error) {
        logger_1.logger.error('exportStudents error:', error.message);
        return apiResponse_1.ApiResponse.error(res, 'Failed to export students', 500);
    }
};
exports.exportStudents = exportStudents;
//# sourceMappingURL=student.controller.js.map