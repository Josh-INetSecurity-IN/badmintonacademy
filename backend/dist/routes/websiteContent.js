"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const contentCtrl = __importStar(require("../controllers/websiteContent.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'));
// Hero slides
router.get('/hero-slides', contentCtrl.getHeroSlides);
router.post('/hero-slides', upload_1.upload.single('image'), contentCtrl.createHeroSlide);
router.put('/hero-slides/:id', upload_1.upload.single('image'), contentCtrl.updateHeroSlide);
router.delete('/hero-slides/:id', contentCtrl.deleteHeroSlide);
// Programs
router.get('/programs', contentCtrl.getPrograms);
router.post('/programs', upload_1.upload.single('image'), contentCtrl.createProgram);
router.put('/programs/:id', upload_1.upload.single('image'), contentCtrl.updateProgram);
router.delete('/programs/:id', contentCtrl.deleteProgram);
// Facilities
router.get('/facilities', contentCtrl.getFacilities);
router.post('/facilities', upload_1.upload.single('image'), contentCtrl.createFacility);
router.put('/facilities/:id', upload_1.upload.single('image'), contentCtrl.updateFacility);
router.delete('/facilities/:id', contentCtrl.deleteFacility);
// Gallery
router.get('/gallery', contentCtrl.getGalleryImages);
router.post('/gallery', upload_1.upload.single('image'), contentCtrl.uploadGalleryImage);
router.put('/gallery/:id', contentCtrl.updateGalleryImage);
router.delete('/gallery/:id', contentCtrl.deleteGalleryImage);
// Testimonials
router.get('/testimonials', contentCtrl.getTestimonials);
router.post('/testimonials', upload_1.upload.single('photo'), contentCtrl.createTestimonial);
router.put('/testimonials/:id', upload_1.upload.single('photo'), contentCtrl.updateTestimonial);
router.delete('/testimonials/:id', contentCtrl.deleteTestimonial);
// Enquiries
router.get('/enquiries', contentCtrl.getEnquiries);
router.put('/enquiries/:id', contentCtrl.updateEnquiryStatus);
router.delete('/enquiries/:id', contentCtrl.deleteEnquiry);
// Settings-based uploads (store path in AcademySetting group='website')
router.post('/upload-about-image', upload_1.upload.single('image'), contentCtrl.uploadAboutImage);
router.post('/upload-logo', upload_1.upload.single('image'), contentCtrl.uploadLogo);
exports.default = router;
//# sourceMappingURL=websiteContent.js.map