import express from 'express';
import { getCards, createCard, updateCard, deleteCard } from '../controllers/cardController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect as any, getCards);
router.post('/', protect as any, createCard as any);
router.put('/:id', protect as any, updateCard as any);
router.delete('/:id', protect as any, deleteCard as any);

export default router;
