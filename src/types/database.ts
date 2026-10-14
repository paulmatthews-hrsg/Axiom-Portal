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
      infringements: {
        Row: {
          id: string
          internal_id: string
          date_received: string
          due_date: string | null
          total_amount_payable: number | null
          victims_levy: number | null
          customer_base: 'GigCar' | 'Fleetcar' | 'Yonder'
          vrn: string
          offence_type: string
          offence_date: string
          offence_location: string | null
          assigned_driver: string | null
          status: 'New' | 'Pending Driver Nomination' | 'Awaiting Driver Nomination' | 'Stat Dec Pending' | 'Awaiting Signature' | 'Ready for Submission' | 'Pending Fleet Payment' | 'Awaiting Reimbursement (Xero)' | 'Closed' | 'Voided'
          fine_amount: number | null
          reference_number: string | null
          notes: string | null
          issuing_state: 'NT' | 'NSW' | 'QLD' | 'VIC' | 'WA' | 'SA' | 'TAS' | 'ACT' | null
          issuing_authority: string | null
          corporate_fine_amount: number | null
          bpay_biller_code: string | null
          bpay_reference: string | null
          reissued_individual_fine_amount: number | null
          ocr_verified: boolean
          ocr_verified_at: string | null
          ocr_verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          internal_id?: string
          date_received?: string
          due_date?: string | null
          total_amount_payable?: number | null
          victims_levy?: number | null
          customer_base: 'GigCar' | 'Fleetcar' | 'Yonder'
          vrn: string
          offence_type: string
          offence_date: string
          offence_location?: string | null
          assigned_driver?: string | null
          status?: 'New' | 'Pending Driver Nomination' | 'Awaiting Driver Nomination' | 'Stat Dec Pending' | 'Pending Fleet Payment' | 'Awaiting Reimbursement (Xero)' | 'Closed' | 'Voided'
          fine_amount?: number | null
          reference_number?: string | null
          notes?: string | null
          issuing_state?: 'NT' | 'NSW' | 'QLD' | 'VIC' | 'WA' | 'SA' | 'TAS' | 'ACT' | null
          issuing_authority?: string | null
          corporate_fine_amount?: number | null
          bpay_biller_code?: string | null
          bpay_reference?: string | null
          reissued_individual_fine_amount?: number | null
          ocr_verified?: boolean
          ocr_verified_at?: string | null
          ocr_verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          internal_id?: string
          date_received?: string
          due_date?: string | null
          total_amount_payable?: number | null
          victims_levy?: number | null
          customer_base?: 'GigCar' | 'Fleetcar' | 'Yonder'
          vrn?: string
          offence_type?: string
          offence_date?: string
          offence_location?: string | null
          assigned_driver?: string | null
          status?: 'New' | 'Pending Driver Nomination' | 'Awaiting Driver Nomination' | 'Stat Dec Pending' | 'Pending Fleet Payment' | 'Awaiting Reimbursement (Xero)' | 'Closed' | 'Voided'
          fine_amount?: number | null
          reference_number?: string | null
          notes?: string | null
          issuing_state?: 'NT' | 'NSW' | 'QLD' | 'VIC' | 'WA' | 'SA' | 'TAS' | 'ACT' | null
          issuing_authority?: string | null
          corporate_fine_amount?: number | null
          bpay_biller_code?: string | null
          bpay_reference?: string | null
          reissued_individual_fine_amount?: number | null
          ocr_verified?: boolean
          ocr_verified_at?: string | null
          ocr_verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          infringement_id: string
          action_type: string
          action_description: string
          performed_by: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          infringement_id: string
          action_type: string
          action_description: string
          performed_by?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          infringement_id?: string
          action_type?: string
          action_description?: string
          performed_by?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          infringement_id: string | null
          timestamp: string
          actor: string
          actor_type: 'user' | 'system'
          ip_address: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          infringement_id?: string | null
          timestamp?: string
          actor: string
          actor_type: 'user' | 'system'
          ip_address: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          infringement_id?: string | null
          timestamp?: string
          actor?: string
          actor_type?: 'user' | 'system'
          ip_address?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          created_at: string
          vehicle_name: string
          vin: string | null
          license_plate: string | null
          year: number | null
          make: string | null
          model: string | null
          status: string | null
          fleetio_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_name: string
          vin?: string | null
          license_plate?: string | null
          year?: number | null
          make?: string | null
          model?: string | null
          status?: string | null
          fleetio_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_name?: string
          vin?: string | null
          license_plate?: string | null
          year?: number | null
          make?: string | null
          model?: string | null
          status?: string | null
          fleetio_id?: string | null
        }
        Relationships: []
      }
      bpa_agreements: {
        Row: {
          id: string
          agreement_number: string
          vendor_name: string
          vendor_category: string
          description: string | null
          total_value: number
          currency: string
          start_date: string
          end_date: string | null
          status: string
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          payment_terms: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agreement_number?: string
          vendor_name: string
          vendor_category?: string
          description?: string | null
          total_value?: number
          currency?: string
          start_date?: string
          end_date?: string | null
          status?: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agreement_number?: string
          vendor_name?: string
          vendor_category?: string
          description?: string | null
          total_value?: number
          currency?: string
          start_date?: string
          end_date?: string | null
          status?: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      infringement_documents: {
        Row: {
          id: string
          infringement_id: string
          file_name: string
          storage_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          infringement_id: string
          file_name: string
          storage_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          infringement_id?: string
          file_name?: string
          storage_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
        }
        Relationships: []
      }
      copilot_conversations: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_role: string
          allowed_fleets: string[]
          messages: Json
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_role?: string
          allowed_fleets?: string[]
          messages?: Json
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          user_role?: string
          allowed_fleets?: string[]
          messages?: Json
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      copilot_audit_logs: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          tool_name: string
          tool_args: Json
          tool_result_summary: string | null
          user_query: string | null
          ai_response: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string
          user_id: string
          tool_name: string
          tool_args?: Json
          tool_result_summary?: string | null
          user_query?: string | null
          ai_response?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          tool_name?: string
          tool_args?: Json
          tool_result_summary?: string | null
          user_query?: string | null
          ai_response?: string | null
          created_at?: string
        }
        Relationships: []
      }
      copilot_feedback: {
        Row: {
          id: string
          conversation_id: string | null
          user_id: string
          user_name: string
          user_role: string
          user_query: string
          ai_response: string
          rating: 'helpful' | 'not_helpful'
          category: string | null
          comment: string | null
          status: 'new' | 'investigating' | 'approved' | 'rejected'
          reviewer_name: string | null
          reviewer_role: string | null
          reviewer_notes: string | null
          approved_guidance: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          user_id: string
          user_name: string
          user_role: string
          user_query: string
          ai_response: string
          rating: 'helpful' | 'not_helpful'
          category?: string | null
          comment?: string | null
          status?: 'new' | 'investigating' | 'approved' | 'rejected'
          reviewer_name?: string | null
          reviewer_role?: string | null
          reviewer_notes?: string | null
          approved_guidance?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          user_id?: string
          user_name?: string
          user_role?: string
          user_query?: string
          ai_response?: string
          rating?: 'helpful' | 'not_helpful'
          category?: string | null
          comment?: string | null
          status?: 'new' | 'investigating' | 'approved' | 'rejected'
          reviewer_name?: string | null
          reviewer_role?: string | null
          reviewer_notes?: string | null
          approved_guidance?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      copilot_guidance: {
        Row: {
          id: string
          title: string
          instruction: string
          scope: string
          status: 'active' | 'archived'
          created_by: string
          approved_by: string
          approved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          instruction: string
          scope?: string
          status?: 'active' | 'archived'
          created_by: string
          approved_by: string
          approved_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          instruction?: string
          scope?: string
          status?: 'active' | 'archived'
          created_by?: string
          approved_by?: string
          approved_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
  }
}

export type Infringement = Database['public']['Tables']['infringements']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type BpaAgreement = Database['public']['Tables']['bpa_agreements']['Row'];
export type InfringementDocument = Database['public']['Tables']['infringement_documents']['Row'];

export interface EmailLog {
  id: string;
  infringement_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  cc_recipients: string[];
  bcc_recipients: string[];
  subject: string;
  body_html: string;
  status: 'sent' | 'failed';
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  tracking_token: string;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  sent_by: string | null;
  sent_at: string;
}

export interface StatutoryDeclarationPayload {
  infringement_notice_number: string;
  vehicle_registration: string;
  offence_date: string;
  company_name: string;
  declarant_name: string;
  nominated_driver_name: string;
  nominated_driver_address: string;
  nominated_driver_license_number: string;
  nominated_driver_license_state: string;
  nominated_driver_license_expiry: string;
  nominated_driver_license_type: string;
  nominated_driver_dob: string;
  signature_declarant: string;
  signature_witness: string;
  witness_name: string;
  witness_address: string;
  witness_phone: string;
}

export interface XeroReimbursementPayload {
  driver_name: string;
  reissued_individual_fine_amount: number;
  attach_documents: boolean;
}
