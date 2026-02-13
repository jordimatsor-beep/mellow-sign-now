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
      clara_conversations: {
        Row: {
          created_at: string | null
          generated_document_id: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generated_document_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          generated_document_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clara_conversations_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clara_conversations_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clara_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clara_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clara_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "clara_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          nif: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          nif?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          nif?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          id: string
          slug: string
          name: string
          credits: number
          price: number
          description: string | null
          popular: boolean
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          credits: number
          price: number
          description?: string | null
          popular?: boolean
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          credits?: number
          price?: number
          description?: string | null
          popular?: boolean
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_credit_purchases: {
        Row: {
          created_at: string | null
          credits_total: number
          credits_used: number | null
          expires_at: string | null
          id: string
          pack_type: string
          price_paid: number | null
          purchased_at: string | null
          stripe_payment_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_total: number
          credits_used?: number | null
          expires_at?: string | null
          id?: string
          pack_type: string
          price_paid?: number | null
          purchased_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_total?: number
          credits_used?: number | null
          expires_at?: string | null
          id?: string
          pack_type?: string
          price_paid?: number | null
          purchased_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          cancelled_at: string | null
          certificate_url: string | null
          created_at: string | null
          custom_message: string | null
          expires_at: string | null
          file_hash: string | null
          file_url: string
          id: string
          otp_code_hash: string | null
          otp_expires_at: string | null
          security_level:
          | Database["public"]["Enums"]["security_level_enum"]
          | null
          sent_at: string | null
          sign_token: string | null
          signature_type: string | null
          signature_page: number | null
          signature_x: number | null
          signature_y: number | null
          signed_at: string | null
          signed_file_url: string | null
          signer_address: string | null
          signer_email: string | null
          signer_name: string | null
          signer_phone: string | null
          signer_tax_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          viewed_at: string | null
          whatsapp_verification_status: string | null
        }
        Insert: {
          cancelled_at?: string | null
          certificate_url?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          file_hash?: string | null
          file_url: string
          id?: string
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          security_level?:
          | Database["public"]["Enums"]["security_level_enum"]
          | null
          sent_at?: string | null
          sign_token?: string | null
          signature_type?: string | null
          signature_page?: number | null
          signature_x?: number | null
          signature_y?: number | null
          signed_at?: string | null
          signed_file_url?: string | null
          signer_address?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_tax_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          viewed_at?: string | null
          whatsapp_verification_status?: string | null
        }
        Update: {
          cancelled_at?: string | null
          certificate_url?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          file_hash?: string | null
          file_url?: string
          id?: string
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          security_level?:
          | Database["public"]["Enums"]["security_level_enum"]
          | null
          sent_at?: string | null
          sign_token?: string | null
          signature_type?: string | null
          signature_page?: number | null
          signature_x?: number | null
          signature_y?: number | null
          signed_at?: string | null
          signed_file_url?: string | null
          signer_address?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_tax_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          viewed_at?: string | null
          whatsapp_verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          created_at: string | null
          document_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      pack_types: {
        Row: {
          credits: number
          name: string
          price: number
          price_per_credit: number | null
          stripe_price_id: string | null
          type: string
        }
        Insert: {
          credits: number
          name: string
          price: number
          price_per_credit?: number | null
          stripe_price_id?: string | null
          type: string
        }
        Update: {
          credits?: number
          name?: string
          price?: number
          price_per_credit?: number | null
          stripe_price_id?: string | null
          type?: string
        }
        Relationships: []
      }
      schema_change_logs: {
        Row: {
          command_tag: string | null
          event_time: string | null
          id: string
          object_identity: string | null
          schema_name: string | null
          user_name: string | null
        }
        Insert: {
          command_tag?: string | null
          event_time?: string | null
          id?: string
          object_identity?: string | null
          schema_name?: string | null
          user_name?: string | null
        }
        Update: {
          command_tag?: string | null
          event_time?: string | null
          id?: string
          object_identity?: string | null
          schema_name?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          acceptance_text: string | null
          created_at: string | null
          document_id: string
          hash_sha256: string
          id: string
          ip_address: unknown
          otp_channel: string | null
          otp_code_ref: string | null
          otp_verified_at: string | null
          signature_image_url: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          tsa_request: string | null
          tsa_response: string | null
          tsa_timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          acceptance_text?: string | null
          created_at?: string | null
          document_id: string
          hash_sha256: string
          id?: string
          ip_address?: unknown
          otp_channel?: string | null
          otp_code_ref?: string | null
          otp_verified_at?: string | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          tsa_request?: string | null
          tsa_response?: string | null
          tsa_timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          acceptance_text?: string | null
          created_at?: string | null
          document_id?: string
          hash_sha256?: string
          id?: string
          ip_address?: unknown
          otp_channel?: string | null
          otp_code_ref?: string | null
          otp_verified_at?: string | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          tsa_request?: string | null
          tsa_response?: string | null
          tsa_timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          billing_email: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          id: string
          issuer_type: string | null
          legal_accepted: boolean | null
          legal_accepted_at: string | null
          legal_address: string | null
          legal_type: string | null
          multicentros_id: string | null
          name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          role: string
          tax_id: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          id: string
          issuer_type?: string | null
          legal_accepted?: boolean | null
          legal_accepted_at?: string | null
          legal_address?: string | null
          legal_type?: string | null
          multicentros_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          issuer_type?: string | null
          legal_accepted?: boolean | null
          legal_accepted_at?: string | null
          legal_address?: string | null
          legal_type?: string | null
          multicentros_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      documents_with_signatures: {
        Row: {
          created_at: string | null
          id: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          available_credits: number | null
          total_packs: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_credit:
      | { Args: { amount: number }; Returns: undefined }
      | {
        Args: { p_user_id: string }
        Returns: {
          remaining: number
          success: boolean
        }[]
      }
      get_available_credits:
      | { Args: never; Returns: number }
      | { Args: { p_user_id: string }; Returns: number }
      get_document_by_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          file_url: string
          id: string
          issuer_data: Json
          signer_email: string
          signer_name: string
          status: string
          title: string
        }[]
      }
      get_document_for_signing: {
        Args: { token_uuid: string }
        Returns: {
          certificate_url: string
          created_at: string
          expires_at: string
          file_url: string
          id: string
          issuer_company: string
          issuer_email: string
          issuer_name: string
          issuer_tax_id: string
          security_level: string
          signed_file_url: string
          signer_email: string
          signer_name: string
          signer_phone: string
          status: string
          title: string
          user_id: string
          whatsapp_verification: boolean
        }[]
      }
      mark_expired_documents: { Args: never; Returns: number }
      mark_document_viewed: {
        Args: { token_uuid: string }
        Returns: undefined
      }
      submit_signature:
      | {
        Args: {
          p_hash_sha256: string
          p_ip_address: unknown
          p_sign_token: string
          p_signature_image_url: string
          p_signer_email: string
          p_signer_name: string
          p_user_agent: string
        }
        Returns: Json
      }
      | {
        Args: {
          p_hash_sha256: string
          p_ip_address: unknown
          p_sign_token: string
          p_signature_image_url: string
          p_signer_email: string
          p_signer_name: string
          p_tsa_request?: string
          p_tsa_response?: string
          p_tsa_timestamp?: string
          p_user_agent: string
        }
        Returns: Json
      }
      get_credit_transactions: {
        Args: { p_limit: number }
        Returns: {
          id: string
          type: "purchase" | "usage" | "gift" | "refund" | "expiry"
          amount: number
          description: string
          document_id: string | null
          created_at: string
        }[]
      }
      get_admin_stats: {
        Args: { p_period?: string }
        Returns: Json
      }
      admin_add_credits: {
        Args: {
          p_target_user_id: string
          p_credits: number
          p_note?: string
        }
        Returns: Json
      }
    }
    Enums: {
      security_level_enum: "standard" | "whatsapp_otp"
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
      security_level_enum: ["standard", "whatsapp_otp"],
    },
  },
} as const
