"use client";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Zap } from "lucide-react";
import { monitoring } from "@/lib/monitoring";

interface PerformanceSummary {
  avgApiResponseTime: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
}

interface HealthStatus {
  status: string;
  checks: {
    database: boolean;
    storage: boolean;
    auth: boolean;
  };
  performance: {
    responseTime: number;
    memory: any;
  };
}

export default function MonitoringDashboard() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      // Get performance summary
      const summaryData = monitoring.getSummary();
      setSummary(summaryData);

      // Get health status
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData.data);
      }

      // Get recent errors
      const errors = monitoring.getErrors(10);
      setRecentErrors(errors);

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.avgApiResponseTime || 0}ms
              </p>
            </div>
            <Zap className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.errorRate || 0}%
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalRequests || 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Errors</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalErrors || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* System Health */}
      {health && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              <span className={`font-medium ${getStatusColor(health.status)}`}>
                {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health.checks.database ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">Database</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health.checks.storage ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">Storage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health.checks.auth ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">Authentication</span>
            </div>
          </div>

          {health.performance && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Health Check Response Time</p>
                  <p className="text-lg font-semibold">{health.performance.responseTime}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-lg font-semibold">
                    {Math.round(health.performance.memory?.heapUsed / 1024 / 1024)}MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
          <div className="space-y-3">
            {recentErrors.slice(0, 5).map((error, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error.error}</p>
                    <p className="text-xs text-red-600 mt-1">{error.path}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={loadMonitoringData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
        <button
          onClick={() => monitoring.sendData()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Send to Monitoring Service
        </button>
      </div>
    </div>
  );
}
