'use client';

import React, { useEffect, useState } from 'react';
import { AdminNav } from '@/components/layout/AdminNav';
import { useProjectStore } from '@/store/projectStore';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getAPIClient } from '@/lib/api';
import { Project, ProjectMember } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FolderKanban,
  Plus,
  Users,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminProjectsPage() {
  const { isAuthenticated } = useAdminAuth();
  const {
    projects,
    members,
    isLoading,
    error,
    loadMembers,
    createProject,
    addMember,
    removeMember,
  } = useProjectStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [allTeams, setAllTeams] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  // Load all teams (not just user's teams) for admin view
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const api = getAPIClient();
        const teams = await api.listTeams();
        setAllTeams(teams);
      } catch {
        // fallback to user's projects
      }
    };
    fetchTeams();
  }, [projects]);

  // Load users for add-member dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const api = getAPIClient();
        const users = await api.listUsers();
        setAllUsers(users);
      } catch {
        // ignore
      }
    };
    fetchUsers();
  }, []);

  const handleExpandProject = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      return;
    }
    setExpandedProjectId(projectId);
    await loadMembers(projectId);
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      await createProject(newProject.name, newProject.description || undefined);
      setNewProject({ name: '', description: '' });
      setShowCreateModal(false);
      // Refresh all teams
      const api = getAPIClient();
      const teams = await api.listTeams();
      setAllTeams(teams);
    } catch {
      // error handled by store
    }
  };

  const handleAddMember = async (projectId: string) => {
    if (!addMemberUserId) return;
    const prevProjectId = useProjectStore.getState().currentProjectId;
    // Temporarily set current project for the addMember call
    useProjectStore.getState().setCurrentProject(projectId);
    await addMember(addMemberUserId);
    // Restore
    useProjectStore.getState().setCurrentProject(prevProjectId);
    setAddMemberUserId('');
    await loadMembers(projectId);
  };

  const handleRemoveMember = async (projectId: string, memberId: string) => {
    const prevProjectId = useProjectStore.getState().currentProjectId;
    useProjectStore.getState().setCurrentProject(projectId);
    await removeMember(memberId);
    useProjectStore.getState().setCurrentProject(prevProjectId);
    await loadMembers(projectId);
  };

  if (!isAuthenticated) return null;

  const displayProjects = allTeams.length > 0 ? allTeams : projects;

  const getUserName = (userId: string) => {
    const u = allUsers.find((u) => u.id === userId);
    return u?.name || u?.email || userId;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminNav />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage projects and team members
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Project List */}
          {isLoading && displayProjects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : displayProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No projects yet. Create your first one!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayProjects.map((project) => {
                const isExpanded = expandedProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                  >
                    {/* Project header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => handleExpandProject(project.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600 flex-shrink-0">
                        <FolderKanban className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-slate-500 truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    {/* Expanded: members */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase">
                            Members
                          </h4>
                        </div>

                        {/* Member list */}
                        {members.length === 0 ? (
                          <p className="text-xs text-slate-400">No members yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {members.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50"
                              >
                                <span className="text-sm text-slate-700">
                                  {getUserName(member.userId)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {member.role && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                      {member.role}
                                    </span>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(project.id, member.id)
                                    }
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add member */}
                        <div className="flex gap-2 mt-2">
                          <select
                            value={addMemberUserId}
                            onChange={(e) => setAddMemberUserId(e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">Select user...</option>
                            {allUsers
                              .filter(
                                (u) =>
                                  !members.some((m) => m.userId === u.id)
                              )
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name || u.email}
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddMember(project.id)}
                            disabled={!addMemberUserId}
                            className="gap-1"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize frames and conversations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
                placeholder="Project name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
                placeholder="Brief description"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
