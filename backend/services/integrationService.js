import axios from 'axios';

const providers = {};

// QuickBooks Online integration
providers.quickbooks = {
    async connect(config) {
        // OAuth2 flow - validate token
        const { accessToken, realmId } = config;
        const res = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return res.status === 200;
    },
    async syncProducts(config, products) {
        const { accessToken, realmId } = config;
        const results = [];
        for (const product of products) {
            try {
                const qbItem = {
                    Name: product.name,
                    Sku: product.sku,
                    description: product.description,
                    UnitPrice: product.basePrice,
                    Type: 'Inventory',
                    QtyOnHand: 0,
                };
                const res = await axios.post(
                    `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/item`,
                    qbItem,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                results.push({ productId: product.id, success: true, qbId: res.data.Item.Id });
            } catch (err) {
                results.push({ productId: product.id, success: false, error: err.message });
            }
        }
        return results;
    },
    async syncSales(config, sales) {
        const { accessToken, realmId } = config;
        const results = [];
        for (const sale of sales) {
            try {
                const qbInvoice = {
                    CustomerRef: { name: sale.customerName || 'Walk-in Customer' },
                    Line: sale.items.map(item => ({
                        Description: item.product?.name || 'Item',
                        Amount: item.totalPrice,
                        DetailType: 'SalesItemLineDetail',
                        SalesItemLineDetail: {
                            ItemRef: { name: item.product?.name },
                            Qty: item.quantity,
                            UnitPrice: item.unitPrice,
                        },
                    })),
                };
                const res = await axios.post(
                    `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice`,
                    qbInvoice,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                results.push({ saleId: sale.id, success: true, qbId: res.data.Invoice.Id });
            } catch (err) {
                results.push({ saleId: sale.id, success: false, error: err.message });
            }
        }
        return results;
    },
};

// Shopify integration
providers.shopify = {
    async connect(config) {
        const { shopDomain, accessToken } = config;
        const res = await axios.get(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken },
        });
        return res.status === 200;
    },
    async syncProducts(config, products) {
        const { shopDomain, accessToken } = config;
        const results = [];
        for (const product of products) {
            try {
                const shopifyProduct = {
                    title: product.name,
                    body_html: product.description || '',
                    vendor: product.brand || '',
                    variants: [{ price: product.basePrice, sku: product.sku || '' }],
                };
                const res = await axios.post(
                    `https://${shopDomain}/admin/api/2024-01/products.json`,
                    { product: shopifyProduct },
                    { headers: { 'X-Shopify-Access-Token': accessToken } }
                );
                results.push({ productId: product.id, success: true, shopifyId: res.data.product.id });
            } catch (err) {
                results.push({ productId: product.id, success: false, error: err.message });
            }
        }
        return results;
    },
    async syncSales(config, sales) {
        // Shopify typically pushes orders TO the POS, not the other way
        return { message: 'Sales sync not supported for Shopify (read-only from POS)' };
    },
};

export { providers };

export async function testIntegration(provider, config) {
    const handler = providers[provider];
    if (!handler) throw new Error(`Unknown provider: ${provider}`);
    return handler.connect(config);
}

export async function syncIntegration(integration, dataType, models) {
    const handler = providers[integration.provider];
    if (!handler) throw new Error(`Unknown provider: ${integration.provider}`);

    const config = integration.config || {};
    const branchId = integration.branchId;

    let results;
    if (dataType === 'products') {
        const products = await models.Product.findAll({
            include: [{ model: models.Inventory, as: 'inventory', where: { branchId }, required: false }],
        });
        results = await handler.syncProducts(config, products);
    } else if (dataType === 'sales') {
        const sales = await models.Sale.findAll({
            where: { branchId },
            include: [{ model: models.SaleItem, as: 'items', include: [{ model: models.Product, as: 'product' }] }],
            limit: 50,
            order: [['createdAt', 'DESC']],
        });
        results = await handler.syncSales(config, sales);
    }

    await integration.update({
        lastSyncAt: new Date(),
        lastStatus: results ? 'success' : 'failed',
    });

    return results;
}

export async function disconnectIntegration(integration) {
    await integration.update({ isActive: false, lastStatus: 'disconnected' });
}
