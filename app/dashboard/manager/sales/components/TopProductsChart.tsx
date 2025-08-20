'use client';

import { useTheme } from 'next-themes';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface ProductData {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_sales: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">
          Sold: <span className="font-medium text-foreground">{payload[0].value} units</span>
        </p>
        <p className="text-muted-foreground">
          Revenue: <span className="font-medium text-foreground">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0,
            }).format(payload[0].payload.total_sales)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function TopProductsChart({ products }: { products: ProductData[] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Sort products by quantity sold (descending)
  const sortedProducts = [...(products || [])].sort((a, b) => 
    b.total_quantity - a.total_quantity
  ).slice(0, 5); // Top 5 products
  
  // If no data, show a placeholder
  if (!sortedProducts || sortedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <Icons.packageSearch className="h-12 w-12 mb-2 opacity-30" />
        <p>No product data available</p>
      </div>
    );
  }
  
  // Calculate the maximum value for the Y-axis
  const maxQuantity = Math.max(...sortedProducts.map(item => item.total_quantity));
  const yAxisMax = Math.ceil(maxQuantity * 1.1); // Add 10% padding
  
  // Colors based on theme
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const barColor = isDark ? '#10B981' : '#059669';
  
  // Truncate long product names
  const truncateName = (name: string, maxLength: number = 15) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };
  
  // Custom tick formatter for the X-axis
  const formatXAxis = (value: string) => {
    return truncateName(value);
  };
  
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedProducts}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid 
            horizontal={true} 
            vertical={false} 
            stroke={gridColor}
            strokeDasharray="3 3"
          />
          <XAxis 
            type="number" 
            domain={[0, yAxisMax]}
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            tickFormatter={(value) => Math.round(value).toString()}
          />
          <YAxis 
            type="category" 
            dataKey="product_name"
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
            width={80}
            className="sm:w-120"
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            tickFormatter={formatXAxis}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
          />
          <Bar 
            dataKey="total_quantity" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          >
            {sortedProducts.map((entry, index) => {
              // Calculate a slightly different shade for each bar
              const opacity = 0.6 + (index * 0.08);
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={barColor}
                  fillOpacity={opacity}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
