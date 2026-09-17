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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          google_maps_url: string | null
          id: string
          is_default: boolean
          label: string
          neighborhood: string
          number: string | null
          state: string
          store_id: string
          street: string
          updated_at: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          google_maps_url?: string | null
          id?: string
          is_default?: boolean
          label?: string
          neighborhood: string
          number?: string | null
          state?: string
          store_id: string
          street: string
          updated_at?: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          google_maps_url?: string | null
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          number?: string | null
          state?: string
          store_id?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          last_login_at: string | null
          name: string
          password_hash: string | null
          phone: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          name: string
          password_hash?: string | null
          phone: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          name?: string
          password_hash?: string | null
          phone?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          assigned_at: string
          collected_at: string | null
          created_at: string
          delivered_at: string | null
          driver_id: string
          id: string
          order_id: string
          status: string
          store_id: string
        }
        Insert: {
          assigned_at?: string
          collected_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_id: string
          id?: string
          order_id: string
          status?: string
          store_id: string
        }
        Update: {
          assigned_at?: string
          collected_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_id?: string
          id?: string
          order_id?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          config: Json
          created_at: string | null
          delivery_fee: number
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          store_id: string
          zone_type: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          store_id: string
          zone_type?: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          store_id?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          pin_hash: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone: string
          pin_hash: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          pin_hash?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_purchases: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_id: string
          notes: string | null
          purchased_at: string
          quantity_purchased: number
          quantity_remaining: number
          store_id: string
          total_paid: number
          updated_at: string
        }
        Insert: {
          cost_per_unit: number
          created_at?: string
          id?: string
          ingredient_id: string
          notes?: string | null
          purchased_at?: string
          quantity_purchased: number
          quantity_remaining: number
          store_id: string
          total_paid: number
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          notes?: string | null
          purchased_at?: string
          quantity_purchased?: number
          quantity_remaining?: number
          store_id?: string
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_purchases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          min_stock_alert: number | null
          name: string
          stock_quantity: number | null
          store_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          min_stock_alert?: number | null
          name: string
          stock_quantity?: number | null
          store_id: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          min_stock_alert?: number | null
          name?: string
          stock_quantity?: number | null
          store_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      option_choice_ingredients: {
        Row: {
          choice_name: string
          created_at: string | null
          id: string
          ingredient_id: string
          option_group_name: string
          quantity_used: number
          store_id: string
        }
        Insert: {
          choice_name: string
          created_at?: string | null
          id?: string
          ingredient_id: string
          option_group_name: string
          quantity_used?: number
          store_id: string
        }
        Update: {
          choice_name?: string
          created_at?: string | null
          id?: string
          ingredient_id?: string
          option_group_name?: string
          quantity_used?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_choice_ingredients_ingredient_fk"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_choice_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_choice_ingredients_store_fk"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_choice_ingredients_store_fk"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_choice_ingredients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_choice_ingredients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_address: string | null
          customer_maps_url: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_type: string
          deposit_amount: number | null
          deposit_status: string | null
          id: string
          items: Json
          notes: string | null
          order_type: string
          payment_method: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_address?: string | null
          customer_maps_url?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_type?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          store_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_address?: string | null
          customer_maps_url?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_type?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          checkout_url: string | null
          created_at: string
          customer_address: string | null
          customer_maps_url: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_fee_mode: string
          delivery_type: string
          deposit_amount: number | null
          deposit_status: string | null
          expires_at: string
          has_mixed_cart: boolean
          id: string
          items: Json
          notes: string | null
          order_type: string
          payment_method: string | null
          provider: string
          provider_reference: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          stock_reserved: boolean
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          customer_address?: string | null
          customer_maps_url?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_fee_mode?: string
          delivery_type?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          expires_at?: string
          has_mixed_cart?: boolean
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          provider?: string
          provider_reference?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          stock_reserved?: boolean
          store_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          customer_address?: string | null
          customer_maps_url?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_fee_mode?: string
          delivery_type?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          expires_at?: string
          has_mixed_cart?: boolean
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          provider?: string
          provider_reference?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          stock_reserved?: boolean
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_checkouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          product_id: string
          quantity_used: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          product_id: string
          quantity_used?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          product_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_fk"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          category_id: string | null
          created_at: string
          description: string | null
          featured: boolean | null
          fulfillment_mode: string
          has_options: boolean | null
          id: string
          image_url: string | null
          min_order_quantity: number | null
          name: string
          options: Json | null
          original_price: number | null
          price: number
          sort_order: number | null
          stock_enabled: boolean | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          fulfillment_mode?: string
          has_options?: boolean | null
          id?: string
          image_url?: string | null
          min_order_quantity?: number | null
          name: string
          options?: Json | null
          original_price?: number | null
          price: number
          sort_order?: number | null
          stock_enabled?: boolean | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          fulfillment_mode?: string
          has_options?: boolean | null
          id?: string
          image_url?: string | null
          min_order_quantity?: number | null
          name?: string
          options?: Json | null
          original_price?: number | null
          price?: number
          sort_order?: number | null
          stock_enabled?: boolean | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_checkout_secrets: {
        Row: {
          checkout_config: Json
          created_at: string
          id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          checkout_config?: Json
          created_at?: string
          id?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          checkout_config?: Json
          created_at?: string
          id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_checkout_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_checkout_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          accepted_payments: string[] | null
          address: string | null
          checkout_config: Json | null
          checkout_link: string | null
          checkout_mode: string
          checkout_provider: string | null
          cover_image_url: string | null
          created_at: string
          custom_payments: Json | null
          delivery_fee: number | null
          delivery_zone_enabled: boolean | null
          description: string | null
          estimated_time: string | null
          google_maps_url: string | null
          help_button_enabled: boolean | null
          help_button_message: string | null
          id: string
          instagram: string | null
          is_open: boolean | null
          logo_url: string | null
          min_order: number | null
          name: string
          opening_hours: Json | null
          ordering_hours: Json | null
          ordering_mode: string
          payment_icons: Json | null
          phone: string | null
          preorder_config: Json | null
          preorder_enabled: boolean | null
          rating: number | null
          review_count: number | null
          show_watermark: boolean | null
          slug: string
          theme_color: string | null
          unavailable_message: string
          unavailable_mode: string
          updated_at: string
          upsell_enabled: boolean | null
          upsell_mode: string | null
          user_id: string
          whatsapp: string | null
          whatsapp_message: string | null
        }
        Insert: {
          accepted_payments?: string[] | null
          address?: string | null
          checkout_config?: Json | null
          checkout_link?: string | null
          checkout_mode?: string
          checkout_provider?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_payments?: Json | null
          delivery_fee?: number | null
          delivery_zone_enabled?: boolean | null
          description?: string | null
          estimated_time?: string | null
          google_maps_url?: string | null
          help_button_enabled?: boolean | null
          help_button_message?: string | null
          id?: string
          instagram?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          min_order?: number | null
          name: string
          opening_hours?: Json | null
          ordering_hours?: Json | null
          ordering_mode?: string
          payment_icons?: Json | null
          phone?: string | null
          preorder_config?: Json | null
          preorder_enabled?: boolean | null
          rating?: number | null
          review_count?: number | null
          show_watermark?: boolean | null
          slug: string
          theme_color?: string | null
          unavailable_message?: string
          unavailable_mode?: string
          updated_at?: string
          upsell_enabled?: boolean | null
          upsell_mode?: string | null
          user_id: string
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          accepted_payments?: string[] | null
          address?: string | null
          checkout_config?: Json | null
          checkout_link?: string | null
          checkout_mode?: string
          checkout_provider?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_payments?: Json | null
          delivery_fee?: number | null
          delivery_zone_enabled?: boolean | null
          description?: string | null
          estimated_time?: string | null
          google_maps_url?: string | null
          help_button_enabled?: boolean | null
          help_button_message?: string | null
          id?: string
          instagram?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          min_order?: number | null
          name?: string
          opening_hours?: Json | null
          ordering_hours?: Json | null
          ordering_mode?: string
          payment_icons?: Json | null
          phone?: string | null
          preorder_config?: Json | null
          preorder_enabled?: boolean | null
          rating?: number | null
          review_count?: number | null
          show_watermark?: boolean | null
          slug?: string
          theme_color?: string | null
          unavailable_message?: string
          unavailable_mode?: string
          updated_at?: string
          upsell_enabled?: boolean | null
          upsell_mode?: string | null
          user_id?: string
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      upsell_rules: {
        Row: {
          created_at: string
          id: string
          priority: number
          source_id: string
          source_type: string
          store_id: string
          suggested_product_ids: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          source_id: string
          source_type?: string
          store_id: string
          suggested_product_ids?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          source_id?: string
          source_type?: string
          store_id?: string
          suggested_product_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "upsell_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      public_stores: {
        Row: {
          accepted_payments: string[] | null
          address: string | null
          checkout_config: Json | null
          checkout_link: string | null
          checkout_mode: string | null
          checkout_provider: string | null
          cover_image_url: string | null
          created_at: string | null
          custom_payments: Json | null
          delivery_fee: number | null
          delivery_zone_enabled: boolean | null
          description: string | null
          estimated_time: string | null
          google_maps_url: string | null
          help_button_enabled: boolean | null
          help_button_message: string | null
          id: string | null
          instagram: string | null
          is_open: boolean | null
          logo_url: string | null
          min_order: number | null
          name: string | null
          opening_hours: Json | null
          ordering_hours: Json | null
          ordering_mode: string | null
          payment_icons: Json | null
          phone: string | null
          preorder_config: Json | null
          preorder_enabled: boolean | null
          rating: number | null
          review_count: number | null
          show_watermark: boolean | null
          slug: string | null
          theme_color: string | null
          unavailable_message: string | null
          unavailable_mode: string | null
          updated_at: string | null
          upsell_enabled: boolean | null
          upsell_mode: string | null
          whatsapp: string | null
          whatsapp_message: string | null
        }
        Insert: {
          accepted_payments?: string[] | null
          address?: string | null
          checkout_config?: Json | null
          checkout_link?: string | null
          checkout_mode?: string | null
          checkout_provider?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_payments?: Json | null
          delivery_fee?: number | null
          delivery_zone_enabled?: boolean | null
          description?: string | null
          estimated_time?: string | null
          google_maps_url?: string | null
          help_button_enabled?: boolean | null
          help_button_message?: string | null
          id?: string | null
          instagram?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          min_order?: number | null
          name?: string | null
          opening_hours?: Json | null
          ordering_hours?: Json | null
          ordering_mode?: string | null
          payment_icons?: Json | null
          phone?: string | null
          preorder_config?: Json | null
          preorder_enabled?: boolean | null
          rating?: number | null
          review_count?: number | null
          show_watermark?: boolean | null
          slug?: string | null
          theme_color?: string | null
          unavailable_message?: string | null
          unavailable_mode?: string | null
          updated_at?: string | null
          upsell_enabled?: boolean | null
          upsell_mode?: string | null
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          accepted_payments?: string[] | null
          address?: string | null
          checkout_config?: Json | null
          checkout_link?: string | null
          checkout_mode?: string | null
          checkout_provider?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_payments?: Json | null
          delivery_fee?: number | null
          delivery_zone_enabled?: boolean | null
          description?: string | null
          estimated_time?: string | null
          google_maps_url?: string | null
          help_button_enabled?: boolean | null
          help_button_message?: string | null
          id?: string | null
          instagram?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          min_order?: number | null
          name?: string | null
          opening_hours?: Json | null
          ordering_hours?: Json | null
          ordering_mode?: string | null
          payment_icons?: Json | null
          phone?: string | null
          preorder_config?: Json | null
          preorder_enabled?: boolean | null
          rating?: number | null
          review_count?: number | null
          show_watermark?: boolean | null
          slug?: string | null
          theme_color?: string | null
          unavailable_message?: string | null
          unavailable_mode?: string | null
          updated_at?: string | null
          upsell_enabled?: boolean | null
          upsell_mode?: string | null
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_delivery: {
        Args: { p_driver_id: string; p_order_id: string; p_store_id: string }
        Returns: Json
      }
      cancel_pending_checkout: {
        Args: { p_checkout_id: string }
        Returns: undefined
      }
      claim_checkout_for_payment: {
        Args: { p_checkout_id: string; p_provider_reference?: string }
        Returns: Json
      }
      consume_ingredient_fifo: {
        Args: { p_ingredient_id: string; p_quantity: number }
        Returns: number
      }
      decrement_ingredients_on_sale: {
        Args: { p_items: Json; p_store_id: string }
        Returns: undefined
      }
      driver_login: {
        Args: { p_phone: string; p_pin: string; p_store_id: string }
        Returns: Json
      }
      expire_pending_checkouts: { Args: never; Returns: number }
      get_checkout_status: { Args: { p_checkout_id: string }; Returns: Json }
      get_customer_orders_by_phone: {
        Args: { p_phone: string; p_store_id: string }
        Returns: {
          admin_notes: string | null
          created_at: string
          customer_address: string | null
          customer_maps_url: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_type: string
          deposit_amount: number | null
          deposit_status: string | null
          id: string
          items: Json
          notes: string | null
          order_type: string
          payment_method: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_driver_deliveries: {
        Args: { p_driver_id: string; p_store_id: string }
        Returns: Json
      }
      get_ingredient_next_cost: {
        Args: { p_ingredient_id: string }
        Returns: number
      }
      get_store_bestseller_ids: {
        Args: { p_store_id: string }
        Returns: string[]
      }
      get_store_customers_safe: {
        Args: { _store_id: string }
        Returns: {
          created_at: string
          has_password: boolean
          id: string
          last_login_at: string
          name: string
          phone: string
          store_id: string
          updated_at: string
        }[]
      }
      get_store_today_order_count: {
        Args: { p_store_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_ingredient_purchase: {
        Args: {
          p_ingredient_id: string
          p_notes?: string
          p_purchased_at?: string
          p_quantity: number
          p_store_id: string
          p_total_paid: number
        }
        Returns: string
      }
      release_checkout_stock: {
        Args: { p_checkout_id: string }
        Returns: undefined
      }
      reserve_checkout_stock: {
        Args: { p_checkout_id: string; p_items: Json }
        Returns: string
      }
      update_delivery_status: {
        Args: {
          p_delivery_id: string
          p_driver_id: string
          p_new_status: string
        }
        Returns: Json
      }
      update_order_status: {
        Args: { p_new_status: string; p_order_id: string; p_store_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
