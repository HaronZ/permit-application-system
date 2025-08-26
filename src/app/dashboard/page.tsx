"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { Search, Plus, Calendar, Hash, Filter, Trash2, Edit, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

type Application = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  reference_no?: string;
};

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    readyForPickup: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, type, status, created_at, reference_no")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const apps = data || [];
      setApplications(apps);

      // Calculate stats
      const stats = {
        total: apps.length,
        submitted: apps.filter(a => a.status === "submitted").length,
        underReview: apps.filter(a => a.status === "under_review").length,
        approved: apps.filter(a => a.status === "approved").length,
        readyForPickup: apps.filter(a => a.status === "ready_for_pickup").length,
        rejected: apps.filter(a => a.status === "rejected").length,
      };
      setStats(stats);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      return;
    }

    setDeleting(id);
    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Application deleted successfully");
      await loadApplications();
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast.error(error.message || "Failed to delete application");
    } finally {
      setDeleting(null);
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.reference_no && app.reference_no.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "All Status", count: stats.total },
    { value: "submitted", label: "Submitted", count: stats.submitted },
    { value: "under_review", label: "Under Review", count: stats.underReview },
    { value: "approved", label: "Approved", count: stats.approved },
    { value: "ready_for_pickup", label: "Ready for Pickup", count: stats.readyForPickup },
    { value: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">Track and manage your permit applications</p>
        </div>
        <Link href="/apply">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Hash className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Under Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.underReview}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Hash className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <Hash className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
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
                placeholder="Search applications by ID, type, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState 
          title="No applications found" 
          description="Get started by submitting your first permit application." 
          actionHref="/apply"
          actionText="Apply Now"
        />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <Card key={app.id} className="p-6 card-hover">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {app.type} Permit
                    </h3>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      <span>ID: {app.id.slice(0, 8)}...</span>
                    </div>
                    {app.reference_no && (
                      <div className="flex items-center gap-1">
                        <span>Ref: {app.reference_no}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Link href={`/applications/${app.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  
                  {/* Only allow editing/deleting for submitted applications */}
                  {app.status === "submitted" && (
                    <>
                      <Link href={`/apply/${app.type}?edit=${app.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      
                      <Button
                        onClick={() => deleteApplication(app.id)}
                        disabled={deleting === app.id}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === app.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
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
