import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { content, chatId, attachments = [] } = req.body;

    if (!content && attachments.length === 0) {
      return res.status(400).json({ success: false, message: 'Message content or attachments required' });
    }

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    // Create new message
    const newMessage = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      attachments,
    });

    // Update the chat's latest message and increment unread count
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: newMessage._id,
      $inc: { unreadCount: 1 },
    });

    // Populate sender and chat data
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email pic')
      .populate('chat');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all messages for a chat
export const fetchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email pic')
      .populate('chat')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
