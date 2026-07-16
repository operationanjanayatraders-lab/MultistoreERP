import { supabase } from '@/db/supabase';
import type {
  Profile, CompanySettings, Company, Warehouse, ProductCategory, Product,
  InventoryItem, InventoryTransaction, StockSummary, InventorySummaryCards,
  TransactionType, Customer, Supplier, SupplierAttachment, SupplierLedgerEntry,
  SalesOrder, PurchaseOrder, StockTransfer, DamageRecord,
  SalesReturn, PurchaseReturn, Account, Voucher, Notification, Message,
  PhysicalStockInventory, ProformaInvoice, Quotation, ProductLocation
} from '@/types/types';

// ── Profiles ──────────────────────────────────────────────
export const getProfile = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', id).maybeSingle();
  return { data: data as Profile | null, error };
};

export const updateProfile = async (id: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles').update(updates).eq('id', id).select().maybeSingle();
  return { data: data as Profile | null, error };
};

export const getProfiles = async (page = 1, pageSize = 100) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('profiles').select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as Profile[] : [], error, count: count ?? 0 };
};

export const createUserProfile = async (profile: { id: string; email: string; full_name?: string; designation?: string; role?: 'user' | 'admin' }) => {
  const { data, error } = await supabase.from('profiles').upsert({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name || null,
    designation: profile.designation || null,
    role: profile.role || 'user',
  }).select().maybeSingle();
  return { data, error };
};

// ── Company Settings ───────────────────────────────────────
export const getCompanySettings = async () => {
  const { data, error } = await supabase
    .from('company_settings').select('*').order('created_at').limit(1).maybeSingle();
  return { data: data as CompanySettings | null, error };
};

export const updateCompanySettings = async (id: string, updates: Partial<CompanySettings>) => {
  const { data, error } = await supabase
    .from('company_settings').update(updates).eq('id', id).select().maybeSingle();
  return { data: data as CompanySettings | null, error };
};

export const upsertCompanySettings = async (settings: Partial<CompanySettings>) => {
  // Get existing settings first
  const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();
  if (existing?.id) {
    const { data, error } = await supabase.from('company_settings').update(settings).eq('id', existing.id).select().maybeSingle();
    return { data: data as CompanySettings | null, error };
  }
  const { data, error } = await supabase.from('company_settings').insert(settings).select().maybeSingle();
  return { data: data as CompanySettings | null, error };
};

// ── Warehouses & Branches ──────────────────────────────────
export const getWarehouses = async () => {
  const { data, error } = await supabase
    .from('warehouses').select('*').order('name').limit(100);
  return { data: Array.isArray(data) ? data as Warehouse[] : [], error };
};

export const getBranches = async (companyId?: string) => {
  let q = supabase.from('branches').select('*').eq('is_active', true).order('name').limit(50);
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  return { data: Array.isArray(data) ? data as import('@/types/types').Branch[] : [], error };
};

export const upsertBranch = async (b: Partial<import('@/types/types').Branch>) => {
  if (b.id) {
    const { data, error } = await supabase.from('branches').update(b).eq('id', b.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('branches').insert(b).select().maybeSingle();
  return { data, error };
};

export const deleteBranch = async (id: string) => {
  return supabase.from('branches').delete().eq('id', id);
};

export const getWarehousesByBranch = async (branchId: string) => {
  const { data, error } = await supabase
    .from('warehouses').select('*').eq('branch_id', branchId).order('name');
  return { data: Array.isArray(data) ? data as Warehouse[] : [], error };
};

export const upsertWarehouse = async (w: Partial<Warehouse>) => {
  if (w.id) {
    const { data, error } = await supabase.from('warehouses').update(w).eq('id', w.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('warehouses').insert(w).select().maybeSingle();
  return { data, error };
};

export const deleteWarehouse = async (id: string) => {
  return supabase.from('warehouses').delete().eq('id', id);
};

// ── Companies ────────────────────────────────────────────────
export const getCompanies = async () => {
  const { data, error } = await supabase
    .from('companies').select('*').eq('is_active', true).order('name').limit(50);
  return { data: Array.isArray(data) ? data as Company[] : [], error };
};

// ── Product Locations ────────────────────────────────────────
export const getProductLocations = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_locations').select('*, warehouses(id,name)')
    .eq('product_id', productId).order('location_code');
  return { data: Array.isArray(data) ? data as ProductLocation[] : [], error };
};

export const upsertProductLocation = async (loc: Partial<ProductLocation>) => {
  if (loc.id) {
    const { data, error } = await supabase.from('product_locations').update(loc).eq('id', loc.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('product_locations').insert(loc).select().maybeSingle();
  return { data, error };
};

export const deleteProductLocation = async (id: string) => {
  return supabase.from('product_locations').delete().eq('id', id);
};

// ── Product Categories ─────────────────────────────────────
export const getProductCategories = async () => {
  const { data, error } = await supabase
    .from('product_categories').select('*').order('name').limit(100);
  return { data: Array.isArray(data) ? data as ProductCategory[] : [], error };
};

export const upsertProductCategory = async (cat: Partial<ProductCategory>) => {
  if (cat.id) {
    const { data, error } = await supabase.from('product_categories').update(cat).eq('id', cat.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('product_categories').insert(cat).select().maybeSingle();
  return { data, error };
};

export const deleteProductCategory = async (id: string) => {
  return supabase.from('product_categories').delete().eq('id', id);
};

// ── Products ───────────────────────────────────────────────
export const getProducts = async (page = 1, pageSize = 20, search = '') => {
  const from = (page - 1) * pageSize;
  let query = supabase.from('products')
    .select('*, product_categories(id,name)', { count: 'exact' })
    .order('name').range(from, from + pageSize - 1);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query;
  return { data: Array.isArray(data) ? data as Product[] : [], error, count: count ?? 0 };
};

export const getProductById = async (id: string) => {
  const { data, error } = await supabase.from('products').select('*, product_categories(id,name)').eq('id', id).maybeSingle();
  return { data: data as Product | null, error };
};

export const upsertProduct = async (product: Partial<Product>) => {
  const payload = { ...product };
  if (!payload.category_id) payload.category_id = null;
  if (payload.id) {
    const { data, error } = await supabase.from('products').update(payload).eq('id', payload.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('products').insert(payload).select().maybeSingle();
  return { data, error };
};

export const deleteProduct = async (id: string) => {
  return supabase.from('products').delete().eq('id', id);
};

// ── Inventory ──────────────────────────────────────────────
export const getInventory = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('inventory')
    .select('*, products(id,name,sku,unit,brand,purchase_price,barcode,description,reorder_level), warehouses(id,name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as InventoryItem[] : [], error, count: count ?? 0 };
};

// ── Inventory Stock Summary (aggregated from transactions) ─
export const getInventorySummaryCards = async (
  fromDate?: string, toDate?: string, warehouseId?: string, branchId?: string, companyId?: string, brand?: string, status?: string
): Promise<{ data: InventorySummaryCards | null; error: unknown }> => {
  // Get all products with their purchase prices and reorder levels
  const { data: products } = await supabase
    .from('products')
    .select('id, purchase_price, reorder_level, brand, name')
    .eq('is_active', true);

  if (!products) return { data: null, error: 'No products' };

  // Get inventory quantities per product+warehouse
  let invQuery = supabase.from('inventory').select('product_id, warehouse_id, quantity');
  // Resolve company → branches → warehouse IDs
  let summaryWhIds: string[] | null = null;
  if (companyId && companyId !== 'all') {
    const { data: brs } = await supabase.from('branches').select('id').eq('company_id', companyId);
    if (brs && brs.length > 0) {
      const { data: whs } = await supabase.from('warehouses').select('id').in('branch_id', brs.map(b => b.id));
      if (whs && whs.length > 0) summaryWhIds = whs.map(w => w.id);
      else summaryWhIds = [];
    } else {
      summaryWhIds = [];
    }
  }
  // Branch filter
  if (branchId && branchId !== 'all') {
    const { data: whs } = await supabase.from('warehouses').select('id').eq('branch_id', branchId);
    if (whs && whs.length > 0) {
      const whIds = whs.map(w => w.id);
      summaryWhIds = summaryWhIds ? summaryWhIds.filter(id => whIds.includes(id)) : whIds;
    } else {
      summaryWhIds = [];
    }
  }
  if (summaryWhIds && summaryWhIds.length > 0) invQuery = invQuery.in('warehouse_id', summaryWhIds);
  else if (summaryWhIds && summaryWhIds.length === 0) invQuery = invQuery.in('warehouse_id', ['__none__']);
  if (warehouseId && warehouseId !== 'all') invQuery = invQuery.eq('warehouse_id', warehouseId);
  const { data: inventory } = await invQuery;

  // Get transactions in date range
  let txQuery = supabase.from('inventory_transactions')
    .select('product_id, warehouse_id, transaction_type, quantity, unit_price');
  if (fromDate) txQuery = txQuery.gte('transaction_date', fromDate);
  if (toDate) txQuery = txQuery.lte('transaction_date', toDate);
  if (warehouseId && warehouseId !== 'all') txQuery = txQuery.eq('warehouse_id', warehouseId);
  const { data: transactions } = await txQuery;

  // Compute
  const prodMap = new Map(products.map(p => [p.id, p]));
  const stockMap = new Map<string, number>();
  invMap: for (const i of (inventory || [])) {
    const key = `${i.product_id}_${i.warehouse_id}`;
    stockMap.set(key, i.quantity);
  }

  // Aggregate per product
  const perProduct = new Map<string, { qty: number; count: number; reorder: number; price: number; brand: string }>();
  for (const p of products) {
    perProduct.set(p.id, { qty: 0, count: 0, reorder: p.reorder_level || 0, price: p.purchase_price || 0, brand: p.brand || '' });
  }
  for (const [key, qty] of stockMap) {
    const pid = key.split('_')[0];
    const entry = perProduct.get(pid);
    if (entry) { entry.qty += qty; entry.count++; }
  }

  let totalValue = 0;
  let totalQty = 0;
  let totalItems = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let negativeStock = 0;

  for (const [pid, entry] of perProduct) {
    if (brand && brand !== 'all' && entry.brand !== brand) continue;
    totalQty += entry.qty;
    totalItems++;
    totalValue += entry.qty * entry.price;
    if (entry.qty <= 0) negativeStock++;
    if (entry.qty === 0) outOfStock++;
    else if (entry.qty <= entry.reorder) lowStock++;
  }

  // Filter by status
  let filteredItems = totalItems;
  if (status && status !== 'all') {
    // Apply status filter logic
  }

  return {
    data: { total_value: totalValue, total_qty: totalQty, total_items: totalItems, low_stock: lowStock, out_of_stock: outOfStock, negative_stock: negativeStock },
    error: null,
  };
};

export const getInventoryItems = async (opts: {
  page?: number; pageSize?: number; search?: string;
  fromDate?: string; toDate?: string; warehouseId?: string; branchId?: string; companyId?: string; brand?: string; status?: string;
  sortBy?: string; sortDir?: 'asc' | 'desc';
}): Promise<{ data: StockSummary[]; total: number; error: unknown }> => {
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 20;
  const { fromDate, toDate, warehouseId, branchId, companyId, brand, status, search, sortBy, sortDir } = opts;

  // Resolve company → branches → warehouse IDs
  let branchWarehouseIds: string[] | null = null;
  if (companyId && companyId !== 'all') {
    const { data: brs } = await supabase.from('branches').select('id').eq('company_id', companyId);
    if (brs && brs.length > 0) {
      const { data: whs } = await supabase.from('warehouses').select('id').in('branch_id', brs.map(b => b.id));
      if (whs && whs.length > 0) branchWarehouseIds = whs.map(w => w.id);
    } else {
      branchWarehouseIds = [];
    }
  }
  // If branch selected, further narrow to branch's warehouses
  if (branchId && branchId !== 'all') {
    const { data: whs } = await supabase.from('warehouses').select('id').eq('branch_id', branchId);
    if (whs && whs.length > 0) {
      const whIds = whs.map(w => w.id);
      branchWarehouseIds = branchWarehouseIds ? branchWarehouseIds.filter(id => whIds.includes(id)) : whIds;
    } else {
      branchWarehouseIds = [];
    }
  }

  // Get products
  let prodQuery = supabase.from('products')
    .select('id, sku, barcode, name, description, brand, unit, purchase_price, reorder_level, product_categories(name)')
    .eq('is_active', true)
    .order('name');

  const { data: products, error: prodErr } = await prodQuery;
  if (prodErr || !products) return { data: [], total: 0, error: prodErr };

  // Get all inventory
  let invQuery = supabase.from('inventory').select('product_id, warehouse_id, quantity, warehouses!inner(id,name)');
  if (warehouseId && warehouseId !== 'all') invQuery = invQuery.eq('warehouse_id', warehouseId);
  else if (branchWarehouseIds && branchWarehouseIds.length > 0) invQuery = invQuery.in('warehouse_id', branchWarehouseIds);
  const { data: inventoryData } = await invQuery;

  // Get transactions for date range
  let txQuery = supabase.from('inventory_transactions')
    .select('product_id, warehouse_id, transaction_type, quantity, remarks')
    .order('transaction_date');
  if (fromDate) txQuery = txQuery.gte('transaction_date', fromDate);
  if (toDate) txQuery = txQuery.lte('transaction_date', toDate);
  if (warehouseId && warehouseId !== 'all') txQuery = txQuery.eq('warehouse_id', warehouseId);
  const { data: txData } = await txQuery;

  // Build warehouse map
  const whNames = new Map<string, string>();
  for (const i of (inventoryData || [])) {
    const w = (i as unknown as { warehouses: { id: string; name: string } }).warehouses;
    if (w) whNames.set(w.id, w.name);
  }

  // Stock per product per warehouse
  const stockByProdWh = new Map<string, number>();
  for (const i of (inventoryData || [])) {
    const key = `${i.product_id}_${i.warehouse_id}`;
    stockByProdWh.set(key, (stockByProdWh.get(key) || 0) + i.quantity);
  }

  // Build warehouse list per product
  const whPerProduct = new Map<string, { warehouse_id: string; warehouse_name: string; quantity: number }[]>();
  for (const [key, qty] of stockByProdWh) {
    const [pid, wid] = key.split('_');
    if (!whPerProduct.has(pid)) whPerProduct.set(pid, []);
    whPerProduct.get(pid)!.push({ warehouse_id: wid, warehouse_name: whNames.get(wid) || wid, quantity: qty });
  }

  // Aggregate breakdown from ALL ADJUSTMENT transactions (sum across warehouses)
  const productBreakdown = new Map<string, Record<string, number>>();
  for (const tx of (txData || [])) {
    if (tx.transaction_type === 'ADJUSTMENT' && tx.remarks && tx.remarks.startsWith('{')) {
      try {
        const parsed = JSON.parse(tx.remarks);
        const existing = productBreakdown.get(tx.product_id);
        if (existing) {
          existing.box_std = existing.box_std || parsed.box_std || 0;
          existing.box_qty = (existing.box_qty || 0) + (parsed.box_qty || 0);
          existing.pkt_std = existing.pkt_std || parsed.pkt_std || 0;
          existing.pkt_qty = (existing.pkt_qty || 0) + (parsed.pkt_qty || 0);
          existing.loose_cut_qty = (existing.loose_cut_qty || 0) + (parsed.loose_cut_qty || 0);
          existing.inwards = (existing.inwards || 0) + (parsed.inwards || 0);
          existing.outwards = (existing.outwards || 0) + (parsed.outwards || 0);
        } else {
          productBreakdown.set(tx.product_id, {
            box_std: parsed.box_std || 0,
            box_qty: parsed.box_qty || 0,
            pkt_std: parsed.pkt_std || 0,
            pkt_qty: parsed.pkt_qty || 0,
            loose_cut_qty: parsed.loose_cut_qty || 0,
            inwards: parsed.inwards || 0,
            outwards: parsed.outwards || 0,
          });
        }
      } catch { /* skip non-JSON remarks */ }
    }
  }

  // Calculate transaction summaries per product
  const txIn = new Map<string, number>(); // PURCHASE + TRANSFER_IN + SALES_RETURN
  const txOut = new Map<string, number>(); // SALE + TRANSFER_OUT + PURCHASE_RETURN + DAMAGE + ADJUSTMENT
  const txByType: Record<string, Map<string, number>> = {
    PURCHASE: new Map(), SALE: new Map(), TRANSFER_IN: new Map(), TRANSFER_OUT: new Map(),
    PURCHASE_RETURN: new Map(), SALES_RETURN: new Map(), ADJUSTMENT: new Map(), DAMAGE: new Map(),
  };

  for (const tx of (txData || [])) {
    const key = `${tx.product_id}`;
    const qty = Math.abs(tx.quantity);
    if (tx.transaction_type === 'PURCHASE' || tx.transaction_type === 'TRANSFER_IN' || tx.transaction_type === 'SALES_RETURN') {
      txIn.set(key, (txIn.get(key) || 0) + qty);
    } else if (tx.transaction_type !== 'OPENING') {
      txOut.set(key, (txOut.get(key) || 0) + qty);
    }
    if (txByType[tx.transaction_type]) {
      txByType[tx.transaction_type].set(key, (txByType[tx.transaction_type].get(key) || 0) + qty);
    }
  }

  // Build summary rows
  const summaries: StockSummary[] = [];
  for (const p of products) {
    if (brand && brand !== 'all' && (p.brand || '') !== brand) continue;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.sku.toLowerCase().includes(s) &&
          !(p.barcode || '').toLowerCase().includes(s) && !(p.brand || '').toLowerCase().includes(s) &&
          !(p.product_categories?.name || '').toLowerCase().includes(s)) continue;
    }

    const pid = p.id;
    const totalQty = Array.from(stockByProdWh.entries())
      .filter(([k]) => k.startsWith(pid + '_'))
      .reduce((s, [, v]) => s + v, 0);

    // Check status filter
    const reorder = p.reorder_level || 0;
    if (status === 'instock' && (totalQty <= reorder || totalQty === 0)) continue;
    if (status === 'lowstock' && (totalQty > reorder || totalQty === 0)) continue;
    if (status === 'outofstock' && totalQty !== 0) continue;
    if (status === 'negativestock' && totalQty >= 0) continue;
    if (status === 'nonmoving') {
      // Has stock but no transactions in period
      if (totalQty === 0) continue;
      const hasTx = (txData || []).some(t => t.product_id === pid);
      if (hasTx) continue;
    }

    // Opening qty from OPENING transactions
    const openingQty = 0; // Simplified - would need date filtering

    const get = (m: Map<string, number>) => m.get(pid) || 0;
    const inwardsVal = get(txByType['PURCHASE']);
    const transferIn = get(txByType['TRANSFER_IN']);
    const salesReturn = get(txByType['SALES_RETURN']);
    const transferOut = get(txByType['TRANSFER_OUT']);
    const damageVal = get(txByType['DAMAGE']);
    const adjustmentVal = get(txByType['ADJUSTMENT']);
    const purchaseReturn = get(txByType['PURCHASE_RETURN']);

    const bd = productBreakdown.get(pid) || {};
    const boxComponent = (bd.box_std > 0 && bd.box_qty > 0) ? bd.box_std * bd.box_qty : 0;
    const pktComponent = (bd.pkt_std > 0 && bd.pkt_qty > 0) ? bd.pkt_std * bd.pkt_qty : 0;
    const inwardsDisplayed = bd.inwards ?? inwardsVal;
    const outwardsDisplayed = bd.outwards ?? get(txByType['SALE']);
    const closing = boxComponent + pktComponent + (bd.loose_cut_qty || 0) + inwardsDisplayed - outwardsDisplayed;
    const stockValue = closing * (p.purchase_price || 0);

    summaries.push({
      product_id: pid,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      brand: p.brand,
      category: p.product_categories?.name || null,
      unit: p.unit,
      purchase_price: p.purchase_price || 0,
      reorder_level: reorder,
      opening_qty: bd.opening_qty ?? openingQty,
      inwards: inwardsDisplayed,
      outwards: outwardsDisplayed,
      transfer_in: transferIn,
      transfer_out: transferOut,
      sales_return: salesReturn,
      purchase_return: purchaseReturn,
      damage: damageVal,
      adjustment: adjustmentVal,
      closing_stock: closing,
      stock_value: stockValue,
      box_std: bd.box_std ?? 0,
      box_qty: bd.box_qty ?? 0,
      pkt_std: bd.pkt_std ?? 0,
      pkt_qty: bd.pkt_qty ?? 0,
      loose_cut_qty: bd.loose_cut_qty ?? 0,
      warehouses: whPerProduct.get(pid) || [],
    });
  }

  // Sort
  if (sortBy) {
    const dir = sortDir === 'desc' ? -1 : 1;
    summaries.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortBy] as number;
      const bv = (b as Record<string, unknown>)[sortBy] as number;
      return (av - bv) * dir;
    });
  }

  const total = summaries.length;
  const paged = summaries.slice((page - 1) * pageSize, page * pageSize);

  return { data: paged, total, error: null };
};

export const getInventoryStockDetail = async (productId: string): Promise<{ warehouse_id: string; warehouse_name: string; quantity: number }[]> => {
  const { data } = await supabase
    .from('inventory')
    .select('warehouse_id, quantity, warehouses!inner(id,name)')
    .eq('product_id', productId)
    .order('quantity', { ascending: false });
  if (!data) return [];
  return (data as unknown as { warehouse_id: string; quantity: number; warehouses: { id: string; name: string } }[]).map(d => ({
    warehouse_id: d.warehouse_id,
    warehouse_name: d.warehouses?.name || d.warehouse_id,
    quantity: d.quantity,
  }));
};

export const getInventoryTransactions = async (productId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*, warehouses(id,name)')
    .eq('product_id', productId)
    .order('transaction_date', { ascending: false })
    .limit(limit);
  return { data: Array.isArray(data) ? data as InventoryTransaction[] : [], error };
};

export const getBrands = async (): Promise<string[]> => {
  const { data } = await supabase.from('products').select('brand').not('brand', 'is', null).neq('brand', '');
  if (!data) return [];
  return [...new Set(data.map(d => d.brand as string))].sort();
};

// ── Inventory Export Helpers ──────────────────────────────
export const getInventoryExportData = async (opts: {
  fromDate?: string; toDate?: string; warehouseId?: string; brand?: string;
}): Promise<{ data: StockSummary[]; error: unknown }> => {
  const result = await getInventoryItems({ ...opts, pageSize: 10000 });
  return { data: result.data, error: result.error };
};

export const createInventoryTransaction = async (tx: Partial<InventoryTransaction>) => {
  return supabase.from('inventory_transactions').insert(tx).select().maybeSingle();
};

export const upsertInventoryStock = async (
  productId: string,
  warehouseId: string,
  quantity: number,
  userId?: string,
  breakdown?: {
    box_std?: number; box_qty?: number; pkt_std?: number;
    pkt_qty?: number; loose_cut_qty?: number; inwards?: number; outwards?: number;
    remarks?: string;
  }
) => {
  const { data: existing } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .maybeSingle();

  const oldQty = existing?.quantity ?? 0;
  const diff = quantity - oldQty;

  const { error: upsertError } = await supabase.from('inventory').upsert(
    { product_id: productId, warehouse_id: warehouseId, quantity },
    { onConflict: 'product_id, warehouse_id' }
  );
  if (upsertError) return { error: upsertError };

  if (diff !== 0) {
    const hasBreakdown = breakdown && (breakdown.box_std || breakdown.box_qty || breakdown.pkt_std || breakdown.pkt_qty || breakdown.loose_cut_qty || breakdown.inwards || breakdown.outwards);
    await supabase.from('inventory_transactions').insert({
      product_id: productId,
      warehouse_id: warehouseId,
      transaction_type: 'ADJUSTMENT',
      quantity: diff,
      transaction_date: new Date().toISOString().split('T')[0],
      remarks: hasBreakdown ? JSON.stringify(breakdown) : 'Manual stock update via Excel import',
      created_by: userId || null,
    });
  }

  return { error: null };
};

// ── Transaction Types ──────────────────────────────────────
export const getTransactionTypes = async () => {
  const { data, error } = await supabase
    .from('transaction_types').select('*').order('name').limit(100);
  return { data: Array.isArray(data) ? data as TransactionType[] : [], error };
};

export const upsertTransactionType = async (tt: Partial<TransactionType>) => {
  if (tt.id) {
    const { data, error } = await supabase.from('transaction_types').update(tt).eq('id', tt.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('transaction_types').insert(tt).select().maybeSingle();
  return { data, error };
};

export const deleteTransactionType = async (id: string) => {
  return supabase.from('transaction_types').delete().eq('id', id);
};

// ── Customers ──────────────────────────────────────────────
export const getCustomers = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('customers').select('*', { count: 'exact' })
    .order('name').range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as Customer[] : [], error, count: count ?? 0 };
};

export const upsertCustomer = async (c: Partial<Customer>) => {
  if (c.id) {
    const { data, error } = await supabase.from('customers').update(c).eq('id', c.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('customers').insert(c).select().maybeSingle();
  return { data, error };
};

export const deleteCustomer = async (id: string) => {
  return supabase.from('customers').delete().eq('id', id);
};

// ── Suppliers (Master) ─────────────────────────────────────
export const getSuppliers = async (page = 1, pageSize = 20, search = '') => {
  const from = (page - 1) * pageSize;
  let query = supabase.from('suppliers')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, from + pageSize - 1);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,supplier_code.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,gstin.ilike.%${search}%,contact_person.ilike.%${search}%`
    );
  }
  const { data, error, count } = await query;
  return { data: Array.isArray(data) ? data as Supplier[] : [], error, count: count ?? 0 };
};

export const getSupplierById = async (id: string) => {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  return { data: data as Supplier | null, error };
};

export const upsertSupplier = async (s: Partial<Supplier>) => {
  const payload = { ...s };
  if (!payload.created_by) delete payload.created_by;
  if (payload.id) {
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('suppliers').update(payload).eq('id', payload.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('suppliers').insert(payload).select().maybeSingle();
  return { data, error };
};

export const deleteSupplier = async (id: string) => {
  return supabase.from('suppliers').delete().eq('id', id);
};

// ── Supplier Duplicate Checks ──────────────────────────────
export const checkSupplierDuplicate = async (field: string, value: string, excludeId?: string) => {
  let query = supabase.from('suppliers').select('id, name').eq(field, value);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query.limit(1).maybeSingle();
  return data as { id: string; name: string } | null;
};

export const checkSupplierDuplicates = async (supplier: Partial<Supplier>) => {
  const warnings: string[] = [];
  const checks: [string, string | null | undefined][] = [
    ['gstin', supplier.gstin],
    ['pan', supplier.pan],
    ['phone', supplier.phone],
    ['name', supplier.name],
  ];
  for (const [field, value] of checks) {
    if (!value || String(value).trim() === '') continue;
    const dup = await checkSupplierDuplicate(field, String(value).trim(), supplier.id);
    if (dup) {
      warnings.push(`${field === 'gstin' ? 'GSTIN' : field === 'pan' ? 'PAN' : field === 'phone' ? 'Mobile' : 'Supplier Name'} "${value}" already exists for supplier "${dup.name}"`);
    }
  }
  return warnings;
};

// ── Auto Supplier Code ─────────────────────────────────────
export const getNextSupplierCode = async (prefix = 'SUP') => {
  const { data } = await supabase
    .from('suppliers')
    .select('supplier_code')
    .not('supplier_code', 'is', null)
    .order('supplier_code', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastCode = data?.supplier_code || `${prefix}00000`;
  const num = parseInt(lastCode.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(num + 1).padStart(5, '0')}`;
};

// ── Supplier Attachments ───────────────────────────────────
export const getSupplierAttachments = async (supplierId: string) => {
  const { data, error } = await supabase
    .from('supplier_attachments')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  return { data: Array.isArray(data) ? data as SupplierAttachment[] : [], error };
};

export const upsertSupplierAttachment = async (a: Partial<SupplierAttachment>) => {
  if (a.id) {
    const { data, error } = await supabase.from('supplier_attachments').update(a).eq('id', a.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('supplier_attachments').insert(a).select().maybeSingle();
  return { data, error };
};

export const deleteSupplierAttachment = async (id: string) => {
  return supabase.from('supplier_attachments').delete().eq('id', id);
};

// ── Supplier Ledger ────────────────────────────────────────
export const getSupplierLedger = async (supplierId: string) => {
  const { data, error } = await supabase
    .from('supplier_ledger')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('entry_date', { ascending: false });
  return { data: Array.isArray(data) ? data as SupplierLedgerEntry[] : [], error };
};

export const createSupplierLedgerEntry = async (entry: Partial<SupplierLedgerEntry>) => {
  return supabase.from('supplier_ledger').insert(entry).select().maybeSingle();
};

// ── Sales Orders ───────────────────────────────────────────
export const getSalesOrders = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('sales_orders')
    .select('*, customers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as SalesOrder[] : [], error, count: count ?? 0 };
};

export const getSalesOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*, customers(id,name), sales_order_items(*, products(id,name,sku,unit))')
    .eq('id', id).maybeSingle();
  return { data: data as SalesOrder | null, error };
};

export const createSalesOrder = async (order: Partial<SalesOrder>, items: Partial<SalesOrderItem>[]) => {
  const { data: ord, error: ordErr } = await supabase.from('sales_orders').insert(order).select().maybeSingle();
  if (ordErr || !ord) return { data: null, error: ordErr };
  const itemsWithId = items.map(i => ({ ...i, sales_order_id: ord.id }));
  const { error: itemErr } = await supabase.from('sales_order_items').insert(itemsWithId);
  return { data: ord, error: itemErr };
};

export const updateSalesOrderStatus = async (id: string, status: SalesOrder['status']) => {
  return supabase.from('sales_orders').update({ status }).eq('id', id);
};

export const deleteSalesOrder = async (id: string) => {
  return supabase.from('sales_orders').delete().eq('id', id);
};

// ── Purchase Orders ────────────────────────────────────────
export const getPurchaseOrders = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as PurchaseOrder[] : [], error, count: count ?? 0 };
};

export const getPurchaseOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(id,name), purchase_order_items(*, products(id,name,sku,unit))')
    .eq('id', id).maybeSingle();
  return { data: data as PurchaseOrder | null, error };
};

export const createPurchaseOrder = async (order: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[]) => {
  const { data: ord, error: ordErr } = await supabase.from('purchase_orders').insert(order).select().maybeSingle();
  if (ordErr || !ord) return { data: null, error: ordErr };
  const itemsWithId = items.map(i => ({ ...i, purchase_order_id: ord.id }));
  const { error: itemErr } = await supabase.from('purchase_order_items').insert(itemsWithId);
  return { data: ord, error: itemErr };
};

export const updatePurchaseOrderStatus = async (id: string, status: PurchaseOrder['status']) => {
  return supabase.from('purchase_orders').update({ status }).eq('id', id);
};

export const deletePurchaseOrder = async (id: string) => {
  return supabase.from('purchase_orders').delete().eq('id', id);
};

// ── Stock Transfers ────────────────────────────────────────
export const getStockTransfers = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('stock_transfers')
    .select('*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id,name), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as StockTransfer[] : [], error, count: count ?? 0 };
};

export const createStockTransfer = async (transfer: Partial<StockTransfer>, items: Partial<StockTransferItem>[]) => {
  const { data: t, error: tErr } = await supabase.from('stock_transfers').insert(transfer).select().maybeSingle();
  if (tErr || !t) return { data: null, error: tErr };
  const itemsWithId = items.map(i => ({ ...i, transfer_id: t.id }));
  const { error: itemErr } = await supabase.from('stock_transfer_items').insert(itemsWithId);
  return { data: t, error: itemErr };
};

export const deleteStockTransfer = async (id: string) => {
  return supabase.from('stock_transfers').delete().eq('id', id);
};

// ── Damage Records ─────────────────────────────────────────
export const getDamageRecords = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('damage_records')
    .select('*, products(id,name,sku), warehouses(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as DamageRecord[] : [], error, count: count ?? 0 };
};

export const createDamageRecord = async (record: Partial<DamageRecord>) => {
  if (!record.warehouse_id) record.warehouse_id = null;
  return supabase.from('damage_records').insert(record);
};

export const updateDamageStatus = async (id: string, status: DamageRecord['status']) => {
  return supabase.from('damage_records').update({ status }).eq('id', id);
};

export const deleteDamageRecord = async (id: string) => {
  return supabase.from('damage_records').delete().eq('id', id);
};

// ── Sales Returns ──────────────────────────────────────────
export const getSalesReturns = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('sales_returns')
    .select('*, customers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as SalesReturn[] : [], error, count: count ?? 0 };
};

export const createSalesReturn = async (ret: Partial<SalesReturn>, items: Partial<SalesReturnItem>[]) => {
  const { data: r, error: rErr } = await supabase.from('sales_returns').insert(ret).select().maybeSingle();
  if (rErr || !r) return { data: null, error: rErr };
  const itemsWithId = items.map(i => ({ ...i, sales_return_id: r.id }));
  const { error: itemErr } = await supabase.from('sales_return_items').insert(itemsWithId);
  return { data: r, error: itemErr };
};

export const deleteSalesReturn = async (id: string) => {
  return supabase.from('sales_returns').delete().eq('id', id);
};

// ── Purchase Returns ───────────────────────────────────────
export const getPurchaseReturns = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('purchase_returns')
    .select('*, suppliers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as PurchaseReturn[] : [], error, count: count ?? 0 };
};

export const createPurchaseReturn = async (ret: Partial<PurchaseReturn>, items: Partial<PurchaseReturnItem>[]) => {
  const { data: r, error: rErr } = await supabase.from('purchase_returns').insert(ret).select().maybeSingle();
  if (rErr || !r) return { data: null, error: rErr };
  const itemsWithId = items.map(i => ({ ...i, purchase_return_id: r.id }));
  const { error: itemErr } = await supabase.from('purchase_return_items').insert(itemsWithId);
  return { data: r, error: itemErr };
};

export const deletePurchaseReturn = async (id: string) => {
  return supabase.from('purchase_returns').delete().eq('id', id);
};

// ── Chart of Accounts ──────────────────────────────────────
export const getAccounts = async () => {
  const { data, error } = await supabase
    .from('accounts').select('*').order('code').limit(200);
  return { data: Array.isArray(data) ? data as Account[] : [], error };
};

export const upsertAccount = async (acc: Partial<Account>) => {
  const payload = { ...acc };
  if (!payload.parent_id) payload.parent_id = null;
  if (payload.id) {
    const { data, error } = await supabase.from('accounts').update(payload).eq('id', payload.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('accounts').insert(payload).select().maybeSingle();
  return { data, error };
};

export const createAccount = async (acc: Partial<Account> & { created_by?: string | null | undefined }) => {
  return supabase.from('accounts').insert(acc).select().maybeSingle();
};

export const deleteAccount = async (id: string) => {
  return supabase.from('accounts').delete().eq('id', id);
};

// ── Designations ───────────────────────────────────────────
export const getDesignations = async () => {
  const { data, error } = await supabase
    .from('designations').select('*').order('name').limit(100);
  return { data: Array.isArray(data) ? data as { id: string; name: string }[] : [], error };
};

export const upsertDesignation = async (d: { id?: string; name: string }) => {
  if (d.id) {
    const { data, error } = await supabase.from('designations').update({ name: d.name }).eq('id', d.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('designations').insert({ name: d.name }).select().maybeSingle();
  return { data, error };
};

export const deleteDesignation = async (id: string) => {
  return supabase.from('designations').delete().eq('id', id);
};

// ── Ledger & Reports ───────────────────────────────────────
export const getLedgerEntries = async (from: string, to: string) => {
  const { data, error } = await supabase
    .from('voucher_items')
    .select('debit, credit, accounts(id, name, account_type), vouchers!inner(voucher_date)')
    .gte('vouchers.voucher_date', from)
    .lte('vouchers.voucher_date', to);
  if (error || !data) return [];
  // Aggregate by account
  const map: Record<string, { account_name: string; debit: number; credit: number }> = {};
  for (const row of (data as unknown) as Array<{ debit: number; credit: number; accounts: { id: string; name: string; account_type: string } | null }>) {
    const acc = row.accounts;
    if (!acc) continue;
    if (!map[acc.id]) map[acc.id] = { account_name: acc.name, debit: 0, credit: 0 };
    map[acc.id].debit += row.debit || 0;
    map[acc.id].credit += row.credit || 0;
  }
  return Object.values(map).map(e => ({ ...e, balance: e.debit - e.credit }));
};

export const getBalanceSheet = async (asOf: string) => {
  const { data: accounts } = await supabase.from('accounts').select('id, name, account_type, opening_balance').limit(200);
  const { data: vItems } = await supabase
    .from('voucher_items')
    .select('account_id, debit, credit, vouchers!inner(voucher_date)')
    .lte('vouchers.voucher_date', asOf);
  if (!accounts) return {};
  const balanceMap: Record<string, number> = {};
  for (const acc of accounts) {
    balanceMap[acc.id] = acc.opening_balance || 0;
  }
  for (const item of (vItems || []) as Array<{ account_id: string; debit: number; credit: number }>) {
    if (balanceMap[item.account_id] !== undefined) {
      balanceMap[item.account_id] += (item.debit || 0) - (item.credit || 0);
    }
  }
  const result: Record<string, { name: string; balance: number }[]> = {};
  for (const acc of accounts as Array<{ id: string; name: string; account_type: string }>) {
    if (!result[acc.account_type]) result[acc.account_type] = [];
    result[acc.account_type].push({ name: acc.name, balance: balanceMap[acc.id] || 0 });
  }
  return result;
};

export const getProfitAndLoss = async (from: string, to: string) => {
  const { data: accounts } = await supabase.from('accounts').select('id, name, account_type').in('account_type', ['income', 'expense']).limit(200);
  const { data: vItems } = await supabase
    .from('voucher_items')
    .select('account_id, debit, credit, vouchers!inner(voucher_date)')
    .gte('vouchers.voucher_date', from)
    .lte('vouchers.voucher_date', to);
  if (!accounts) return { revenue: 0, expenses: 0, netProfit: 0, details: {} };
  const balanceMap: Record<string, number> = {};
  for (const item of (vItems || []) as Array<{ account_id: string; debit: number; credit: number }>) {
    balanceMap[item.account_id] = (balanceMap[item.account_id] || 0) + (item.credit || 0) - (item.debit || 0);
  }
  let revenue = 0, expenses = 0;
  const details: Record<string, { name: string; balance: number }[]> = {};
  for (const acc of accounts as Array<{ id: string; name: string; account_type: string }>) {
    const bal = Math.abs(balanceMap[acc.id] || 0);
    const type = acc.account_type === 'income' ? 'revenue' : acc.account_type;
    if (!details[type]) details[type] = [];
    details[type].push({ name: acc.name, balance: bal });
    if (type === 'revenue') revenue += bal;
    else expenses += bal;
  }
  return { revenue, expenses, netProfit: revenue - expenses, details };
};

// ── Vouchers ───────────────────────────────────────────────
export const getVouchers = async (page = 1, pageSize = 20, type?: string) => {
  const from = (page - 1) * pageSize;
  let query = supabase.from('vouchers')
    .select('*', { count: 'exact' })
    .order('voucher_date', { ascending: false })
    .range(from, from + pageSize - 1);
  if (type) query = query.eq('voucher_type', type);
  const { data, error, count } = await query;
  return { data: Array.isArray(data) ? data as Voucher[] : [], error, count: count ?? 0 };
};

export const getVoucherById = async (id: string) => {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*, voucher_items(*, accounts(id,code,name))')
    .eq('id', id).maybeSingle();
  return { data: data as Voucher | null, error };
};

export const createVoucher = async (voucher: Partial<Voucher>, items: Partial<VoucherItem>[]) => {
  const { data: v, error: vErr } = await supabase.from('vouchers').insert(voucher).select().maybeSingle();
  if (vErr || !v) return { data: null, error: vErr };
  const itemsWithId = items.map(i => ({ ...i, voucher_id: v.id }));
  const { error: itemErr } = await supabase.from('voucher_items').insert(itemsWithId);
  return { data: v, error: itemErr };
};

export const deleteVoucher = async (id: string) => {
  return supabase.from('vouchers').delete().eq('id', id);
};

// ── Notifications ──────────────────────────────────────────
export const getNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(20);
  return { data: Array.isArray(data) ? data as Notification[] : [], error };
};

export const markNotificationRead = async (id: string) => {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

// ── Messages ───────────────────────────────────────────────
export const getMessages = async (userId: string) => {
  const { data, error } = await supabase
    .from('messages').select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false }).limit(20);
  return { data: Array.isArray(data) ? data as Message[] : [], error };
};

export const markMessageRead = async (id: string) => {
  return supabase.from('messages').update({ is_read: true }).eq('id', id);
};

// ── Dashboard Stats ────────────────────────────────────────
export const getDashboardStats = async () => {
  const [salesRes, purchaseRes, productRes, inventoryRes, proformaRes, quotationRes] = await Promise.all([
    supabase.from('sales_orders').select('total', { count: 'exact' }).neq('status', 'cancelled'),
    supabase.from('purchase_orders').select('total', { count: 'exact' }).neq('status', 'cancelled'),
    supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('inventory').select('quantity').limit(1000),
    supabase.from('proforma_invoices').select('total', { count: 'exact' }).neq('status', 'cancelled'),
    supabase.from('quotations').select('total', { count: 'exact' }).neq('status', 'expired'),
  ]);
  const totalSales = (salesRes.data || []).reduce((s: number, r: { total: number }) => s + (r.total || 0), 0);
  const totalPurchase = (purchaseRes.data || []).reduce((s: number, r: { total: number }) => s + (r.total || 0), 0);
  const totalStock = (inventoryRes.data || []).reduce((s: number, r: { quantity: number }) => s + (r.quantity || 0), 0);
  const totalProforma = (proformaRes.data || []).reduce((s: number, r: { total: number }) => s + (r.total || 0), 0);
  const totalQuotation = (quotationRes.data || []).reduce((s: number, r: { total: number }) => s + (r.total || 0), 0);
  return {
    totalSales,
    totalPurchase,
    totalProducts: productRes.count ?? 0,
    totalOrders: salesRes.count ?? 0,
    totalStock,
    totalProforma,
    totalChallan: totalQuotation,
    paymentReceived: totalSales * 0.7,
    paymentDue: totalSales * 0.3,
  };
};

// ── Physical Stock Inventory ───────────────────────────────
export const getPhysicalStockInventory = async (page = 1, pageSize = 20, warehouseId?: string) => {
  const from = (page - 1) * pageSize;
  let q = supabase
    .from('physical_stock_inventory')
    .select('*, products(id,name,sku), warehouses(id,name)', { count: 'exact' })
    .order('inventory_date', { ascending: false })
    .range(from, from + pageSize - 1);
  if (warehouseId && warehouseId !== 'all') q = q.eq('warehouse_id', warehouseId);
  const { data, error, count } = await q;
  return { data: Array.isArray(data) ? data as PhysicalStockInventory[] : [], error, count: count ?? 0 };
};

export const createPhysicalStockRecord = async (record: Partial<PhysicalStockInventory>) => {
  const { data, error } = await supabase.from('physical_stock_inventory').insert(record).select().maybeSingle();
  return { data: data as PhysicalStockInventory | null, error };
};

export const deletePhysicalStockRecord = async (id: string) => {
  return supabase.from('physical_stock_inventory').delete().eq('id', id);
};

// ── Proforma Invoices ─────────────────────────────────────
export const getProformaInvoices = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('proforma_invoices')
    .select('*, customers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as ProformaInvoice[] : [], error, count: count ?? 0 };
};

export const getProformaInvoiceById = async (id: string) => {
  const { data, error } = await supabase
    .from('proforma_invoices')
    .select('*, customers(id,name), proforma_invoice_items(*, products(id,name,sku))')
    .eq('id', id).maybeSingle();
  return { data: data as ProformaInvoice | null, error };
};

export const createProformaInvoice = async (
  invoice: Partial<ProformaInvoice>,
  items: Array<{ product_id?: string | null; item_code?: string; item_name: string; qty: number; rate: number; gst_percent: number; gst_amount: number; amount: number; sort_order?: number }>
) => {
  const { data: v, error: vErr } = await supabase.from('proforma_invoices').insert(invoice).select().maybeSingle();
  if (vErr || !v) return { data: null, error: vErr };
  const itemsWithId = items.map((i, idx) => ({ ...i, proforma_id: v.id, sort_order: idx }));
  const { error: itemErr } = await supabase.from('proforma_invoice_items').insert(itemsWithId);
  return { data: v as ProformaInvoice, error: itemErr };
};

export const updateProformaInvoice = async (
  id: string,
  invoice: Partial<ProformaInvoice>,
  items: Array<{ product_id?: string | null; item_code?: string; item_name: string; qty: number; rate: number; gst_percent: number; gst_amount: number; amount: number; sort_order?: number }>
) => {
  const { error: delErr } = await supabase.from('proforma_invoice_items').delete().eq('proforma_id', id);
  if (delErr) return { data: null, error: delErr };
  const { data: v, error: vErr } = await supabase.from('proforma_invoices').update(invoice).eq('id', id).select().maybeSingle();
  if (vErr || !v) return { data: null, error: vErr };
  const itemsWithId = items.map((i, idx) => ({ ...i, proforma_id: id, sort_order: idx }));
  const { error: itemErr } = await supabase.from('proforma_invoice_items').insert(itemsWithId);
  return { data: v as ProformaInvoice, error: itemErr };
};

export const deleteProformaInvoice = async (id: string) => {
  return supabase.from('proforma_invoices').delete().eq('id', id);
};

// ── Quotations ────────────────────────────────────────────
export const getQuotations = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from('quotations')
    .select('*, customers(id,name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as Quotation[] : [], error, count: count ?? 0 };
};

export const getQuotationById = async (id: string) => {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customers(id,name), quotation_items(*, products(id,name,sku))')
    .eq('id', id).maybeSingle();
  return { data: data as Quotation | null, error };
};

export const createQuotation = async (
  quotation: Partial<Quotation>,
  items: Array<{ product_id?: string | null; item_code?: string; item_name: string; qty: number; rate: number; discount_percent: number; discount_amount: number; gst_percent: number; gst_amount: number; amount: number; sort_order?: number }>
) => {
  const { data: v, error: vErr } = await supabase.from('quotations').insert(quotation).select().maybeSingle();
  if (vErr || !v) return { data: null, error: vErr };
  const itemsWithId = items.map((i, idx) => ({ ...i, quotation_id: v.id, sort_order: idx }));
  const { error: itemErr } = await supabase.from('quotation_items').insert(itemsWithId);
  return { data: v as Quotation, error: itemErr };
};

export const updateQuotation = async (
  id: string,
  quotation: Partial<Quotation>,
  items: Array<{ product_id?: string | null; item_code?: string; item_name: string; qty: number; rate: number; discount_percent: number; discount_amount: number; gst_percent: number; gst_amount: number; amount: number; sort_order?: number }>
) => {
  const { error: delErr } = await supabase.from('quotation_items').delete().eq('quotation_id', id);
  if (delErr) return { data: null, error: delErr };
  const { data: v, error: vErr } = await supabase.from('quotations').update(quotation).eq('id', id).select().maybeSingle();
  if (vErr || !v) return { data: null, error: vErr };
  const itemsWithId = items.map((i, idx) => ({ ...i, quotation_id: id, sort_order: idx }));
  const { error: itemErr } = await supabase.from('quotation_items').insert(itemsWithId);
  return { data: v as Quotation, error: itemErr };
};

export const deleteQuotation = async (id: string) => {
  return supabase.from('quotations').delete().eq('id', id);
};

// ── Top Selling / Low Stock helpers ───────────────────────
export const getTopSellingItems = async (limit = 10) => {
  const { data, error } = await supabase
    .from('sales_order_items')
    .select('quantity, products(id,name,sku,product_categories(name))')
    .limit(500);
  if (error || !data) return [];
  const map: Record<string, { id: string; name: string; sku: string; cat: string; qty: number }> = {};
  for (const row of (data as unknown) as Array<{ quantity: number; products: { id: string; name: string; sku: string; product_categories: { name: string } | null } | null }>) {
    if (!row.products) continue;
    const p = row.products;
    if (!map[p.id]) map[p.id] = { id: p.id, name: p.name, sku: p.sku, cat: p.product_categories?.name || '-', qty: 0 };
    map[p.id].qty += row.quantity || 0;
  }
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
};

export const getLowStockItems = async (limit = 10) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity, products(id,name,sku,reorder_level,product_categories(name))')
    .limit(500);
  if (error || !data) return [];
  type InvRow = { quantity: number; products: { id: string; name: string; sku: string; reorder_level: number; product_categories: { name: string } | null } | null };
  return ((data as unknown) as InvRow[])
    .filter(r => r.products && r.quantity <= (r.products.reorder_level || 5))
    .map(r => ({ id: r.products!.id, name: r.products!.name, sku: r.products!.sku, cat: r.products!.product_categories?.name || '-', qty: r.quantity }))
    .sort((a, b) => a.qty - b.qty)
    .slice(0, limit);
};

// ── Departments ─────────────────────────────────────────────
export const getDepartments = async () => {
  const { data, error } = await supabase
    .from('departments').select('*').eq('is_active', true).order('name').limit(200);
  return { data: Array.isArray(data) ? data as import('@/types/types').Department[] : [], error };
};

export const upsertDepartment = async (d: { id?: string; name: string; is_active?: boolean }) => {
  const payload = { name: d.name, is_active: d.is_active ?? true };
  if (d.id) {
    const { data, error } = await supabase.from('departments').update(payload).eq('id', d.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await supabase.from('departments').insert(payload).select().maybeSingle();
  return { data, error };
};

export const deleteDepartment = async (id: string) => {
  return supabase.from('departments').update({ is_active: false }).eq('id', id);
};

// ── Daily Task Reports ────────────────────────────────────────
export type DailyTaskReportInput = {
  id?: string;
  user_id: string;
  department_id?: string | null;
  employee_name: string;
  designation?: string | null;
  report_date: string;
  issues_requirements?: string | null;
  plan_for_tomorrow?: string | null;
  status?: 'draft' | 'submitted';
  daily_items: Array<{ task_type: string; work_description: string; status: string; remarks?: string | null }>;
  pending_items: Array<{ task_type: string; work_description: string; status: string; expected_completion?: string | null }>;
};

export const getDailyTaskReports = async (opts: {
  from: string;
  to: string;
  departmentId?: string;
  userId?: string;
}) => {
  let q = supabase
    .from('daily_task_reports')
    .select(`
      *,
      departments(id, name),
      daily_task_items(id, task_type, work_description, status, remarks, sort_order),
      pending_task_items(id, task_type, work_description, status, expected_completion, sort_order)
    `)
    .gte('report_date', opts.from)
    .lte('report_date', opts.to)
    .order('report_date', { ascending: false });

  if (opts.departmentId) q = q.eq('department_id', opts.departmentId);
  if (opts.userId) q = q.eq('user_id', opts.userId);

  const { data, error } = await q.limit(500);
  return {
    data: Array.isArray(data) ? data as import('@/types/types').DailyTaskReport[] : [],
    error,
  };
};

export const getDailyTaskReportByDate = async (userId: string, reportDate: string) => {
  const { data, error } = await supabase
    .from('daily_task_reports')
    .select(`
      *,
      departments(id, name),
      daily_task_items(id, task_type, work_description, status, remarks, sort_order),
      pending_task_items(id, task_type, work_description, status, expected_completion, sort_order)
    `)
    .eq('user_id', userId)
    .eq('report_date', reportDate)
    .maybeSingle();
  return { data: data as import('@/types/types').DailyTaskReport | null, error };
};

export const saveDailyTaskReport = async (input: DailyTaskReportInput) => {
  const header = {
    user_id: input.user_id,
    department_id: input.department_id || null,
    employee_name: input.employee_name,
    designation: input.designation || null,
    report_date: input.report_date,
    issues_requirements: input.issues_requirements || null,
    plan_for_tomorrow: input.plan_for_tomorrow || null,
    status: input.status || 'submitted',
    updated_at: new Date().toISOString(),
  };

  let reportId = input.id;

  if (reportId) {
    const { error } = await supabase.from('daily_task_reports').update(header).eq('id', reportId);
    if (error) return { data: null, error };
  } else {
    const { data, error } = await supabase.from('daily_task_reports').insert(header).select('id').maybeSingle();
    if (error) return { data: null, error };
    reportId = data?.id;
  }

  if (!reportId) return { data: null, error: { message: 'Failed to save report' } as import('@supabase/supabase-js').PostgrestError };

  await supabase.from('daily_task_items').delete().eq('report_id', reportId);
  await supabase.from('pending_task_items').delete().eq('report_id', reportId);

  const dailyRows = input.daily_items
    .filter(i => i.work_description.trim() || i.task_type.trim())
    .map((item, idx) => ({
      report_id: reportId,
      task_type: item.task_type,
      work_description: item.work_description,
      status: item.status,
      remarks: item.remarks || null,
      sort_order: idx,
    }));

  const pendingRows = input.pending_items
    .filter(i => i.work_description.trim() || i.task_type.trim())
    .map((item, idx) => ({
      report_id: reportId,
      task_type: item.task_type,
      work_description: item.work_description,
      status: item.status,
      expected_completion: item.expected_completion || null,
      sort_order: idx,
    }));

  if (dailyRows.length) {
    const { error } = await supabase.from('daily_task_items').insert(dailyRows);
    if (error) return { data: null, error };
  }
  if (pendingRows.length) {
    const { error } = await supabase.from('pending_task_items').insert(pendingRows);
    if (error) return { data: null, error };
  }

  const { data, error } = await getDailyTaskReportByDate(input.user_id, input.report_date);
  return { data, error };
};

export const deleteDailyTaskReport = async (id: string) => {
  return supabase.from('daily_task_reports').delete().eq('id', id);
};

// helper type re-exports used inside api.ts only
type SalesOrderItem = import('@/types/types').SalesOrderItem;
type PurchaseOrderItem = import('@/types/types').PurchaseOrderItem;
type StockTransferItem = import('@/types/types').StockTransferItem;
type SalesReturnItem = import('@/types/types').SalesReturnItem;
type PurchaseReturnItem = import('@/types/types').PurchaseReturnItem;
type VoucherItem = import('@/types/types').VoucherItem;
