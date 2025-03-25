import { Server } from 'socket.io';
import Message from './models/Message.js';
import Chat from './model/Chat.js';
import User from './model/User.js';

const socketSetup = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store online users
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins with their user ID
    socket.on('setup', (userData) => {
      socket.join(userData._id);
      socket.emit('connected');
      onlineUsers.set(userData._id, socket.id);
      io.emit('user-status-update', [...onlineUsers.keys()]);
    });

    // Join a chat room
    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    // Handle new message
    socket.on('new-message', async (messageData) => {
      try {
        const newMessage = await Message.create(messageData);
        await Chat.findByIdAndUpdate(messageData.chat, {
          latestMessage: newMessage._id,
          $inc: { unreadCount: 1 },
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name email role')
          .populate('chat');

        socket.to(messageData.chat).emit('message-received', populatedMessage);

        // Check if recipient is online and send notification
        const recipientIds = messageData.chat.users.filter(
          (userId) => userId.toString() !== messageData.sender.toString()
        );

        recipientIds.forEach((recipientId) => {
          if (onlineUsers.has(recipientId.toString())) {
            socket.to(recipientId.toString()).emit('new-message-notification', {
              chatId: messageData.chat,
              message: populatedMessage,
            });
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // Typing indicator
    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('typing', chatId);
    });

    socket.on('stop-typing', (chatId) => {
      socket.to(chatId).emit('stop-typing', chatId);
    });

    // Mark messages as read
    socket.on('mark-read', async (chatId, userId) => {
      try {
        await Chat.findByIdAndUpdate(chatId, { unreadCount: 0 });
        await Message.updateMany(
          { chat: chatId, sender: { $ne: userId } },
          { read: true }
        );
        socket.to(chatId).emit('messages-read', chatId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('user-status-update', [...onlineUsers.keys()]);
    });
  });

  return io;
};

export default socketSetup;
