import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const ENQUIRY_STATUSES = ['new', 'contacted', 'closed'];

const imagePath = (req: AuthRequest): string => {
  const folder = String(req.query.type || 'website');
  return `/uploads/${folder}/${req.file!.filename}`;
};

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) ? id : NaN;
};

const toPlain = (item: any) => ({ ...item });

function clampRating(rating: any): number | null {
  const n = Number(rating);
  if (isNaN(n) || n < 0) return null;
  return Math.min(Math.max(Math.round(n), 0), 5);
}

// -------------------- Hero Slides --------------------

export const getHeroSlides = async (req: AuthRequest, res: Response) => {
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return ApiResponse.success(res, 'Hero slides retrieved', slides);
  } catch (error: any) {
    logger.error('getHeroSlides error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch hero slides', 500, error.message);
  }
};

export const createHeroSlide = async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, ctaText, ctaLink, sortOrder, isActive } = req.body;
    if (!req.file && !req.body.image) {
      return ApiResponse.error(res, 'Hero slide image is required', 400);
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title: title || null,
        subtitle: subtitle || null,
        image: req.file ? imagePath(req) : req.body.image,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
      },
    });

    return ApiResponse.created(res, 'Hero slide created', slide);
  } catch (error: any) {
    logger.error('createHeroSlide error:', error.message);
    return ApiResponse.error(res, 'Failed to create hero slide', 500, error.message);
  }
};

export const updateHeroSlide = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid hero slide id', 400);

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Hero slide not found', 404);

    const { title, subtitle, ctaText, ctaLink, sortOrder, isActive } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (ctaText !== undefined) data.ctaText = ctaText;
    if (ctaLink !== undefined) data.ctaLink = ctaLink;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = isActive === true || isActive === 'true';
    if (req.file) data.image = imagePath(req);
    else if (req.body.image) data.image = req.body.image;

    const slide = await prisma.heroSlide.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'heroSlide',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(slide),
      },
    });

    return ApiResponse.success(res, 'Hero slide updated', toPlain(slide));
  } catch (error: any) {
    logger.error('updateHeroSlide error:', error.message);
    return ApiResponse.error(res, 'Failed to update hero slide', 500, error.message);
  }
};

export const deleteHeroSlide = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid hero slide id', 400);

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Hero slide not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'heroSlide',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.heroSlide.delete({ where: { id } });
    return ApiResponse.success(res, 'Hero slide deleted');
  } catch (error: any) {
    logger.error('deleteHeroSlide error:', error.message);
    return ApiResponse.error(res, 'Failed to delete hero slide', 500, error.message);
  }
};

// -------------------- Coaching Programs --------------------

export const getPrograms = async (req: AuthRequest, res: Response) => {
  try {
    const programs = await prisma.coachingProgram.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return ApiResponse.success(res, 'Coaching programs retrieved', programs);
  } catch (error: any) {
    logger.error('getPrograms error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch coaching programs', 500, error.message);
  }
};

export const createProgram = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, ageGroup, skillLevel, feeDisplay, isActive, sortOrder } = req.body;
    if (!title) return ApiResponse.error(res, 'Program title is required', 400);

    const program = await prisma.coachingProgram.create({
      data: {
        title,
        description: description || null,
        image: req.file ? imagePath(req) : req.body.image || null,
        ageGroup: ageGroup || null,
        skillLevel: skillLevel || null,
        feeDisplay: feeDisplay || null,
        isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      },
    });

    return ApiResponse.created(res, 'Coaching program created', program);
  } catch (error: any) {
    logger.error('createProgram error:', error.message);
    return ApiResponse.error(res, 'Failed to create coaching program', 500, error.message);
  }
};

export const updateProgram = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid program id', 400);

    const existing = await prisma.coachingProgram.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Coaching program not found', 404);

    const { title, description, ageGroup, skillLevel, feeDisplay, isActive, sortOrder } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (ageGroup !== undefined) data.ageGroup = ageGroup;
    if (skillLevel !== undefined) data.skillLevel = skillLevel;
    if (feeDisplay !== undefined) data.feeDisplay = feeDisplay;
    if (isActive !== undefined) data.isActive = isActive === true || isActive === 'true';
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (req.file) data.image = imagePath(req);
    else if (req.body.image) data.image = req.body.image;

    const program = await prisma.coachingProgram.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'coachingProgram',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(program),
      },
    });

    return ApiResponse.success(res, 'Coaching program updated', toPlain(program));
  } catch (error: any) {
    logger.error('updateProgram error:', error.message);
    return ApiResponse.error(res, 'Failed to update coaching program', 500, error.message);
  }
};

export const deleteProgram = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid program id', 400);

    const existing = await prisma.coachingProgram.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Coaching program not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'coachingProgram',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.coachingProgram.delete({ where: { id } });
    return ApiResponse.success(res, 'Coaching program deleted');
  } catch (error: any) {
    logger.error('deleteProgram error:', error.message);
    return ApiResponse.error(res, 'Failed to delete coaching program', 500, error.message);
  }
};

// -------------------- Facilities --------------------

export const getFacilities = async (req: AuthRequest, res: Response) => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return ApiResponse.success(res, 'Facilities retrieved', facilities);
  } catch (error: any) {
    logger.error('getFacilities error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch facilities', 500, error.message);
  }
};

export const createFacility = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, icon, isActive, sortOrder } = req.body;
    if (!title) return ApiResponse.error(res, 'Facility title is required', 400);

    const facility = await prisma.facility.create({
      data: {
        title,
        description: description || null,
        image: req.file ? imagePath(req) : req.body.image || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      },
    });

    return ApiResponse.created(res, 'Facility created', facility);
  } catch (error: any) {
    logger.error('createFacility error:', error.message);
    return ApiResponse.error(res, 'Failed to create facility', 500, error.message);
  }
};

export const updateFacility = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid facility id', 400);

    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Facility not found', 404);

    const { title, description, icon, isActive, sortOrder } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (isActive !== undefined) data.isActive = isActive === true || isActive === 'true';
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (req.file) data.image = imagePath(req);
    else if (req.body.image) data.image = req.body.image;

    const facility = await prisma.facility.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'facility',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(facility),
      },
    });

    return ApiResponse.success(res, 'Facility updated', toPlain(facility));
  } catch (error: any) {
    logger.error('updateFacility error:', error.message);
    return ApiResponse.error(res, 'Failed to update facility', 500, error.message);
  }
};

export const deleteFacility = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid facility id', 400);

    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Facility not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'facility',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.facility.delete({ where: { id } });
    return ApiResponse.success(res, 'Facility deleted');
  } catch (error: any) {
    logger.error('deleteFacility error:', error.message);
    return ApiResponse.error(res, 'Failed to delete facility', 500, error.message);
  }
};

// -------------------- Gallery --------------------

export const getGalleryImages = async (req: AuthRequest, res: Response) => {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    });
    return ApiResponse.success(res, 'Gallery images retrieved', images);
  } catch (error: any) {
    logger.error('getGalleryImages error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch gallery images', 500, error.message);
  }
};

export const uploadGalleryImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Gallery image is required', 400);
    }

    const { title, category, caption, sortOrder, isPublished } = req.body;

    const image = await prisma.galleryImage.create({
      data: {
        title: title || null,
        image: imagePath(req),
        category: category || null,
        caption: caption || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isPublished: isPublished !== undefined ? isPublished === true || isPublished === 'true' : true,
      },
    });

    return ApiResponse.created(res, 'Gallery image uploaded', image);
  } catch (error: any) {
    logger.error('uploadGalleryImage error:', error.message);
    return ApiResponse.error(res, 'Failed to upload gallery image', 500, error.message);
  }
};

export const updateGalleryImage = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid gallery image id', 400);

    const existing = await prisma.galleryImage.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Gallery image not found', 404);

    const { title, category, caption, sortOrder, isPublished } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (category !== undefined) data.category = category;
    if (caption !== undefined) data.caption = caption;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isPublished !== undefined) data.isPublished = isPublished === true || isPublished === 'true';

    const image = await prisma.galleryImage.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'galleryImage',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(image),
      },
    });

    return ApiResponse.success(res, 'Gallery image updated', toPlain(image));
  } catch (error: any) {
    logger.error('updateGalleryImage error:', error.message);
    return ApiResponse.error(res, 'Failed to update gallery image', 500, error.message);
  }
};

export const deleteGalleryImage = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid gallery image id', 400);

    const existing = await prisma.galleryImage.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Gallery image not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'galleryImage',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.galleryImage.delete({ where: { id } });
    return ApiResponse.success(res, 'Gallery image deleted');
  } catch (error: any) {
    logger.error('deleteGalleryImage error:', error.message);
    return ApiResponse.error(res, 'Failed to delete gallery image', 500, error.message);
  }
};

// -------------------- Testimonials --------------------

export const getTestimonials = async (req: AuthRequest, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }],
    });
    return ApiResponse.success(res, 'Testimonials retrieved', testimonials);
  } catch (error: any) {
    logger.error('getTestimonials error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch testimonials', 500, error.message);
  }
};

export const createTestimonial = async (req: AuthRequest, res: Response) => {
  try {
    const { name, testimonial, rating, isPublished } = req.body;
    if (!name || !testimonial) {
      return ApiResponse.error(res, 'Name and testimonial are required', 400);
    }

    const created = await prisma.testimonial.create({
      data: {
        name,
        photo: req.file ? imagePath(req) : req.body.photo || null,
        testimonial,
        rating: rating !== undefined ? clampRating(rating) : null,
        isPublished: isPublished !== undefined ? isPublished === true || isPublished === 'true' : true,
      },
    });

    return ApiResponse.created(res, 'Testimonial created', created);
  } catch (error: any) {
    logger.error('createTestimonial error:', error.message);
    return ApiResponse.error(res, 'Failed to create testimonial', 500, error.message);
  }
};

export const updateTestimonial = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid testimonial id', 400);

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Testimonial not found', 404);

    const { name, testimonial, rating, isPublished } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (testimonial !== undefined) data.testimonial = testimonial;
    if (rating !== undefined) data.rating = clampRating(rating);
    if (isPublished !== undefined) data.isPublished = isPublished === true || isPublished === 'true';
    if (req.file) data.photo = imagePath(req);
    else if (req.body.photo) data.photo = req.body.photo;

    const updated = await prisma.testimonial.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'testimonial',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(updated),
      },
    });

    return ApiResponse.success(res, 'Testimonial updated', toPlain(updated));
  } catch (error: any) {
    logger.error('updateTestimonial error:', error.message);
    return ApiResponse.error(res, 'Failed to update testimonial', 500, error.message);
  }
};

export const deleteTestimonial = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid testimonial id', 400);

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Testimonial not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'testimonial',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.testimonial.delete({ where: { id } });
    return ApiResponse.success(res, 'Testimonial deleted');
  } catch (error: any) {
    logger.error('deleteTestimonial error:', error.message);
    return ApiResponse.error(res, 'Failed to delete testimonial', 500, error.message);
  }
};

// -------------------- Enquiries --------------------

export const getEnquiries = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
      if (!ENQUIRY_STATUSES.includes(where.status)) {
        return ApiResponse.error(res, 'Invalid status', 400);
      }
    }

    const skip = (page - 1) * limit;
    const [enquiries, total] = await Promise.all([
      prisma.contactEnquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactEnquiry.count({ where }),
    ]);

    return ApiResponse.paginated(res, enquiries, total, page, limit);
  } catch (error: any) {
    logger.error('getEnquiries error:', error.message);
    return ApiResponse.error(res, 'Failed to fetch enquiries', 500, error.message);
  }
};

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, subject, message, source } = req.body;

    if (!name || !phone || !message) {
      return ApiResponse.error(res, 'Name, phone and message are required', 400);
    }

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name,
        phone,
        email: email || null,
        subject: subject || null,
        message,
        source: source || 'website',
      },
    });

    return ApiResponse.created(res, 'Enquiry submitted successfully', enquiry);
  } catch (error: any) {
    logger.error('createEnquiry error:', error.message);
    return ApiResponse.error(res, 'Failed to submit enquiry', 500, error.message);
  }
};

export const updateEnquiryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid enquiry id', 400);

    const existing = await prisma.contactEnquiry.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Enquiry not found', 404);

    const { status, notes } = req.body;
    const data: any = {};
    if (status !== undefined) {
      if (!ENQUIRY_STATUSES.includes(status)) {
        return ApiResponse.error(res, `Status must be one of: ${ENQUIRY_STATUSES.join(', ')}`, 400);
      }
      data.status = status;
    }
    if (notes !== undefined) data.notes = notes;

    if (Object.keys(data).length === 0) {
      return ApiResponse.error(res, 'Nothing to update', 400);
    }

    const enquiry = await prisma.contactEnquiry.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'update',
        entityType: 'contactEnquiry',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(enquiry),
      },
    });

    return ApiResponse.success(res, 'Enquiry updated', toPlain(enquiry));
  } catch (error: any) {
    logger.error('updateEnquiryStatus error:', error.message);
    return ApiResponse.error(res, 'Failed to update enquiry', 500, error.message);
  }
};

export const deleteEnquiry = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return ApiResponse.error(res, 'Invalid enquiry id', 400);

    const existing = await prisma.contactEnquiry.findUnique({ where: { id } });
    if (!existing) return ApiResponse.error(res, 'Enquiry not found', 404);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'delete',
        entityType: 'contactEnquiry',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    await prisma.contactEnquiry.delete({ where: { id } });
    return ApiResponse.success(res, 'Enquiry deleted');
  } catch (error: any) {
    logger.error('deleteEnquiry error:', error.message);
    return ApiResponse.error(res, 'Failed to delete enquiry', 500, error.message);
  }
};

// -------------------- Settings-based uploads --------------------

const upsertSettingImage = async (key: string, req: AuthRequest) => {
  return prisma.academySetting.upsert({
    where: { key },
    update: { value: imagePath(req), group: 'website', type: 'image' },
    create: { key, value: imagePath(req), group: 'website', type: 'image' },
  });
};

export const uploadAboutImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'About image is required', 400);
    }
    const setting = await upsertSettingImage('about_image', req);
    return ApiResponse.success(res, 'About image uploaded', {
      key: setting.key,
      image: setting.value,
    });
  } catch (error: any) {
    logger.error('uploadAboutImage error:', error.message);
    return ApiResponse.error(res, 'Failed to upload about image', 500, error.message);
  }
};

export const uploadLogo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Logo is required', 400);
    }
    const setting = await upsertSettingImage('logo', req);
    return ApiResponse.success(res, 'Logo uploaded', {
      key: setting.key,
      image: setting.value,
    });
  } catch (error: any) {
    logger.error('uploadLogo error:', error.message);
    return ApiResponse.error(res, 'Failed to upload logo', 500, error.message);
  }
};