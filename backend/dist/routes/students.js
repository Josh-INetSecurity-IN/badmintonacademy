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
const studentCtrl = __importStar(require("../controllers/student.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', studentCtrl.getStudents);
router.get('/export', studentCtrl.exportStudents);
router.get('/by-batch/:batchId', studentCtrl.getStudentsByBatch);
router.post('/', (0, auth_1.authorize)('super_admin', 'admin', 'staff'), studentCtrl.createStudent);
router.post('/:id/photo', upload_1.upload.single('photo'), (0, auth_1.authorize)('super_admin', 'admin', 'staff'), studentCtrl.updateProfilePhoto);
router.post('/:id/assign-batch', (0, auth_1.authorize)('super_admin', 'admin'), studentCtrl.assignBatch);
router.post('/:id/transfer-batch', (0, auth_1.authorize)('super_admin', 'admin'), studentCtrl.transferBatch);
router.post('/:id/remove-batch', (0, auth_1.authorize)('super_admin', 'admin'), studentCtrl.removeFromBatch);
router.post('/:id/archive', (0, auth_1.authorize)('super_admin', 'admin'), studentCtrl.archiveStudent);
router.get('/:id', studentCtrl.getStudent);
router.put('/:id', (0, auth_1.authorize)('super_admin', 'admin', 'staff'), studentCtrl.updateStudent);
exports.default = router;
//# sourceMappingURL=students.js.map