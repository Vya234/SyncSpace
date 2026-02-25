const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// workspaceId -> Map<userId, { name, socketIds: Set<string> }>
const activeUsersByWorkspace = new Map();

function getActiveUsersList(workspaceId) {
  const map = activeUsersByWorkspace.get(workspaceId);
  if (!map) return [];
  return Array.from(map.entries()).map(([userId, value]) => ({
    userId,
    name: value.name,
  }));
}

function registerSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      const user = await User.findById(decoded.id).select('name');
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.data.userId = user._id.toString();
      socket.data.name = user.name;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinWorkspace', async ({ workspaceId }) => {
      const userId = socket.data.userId;
      const name = socket.data.name;
      if (!workspaceId || !userId) return;

      try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return;

        const isMember = workspace.members.some(
          (m) => m.toString() === userId.toString(),
        );
        if (!isMember) {
          workspace.members.push(userId);
          await workspace.save();
        }

        socket.join(workspaceId);
        socket.data.workspaceId = workspaceId;

        let userMap = activeUsersByWorkspace.get(workspaceId);
        if (!userMap) {
          userMap = new Map();
          activeUsersByWorkspace.set(workspaceId, userMap);
        }

        const existing = userMap.get(userId) || { name, socketIds: new Set() };
        existing.name = name || existing.name;
        existing.socketIds.add(socket.id);
        userMap.set(userId, existing);

        io.to(workspaceId).emit('userConnected', {
          workspaceId,
          users: getActiveUsersList(workspaceId),
        });
      } catch (err) {
        console.error('Error in joinWorkspace socket handler', err);
      }
    });

    socket.on('leaveWorkspace', () => {
      const { workspaceId, userId } = socket.data;
      if (!workspaceId || !userId) return;

      socket.leave(workspaceId);

      const userMap = activeUsersByWorkspace.get(workspaceId);
      if (userMap) {
        const entry = userMap.get(userId);
        if (entry) {
          entry.socketIds.delete(socket.id);
          if (entry.socketIds.size === 0) {
            userMap.delete(userId);
          }
        }
        if (userMap.size === 0) {
          activeUsersByWorkspace.delete(workspaceId);
        }
      }

      io.to(workspaceId).emit('userDisconnected', {
        workspaceId,
        users: getActiveUsersList(workspaceId),
      });
    });

    socket.on('noteChange', ({ content }) => {
      const { workspaceId } = socket.data;
      if (!workspaceId) return;
      socket.to(workspaceId).emit('noteChange', { content });
    });

    socket.on('sendMessage', async ({ workspaceId, content }) => {
      const userId = socket.data.userId;
      const name = socket.data.name;
      const roomId = socket.data.workspaceId;

      if (!workspaceId || !userId || !content || workspaceId !== roomId) return;

      const trimmed = String(content).trim();
      if (!trimmed) return;
      if (trimmed.length > 2000) return;

      try {
        const message = await Message.create({
          workspace: workspaceId,
          sender: userId,
          content: trimmed,
        });

        io.to(workspaceId).emit('message', {
          id: message._id,
          content: message.content,
          senderId: userId,
          senderName: name,
          createdAt: message.createdAt,
        });
      } catch (err) {
        // For simplicity log and ignore; REST will still work
        console.error('Error saving message from socket:', err);
      }
    });

    socket.on('disconnect', () => {
      const { workspaceId, userId } = socket.data;
      if (!workspaceId || !userId) return;

      const userMap = activeUsersByWorkspace.get(workspaceId);
      if (userMap) {
        const entry = userMap.get(userId);
        if (entry) {
          entry.socketIds.delete(socket.id);
          if (entry.socketIds.size === 0) {
            userMap.delete(userId);
          }
        }
        if (userMap.size === 0) {
          activeUsersByWorkspace.delete(workspaceId);
        }
      }

      io.to(workspaceId).emit('userDisconnected', {
        workspaceId,
        users: getActiveUsersList(workspaceId),
      });
    });
  });
}

module.exports = registerSocketHandlers;

