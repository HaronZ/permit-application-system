import { NextRequest } from "next/server";
import { json, error } from "@/lib/http";
import { monitoring } from "@/lib/monitoring";
import { isAdmin } from "@/lib/auth";

// GET /api/monitoring - Get performance data (admin only)
export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error('Unauthorized', 401);
    }

    const token = authHeader.substring(7);
    const isUserAdmin = await isAdmin(token);
    
    if (!isUserAdmin) {
      return error('Forbidden: Admin access required', 403);
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (type) {
      case 'summary':
        return json({
          success: true,
          data: monitoring.getSummary()
        });

      case 'interactions':
        return json({
          success: true,
          data: monitoring.getInteractions(limit)
        });

      case 'errors':
        return json({
          success: true,
          data: monitoring.getErrors(limit)
        });

      case 'all':
        return json({
          success: true,
          data: monitoring.exportData()
        });

      default:
        return error('Invalid type parameter', 400);
    }
  } catch (err: any) {
    console.error('GET /api/monitoring error:', err);
    return error('Failed to fetch monitoring data', 500);
  }
}

// POST /api/monitoring - Send data to external monitoring service
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'send';

    if (action === 'send') {
      await monitoring.sendData();
      return json({
        success: true,
        message: 'Monitoring data sent successfully'
      });
    } else {
      return error('Invalid action parameter', 400);
    }
  } catch (err: any) {
    console.error('POST /api/monitoring error:', err);
    return error('Failed to process monitoring action', 500);
  }
}
