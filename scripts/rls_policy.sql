-- Row Level Security Policies for All Tables

-- Products Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products" ON public.products 
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to view products" ON public.products 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage products" ON public.products 
FOR ALL USING (is_current_user_manager());

-- Categories Policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories 
FOR SELECT USING (true);

CREATE POLICY "Managers can manage categories" ON public.categories 
FOR ALL USING (is_current_user_manager());

-- Sales Policies
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales" ON public.sales 
FOR SELECT 
USING (EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.auth_user_id = auth.uid() 
    AND (
        users.role = 'manager' OR 
        users.id = sales.salesperson_id
    )
));

CREATE POLICY "Salespersons can create sales" ON public.sales 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.id = sales.salesperson_id
));

CREATE POLICY "Allow managers to manage all sales" ON public.sales 
FOR ALL USING (is_current_user_manager());

-- Sale Items Policies
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sale items visible to authenticated users" ON public.sale_items 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create sale items" ON public.sale_items 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.salesperson_id = (SELECT auth.uid())
));

CREATE POLICY "Users can update their own sale items" ON public.sale_items 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.salesperson_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.salesperson_id = (SELECT auth.uid())
));

CREATE POLICY "Users can delete their own sale items" ON public.sale_items 
FOR DELETE 
USING (EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.salesperson_id = (SELECT auth.uid())
));

-- Inventory Transactions Policies
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory transactions visible to authenticated" ON public.inventory_transactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create inventory transactions" ON public.inventory_transactions 
FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can update their own inventory transactions" ON public.inventory_transactions 
FOR UPDATE 
USING ((SELECT auth.uid()) = created_by)
WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can delete their own inventory transactions" ON public.inventory_transactions 
FOR DELETE 
USING ((SELECT auth.uid()) = created_by);

-- Suppliers Policies
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow managers to manage suppliers" ON public.suppliers 
FOR ALL USING (is_current_user_manager());

-- Scanner Configurations Policies
ALTER TABLE public.scanner_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow managers to manage scanner configurations" ON public.scanner_configurations 
FOR ALL USING (is_current_user_manager());

-- Barcode Scan Logs Policies
ALTER TABLE public.barcode_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow managers to view barcode scan logs" ON public.barcode_scan_logs 
FOR SELECT USING (is_current_user_manager());

-- Audit Logs Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view audit logs" ON public.audit_logs 
FOR SELECT USING (is_current_user_manager());