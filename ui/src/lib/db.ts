import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  category: string;
  sku: string;
  barcode: string;
  barcodes: string[];
  imageUrl?: string;
  updatedAt: number;
}

export interface OfflineSale {
  id?: number;
  saleData: any;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

export class RetailProDB extends Dexie {
  products!: Table<LocalProduct>;
  offlineSales!: Table<OfflineSale>;

  constructor() {
    super('RetailProDB');
    this.version(1).stores({
      products: 'id, name, sku, barcode, *barcodes, category',
      offlineSales: '++id, createdAt, status'
    });
  }
}

export const db = new RetailProDB();
