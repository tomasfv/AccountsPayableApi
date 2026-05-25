"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vendorController_1 = require("../controllers/vendorController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, vendorController_1.getAllVendors);
router.get('/:id', authMiddleware_1.protect, vendorController_1.getVendorById);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('Admin'), vendorController_1.createVendor);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('Admin'), vendorController_1.updateVendor);
exports.default = router;
