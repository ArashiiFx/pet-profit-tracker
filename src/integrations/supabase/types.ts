export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pet_name: string
          purchase_date: string | null
          purchase_id: string | null
          quantity: number
          sold_date: string | null
          source_type: string
          status: string
          trade_id: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pet_name: string
          purchase_date?: string | null
          purchase_id?: string | null
          quantity?: number
          sold_date?: string | null
          source_type?: string
          status?: string
          trade_id?: string | null
          updated_at?: string
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pet_name?: string
          purchase_date?: string | null
          purchase_id?: string | null
          quantity?: number
          sold_date?: string | null
          source_type?: string
          status?: string
          trade_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          buy_item: string
          buy_price: number
          created_at: string
          currency: string
          game: string
          id: string
          notes: string | null
          purchase_date: string
          seq: number
          user_id: string
        }
        Insert: {
          buy_item: string
          buy_price: number
          created_at?: string
          currency?: string
          game: string
          id?: string
          notes?: string | null
          purchase_date: string
          seq?: never
          user_id?: string
        }
        Update: {
          buy_item?: string
          buy_price?: number
          created_at?: string
          currency?: string
          game?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          seq?: never
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          exchange_rate: number
          fee_percentage: number
          fee_usd: number
          id: string
          inventory_id: string | null
          net_sell_idr: number
          net_sell_usd: number
          notes: string | null
          pet_name: string
          profit_idr: number | null
          quantity_sold: number
          sale_date: string
          sell_price_usd: number
          seq: number
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          exchange_rate: number
          fee_percentage?: number
          fee_usd: number
          id?: string
          inventory_id?: string | null
          net_sell_idr: number
          net_sell_usd: number
          notes?: string | null
          pet_name: string
          profit_idr?: number | null
          quantity_sold: number
          sale_date: string
          sell_price_usd: number
          seq?: never
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          exchange_rate?: number
          fee_percentage?: number
          fee_usd?: number
          id?: string
          inventory_id?: string | null
          net_sell_idr?: number
          net_sell_usd?: number
          notes?: string | null
          pet_name?: string
          profit_idr?: number | null
          quantity_sold?: number
          sale_date?: string
          sell_price_usd?: number
          seq?: never
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          default_fee_percentage: number
          id: string
          updated_at: string
          usd_exchange_rate: number
          user_id: string
        }
        Insert: {
          default_fee_percentage?: number
          id?: string
          updated_at?: string
          usd_exchange_rate?: number
          user_id?: string
        }
        Update: {
          default_fee_percentage?: number
          id?: string
          updated_at?: string
          usd_exchange_rate?: number
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchase_id: string | null
          seq: number
          source_inventory_id: string | null
          trade_date: string
          traded_item: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_id?: string | null
          seq?: never
          source_inventory_id?: string | null
          trade_date: string
          traded_item: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_id?: string | null
          seq?: never
          source_inventory_id?: string | null
          trade_date?: string
          traded_item?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_source_inventory_id_fkey"
            columns: ["source_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stock: {
        Args: {
          p_pet_name: string
          p_purchase_date: string | null
          p_purchase_id: string | null
          p_quantity: number
          p_source_type: string
          p_trade_id: string | null
          p_username: string
        }
        Returns: string
      }
      create_trade: {
        Args: {
          p_notes: string | null
          p_pets: Json
          p_purchase_id: string | null
          p_source_inventory_id: string | null
          p_source_quantity: number | null
          p_trade_date: string
          p_traded_item: string
        }
        Returns: string
      }
      seed_demo_data: { Args: never; Returns: undefined }
      sell_stock: {
        Args: {
          p_exchange_rate: number
          p_fee_percentage: number
          p_inventory_id: string
          p_notes: string | null
          p_price_usd: number
          p_quantity: number
          p_sale_date: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
