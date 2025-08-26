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
import { Search, Plus, Calendar, Hash, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-1">Track the status of your permit applications</p>
        </div>
        <Link href="/apply/business">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Application
          </Button>
        </Link>
      </div>

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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
          {filteredApplications.length} of {applications.length} applications
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState 
          title={applications.length === 0 ? "No applications yet" : "No matching applications"}
          description={
            applications.length === 0 
              ? "Start your first application to get started."
              : "Try adjusting your search or filter criteria."
          }
          actionHref={applications.length === 0 ? "/apply/business" : undefined}
          actionText={applications.length === 0 ? "Start Business Permit" : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <Link key={app.id} href={`/applications/${app.id}`}>
              <Card className="p-6 card-hover">
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
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm">View Details</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
