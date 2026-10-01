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
const regularPlayerCtrl = __importStar(require("../controllers/regularPlayer.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', regularPlayerCtrl.getPlayers);
router.get('/expired', regularPlayerCtrl.getExpired);
router.get('/export', regularPlayerCtrl.exportPlayers);
router.get('/upcoming-sessions/:id', regularPlayerCtrl.getUpcomingSessions);
router.post('/', (0, auth_1.authorize)('super_admin', 'admin', 'staff'), regularPlayerCtrl.createPlayer);
router.post('/:id/photo', upload_1.upload.single('photo'), (0, auth_1.authorize)('super_admin', 'admin', 'staff'), regularPlayerCtrl.updatePhoto);
router.post('/:id/assign-batch', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.assignBatch);
router.post('/:id/remove-batch', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.removeFromBatch);
router.post('/:id/pause', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.pauseMembership);
router.post('/:id/resume', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.resumeMembership);
router.post('/:id/renew', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.renewSubscription);
router.get('/:id', regularPlayerCtrl.getPlayer);
router.put('/:id', (0, auth_1.authorize)('super_admin', 'admin', 'staff'), regularPlayerCtrl.updatePlayer);
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'admin'), regularPlayerCtrl.deletePlayer);
exports.default = router;
//# sourceMappingURL=regularPlayers.js.map