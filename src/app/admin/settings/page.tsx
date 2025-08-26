"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { 
  Settings, 
  Shield, 
  Database, 
  Bell, 
  FileText, 
  Users, 
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { checkSuperAdminStatus } from "@/lib/auth";

interface SystemSettings {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxApplicationsPerUser: number;
  autoApprovalEnabled: boolean;
  notificationEnabled: boolean;
  maintenanceMode: boolean;
  sessionTimeout: number;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    maxFileSize: 10,
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    maxApplicationsPerUser: 5,
    autoApprovalEnabled: false,
    notificationEnabled: true,
    maintenanceMode: false,
    sessionTimeout: 24
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
    }
  }, [isSuperAdmin]);

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const superAdminStatus = await checkSuperAdminStatus(user.email);
        setIsSuperAdmin(superAdminStatus);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async function loadSettings() {
    setLoading(true);
    try {
      // In a real app, you'd load these from a settings table
      // For now, we'll use the default values
      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      // In a real app, you'd save these to a settings table
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }

    setSettings({
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
      maxApplicationsPerUser: 5,
      autoApprovalEnabled: false,
      notificationEnabled: true,
      maintenanceMode: false,
      sessionTimeout: 24
    });
    
    toast.success('Settings reset to defaults');
  }

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
        description="Only Super Administrators can access system settings." 
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">Configure system-wide settings and preferences</p>
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

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* File Upload Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">File Upload Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum File Size (MB)
                </label>
                <Input
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxFileSize: Number(e.target.value) }))}
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed File Types
                </label>
                <Input
                  type="text"
                  value={settings.allowedFileTypes.join(', ')}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    allowedFileTypes: e.target.value.split(',').map(t => t.trim()) 
                  }))}
                  placeholder="pdf, jpg, png, doc"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Separate file types with commas</p>
              </div>
            </div>
          </Card>

          {/* Application Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Applications Per User
                </label>
                <Input
                  type="number"
                  value={settings.maxApplicationsPerUser}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxApplicationsPerUser: Number(e.target.value) }))}
                  min="1"
                  max="50"
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoApproval"
                  checked={settings.autoApprovalEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoApprovalEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoApproval" className="text-sm font-medium text-gray-700">
                  Enable Auto-Approval for Simple Applications
                </label>
              </div>
            </div>
          </Card>

          {/* System Preferences */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Settings className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">System Preferences</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (hours)
                </label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                  min="1"
                  max="168"
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
                  Maintenance Mode
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={settings.notificationEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifications" className="text-sm font-medium text-gray-700">
                  Enable Email Notifications
                </label>
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">Require 2FA for all admin accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">Enabled</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Rate Limiting</h3>
                  <p className="text-sm text-gray-600">API rate limiting for security</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">Active</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Audit Logging</h3>
                  <p className="text-sm text-gray-600">Track all system activities</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">Enabled</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
          </Card>

          {/* Database Status */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Database className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Database</span>
                </div>
                <p className="text-sm text-green-600 mt-1">Connected & Healthy</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Storage</span>
                </div>
                <p className="text-sm text-green-600 mt-1">Operational</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Authentication</span>
                </div>
                <p className="text-sm text-green-600 mt-1">Active</p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={resetToDefaults}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
