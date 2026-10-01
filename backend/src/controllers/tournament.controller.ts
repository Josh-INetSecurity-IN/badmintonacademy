import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';

const prisma = new PrismaClient();

const toPlain = (t: any) => {
  let parsedCategories: any = [];
  try {
    parsedCategories = JSON.parse(t.categories || '[]');
  } catch {
    parsedCategories = [];
  }
  return {
    ...t,
    entryFee: Number(t.entryFee),
    categories: parsedCategories,
  };
};

export const getTournaments = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      featured,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

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

    return ApiResponse.paginated(
      res,
      tournaments.map(toPlain),
      total,
      Number(page),
      take
    );
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch tournaments', 500, error.message);
  }
};

export const getTournament = async (req: Request, res: Response) => {
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
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    return ApiResponse.success(res, 'Tournament retrieved successfully', {
      ...toPlain(tournament),
      registrations: tournament.registrations.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch tournament', 500, error.message);
  }
};

export const createTournament = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      registrationDeadline,
      venue,
      categories,
      entryFee,
      prizeDetails,
      rules,
      contactDetails,
      registrationUrl,
      status = 'draft',
      isFeatured = false,
    } = req.body;

    if (!name || !startDate || !endDate || entryFee === undefined) {
      return ApiResponse.error(res, 'Name, start date, end date, and entry fee are required', 400);
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
        entryFee: new Prisma.Decimal(entryFee),
        prizeDetails: prizeDetails || null,
        rules: rules || null,
        contactDetails: contactDetails || null,
        registrationUrl: registrationUrl || null,
        status,
        isFeatured: Boolean(isFeatured),
      },
    });

    return ApiResponse.success(res, 'Tournament created successfully', toPlain(tournament), 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to create tournament', 500, error.message);
  }
};

export const updateTournament = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      registrationDeadline,
      venue,
      categories,
      entryFee,
      prizeDetails,
      rules,
      contactDetails,
      registrationUrl,
      status,
      isFeatured,
    } = req.body;

    const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (registrationDeadline !== undefined) {
      data.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
    }
    if (venue !== undefined) data.venue = venue;
    if (categories !== undefined) data.categories = JSON.stringify(categories);
    if (entryFee !== undefined) data.entryFee = new Prisma.Decimal(entryFee);
    if (prizeDetails !== undefined) data.prizeDetails = prizeDetails;
    if (rules !== undefined) data.rules = rules;
    if (contactDetails !== undefined) data.contactDetails = contactDetails;
    if (registrationUrl !== undefined) data.registrationUrl = registrationUrl;
    if (status !== undefined) data.status = status;
    if (isFeatured !== undefined) data.isFeatured = Boolean(isFeatured);

    const tournament = await prisma.tournament.update({
      where: { id: Number(id) },
      data,
    });

    return ApiResponse.success(res, 'Tournament updated successfully', toPlain(tournament));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update tournament', 500, error.message);
  }
};

export const deleteTournament = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    if (force === 'true') {
      await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: Number(id) } });
      await prisma.tournament.delete({ where: { id: Number(id) } });
      return ApiResponse.success(res, 'Tournament permanently deleted');
    }

    const updated = await prisma.tournament.update({
      where: { id: Number(id) },
      data: { status: 'completed' },
    });

    return ApiResponse.success(res, 'Tournament marked as completed', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to delete tournament', 500, error.message);
  }
};

export const uploadPoster = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    if (!req.file) {
      return ApiResponse.error(res, 'No poster uploaded', 400);
    }

    const updated = await prisma.tournament.update({
      where: { id: Number(id) },
      data: { poster: `/uploads/${req.file.filename}` },
    });

    return ApiResponse.success(res, 'Poster uploaded successfully', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to upload poster', 500, error.message);
  }
};

export const publishTournament = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    const updated = await prisma.tournament.update({
      where: { id: Number(id) },
      data: { status: 'published' },
    });

    return ApiResponse.success(res, 'Tournament published successfully', toPlain(updated));
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to publish tournament', 500, error.message);
  }
};

export const registerPlayer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      participantName,
      phone,
      email,
      category,
      teamName,
      partnerName,
      amount,
      paymentStatus = 'paid',
      notes,
    } = req.body;

    if (!participantName || !phone || !category) {
      return ApiResponse.error(res, 'Participant name, phone, and category are required', 400);
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!tournament) {
      return ApiResponse.error(res, 'Tournament not found', 404);
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
        amount: new Prisma.Decimal(amount !== undefined ? amount : Number(tournament.entryFee)),
        paymentStatus,
        notes: notes || null,
      },
    });

    return ApiResponse.success(res, 'Player registered successfully', {
      ...registration,
      amount: Number(registration.amount),
    }, 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to register player', 500, error.message);
  }
};

export const updateRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const { id, regId } = req.params;
    const { paymentStatus, notes, participantName, phone, email, category, teamName, partnerName } = req.body;

    const existing = await prisma.tournamentRegistration.findFirst({
      where: { id: Number(regId), tournamentId: Number(id) },
    });

    if (!existing) {
      return ApiResponse.error(res, 'Registration not found', 404);
    }

    const data: any = {};
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    if (notes !== undefined) data.notes = notes;
    if (participantName !== undefined) data.participantName = participantName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (category !== undefined) data.category = category;
    if (teamName !== undefined) data.teamName = teamName;
    if (partnerName !== undefined) data.partnerName = partnerName;

    const updated = await prisma.tournamentRegistration.update({
      where: { id: Number(regId) },
      data,
    });

    return ApiResponse.success(res, 'Registration updated successfully', {
      ...updated,
      amount: Number(updated.amount),
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update registration', 500, error.message);
  }
};

export const exportParticipants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) } });
    if (!tournament) {
      return ApiResponse.error(res, 'Tournament not found', 404);
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: Number(id) },
      orderBy: { createdAt: 'desc' },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${tournament.name.replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}-participants.csv`
    );

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
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to export participants', 500, error.message);
  }
};

export const getTournamentRevenue = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
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

    return ApiResponse.success(res, 'Tournament revenue retrieved successfully', {
      tournaments: revenue,
      totalRevenue,
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to fetch tournament revenue', 500, error.message);
  }
};