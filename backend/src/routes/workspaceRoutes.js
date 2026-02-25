const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
  getWorkspace,
  getNotes,
  updateNotes,
  getMessages,
  exportNotes,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createWorkspace);
router.post('/join', joinWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', getWorkspace);
router.get('/:id/notes', getNotes);
router.put('/:id/notes', updateNotes);
router.get('/:id/messages', getMessages);
router.get('/:id/export', exportNotes);

module.exports = router;

