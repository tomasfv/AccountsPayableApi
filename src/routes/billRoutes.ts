import express from 'express';
import {
  getAllBills,
  getBillById,
  createBill,
  approveBill,
  schedulePayment,
  executePayment
} from '../controllers/billController';
import { protect, authorize } from '../middleware/authMiddleware';
import upload from '../middleware/upload';

const router = express.Router();

router.get('/', protect as any, getAllBills);
router.get('/:id', protect as any, getBillById);
router.post('/', protect as any, upload.single('file'), createBill as any);
router.post('/:id/approve', protect as any, authorize('Admin', 'Approver') as any, approveBill as any);
router.post('/:id/schedule', protect as any, authorize('Admin', 'Approver') as any, schedulePayment);
router.post('/:id/pay', protect as any, authorize('Admin') as any, executePayment);

export default router;
