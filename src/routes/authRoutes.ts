import express from 'express';
import { register, login, getMe, getAllUsers } from '../controllers/authController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', protect as any, authorize('Admin') as any, register);
router.post('/login', login);
router.get('/me', protect as any, getMe);
router.get('/users', protect as any, getAllUsers as any);

export default router;
