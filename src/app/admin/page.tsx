"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { Search, Filter, Download, Eye, CheckCircle, Clock, AlertCircle, XCircle, Package, BarChart3, Users, Settings, Shield, Bell, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import MonitoringDashboard from "@/components/MonitoringDashboard";
import { checkAdminStatus, checkSuperAdminStatus, getUserPermissionsAsync, UserRole } from "@/lib/auth";

type Application = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  applicant_id: string;
  reference_no?: string;
  applicant?: {
    full_name: string;
    email: string;
    phone: string;
  } | {
    full_name: string;
    email: string;
    phone: string;
  }[];
};

export default function Admin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    readyForPickup: 0,
    rejected: 0,
  });
  
  // Real-time state
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [newApplicationsCount, setNewApplicationsCount] = useState(0);
  
  // Refs for cleanup
  const realtimeSubscription = useRef<any>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show notification for new applications
  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    
    // Also show toast notification
    toast.success(body, {
      duration: 5000,
      icon: '🔔',
    });
  }, []);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!mounted.current) return;

    // Subscribe to applications table changes
    realtimeSubscription.current = supabase
      .channel('applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        async (payload) => {
          if (!mounted.current) return;
          
          console.log('Real-time update received:', payload);
          setLastUpdate(new Date());
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            // New application submitted
            setNewApplicationsCount(prev => prev + 1);
            showNotification(
              'New Permit Application',
              `A new ${payload.new.type} application has been submitted!`
            );
            
            // Refresh data immediately
            await loadApplications();
          } else if (payload.eventType === 'UPDATE') {
            // Application status changed
            if (payload.old.status !== payload.new.status) {
              showNotification(
                'Application Status Updated',
                `Application ${payload.new.reference_no || payload.new.id} status changed to ${payload.new.status}`
              );
            }
            
            // Refresh data
            await loadApplications();
          } else if (payload.eventType === 'DELETE') {
            // Application deleted
            showNotification(
              'Application Deleted',
              'An application has been removed from the system'
            );
            
            // Refresh data
            await loadApplications();
          }
        }
      )
      .subscribe((status) => {
        if (mounted.current) {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
          console.log('Realtime subscription status:', status);
        }
      });

    return realtimeSubscription.current;
  }, [showNotification]);

  // Setup auto-refresh
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefreshEnabled || !mounted.current) return;
    
    autoRefreshInterval.current = setInterval(async () => {
      if (mounted.current && !loading) {
        console.log('Auto-refreshing admin dashboard...');
        await loadApplications();
        setLastUpdate(new Date());
      }
    }, 30000); // Refresh every 30 seconds
  }, [autoRefreshEnabled, loading]);

  // Cleanup real-time and auto-refresh
  const cleanupRealtime = useCallback(() => {
    if (realtimeSubscription.current) {
      supabase.removeChannel(realtimeSubscription.current);
      realtimeSubscription.current = null;
    }
    
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  async function loadApplications(nextPage = page, nextQuery = searchQuery, nextFilter = statusFilter) {
    setLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select(`
          id, type, status, created_at, applicant_id, reference_no,
          applicant:applicants(full_name, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (nextFilter !== "all") {
        query = query.eq("status", nextFilter);
      }

      if (nextQuery) {
        query = query.or(`id.ilike.%${nextQuery}%,type.ilike.%${nextQuery}%,reference_no.ilike.%${nextQuery}%`);
      }

      const { data, error, count } = await query
        .range((nextPage - 1) * pageSize, nextPage * pageSize - 1)
        .select("*");

      if (error) throw error;

      setApplications(data || []);
      setTotalCount(count || 0);
      setPage(nextPage);

      // Calculate stats
      const allApps = await supabase
        .from("applications")
        .select("status");

      if (allApps.data) {
        const stats = {
          total: allApps.data.length,
          submitted: allApps.data.filter(a => a.status === "submitted").length,
          underReview: allApps.data.filter(a => a.status === "under_review").length,
          approved: allApps.data.filter(a => a.status === "approved").length,
          readyForPickup: allApps.data.filter(a => a.status === "ready_for_pickup").length,
          rejected: allApps.data.filter(a => a.status === "rejected").length,
        };
        setStats(stats);
      }
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast.error(error.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      setAuthLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        
        const userEmail = data.user?.email ?? null;
        setEmail(userEmail);
        
        if (userEmail) {
          // Check admin status using new RBAC system
          const adminStatus = await checkAdminStatus(userEmail);
          const superAdminStatus = await checkSuperAdminStatus(userEmail);
          const userPermissions = await getUserPermissionsAsync(userEmail);
          
          if (mounted) {
            setIsAdmin(adminStatus);
            setIsSuperAdmin(superAdminStatus);
            setUserRole(userPermissions?.role || null);
            
            if (adminStatus) {
              await loadApplications();
              
              // Setup real-time and auto-refresh after initial load
              setupRealtimeSubscription();
              setupAutoRefresh();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing admin:', error);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }
    
    init();
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);
      
      if (userEmail) {
        const adminStatus = await checkAdminStatus(userEmail);
        const superAdminStatus = await checkSuperAdminStatus(userEmail);
        const userPermissions = await getUserPermissionsAsync(userEmail);
        
        setIsAdmin(adminStatus);
        setIsSuperAdmin(superAdminStatus);
        setUserRole(userPermissions?.role || null);
        
        if (adminStatus) {
          await loadApplications();
          
          // Setup real-time and auto-refresh
          setupRealtimeSubscription();
          setupAutoRefresh();
        }
      }
    });
    
    return () => { 
      mounted = false; 
      sub.subscription.unsubscribe();
      cleanupRealtime();
    };
  }, [setupRealtimeSubscription, setupAutoRefresh, cleanupRealtime]);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const prev = applications.find(a => a.id === id)?.status;
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
      
      toast.success(`Updated to ${status.replace(/_/g, " ")}`, {
        duration: 3000,
      });
      
      await loadApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    const ids = applications.map(a => a.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        ids.forEach(id => n.delete(id));
      } else {
        ids.forEach(id => n.add(id));
      }
      return n;
    });
  }

  async function bulkUpdate(status: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    
    setUpdating("bulk");
    try {
      const { error } = await supabase.from("applications").update({ status }).in("id", ids);
      if (error) throw error;
      
      toast.success(`Updated ${ids.length} applications to ${status.replace(/_/g, " ")}`);
      setSelected(new Set());
      await loadApplications();
    } catch (error: any) {
      toast.error(error.message || "Bulk update failed");
    } finally {
      setUpdating(null);
    }
  }

  async function exportCSV() {
    try {
      const cols = ["id", "type", "status", "created_at", "reference_no"] as const;
      let query = supabase
        .from("applications")
        .select(cols.join(","))
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (searchQuery.trim()) {
        const term = searchQuery.trim();
        query = query.or(`type.ilike.%${term}%,id.ilike.%${term}%`);
      }
      
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      
      const rows = (data || []).map((a: any) => cols.map(c => String((a as any)[c]).replaceAll('"','""')));
      const csv = [cols.join(","), ...rows.map((r: string[]) => r.map((v: string) => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; 
      a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`; 
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("CSV export failed");
    }
  }

  const statusOptions = [
    { value: "all", label: "All Status", count: stats.total },
    { value: "submitted", label: "Submitted", count: stats.submitted },
    { value: "under_review", label: "Under Review", count: stats.underReview },
    { value: "approved", label: "Approved", count: stats.approved },
    { value: "ready_for_pickup", label: "Ready for Pickup", count: stats.readyForPickup },
    { value: "rejected", label: "Rejected", count: stats.rejected },
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <EmptyState 
        title="Please login" 
        description="Admin access requires an account." 
        actionHref="/login" 
        actionText="Go to Login" 
      />
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState 
        title="Not authorized" 
        description="Your account is not allowed to access Admin." 
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Review</h1>
          <p className="text-gray-600 mt-1">Review and manage permit applications</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant={showMonitoring ? "primary" : "outline"}
            onClick={() => setShowMonitoring(!showMonitoring)} 
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            {showMonitoring ? "Hide" : "Show"} Monitoring
          </Button>
          <Button onClick={exportCSV} leftIcon={<Download className="h-4 w-4" />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Monitoring Dashboard */}
      {showMonitoring && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Monitoring</h2>
          <MonitoringDashboard />
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {statusOptions.map((option) => (
          <Card key={option.value} className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{option.count}</div>
            <div className="text-sm text-gray-600">{option.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by type, ID, or reference..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                setPage(1);
                loadApplications(1, value, statusFilter);
              }}
              className="pl-10 w-full sm:w-80"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value;
                setStatusFilter(value);
                setPage(1);
                loadApplications(1, searchQuery, value);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {applications.length} of {totalCount} applications
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              onClick={() => bulkUpdate("under_review")}
              disabled={updating === "bulk"}
              leftIcon={<Clock className="h-4 w-4" />}
            >
              Under Review
            </Button>
            <Button
              size="sm"
              onClick={() => bulkUpdate("approved")}
              disabled={updating === "bulk"}
              leftIcon={<CheckCircle className="h-4 w-4" />}
            >
              Approve
            </Button>
            <Button
              size="sm"
              onClick={() => bulkUpdate("ready_for_pickup")}
              disabled={updating === "bulk"}
              leftIcon={<Package className="h-4 w-4" />}
            >
              Ready for Pickup
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => bulkUpdate("rejected")}
              disabled={updating === "bulk"}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Reject
            </Button>
          </div>
        </Card>
      )}

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState 
          title="No applications" 
          description="Try changing the filter or search criteria." 
        />
      ) : (
        <>
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(app.id)}
                      onChange={() => toggle(app.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {app.type} Permit
                      </h3>
                      {app.applicant && (
                        <p className="text-sm text-gray-600">
                          {getApplicantData(app)?.full_name} • {getApplicantData(app)?.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div>ID: {app.id.slice(0, 8)}...</div>
                  {app.reference_no && <div>Ref: {app.reference_no}</div>}
                  <div>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(app.id, "under_review")}
                    disabled={updating === app.id}
                    leftIcon={<Clock className="h-4 w-4" />}
                  >
                    Under Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(app.id, "approved")}
                    disabled={updating === app.id}
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(app.id, "ready_for_pickup")}
                    disabled={updating === app.id}
                    leftIcon={<Package className="h-4 w-4" />}
                  >
                    Ready for Pickup
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setStatus(app.id, "rejected")}
                    disabled={updating === app.id}
                    leftIcon={<XCircle className="h-4 w-4" />}
                  >
                    Reject
                  </Button>
                  <Link href={`/applications/${app.id}`}>
                    <Button size="sm" variant="ghost" leftIcon={<Eye className="h-4 w-4" />}>
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages} • Total {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    loadApplications(newPage);
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const newPage = Math.min(totalPages, page + 1);
                    setPage(newPage);
                    loadApplications(newPage);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
