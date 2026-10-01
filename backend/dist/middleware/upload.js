"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type || 'profiles';
        const dir = path_1.default.join(config_1.config.uploadDir, type);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    }
    else {
        cb(new Error('Only images (jpg, png, gif, webp) and PDFs are allowed'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: config_1.config.maxFileSize },
    fileFilter,
});
//# sourceMappingURL=upload.js.map