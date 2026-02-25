const PDFDocument = require('pdfkit');
const Workspace = require('../models/Workspace');
const Message = require('../models/Message');
const httpError = require('../utils/httpError');

async function createWorkspace(req, res, next) {
  try {
    const { title } = req.body;
    if (!title) {
      throw httpError(400, 'Title is required');
    }

    if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 140) {
      throw httpError(400, 'Title must be between 2 and 140 characters');
    }

    const workspace = await Workspace.create({
      title,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
}

async function joinWorkspace(req, res, next) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      throw httpError(400, 'workspaceId is required');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw httpError(404, 'Workspace not found');
    }

    const isMember = workspace.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      workspace.members.push(req.user._id);
      await workspace.save();
    }

    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

async function getMyWorkspaces(req, res, next) {
  try {
    const workspaces = await Workspace.find({
      members: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(workspaces);
  } catch (err) {
    next(err);
  }
}

async function getWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      throw httpError(404, 'Workspace not found');
    }
    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

async function getNotes(req, res, next) {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      throw httpError(404, 'Workspace not found');
    }
    res.json({ content: workspace.noteContent || '' });
  } catch (err) {
    next(err);
  }
}

async function updateNotes(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (content != null && typeof content !== 'string') {
      throw httpError(400, 'content must be a string');
    }

    const maxLength = 20000;
    if (typeof content === 'string' && content.length > maxLength) {
      throw httpError(413, 'Note content is too large');
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      throw httpError(404, 'Workspace not found');
    }

    workspace.noteContent = content || '';
    await workspace.save();

    res.json({ content: workspace.noteContent });
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { id } = req.params;

    const messages = await Message.find({ workspace: id })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('sender', 'name email');

    res.json(
      messages.map((m) => ({
        id: m._id,
        content: m.content,
        senderName: m.sender.name,
        senderEmail: m.sender.email,
        senderId: m.sender._id,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function exportNotes(req, res, next) {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      throw httpError(404, 'Workspace not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${workspace.title.replace(/\s+/g, '_')}.pdf"`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    const timestamp = new Date().toISOString();

    doc.fontSize(20).text('SyncSpace Notes Export', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Workspace: ${workspace.title}`);
    doc.fontSize(12).text(`Exported at: ${timestamp}`);
    doc.moveDown();
    doc.fontSize(12).text('Notes:', { underline: true });
    doc.moveDown();

    doc.fontSize(12).text(workspace.noteContent || '');

    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
  getWorkspace,
  getNotes,
  updateNotes,
  getMessages,
  exportNotes,
};

