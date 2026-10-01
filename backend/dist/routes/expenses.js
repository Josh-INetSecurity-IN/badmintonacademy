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
const expenseCtrl = __importStar(require("../controllers/expense.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', expenseCtrl.getExpenses);
router.get('/categories', expenseCtrl.getExpenseCategories);
router.get('/summary', expenseCtrl.getExpenseSummary);
router.get('/export', expenseCtrl.exportExpenses);
router.post('/', (0, auth_1.authorize)('super_admin', 'admin', 'staff'), expenseCtrl.createExpense);
router.post('/:id/receipt', upload_1.upload.single('receipt'), (0, auth_1.authorize)('super_admin', 'admin'), expenseCtrl.uploadReceipt);
router.put('/:id', (0, auth_1.authorize)('super_admin', 'admin'), expenseCtrl.updateExpense);
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'admin'), expenseCtrl.deleteExpense);
exports.default = router;
//# sourceMappingURL=expenses.js.map