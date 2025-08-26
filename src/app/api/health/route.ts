import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { monitoring } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: false,
      storage: false,
      auth: false
    },
    performance: {
      responseTime: 0,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  try {
    // Check database connection
    const { data: dbCheck, error: dbError } = await supabaseAdmin
      .from('applications')
      .select('count')
      .limit(1);
    
    health.checks.database = !dbError;

    // Check storage
    const { data: storageCheck, error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .list('', { limit: 1 });
    
    health.checks.storage = !storageError;

    // Check auth service
    const { data: authCheck, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    });
    
    health.checks.auth = !authError;

    // Determine overall status
    const allChecksPassed = Object.values(health.checks).every(check => check);
    health.status = allChecksPassed ? 'healthy' : 'degraded';

    // Calculate response time
    health.performance.responseTime = Date.now() - startTime;

    // Track health check
    monitoring.metric('health_check_duration', health.performance.responseTime, 'ms', {
      status: health.status,
      environment: health.environment
    });

    return json({
      success: true,
      data: health
    }, {
      status: allChecksPassed ? 200 : 503
    });

  } catch (error) {
    health.status = 'unhealthy';
    health.performance.responseTime = Date.now() - startTime;
    
    // Track failed health check
    monitoring.metric('health_check_failed', 1, 'count', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return json({
      success: false,
      data: health,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, {
      status: 503
    });
  }
}
