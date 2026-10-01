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
const batchCtrl = __importStar(require("../controllers/coachingBatch.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', batchCtrl.getBatches);
router.get('/calendar', batchCtrl.getBatchCalendar);
router.get('/:id', batchCtrl.getBatch);
router.get('/:id/roster', batchCtrl.getBatchRoster);
router.post('/', (0, auth_1.authorize)('super_admin', 'admin'), batchCtrl.createBatch);
router.post('/:id/students', (0, auth_1.authorize)('super_admin', 'admin'), batchCtrl.assignStudents);
router.put('/:id', (0, auth_1.authorize)('super_admin', 'admin'), batchCtrl.updateBatch);
router.delete('/:id/students/:studentId', (0, auth_1.authorize)('super_admin', 'admin'), batchCtrl.removeStudent);
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'admin'), batchCtrl.deleteBatch);
exports.default = router;
//# sourceMappingURL=coachingBatches.js.map