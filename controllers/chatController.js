import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

// Access or create a chat between user and admin
export const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId is required',
      });
    }

    // Find if a chat already exists between these users
    let chat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    chat = await User.populate(chat, {
      path: 'latestMessage.sender',
      select: 'name email pic',
    });

    if (chat.length > 0) {
      return res.status(200).json({
        success: true,
        chat: chat[0],
      });
    }

    // Create a new chat
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const chatData = {
      chatName: 'sender',
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate(
      'user',
      '-password'
    );

    return res.status(201).json({
      success: true,
      chat: fullChat,
    });
  } catch (error) {
    console.error('Access chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get all chats for a user
export const fetchChats = async (req, res) => {
  try {
    let chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'name email pic',
    });

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error('Fetch chats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Mark chat as read
export const markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Update chat unread count
    await Chat.findByIdAndUpdate(chatId, { unreadCount: 0 });

    // Mark all messages as read
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user._id },
      },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Chat marked as read',
    });
  } catch (error) {
    console.error('Mark chat as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
