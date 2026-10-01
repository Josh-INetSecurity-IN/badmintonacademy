import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as contentCtrl from '../controllers/websiteContent.controller';

const router = Router();

router.use(authenticate, authorize('super_admin', 'admin'));

// Hero slides
router.get('/hero-slides', contentCtrl.getHeroSlides);
router.post('/hero-slides', upload.single('image'), contentCtrl.createHeroSlide);
router.put('/hero-slides/:id', upload.single('image'), contentCtrl.updateHeroSlide);
router.delete('/hero-slides/:id', contentCtrl.deleteHeroSlide);

// Programs
router.get('/programs', contentCtrl.getPrograms);
router.post('/programs', upload.single('image'), contentCtrl.createProgram);
router.put('/programs/:id', upload.single('image'), contentCtrl.updateProgram);
router.delete('/programs/:id', contentCtrl.deleteProgram);

// Facilities
router.get('/facilities', contentCtrl.getFacilities);
router.post('/facilities', upload.single('image'), contentCtrl.createFacility);
router.put('/facilities/:id', upload.single('image'), contentCtrl.updateFacility);
router.delete('/facilities/:id', contentCtrl.deleteFacility);

// Gallery
router.get('/gallery', contentCtrl.getGalleryImages);
router.post('/gallery', upload.single('image'), contentCtrl.uploadGalleryImage);
router.put('/gallery/:id', contentCtrl.updateGalleryImage);
router.delete('/gallery/:id', contentCtrl.deleteGalleryImage);

// Testimonials
router.get('/testimonials', contentCtrl.getTestimonials);
router.post('/testimonials', upload.single('photo'), contentCtrl.createTestimonial);
router.put('/testimonials/:id', upload.single('photo'), contentCtrl.updateTestimonial);
router.delete('/testimonials/:id', contentCtrl.deleteTestimonial);

// Enquiries
router.get('/enquiries', contentCtrl.getEnquiries);
router.put('/enquiries/:id', contentCtrl.updateEnquiryStatus);
router.delete('/enquiries/:id', contentCtrl.deleteEnquiry);

// Settings-based uploads (store path in AcademySetting group='website')
router.post('/upload-about-image', upload.single('image'), contentCtrl.uploadAboutImage);
router.post('/upload-logo', upload.single('image'), contentCtrl.uploadLogo);

export default router;