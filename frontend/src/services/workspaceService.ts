import { api } from './api';
import type { Workspace } from '../types';

export const workspaceService = {
  async getMyWorkspaces(): Promise<Workspace[]> {
    const res = await api.get<Workspace[]>('/workspaces');
    return res.data;
  },

  async createWorkspace(title: string): Promise<Workspace> {
    const res = await api.post<Workspace>('/workspaces', { title });
    return res.data;
  },

  async joinWorkspace(workspaceId: string): Promise<Workspace> {
    const res = await api.post<Workspace>('/workspaces/join', { workspaceId });
    return res.data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const res = await api.get<Workspace>(`/workspaces/${id}`);
    return res.data;
  },
};

