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
const guestCtrl = __importStar(require("../controllers/guestBooking.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', guestCtrl.getBookings);
router.get('/daily', guestCtrl.getDailyBookings);
router.get('/revenue', guestCtrl.getRevenue);
router.post('/', guestCtrl.createBooking);
router.post('/:id/cancel', guestCtrl.cancelBooking);
router.post('/:id/complete', guestCtrl.completeBooking);
router.post('/:id/convert-regular', (0, auth_1.authorize)('super_admin', 'admin'), guestCtrl.convertToRegular);
router.get('/:id', guestCtrl.getBooking);
router.put('/:id', guestCtrl.updateBooking);
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'admin'), guestCtrl.deleteBooking);
exports.default = router;
//# sourceMappingURL=guestBookings.js.map