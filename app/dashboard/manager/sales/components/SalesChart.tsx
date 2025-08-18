'use client';

import { useTheme } from 'next-themes';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface DailySalesData {
  sale_date: string;
  total_sales: number;
  order_count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-4 shadow-lg">
        <p className="font-medium">{format(parseISO(label || ''), 'PPP')}</p>
        <p className="text-sm">
          <span className="text-muted-foreground">Sales: </span>
          <span className="font-medium">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0,
            }).format(payload[0].value)}
          </span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Orders: </span>
          <span className="font-medium">{payload[0].payload.order_count}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function SalesChart({ data }: { data: DailySalesData[] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Ensure data is sorted by date
  const sortedData = [...(data || [])].sort((a, b) => 
    new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  );
  
  // If no data, show a placeholder
  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <Icons.barChart2 className="h-12 w-12 mb-2 opacity-30" />
        <p>No sales data available for the selected period</p>
      </div>
    );
  }
  
  // Format dates for the X-axis
  const formatXAxis = (date: string) => {
    return format(parseISO(date), 'MMM d');
  };
  
  // Calculate the max value for the Y-axis (rounded up to the nearest 1000)
  const maxValue = Math.max(...sortedData.map(item => item.total_sales));
  const yAxisMax = Math.ceil(maxValue / 1000) * 1000;
  
  // Colors based on theme
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const gradientStart = isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)';
  const gradientStop = isDark ? 'rgba(16, 185, 129, 0.0)' : 'rgba(16, 185, 129, 0.05)';
  const lineColor = '#10B981';
  
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={sortedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientStart} stopOpacity={0.8} />
              <stop offset="95%" stopColor={gradientStop} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={gridColor} 
            vertical={false}
          />
          <XAxis
            dataKey="sale_date"
            tickFormatter={formatXAxis}
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            width={60}
            tickFormatter={(value) => {
              if (value >= 1000000) {
                return `UGX ${(value / 1000000).toFixed(0)}M`;
              } else if (value >= 1000) {
                return `UGX ${(value / 1000).toFixed(0)}K`;
              }
              return `UGX ${value}`;
            }}
            domain={[0, yAxisMax]}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
          />
          <Area
            type="monotone"
            dataKey="total_sales"
            stroke={lineColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
