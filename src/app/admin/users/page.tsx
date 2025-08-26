"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { 
  Search, 
  Filter, 
  UserPlus, 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { UserRole, getRoleDisplayName, Permission, getPermissionDisplayName } from "@/lib/rbac";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: UserRole;
  permissions?: Permission[];
  applicant?: {
    full_name: string;
    phone: string;
  };
}

interface RoleAssignment {
  userId: string;
  email: string;
  currentRole: UserRole;
  newRole: UserRole;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        // Check if user is super admin
        const { data: roleData } = await supabase
          .rpc('get_user_role', { user_email: user.email });
        setIsSuperAdmin(roleData === 'super_admin');
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      // Get all users from auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      // Get user roles and applicant info
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role');

      const { data: applicants, error: applicantsError } = await supabaseAdmin
        .from('applicants')
        .select('id, email, full_name, phone');

      if (rolesError) throw rolesError;
      if (applicantsError) throw applicantsError;

      // Combine the data
      const usersWithRoles = authUsers.users.map(authUser => {
        const role = userRoles?.find(ur => ur.user_id === authUser.id)?.role || 'user';
        const applicant = applicants?.find(a => a.email === authUser.email);
        
        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          role: role as UserRole,
          applicant
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function assignRole(userId: string, email: string, newRole: UserRole) {
    try {
      // Update user role in user_roles table
      const { error } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: newRole,
          created_by: currentUser.id
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success(`Role updated to ${getRoleDisplayName(newRole)}`);
      await loadUsers();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete user role first
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete user from auth (this will cascade to other tables)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.applicant?.full_name && user.applicant.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleOptions = [
    { value: "all", label: "All Roles", count: users.length },
    { value: "user", label: "Users", count: users.filter(u => u.role === "user").length },
    { value: "admin", label: "Admins", count: users.filter(u => u.role === "admin").length },
    { value: "super_admin", label: "Super Admins", count: users.filter(u => u.role === "super_admin").length },
  ];

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <EmptyState 
        title="Access Denied" 
        description="Only Super Administrators can access user management." 
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage users, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
          >
            ← Back to Admin
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Shield className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Settings className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Super Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => {
                  const created = new Date(u.created_at);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return created > monthAgo;
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Users List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState 
          title="No users found" 
          description="Try adjusting your search or filters." 
        />
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.applicant?.full_name || 'No Name'}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getRoleDisplayName(user.role || UserRole.USER)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>📧 {user.email}</span>
                    </div>
                    {user.applicant?.phone && (
                      <div className="flex items-center gap-1">
                        <span>📱 {user.applicant.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span>📅 Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                    </div>
                    {user.last_sign_in_at && (
                      <div className="flex items-center gap-1">
                        <span>🕒 Last seen {formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {editingUser === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          assignRole(user.id, user.email, newRole);
                          setEditingUser(null);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <Button
                        onClick={() => setEditingUser(null)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => setEditingUser(user.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== 'super_admin' && (
                        <Button
                          onClick={() => deleteUser(user.id, user.email)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
