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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_from_manager: boolean | null
          message: string
          order_id: string | null
          telegram_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_from_manager?: boolean | null
          message: string
          order_id?: string | null
          telegram_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_from_manager?: boolean | null
          message?: string
          order_id?: string | null
          telegram_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          phone_number: string
          status: Database["public"]["Enums"]["order_status"]
          telegram_user_id: string | null
          telegram_username: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          phone_number: string
          status?: Database["public"]["Enums"]["order_status"]
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          phone_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          telegram_user_id?: string | null
          telegram_username?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          article: string | null
          category_name: string | null
          category_path: string | null
          code: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          min_quantity: number | null
          name: string
          photo_url: string | null
          purchase_price: number | null
          quantity: number | null
          retail_price: number | null
          unit: string | null
          updated_at: string
          warranty_days: number | null
          warranty_months: number | null
        }
        Insert: {
          article?: string | null
          category_name?: string | null
          category_path?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          min_quantity?: number | null
          name: string
          photo_url?: string | null
          purchase_price?: number | null
          quantity?: number | null
          retail_price?: number | null
          unit?: string | null
          updated_at?: string
          warranty_days?: number | null
          warranty_months?: number | null
        }
        Update: {
          article?: string | null
          category_name?: string | null
          category_path?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          min_quantity?: number | null
          name?: string
          photo_url?: string | null
          purchase_price?: number | null
          quantity?: number | null
          retail_price?: number | null
          unit?: string | null
          updated_at?: string
          warranty_days?: number | null
          warranty_months?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          price: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          price: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          price?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      telegram_auth_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string | null
          telegram_user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone?: string | null
          telegram_user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string | null
          telegram_user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_login: string | null
          last_name: string | null
          phone: string | null
          telegram_user_id: string
          username: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          telegram_user_id: string
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          telegram_user_id?: string
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_public: {
        Row: {
          article: string | null
          category_name: string | null
          category_path: string | null
          code: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_visible: boolean | null
          min_quantity: number | null
          name: string | null
          photo_url: string | null
          quantity: number | null
          retail_price: number | null
          unit: string | null
          updated_at: string | null
          warranty_days: number | null
          warranty_months: number | null
        }
        Insert: {
          article?: string | null
          category_name?: string | null
          category_path?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_visible?: boolean | null
          min_quantity?: number | null
          name?: string | null
          photo_url?: string | null
          quantity?: number | null
          retail_price?: number | null
          unit?: string | null
          updated_at?: string | null
          warranty_days?: number | null
          warranty_months?: number | null
        }
        Update: {
          article?: string | null
          category_name?: string | null
          category_path?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_visible?: boolean | null
          min_quantity?: number | null
          name?: string | null
          photo_url?: string | null
          quantity?: number | null
          retail_price?: number | null
          unit?: string | null
          updated_at?: string | null
          warranty_days?: number | null
          warranty_months?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_admin_user: {
        Args: { admin_email: string; admin_password: string }
        Returns: Json
      }
      decrement_product_quantity: {
        Args: { product_id: string; quantity_to_subtract: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "observer"
      order_status: "pending" | "accepted" | "ready" | "completed" | "cancelled"
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
    Enums: {
      app_role: ["admin", "employee", "observer"],
      order_status: ["pending", "accepted", "ready", "completed", "cancelled"],
    },
  },
} as const
