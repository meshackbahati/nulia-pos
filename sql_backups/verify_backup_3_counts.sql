WITH expected(table_name, expected_count) AS (
  VALUES
    ('SequelizeMeta', 34::bigint),
    ('audit_logs', 199::bigint),
    ('branches', 1::bigint),
    ('exchange_rates', 11::bigint),
    ('idempotency_keys', 971::bigint),
    ('inventory', 338::bigint),
    ('payment_logs', 0::bigint),
    ('payments', 78::bigint),
    ('product_variants', 0::bigint),
    ('products', 338::bigint),
    ('purchase_order_items', 0::bigint),
    ('purchase_orders', 0::bigint),
    ('sale_items', 102::bigint),
    ('sales', 76::bigint),
    ('settings', 8::bigint),
    ('suppliers', 0::bigint),
    ('users', 5::bigint)
),
actual(table_name, actual_count) AS (
  SELECT 'SequelizeMeta', count(*) FROM public."SequelizeMeta"
  UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs
  UNION ALL SELECT 'branches', count(*) FROM public.branches
  UNION ALL SELECT 'exchange_rates', count(*) FROM public.exchange_rates
  UNION ALL SELECT 'idempotency_keys', count(*) FROM public.idempotency_keys
  UNION ALL SELECT 'inventory', count(*) FROM public.inventory
  UNION ALL SELECT 'payment_logs', count(*) FROM public.payment_logs
  UNION ALL SELECT 'payments', count(*) FROM public.payments
  UNION ALL SELECT 'product_variants', count(*) FROM public.product_variants
  UNION ALL SELECT 'products', count(*) FROM public.products
  UNION ALL SELECT 'purchase_order_items', count(*) FROM public.purchase_order_items
  UNION ALL SELECT 'purchase_orders', count(*) FROM public.purchase_orders
  UNION ALL SELECT 'sale_items', count(*) FROM public.sale_items
  UNION ALL SELECT 'sales', count(*) FROM public.sales
  UNION ALL SELECT 'settings', count(*) FROM public.settings
  UNION ALL SELECT 'suppliers', count(*) FROM public.suppliers
  UNION ALL SELECT 'users', count(*) FROM public.users
)
SELECT
  expected.table_name,
  expected.expected_count,
  actual.actual_count,
  CASE
    WHEN expected.expected_count = actual.actual_count THEN 'ok'
    ELSE 'mismatch'
  END AS status
FROM expected
JOIN actual USING (table_name)
ORDER BY expected.table_name;
