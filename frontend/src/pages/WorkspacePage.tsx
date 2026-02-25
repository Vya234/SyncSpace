import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';
import { noteService } from '../services/noteService';
import { chatService } from '../services/chatService';
import {
  ActiveUsers,
} from '../components/ActiveUsers';
import { NotesEditor } from '../components/NotesEditor';
import { ChatPanel } from '../components/ChatPanel';
import { Button } from '../components/ui/Button';
import type { ActiveUser, ChatMessage, Workspace } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  connectSocket,
  disconnectSocket,
  joinWorkspace,
  leaveWorkspace,
  sendMessage,
  sendNoteChange,
  subscribeToMessages,
  subscribeToNoteChange,
  subscribeToUsers,
} from '../services/socket';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notes, setNotes] = useState('');
  const [remoteUpdating, setRemoteUpdating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    async function load() {
      try {
        const [ws, noteContent, chat] = await Promise.all([
          workspaceService.getWorkspace(workspaceId),
          noteService.getNotes(workspaceId),
          chatService.getMessages(workspaceId),
        ]);
        if (cancelled) return;
        setWorkspace(ws);
        setNotes(noteContent);
        setMessages(chat);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response?.data?.message ?? 'Failed to load workspace.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !user) return;

    const token = localStorage.getItem('syncspace_token') ?? '';
    const socket = connectSocket(token);

    joinWorkspace(workspaceId);

    subscribeToNoteChange((content) => {
      setRemoteUpdating(true);
      setNotes(content);
      window.setTimeout(() => setRemoteUpdating(false), 150);
    });

    subscribeToMessages((message) => {
      setMessages((prev) => [...prev, message]);
    });

    subscribeToUsers((users) => {
      setActiveUsers(users);
    });

    return () => {
      leaveWorkspace();
      socket.off('noteChange');
      socket.off('message');
      socket.off('userConnected');
      socket.off('userDisconnected');
      disconnectSocket();
    };
  }, [workspaceId, user]);

  const persistNotes = useDebouncedCallback(async (content: string) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await noteService.updateNotes(workspaceId, content);
    } catch (err) {
      // Log and keep UI responsive; socket keeps peers in sync.
      // eslint-disable-next-line no-console
      console.error('Failed to persist notes', err);
    } finally {
      setSaving(false);
    }
  }, 700);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (!workspaceId || !user) return;
    sendNoteChange(workspaceId, value);
    persistNotes(value);
  };

  const handleSendMessage = (content: string) => {
    if (!workspaceId || !user) return;
    sendMessage(workspaceId, user.id, content, user.name);
  };

  const handleExport = async () => {
    if (!workspaceId) return;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('syncspace_token') ?? '';

    try {
      const res = await fetch(`${apiBase}/api/workspaces/${workspaceId}/export`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error('Failed to export notes');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workspace?.title || 'notes'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export failed', err);
    }
  };

  const handleLeave = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center">
        <p className="text-sm text-slate-400">Loading workspace...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-300">{error ?? 'Workspace not found.'}</p>
        <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:py-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{workspace.title}</h2>
          <p className="text-xs text-slate-500">
            Share this workspace ID to invite others:{' '}
            <span className="font-mono text-slate-300">{workspace._id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleExport}
            className="border border-sky-500/60 bg-sky-600 px-4 py-1.5 text-xs text-slate-50 hover:bg-sky-500"
          >
            Export notes PDF
          </Button>
          <Button
            type="button"
            onClick={handleLeave}
            className="border border-slate-600 bg-slate-800 px-4 py-1.5 text-xs text-slate-50 hover:bg-slate-700"
          >
            Leave workspace
          </Button>
          {saving && (
            <span className="text-xs text-slate-500">Saving changes...</span>
          )}
          {!saving && remoteUpdating && (
            <span className="text-xs text-slate-500">Updated from collaborator</span>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-4 md:grid-cols-[220px_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <div className="space-y-3">
          <ActiveUsers users={activeUsers} />
        </div>
        <div className="flex min-h-[320px] flex-col">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Notes</span>
            <span className="text-[10px]">
              Autosaves every 700ms • Real-time for everyone in this space
            </span>
          </div>
          <div className="flex-1">
            <NotesEditor
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Capture decisions, ideas, and action items here..."
            />
          </div>
        </div>
        <div className="min-h-[320px]">
          <ChatPanel messages={messages} onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
}

