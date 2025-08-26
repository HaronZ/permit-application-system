// Performance Monitoring System
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface UserInteraction {
  event: string;
  path: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  error: string;
  stack?: string;
  path: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  ip?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private errors: ErrorLog[] = [];
  private sessionId: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_MONITORING === 'true';
    
    // Clean up old data periodically
    if (this.isEnabled) {
      setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track API performance
  trackApiCall(endpoint: string, duration: number, status: number, userId?: string) {
    if (!this.isEnabled) return;

    this.metrics.push({
      name: 'api_call_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        endpoint,
        status: status.toString(),
        userId: userId || 'anonymous'
      }
    });

    // Track error rates
    if (status >= 400) {
      this.metrics.push({
        name: 'api_error_rate',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        tags: { endpoint, status: status.toString() }
      });
    }
  }

  // Track page load performance
  trackPageLoad(path: string, loadTime: number, userId?: string) {
    if (!this.isEnabled) return;

    this.metrics.push({
      name: 'page_load_time',
      value: loadTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: { path, userId: userId || 'anonymous' }
    });
  }

  // Track user interactions
  trackInteraction(event: string, path: string, userId?: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    this.interactions.push({
      event,
      path,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      metadata
    });
  }

  // Track errors
  trackError(error: Error, path: string, userId?: string, userAgent?: string, ip?: string) {
    if (!this.isEnabled) return;

    this.errors.push({
      error: error.message,
      stack: error.stack,
      path,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      userAgent,
      ip
    });

    // Also track as metric
    this.metrics.push({
      name: 'error_count',
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      tags: { path, errorType: error.name }
    });
  }

  // Track custom metrics
  trackMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    });
  }

  // Get performance summary
  getPerformanceSummary(): {
    avgApiResponseTime: number;
    errorRate: number;
    totalRequests: number;
    totalErrors: number;
  } {
    const apiCalls = this.metrics.filter(m => m.name === 'api_call_duration');
    const errors = this.metrics.filter(m => m.name === 'api_error_rate');
    
    const avgApiResponseTime = apiCalls.length > 0 
      ? apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length 
      : 0;
    
    const errorRate = apiCalls.length > 0 
      ? (errors.length / apiCalls.length) * 100 
      : 0;

    return {
      avgApiResponseTime: Math.round(avgApiResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: apiCalls.length,
      totalErrors: errors.length
    };
  }

  // Get recent interactions
  getRecentInteractions(limit: number = 50): UserInteraction[] {
    return this.interactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get recent errors
  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Export data for external monitoring
  exportData() {
    return {
      metrics: this.metrics,
      interactions: this.interactions,
      errors: this.errors,
      summary: this.getPerformanceSummary(),
      timestamp: Date.now()
    };
  }

  // Clean up old data (keep last 24 hours)
  private cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.interactions = this.interactions.filter(i => i.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }

  // Send data to external monitoring service (if configured)
  async sendToMonitoringService() {
    if (!this.isEnabled || !process.env.MONITORING_ENDPOINT) return;

    try {
      const data = this.exportData();
      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send monitoring data:', error);
    }
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for easy tracking
export const monitoring = {
  // Track API calls
  apiCall: (endpoint: string, duration: number, status: number, userId?: string) => {
    performanceMonitor.trackApiCall(endpoint, duration, status, userId);
  },

  // Track page loads
  pageLoad: (path: string, loadTime: number, userId?: string) => {
    performanceMonitor.trackPageLoad(path, loadTime, userId);
  },

  // Track user interactions
  interaction: (event: string, path: string, userId?: string, metadata?: Record<string, any>) => {
    performanceMonitor.trackInteraction(event, path, userId, metadata);
  },

  // Track errors
  error: (error: Error, path: string, userId?: string, userAgent?: string, ip?: string) => {
    performanceMonitor.trackError(error, path, userId, userAgent, ip);
  },

  // Track custom metrics
  metric: (name: string, value: number, unit: string, tags?: Record<string, string>) => {
    performanceMonitor.trackMetric(name, value, unit, tags);
  },

  // Get performance data
  getSummary: () => performanceMonitor.getPerformanceSummary(),
  getInteractions: (limit?: number) => performanceMonitor.getRecentInteractions(limit),
  getErrors: (limit?: number) => performanceMonitor.getRecentErrors(limit),
  exportData: () => performanceMonitor.exportData(),
  sendData: () => performanceMonitor.sendToMonitoringService(),
};

// React hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  return {
    trackRender: (duration: number) => {
      monitoring.metric('component_render_time', duration, 'ms', { component: componentName });
    },
    trackInteraction: (event: string, metadata?: Record<string, any>) => {
      monitoring.interaction(event, window.location.pathname, undefined, { 
        component: componentName, 
        ...metadata 
      });
    },
    trackError: (error: Error) => {
      monitoring.error(error, window.location.pathname);
    }
  };
}
