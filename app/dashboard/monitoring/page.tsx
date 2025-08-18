'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Server, Activity, Wifi, AlertTriangle, Clock, Cpu, HardDrive, Database } from 'lucide-react';
import { useAppStore } from '@/lib/stores/useAppStore';
import { useCartStore } from '@/lib/stores/useCartStore';

type Metric = {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
};

type SystemInfo = {
  userAgent: string;
  platform: string;
  cores: number;
  memory: number;
  online: boolean;
  timezone: string;
  language: string;
  cookies: boolean;
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    type?: string;
  };
};

type PerformanceData = {
  timestamp: number;
  cpu: number;
  memory: number;
  responseTime: number;
};

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({});
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  
  const { isOnline, lastSynced } = useAppStore();
  const { pendingSync } = useCartStore();
  
  // Mock data for demonstration
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        // Mock metrics data
        setMetrics({
          'page.load_time': Array(10).fill(0).map((_, i) => ({
            name: 'page.load_time',
            value: 800 + Math.random() * 400,
            timestamp: Date.now() - (9 - i) * 60000,
          })),
          'api.response_time': Array(10).fill(0).map((_, i) => ({
            name: 'api.response_time',
            value: 50 + Math.random() * 100,
            timestamp: Date.now() - (9 - i) * 60000,
          })),
        });
        
        // Get system info with fallbacks
        const systemInfo: SystemInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          cores: navigator.hardwareConcurrency || 4,
          memory: (navigator as any).deviceMemory || 8, // GB
          online: navigator.onLine,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          cookies: navigator.cookieEnabled,
        };
        
        // Add connection info if available
        if ('connection' in navigator) {
          systemInfo.connection = {
            effectiveType: (navigator as any).connection?.effectiveType,
            downlink: (navigator as any).connection?.downlink,
            rtt: (navigator as any).connection?.rtt,
            saveData: (navigator as any).connection?.saveData,
            type: (navigator as any).connection?.type,
          };
        }
        
        setSystemInfo(systemInfo);
        
        // Mock performance data
        setPerformanceData(
          Array(12).fill(0).map((_, i) => ({
            timestamp: Date.now() - (11 - i) * 300000, // 5 min intervals
            cpu: 20 + Math.random() * 60,
            memory: 30 + Math.random() * 50,
            responseTime: 50 + Math.random() * 200,
          }))
        );
        
        setIsLoading(false);
      }, 500);
    };
    
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-500' : 'text-red-500';
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <div className="flex items-center space-x-2
        ">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isOnline ? 'Online' : 'Offline'}</div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Connected to the server' : 'Working in offline mode'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
                <div className={`h-2 w-2 rounded-full ${!pendingSync ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pendingSync ? 'Pending' : 'Synced'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastSynced 
                    ? `Last sync: ${new Date(lastSynced).toLocaleString()}`
                    : 'Never synced'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Load</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics['page.load_time']?.[0]?.value.toFixed(0) || '--'}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics['page.load_time']?.length || 0} data points
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Response</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics['api.response_time']?.[0]?.value.toFixed(0) || '--'}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 10 requests avg
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Page Load Time</CardTitle>
                <CardDescription>Last 10 page loads (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end space-x-1">
                  {metrics['page.load_time']?.map((metric, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ 
                        height: `${Math.min(metric.value / 20, 100)}%`,
                        minWidth: '8px'
                      }}
                      title={`${metric.value.toFixed(0)}ms at ${formatTime(metric.timestamp)}`}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>API Response Time</CardTitle>
                <CardDescription>Last 10 API calls (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end space-x-1">
                  {metrics['api.response_time']?.map((metric, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                      style={{ 
                        height: `${Math.min(metric.value, 100)}%`,
                        minWidth: '8px'
                      }}
                      title={`${metric.value.toFixed(0)}ms at ${formatTime(metric.timestamp)}`}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>System performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-end space-x-1">
                {performanceData.map((data, i) => (
                  <div key={i} className="flex-1 flex space-x-px">
                    <div 
                      className="w-1/3 bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
                      style={{ height: `${data.cpu}%` }}
                      title={`CPU: ${data.cpu.toFixed(1)}%`}
                    ></div>
                    <div 
                      className="w-1/3 bg-green-500 hover:bg-green-600 transition-colors rounded-t"
                      style={{ height: `${data.memory}%` }}
                      title={`Memory: ${data.memory.toFixed(1)}%`}
                    ></div>
                    <div 
                      className="w-1/3 bg-purple-500 hover:bg-purple-600 transition-colors rounded-t"
                      style={{ height: `${Math.min(data.responseTime / 5, 100)}%` }}
                      title={`Response: ${data.responseTime.toFixed(0)}ms`}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{new Date(performanceData[0]?.timestamp || 0).toLocaleTimeString()}</span>
                <span>Now</span>
              </div>
              <div className="flex justify-between mt-4 text-sm">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-blue-500 rounded-sm mr-2"></div>
                  <span>CPU Usage</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-500 rounded-sm mr-2"></div>
                  <span>Memory Usage</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-purple-500 rounded-sm mr-2"></div>
                  <span>Response Time</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          {systemInfo && (
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Client and environment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Browser</h3>
                    <div className="bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground overflow-x-auto">
                      {systemInfo.userAgent}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Platform</h3>
                    <div className="p-3 bg-muted rounded-md">
                      {systemInfo.platform}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">CPU Cores</h3>
                    <div className="p-3 bg-muted rounded-md flex items-center">
                      <Cpu className="h-4 w-4 mr-2" />
                      {systemInfo.cores} cores
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Memory</h3>
                    <div className="p-3 bg-muted rounded-md flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      {systemInfo.memory} GB
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Status</h3>
                    <div className="p-3 bg-muted rounded-md flex items-center">
                      <Wifi className={`h-4 w-4 mr-2 ${getStatusColor(systemInfo.online)}`} />
                      {systemInfo.online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Cookies</h3>
                    <div className="p-3 bg-muted rounded-md">
                      {systemInfo.cookies ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Timezone</h3>
                    <div className="p-3 bg-muted rounded-md">
                      {systemInfo.timezone}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Language</h3>
                    <div className="p-3 bg-muted rounded-md">
                      {systemInfo.language}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Application and error logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start p-3 bg-muted/50 rounded-md">
                  <div className="text-green-500 mr-3">[INFO]</div>
                  <div>
                    <p>Application started successfully</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {!isOnline && (
                  <div className="flex items-start p-3 bg-muted/50 rounded-md">
                    <div className="text-yellow-500 mr-3">[WARN]</div>
                    <div>
                      <p>Working in offline mode. Some features may be limited.</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {pendingSync && (
                  <div className="flex items-start p-3 bg-muted/50 rounded-md">
                    <div className="text-blue-500 mr-3">[SYNC]</div>
                    <div>
                      <p>Changes pending sync with server</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start p-3 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground mr-3">[DEBUG]</div>
                  <div>
                    <p>Performance monitoring active</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted/30 rounded-md border border-dashed border-muted-foreground/30 text-center">
                <p className="text-sm text-muted-foreground">
                  Logs will appear here as they are generated
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
