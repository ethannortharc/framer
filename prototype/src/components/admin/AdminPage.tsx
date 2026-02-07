'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Plus, Trash2, LogIn, UserPlus } from 'lucide-react';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

interface PBUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  verified: boolean;
  created: string;
}

interface PBTeam {
  id: string;
  name: string;
  description?: string;
  created: string;
}

export function AdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [users, setUsers] = useState<PBUser[]>([]);
  const [teams, setTeams] = useState<PBTeam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New user form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('engineer');

  // New team form
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const adminLogin = async () => {
    setLoginError(null);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Invalid admin credentials');
      }

      const data = await response.json();
      setAdminToken(data.token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const fetchUsers = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records?perPage=200`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const data = await response.json();
      setUsers(data.items || []);
    } catch {
      console.warn('Failed to fetch users');
    }
    setIsLoading(false);
  };

  const fetchTeams = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records?perPage=200`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const data = await response.json();
      setTeams(data.items || []);
    } catch {
      console.warn('Failed to fetch teams');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (adminToken) {
      fetchUsers();
      fetchTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const createUser = async () => {
    if (!adminToken) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/users/records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword,
            passwordConfirm: newUserPassword,
            name: newUserName,
            role: newUserRole,
          }),
        }
      );
      setShowNewUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('engineer');
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!adminToken || !confirm('Delete this user?')) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const createTeam = async () => {
    if (!adminToken) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: newTeamName,
            description: newTeamDescription,
          }),
        }
      );
      setShowNewTeam(false);
      setNewTeamName('');
      setNewTeamDescription('');
      fetchTeams();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!adminToken || !confirm('Delete this team?')) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records/${teamId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      fetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  // Admin login form
  if (!adminToken) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 text-violet-500" />
            <h2 className="text-xl font-bold text-slate-900">Admin Login</h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in with PocketBase admin credentials
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminLogin()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Enter admin password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <Button onClick={adminLogin} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In as Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-slate-900">Administration</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAdminToken(null)}>
            Sign Out
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'teams'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Teams
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Users ({users.length})
              </h3>
              <Button size="sm" onClick={() => setShowNewUser(!showNewUser)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>

            {/* New User Form */}
            {showNewUser && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    >
                      <option value="engineer">Engineer</option>
                      <option value="senior_engineer">Senior Engineer</option>
                      <option value="tech_lead">Tech Lead</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewUser(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createUser} disabled={!newUserEmail || !newUserPassword}>
                    Create User
                  </Button>
                </div>
              </div>
            )}

            {/* User List */}
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
                  >
                    <Avatar
                      initials={user.name?.slice(0, 2).toUpperCase() || user.email[0].toUpperCase()}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {user.name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge variant={user.verified ? 'success' : 'outline'}>
                      {user.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    {user.role && (
                      <Badge variant="default">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    )}
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Teams ({teams.length})
              </h3>
              <Button size="sm" onClick={() => setShowNewTeam(!showNewTeam)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            </div>

            {/* New Team Form */}
            {showNewTeam && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Team name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={newTeamDescription}
                      onChange={(e) => setNewTeamDescription(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Team description"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewTeam(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createTeam} disabled={!newTeamName}>
                    Create Team
                  </Button>
                </div>
              </div>
            )}

            {/* Team List */}
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete team"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
