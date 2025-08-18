'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/stores/useAppStore';
import { useCartStore } from '@/lib/stores/useCartStore';
import { RefreshCw, AlertCircle, Server, Activity, Wifi, WifiOff } from 'lucide-react';

export function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<{
    [key: string]: { value: number; timestamp: number }[];
  }>({});
  const [errors, setErrors] = useState<Array<{ error: Error; timestamp: number; context: any }>>([]);
  
  const { isOnline, lastSynced } = useAppStore();
  const { items, pendingSync } = useCartStore();
  
  // Mock data for demonstration
  useEffect(() => {
    const loadMetrics = () => {
      // In a real app, this would fetch from your monitoring service
      setMetrics({
        'page.load_time': [
          { value: 1200, timestamp: Date.now() - 60000 },
          { value: 950, timestamp: Date.now() - 30000 },
          { value: 1100, timestamp: Date.now() },
        ],
        'api.request.duration': [
          { value: 150, timestamp: Date.now() - 60000 },
          { value: 120, timestamp: Date.now() - 30000 },
          { value: 180, timestamp: Date.now() },
        ],
      });
    };
    
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const refreshData = () => {
    // In a real app, this would trigger a data refresh
    console.log('Refreshing monitoring data...');
  };
  
  const clearErrors = () => {
    setErrors([]);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Monitoring</h1>
        <Button variant="outline" size="sm" onClick={refreshData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">
            <AlertCircle className="mr-2 h-4 w-4" />
            Errors {errors.length > 0 && `(${errors.length})`}
          </TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Connected to the server' : 'Working in offline mode'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
                <span className="h-4 w-4 text-muted-foreground">🛒</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(items).length}</div>
                <p className="text-xs text-muted-foreground">
                  {pendingSync ? 'Pending sync with server' : 'Synced with server'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastSynced 
                    ? new Date(lastSynced).toLocaleTimeString() 
                    : 'Never'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastSynced 
                    ? new Date(lastSynced).toLocaleDateString() 
                    : 'No sync data available'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isOnline ? 'Operational' : 'Limited'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'All systems normal' : 'Offline mode active'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">Application started</p>
                      <p className="text-sm text-muted-foreground">Just now</p>
                    </div>
                  </div>
                  {!isOnline && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">Offline mode activated</p>
                        <p className="text-sm text-muted-foreground">A few seconds ago</p>
                      </div>
                    </div>
                  )}
                  {pendingSync && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">Changes pending sync</p>
                        <p className="text-sm text-muted-foreground">Will sync when online</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>System Resources</CardTitle>
                  <span className="text-xs text-muted-foreground">Mock Data</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>24%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: '24%' }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory</span>
                    <span>1.2GB / 4GB</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cache</span>
                    <span>45MB</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: '15%' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Page Load Time (ms)</h3>
                <div className="h-40 bg-muted rounded p-2">
                  {/* Placeholder for chart */}
                  <div className="flex items-end h-full space-x-1">
                    {metrics['page.load_time']?.map((point, i) => (
                      <div 
                        key={i}
                        className="bg-blue-500 w-4 rounded-t"
                        style={{ height: `${Math.min(point.value / 20, 100)}%` }}
                        title={`${point.value}ms`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">API Response Time (ms)</h3>
                <div className="h-40 bg-muted rounded p-2">
                  {/* Placeholder for chart */}
                  <div className="flex items-end h-full space-x-1">
                    {metrics['api.request.duration']?.map((point, i) => (
                      <div 
                        key={i}
                        className="bg-green-500 w-4 rounded-t"
                        style={{ height: `${Math.min(point.value, 100)}%` }}
                        title={`${point.value}ms`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent Performance Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Page Load</span>
                        <span className="font-mono">1.2s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API: /products</span>
                        <span className="font-mono">145ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API: /cart</span>
                        <span className="font-mono">89ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>JS Bundle</span>
                        <span className="font-mono">245KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSS</span>
                        <span className="font-mono">87KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Images</span>
                        <span className="font-mono">1.2MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Error Logs</CardTitle>
                {errors.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearErrors}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>No errors logged</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {errors.map((error, i) => (
                    <div key={i} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-red-800 dark:text-red-200">
                            {error.error.name}: {error.error.message}
                          </h4>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {new Date(error.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {error.error.stack && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                            {error.error.stack}
                          </pre>
                        </details>
                      )}
                      {error.context && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                            Context
                          </summary>
                          <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Application</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p>1.0.0</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Environment</p>
                    <p>{process.env.NODE_ENV}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p>Today</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p>2h 15m</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Browser</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User Agent</p>
                    <p className="truncate" title={navigator.userAgent}>
                      {navigator.userAgent.split(' ')[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Online Status</p>
                    <p>{navigator.onLine ? 'Online' : 'Offline'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cookies Enabled</p>
                    <p>{navigator.cookieEnabled ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Do Not Track</p>
                    <p>{navigator.doNotTrack || 'Not set'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Storage</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Local Storage</span>
                      <span>45KB / 5MB</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: '0.9%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Cache Storage</span>
                      <span>12MB / 100MB</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500" 
                        style={{ width: '12%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
