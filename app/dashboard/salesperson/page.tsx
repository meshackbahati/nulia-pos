"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { validateSalespersonSession, UserProfile } from '@/lib/auth-utils';
import SalespersonDashboard from '@/components/salesperson-dashboard';
import { Icons } from '@/components/icons';

export default function SalespersonDashboardPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesData = useCallback(async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('salesperson_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ATHENA] Sales fetch error:', error);
      setError('Failed to load sales data.');
    } else {
      setTodaySales(data || []);
      const total = (data || []).reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      setTodayTotal(total);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      setLoading(true);
      try {
        const sessionToken = searchParams.get('session');
        if (!sessionToken) {
          throw new Error('Session token is missing.');
        }

        // This is a workaround to use the server-side validation logic on the client.
        // In a real application, you would have a proper client-side session validation.
        const decodedToken = Buffer.from(sessionToken, 'base64').toString('utf-8');
        const sessionData = JSON.parse(decodedToken);

        if (sessionData.role !== 'salesperson' || !sessionData.userId) {
          throw new Error("Invalid session data");
        }

        const validatedUser: UserProfile = {
          id: sessionData.userId,
          email: sessionData.email || `salesperson-${sessionData.userId}@example.com`,
          full_name: sessionData.fullName || `Salesperson ${sessionData.userId}`,
          role: 'salesperson',
          auth_user_id: sessionData.userId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(validatedUser);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .gt('quantity', 0)
          .eq('is_active', true)
          .order('name');

        if (productsError) throw productsError;
        setProducts(productsData || []);

        await fetchSalesData(validatedUser.id);

      } catch (err) {
        console.error('[ATHENA] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [searchParams, fetchSalesData]);

  const handleSaleSuccess = () => {
    if (user) {
      fetchSalesData(user.id);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-6 max-w-md mx-auto bg-card rounded-lg shadow-lg border">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Or a redirect component
  }

  return (
    <SalespersonDashboard
      user={user}
      products={products}
      todaySales={todaySales}
      todayTotal={todayTotal}
      onSaleSuccess={handleSaleSuccess}
    />
  );
}
