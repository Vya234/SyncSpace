import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    workspaceService
      .getMyWorkspaces()
      .then(setWorkspaces)
      .catch(() => setError('Could not load workspaces.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string) ?? '';
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const ws = await workspaceService.createWorkspace(title.trim());
      setWorkspaces((prev) => [ws, ...prev]);
      e.currentTarget.reset();
      // ensure any previous error banner is cleared after a successful create
      setError(null);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message ?? 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = (formData.get('workspaceId') as string) ?? '';
    if (!id.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const ws = await workspaceService.joinWorkspace(id.trim());
      setWorkspaces((prev) => {
        const exists = prev.find((w) => w._id === ws._id);
        return exists ? prev : [ws, ...prev];
      });
      navigate(`/workspace/${ws._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to join workspace.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Your workspaces</h2>
          <p className="text-sm text-slate-400">
            Create a new SyncSpace or join an existing one by ID.
          </p>
        </div>
      </div>

      {error && !creating && !joining && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-medium text-slate-100">Create workspace</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              name="title"
              placeholder="Weekly planning, Sprint board..."
              required
            />
            <Button type="submit" loading={creating} className="w-full">
              Create
            </Button>
          </form>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-medium text-slate-100">Join by ID</h3>
          <form onSubmit={handleJoin} className="space-y-3">
            <Input
              name="workspaceId"
              placeholder="Paste workspace ID"
              required
            />
            <Button type="submit" loading={joining} className="w-full">
              Join
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-100">Recent spaces</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-slate-500">No workspaces yet. Create your first one.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <li
                key={ws._id}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm hover:border-sky-500/60 hover:bg-slate-900"
                onClick={() => navigate(`/workspace/${ws._id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-100">{ws.title}</p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    {ws.members.length} members
                  </span>
                </div>
                {ws._id && (
                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    ID: <span className="font-mono">{ws._id}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

