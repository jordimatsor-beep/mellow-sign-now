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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anon_referral_sessions: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          ip_prefix: string | null
          new_user_id: string | null
          ref_code: string
          session_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          ip_prefix?: string | null
          new_user_id?: string | null
          ref_code: string
          session_id?: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          ip_prefix?: string | null
          new_user_id?: string | null
          ref_code?: string
          session_id?: string
        }
        Relationships: []
      }
      api_clients: {
        Row: {
          active: boolean
          api_key_hash: string
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          user_id: string | null
          webhook_secret: string
          webhook_url: string | null
        }
        Insert: {
          active?: boolean
          api_key_hash: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          user_id?: string | null
          webhook_secret: string
          webhook_url?: string | null
        }
        Update: {
          active?: boolean
          api_key_hash?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          user_id?: string | null
          webhook_secret?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_profiles: {
        Row: {
          ciudad: string
          codigo_postal: string
          created_at: string | null
          direccion_fiscal: string
          email_facturacion: string | null
          holded_contact_id: string | null
          id: string
          nif_cif: string
          pais: string
          razon_social: string
          regimen_fiscal: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ciudad: string
          codigo_postal: string
          created_at?: string | null
          direccion_fiscal: string
          email_facturacion?: string | null
          holded_contact_id?: string | null
          id?: string
          nif_cif: string
          pais?: string
          razon_social: string
          regimen_fiscal?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ciudad?: string
          codigo_postal?: string
          created_at?: string | null
          direccion_fiscal?: string
          email_facturacion?: string | null
          holded_contact_id?: string | null
          id?: string
          nif_cif?: string
          pais?: string
          razon_social?: string
          regimen_fiscal?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      clara_usage_logs: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          popular: boolean | null
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          popular?: boolean | null
          price: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          popular?: boolean | null
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          consumption_source: string | null
          created_at: string
          credit_pack_id: string | null
          description: string
          document_id: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          consumption_source?: string | null
          created_at?: string
          credit_pack_id?: string | null
          description: string
          document_id?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          consumption_source?: string | null
          created_at?: string
          credit_pack_id?: string | null
          description?: string
          document_id?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          api_client_id: string | null
          cancelled_at: string | null
          certificate_url: string | null
          created_at: string | null
          custom_message: string | null
          expires_at: string | null
          file_hash: string | null
          file_url: string
          id: string
          is_template: boolean
          original_format: string | null
          otp_code_hash: string | null
          otp_expires_at: string | null
          otp_failed_attempts: number | null
          security_level:
            | Database["public"]["Enums"]["security_level_enum"]
            | null
          sent_at: string | null
          sign_token: string | null
          signature_page: number | null
          signature_type: string | null
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
        }
        Insert: {
          api_client_id?: string | null
          cancelled_at?: string | null
          certificate_url?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          file_hash?: string | null
          file_url: string
          id?: string
          is_template?: boolean
          original_format?: string | null
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          otp_failed_attempts?: number | null
          security_level?:
            | Database["public"]["Enums"]["security_level_enum"]
            | null
          sent_at?: string | null
          sign_token?: string | null
          signature_page?: number | null
          signature_type?: string | null
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
        }
        Update: {
          api_client_id?: string | null
          cancelled_at?: string | null
          certificate_url?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          file_hash?: string | null
          file_url?: string
          id?: string
          is_template?: boolean
          original_format?: string | null
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          otp_failed_attempts?: number | null
          security_level?:
            | Database["public"]["Enums"]["security_level_enum"]
            | null
          sent_at?: string | null
          sign_token?: string | null
          signature_page?: number | null
          signature_type?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "documents_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          html_body: string
          id: string
          last_attempt_at: string | null
          metadata: Json | null
          next_retry_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_type: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_body: string
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_type: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_body?: string
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_type?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: []
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
      invoices: {
        Row: {
          base_imponible: number
          concepto: string
          created_at: string | null
          error_detail: string | null
          holded_invoice_id: string | null
          holded_status: string | null
          id: string
          importe_impuesto: number
          iva_pct: number
          numero_fc: string | null
          product_type: string
          regimen_fiscal: string
          stripe_payment_intent_id: string
          total: number
          user_id: string
        }
        Insert: {
          base_imponible: number
          concepto: string
          created_at?: string | null
          error_detail?: string | null
          holded_invoice_id?: string | null
          holded_status?: string | null
          id?: string
          importe_impuesto: number
          iva_pct: number
          numero_fc?: string | null
          product_type: string
          regimen_fiscal: string
          stripe_payment_intent_id: string
          total: number
          user_id: string
        }
        Update: {
          base_imponible?: number
          concepto?: string
          created_at?: string | null
          error_detail?: string | null
          holded_invoice_id?: string | null
          holded_status?: string | null
          id?: string
          importe_impuesto?: number
          iva_pct?: number
          numero_fc?: string | null
          product_type?: string
          regimen_fiscal?: string
          stripe_payment_intent_id?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      knowledge_vectors: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
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
      otp_logs: {
        Row: {
          block_reason: string | null
          blocked: boolean | null
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked?: boolean | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked?: boolean | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otp_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      overage_charges: {
        Row: {
          amount_eur: number | null
          billed: boolean
          charged_at: string | null
          firma_id: string | null
          id: string
          mes_ciclo: string | null
          stripe_invoice_item_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          billed?: boolean
          charged_at?: string | null
          firma_id?: string | null
          id?: string
          mes_ciclo?: string | null
          stripe_invoice_item_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          billed?: boolean
          charged_at?: string | null
          firma_id?: string | null
          id?: string
          mes_ciclo?: string | null
          stripe_invoice_item_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overage_charges_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overage_charges_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: true
            referencedRelation: "documents_with_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overage_charges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      payout_requests: {
        Row: {
          amount_eur: number
          created_at: string | null
          iban: string
          id: string
          notes: string | null
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_eur: number
          created_at?: string | null
          iban: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_eur?: number
          created_at?: string | null
          iban?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_history: {
        Row: {
          changed_at: string | null
          id: string
          motivo: string | null
          plan_anterior: string | null
          plan_nuevo: string | null
          stripe_event_id: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          id?: string
          motivo?: string | null
          plan_anterior?: string | null
          plan_nuevo?: string | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          id?: string
          motivo?: string | null
          plan_anterior?: string | null
          plan_nuevo?: string | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount_eur: number
          created_at: string | null
          id: string
          paid_at: string | null
          percentage: number
          product: string
          purchase_eur: number
          referred_id: string
          referrer_id: string
          status: string
          stripe_session: string
        }
        Insert: {
          amount_eur: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          product: string
          purchase_eur: number
          referred_id: string
          referrer_id: string
          status?: string
          stripe_session: string
        }
        Update: {
          amount_eur?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          product?: string
          purchase_eur?: number
          referred_id?: string
          referrer_id?: string
          status?: string
          stripe_session?: string
        }
        Relationships: []
      }
      referral_rl: {
        Row: {
          hits: number
          ip: string
          minute: string
        }
        Insert: {
          hits?: number
          ip: string
          minute: string
        }
        Update: {
          hits?: number
          ip?: string
          minute?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          credits_to_referred: number
          credits_to_referrer: number
          id: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_to_referred?: number
          credits_to_referrer?: number
          id?: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_to_referred?: number
          credits_to_referrer?: number
          id?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
          updated_at?: string | null
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
      support_chats: {
        Row: {
          admin_read: boolean | null
          closed_by: string | null
          created_at: string
          id: string
          last_message_at: string | null
          rating: number | null
          rating_comment: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
          user_read: boolean | null
        }
        Insert: {
          admin_read?: boolean | null
          closed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email: string
          user_id: string
          user_read?: boolean | null
        }
        Update: {
          admin_read?: boolean | null
          closed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_read?: boolean | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_purchases: {
        Row: {
          created_at: string | null
          credits_total: number
          credits_used: number
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
          credits_used?: number
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
          credits_used?: number
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
      users: {
        Row: {
          address: string | null
          billing_email: string | null
          brand_color: string | null
          brand_logo_url: string | null
          brand_sender_name: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          firmas_creditos: number
          firmas_usadas_mes: number
          grace_until: string | null
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
          plan_id: string
          plan_renewed_at: string | null
          role: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_period_end: string | null
          subscription_status: string | null
          tax_id: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_sender_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          firmas_creditos?: number
          firmas_usadas_mes?: number
          grace_until?: string | null
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
          plan_id?: string
          plan_renewed_at?: string | null
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean
          subscription_period_end?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_sender_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          firmas_creditos?: number
          firmas_usadas_mes?: number
          grace_until?: string | null
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
          plan_id?: string
          plan_renewed_at?: string | null
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean
          subscription_period_end?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      documents_with_signatures: {
        Row: {
          certificate_url: string | null
          created_at: string | null
          expires_at: string | null
          file_url: string | null
          id: string | null
          security_level:
            | Database["public"]["Enums"]["security_level_enum"]
            | null
          sent_at: string | null
          sign_token: string | null
          signature_hash: string | null
          signature_type: string | null
          signed_at: string | null
          signed_file_url: string | null
          signer_email: string | null
          signer_ip: unknown
          signer_name: string | null
          signer_phone: string | null
          signer_user_agent: string | null
          status: string | null
          title: string | null
          tsa_timestamp: string | null
          updated_at: string | null
          user_id: string | null
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
      referral_commission_balance: {
        Row: {
          balance_paid: number | null
          balance_pending: number | null
          balance_total: number | null
          commissions_pending: number | null
          commissions_total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      referral_stats: {
        Row: {
          credits_earned: number | null
          credits_remaining: number | null
          total_active: number | null
          total_invited: number | null
          total_pending: number | null
          user_id: string | null
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
      add_credits_with_log: {
        Args: {
          p_amount: number
          p_description: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_firmas_creditos: {
        Args: {
          p_credits: number
          p_description?: string
          p_session: string
          p_user_id: string
        }
        Returns: boolean
      }
      admin_add_credits: {
        Args: {
          p_credits: number
          p_message?: string
          p_note?: string
          p_target_user_id: string
          p_title?: string
        }
        Returns: Json
      }
      admin_change_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: Json
      }
      admin_get_clara_conversations: {
        Args: { page_offset?: number; page_size?: number }
        Returns: {
          conversation_id: string
          created_at: string
          last_message: string
          message_count: number
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_document_counts: {
        Args: { p_user_ids: string[] }
        Returns: {
          doc_count: number
          user_id: string
        }[]
      }
      admin_get_gift_transactions: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_logs: {
        Args: {
          event_type_filter?: string
          page_offset?: number
          page_size?: number
        }
        Returns: {
          created_at: string
          document_id: string
          event_type: string
          id: string
          user_email: string
        }[]
      }
      admin_get_user: { Args: { user_uuid: string }; Returns: Json }
      admin_grant_credits: {
        Args: {
          credit_amount: number
          description?: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: { page_offset?: number; page_size?: number; search_term?: string }
        Returns: {
          available_credits: number
          company_name: string
          created_at: string
          email: string
          id: string
          legal_accepted: boolean
          name: string
          onboarding_completed: boolean
          role: string
          total_credits: number
          total_documents: number
        }[]
      }
      admin_referral_overview: {
        Args: never
        Returns: {
          balance_paid: number
          balance_pending: number
          credits_earned: number
          payout_amount: number
          payout_created: string
          payout_iban: string
          payout_id: string
          payout_notes: string
          referral_code: string
          total_active: number
          total_invited: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_revoke_credits: {
        Args: {
          credit_amount: number
          description?: string
          target_user_id: string
        }
        Returns: Json
      }
      check_clara_rate_limit: {
        Args: { p_max?: number; p_window_seconds?: number }
        Returns: boolean
      }
      check_referral_rl: {
        Args: { p_ip: string; p_max?: number }
        Returns: number
      }
      cleanup_old_drafts: { Args: never; Returns: number }
      consume_credit:
        | {
            Args: { amount: number; p_description?: string }
            Returns: undefined
          }
        | {
            Args: {
              amount: number
              p_description?: string
              p_document_id?: string
            }
            Returns: undefined
          }
      consume_credit_for_user: {
        Args: { p_description?: string; p_user_id: string }
        Returns: undefined
      }
      consumir_firma: {
        Args: {
          p_description?: string
          p_document_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      firmas_limite_plan: { Args: { p_plan: string }; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      get_admin_stats:
        | { Args: never; Returns: Json }
        | { Args: { p_period?: string }; Returns: Json }
      get_available_credits: { Args: never; Returns: number }
      get_credit_transactions: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          description: string
          document_id: string
          id: string
          type: string
        }[]
      }
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
      get_document_counts: {
        Args: never
        Returns: {
          pending: number
          signed: number
          total: number
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
      get_or_create_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_plan_status: { Args: never; Returns: Json }
      grant_credits: {
        Args: {
          credits_amount: number
          description_text?: string
          target_email: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_support: { Args: never; Returns: boolean }
      mark_document_viewed: { Args: { token_uuid: string }; Returns: undefined }
      mark_expired_documents: { Args: never; Returns: number }
      match_knowledge:
        | {
            Args: {
              filter?: Json
              match_count: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              filter?: Json
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
      process_referral_reward: {
        Args: { p_referred_id: string }
        Returns: Json
      }
      refund_credit: { Args: { p_description?: string }; Returns: undefined }
      reset_firmas_mensuales: { Args: never; Returns: number }
      revertir_firma: {
        Args: {
          p_description?: string
          p_document_id?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      set_user_role: {
        Args: { new_role: string; target_email: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      security_level_enum: ["standard", "whatsapp_otp"],
    },
  },
} as const
