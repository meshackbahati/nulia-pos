export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          barcode: string | null
          barcode_data: string | null
          barcode_format_id: number | null
          sku: string | null
          price: number
          quantity: number
          category: string | null
          currency: string
          low_stock_threshold: number
          reorder_point: number
          expiry_date: string | null
          is_active: boolean
          supplier_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          last_restocked_at: string | null
        }
        Insert: {
          id?: string
          name: string
          barcode?: string | null
          barcode_data?: string | null
          barcode_format_id?: number | null
          sku?: string | null
          price: number
          quantity?: number
          category?: string | null
          currency?: string
          low_stock_threshold?: number
          reorder_point?: number
          expiry_date?: string | null
          is_active?: boolean
          supplier_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          last_restocked_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          barcode?: string | null
          barcode_data?: string | null
          barcode_format_id?: number | null
          sku?: string | null
          price?: number
          quantity?: number
          category?: string | null
          currency?: string
          low_stock_threshold?: number
          reorder_point?: number
          expiry_date?: string | null
          is_active?: boolean
          supplier_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          last_restocked_at?: string | null
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          product_id: string
          transaction_type: string
          quantity: number
          unit_cost: number | null
          total_cost: number | null
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          location_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          transaction_type: string
          quantity: number
          unit_cost?: number | null
          total_cost?: number | null
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          location_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          transaction_type?: string
          quantity?: number
          unit_cost?: number | null
          total_cost?: number | null
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          location_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      barcode_formats: {
        Row: {
          id: number
          name: string
          prefix: string | null
          pattern: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          prefix?: string | null
          pattern: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          prefix?: string | null
          pattern?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          tax_id: string | null
          payment_terms: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      current_stock_levels: {
        Row: {
          product_id: string | null
          product_name: string | null
          sku: string | null
          barcode_data: string | null
          system_quantity: number | null
          calculated_quantity: number | null
          reorder_point: number | null
          low_stock_threshold: number | null
          supplier_id: string | null
          supplier_name: string | null
          last_restocked_at: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_barcode_data: {
        Args: {
          p_product_id: string
          format_id: number
        }
        Returns: string
      }
      get_product_stock: {
        Args: {
          p_product_id: string
        }
        Returns: number
      }
      refresh_current_stock_levels: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
