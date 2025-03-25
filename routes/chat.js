import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  accessChat, 
  fetchChats,
  markChatAsRead
} from '../controllers/chatController.js';

const router = express.Router();

router.post('/',accessChat);
router.get('/', fetchChats);
router.put('/:chatId/read',markChatAsRead);

export default router;
