import express from 'express';
import { getAllVendors, getVendorById, createVendor, updateVendor } from '../controllers/vendorController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect as any, getAllVendors);
router.get('/:id', protect as any, getVendorById);
router.post('/', protect as any, authorize('Admin') as any, createVendor);
router.put('/:id', protect as any, authorize('Admin') as any, updateVendor);

export default router;
