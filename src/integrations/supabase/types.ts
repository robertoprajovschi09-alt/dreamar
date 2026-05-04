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
      agencies: {
        Row: {
          brand_color: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          slug: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          slug: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          slug?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_impact_entries: {
        Row: {
          agency_id: string
          appointments: number | null
          bookings: number | null
          calls: number | null
          client_id: string
          contracts: number | null
          created_at: string
          created_by: string | null
          dms: number | null
          entry_date: string
          id: string
          objections: string | null
          orders: number | null
          qualitative_feedback: string | null
          revenue_estimate: number | null
          sales: number | null
          updated_at: string
          viewings: number | null
        }
        Insert: {
          agency_id: string
          appointments?: number | null
          bookings?: number | null
          calls?: number | null
          client_id: string
          contracts?: number | null
          created_at?: string
          created_by?: string | null
          dms?: number | null
          entry_date?: string
          id?: string
          objections?: string | null
          orders?: number | null
          qualitative_feedback?: string | null
          revenue_estimate?: number | null
          sales?: number | null
          updated_at?: string
          viewings?: number | null
        }
        Update: {
          agency_id?: string
          appointments?: number | null
          bookings?: number | null
          calls?: number | null
          client_id?: string
          contracts?: number | null
          created_at?: string
          created_by?: string | null
          dms?: number | null
          entry_date?: string
          id?: string
          objections?: string | null
          orders?: number | null
          qualitative_feedback?: string | null
          revenue_estimate?: number | null
          sales?: number | null
          updated_at?: string
          viewings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_impact_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_impact_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string
          brand_voice: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          health_score: number | null
          id: string
          logo_url: string | null
          monthly_retainer: number | null
          name: string
          niche: Database["public"]["Enums"]["niche"]
          notes: string | null
          objectives: string | null
          platforms: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          brand_voice?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_retainer?: number | null
          name: string
          niche?: Database["public"]["Enums"]["niche"]
          notes?: string | null
          objectives?: string | null
          platforms?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          brand_voice?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_retainer?: number | null
          name?: string
          niche?: Database["public"]["Enums"]["niche"]
          notes?: string | null
          objectives?: string | null
          platforms?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          agency_id: string
          approval_status: string | null
          assigned_to: string | null
          caption: string | null
          client_id: string
          created_at: string
          deadline: string | null
          id: string
          platform: string | null
          scheduled_for: string | null
          script: string | null
          status: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          approval_status?: string | null
          assigned_to?: string | null
          caption?: string | null
          client_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          platform?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          approval_status?: string | null
          assigned_to?: string | null
          caption?: string | null
          client_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          platform?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agency_id: string
          ai_summary: string | null
          client_id: string | null
          created_at: string
          folder: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          uploaded_by: string | null
        }
        Insert: {
          agency_id: string
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_custom_metrics: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          id: string
          label: string
          notes: string | null
          recorded_at: string | null
          unit: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          recorded_at?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          recorded_at?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "niche_custom_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niche_custom_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_dental_treatments: {
        Row: {
          agency_id: string
          appointments_booked: number | null
          client_id: string
          conversion_status: string | null
          cost_per_appointment: number | null
          created_at: string
          id: string
          notes: string | null
          objections: string | null
          patients_arrived: number | null
          qualified_leads: number | null
          treatment: string
          treatment_interest: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          appointments_booked?: number | null
          client_id: string
          conversion_status?: string | null
          cost_per_appointment?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          objections?: string | null
          patients_arrived?: number | null
          qualified_leads?: number | null
          treatment: string
          treatment_interest?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          appointments_booked?: number | null
          client_id?: string
          conversion_status?: string | null
          cost_per_appointment?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          objections?: string | null
          patients_arrived?: number | null
          qualified_leads?: number | null
          treatment?: string
          treatment_interest?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niche_dental_treatments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niche_dental_treatments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_fitness_offerings: {
        Row: {
          agency_id: string
          classes_promoted: number | null
          client_id: string
          created_at: string
          id: string
          memberships_sold: number | null
          messages_received: number | null
          name: string
          new_members_influenced: number | null
          notes: string | null
          offering_type: string | null
          trainer_content: number | null
          transformations: number | null
          trial_sessions: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          classes_promoted?: number | null
          client_id: string
          created_at?: string
          id?: string
          memberships_sold?: number | null
          messages_received?: number | null
          name: string
          new_members_influenced?: number | null
          notes?: string | null
          offering_type?: string | null
          trainer_content?: number | null
          transformations?: number | null
          trial_sessions?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          classes_promoted?: number | null
          client_id?: string
          created_at?: string
          id?: string
          memberships_sold?: number | null
          messages_received?: number | null
          name?: string
          new_members_influenced?: number | null
          notes?: string | null
          offering_type?: string | null
          trainer_content?: number | null
          transformations?: number | null
          trial_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niche_fitness_offerings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niche_fitness_offerings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_real_estate_properties: {
        Row: {
          agency_id: string
          area_sqm: number | null
          client_id: string
          cost_per_lead: number | null
          created_at: string
          id: string
          messages: number | null
          notes: string | null
          offers_received: number | null
          price: number | null
          property_type: string | null
          sold: boolean | null
          title: string
          updated_at: string
          viewings_booked: number | null
          views: number | null
        }
        Insert: {
          agency_id: string
          area_sqm?: number | null
          client_id: string
          cost_per_lead?: number | null
          created_at?: string
          id?: string
          messages?: number | null
          notes?: string | null
          offers_received?: number | null
          price?: number | null
          property_type?: string | null
          sold?: boolean | null
          title: string
          updated_at?: string
          viewings_booked?: number | null
          views?: number | null
        }
        Update: {
          agency_id?: string
          area_sqm?: number | null
          client_id?: string
          cost_per_lead?: number | null
          created_at?: string
          id?: string
          messages?: number | null
          notes?: string | null
          offers_received?: number | null
          price?: number | null
          property_type?: string | null
          sold?: boolean | null
          title?: string
          updated_at?: string
          viewings_booked?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "niche_real_estate_properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niche_real_estate_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_restaurant_items: {
        Row: {
          agency_id: string
          best_dish: boolean | null
          buying_intent_comments: number | null
          category: string | null
          client_id: string
          created_at: string
          estimated_sales_impact: number | null
          events: number | null
          foot_traffic: number | null
          id: string
          name: string
          notes: string | null
          orders: number | null
          reservations: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          best_dish?: boolean | null
          buying_intent_comments?: number | null
          category?: string | null
          client_id: string
          created_at?: string
          estimated_sales_impact?: number | null
          events?: number | null
          foot_traffic?: number | null
          id?: string
          name: string
          notes?: string | null
          orders?: number | null
          reservations?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          best_dish?: boolean | null
          buying_intent_comments?: number | null
          category?: string | null
          client_id?: string
          created_at?: string
          estimated_sales_impact?: number | null
          events?: number | null
          foot_traffic?: number | null
          id?: string
          name?: string
          notes?: string | null
          orders?: number | null
          reservations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niche_restaurant_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niche_restaurant_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          advanced_analytics: boolean
          ai_reports: boolean
          ai_strategy_room: boolean
          approval_workflow: boolean
          client_portal: boolean
          competitor_watch: boolean
          custom_branding: boolean
          max_clients: number | null
          max_seats: number | null
          name: string
          niche_dashboards: boolean
          premium_pdf: boolean
          price_eur: number
          stripe_price_id: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          white_label: boolean
        }
        Insert: {
          advanced_analytics?: boolean
          ai_reports?: boolean
          ai_strategy_room?: boolean
          approval_workflow?: boolean
          client_portal?: boolean
          competitor_watch?: boolean
          custom_branding?: boolean
          max_clients?: number | null
          max_seats?: number | null
          name: string
          niche_dashboards?: boolean
          premium_pdf?: boolean
          price_eur: number
          stripe_price_id?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          white_label?: boolean
        }
        Update: {
          advanced_analytics?: boolean
          ai_reports?: boolean
          ai_strategy_room?: boolean
          approval_workflow?: boolean
          client_portal?: boolean
          competitor_watch?: boolean
          custom_branding?: boolean
          max_clients?: number | null
          max_seats?: number | null
          name?: string
          niche_dashboards?: boolean
          premium_pdf?: boolean
          price_eur?: number
          stripe_price_id?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          white_label?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_saas_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_saas_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_saas_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          agency_id: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string
          assigned_to: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          agency_id: string
          ai_insight: string | null
          ai_score: number | null
          body_angle: string | null
          calls: number | null
          client_feedback: string | null
          client_id: string
          comments: number | null
          completion_rate: number | null
          created_at: string
          cta: string | null
          dms: number | null
          duration_seconds: number | null
          estimated_sales_impact: number | null
          format: string | null
          hook: string | null
          id: string
          likes: number | null
          objective: string | null
          platform: string | null
          publish_date: string | null
          reach: number | null
          recommendation:
            | Database["public"]["Enums"]["video_recommendation"]
            | null
          retention_3s: number | null
          retention_50pct: number | null
          saves: number | null
          shares: number | null
          updated_at: string
          video_url: string | null
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          agency_id: string
          ai_insight?: string | null
          ai_score?: number | null
          body_angle?: string | null
          calls?: number | null
          client_feedback?: string | null
          client_id: string
          comments?: number | null
          completion_rate?: number | null
          created_at?: string
          cta?: string | null
          dms?: number | null
          duration_seconds?: number | null
          estimated_sales_impact?: number | null
          format?: string | null
          hook?: string | null
          id?: string
          likes?: number | null
          objective?: string | null
          platform?: string | null
          publish_date?: string | null
          reach?: number | null
          recommendation?:
            | Database["public"]["Enums"]["video_recommendation"]
            | null
          retention_3s?: number | null
          retention_50pct?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          video_url?: string | null
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          agency_id?: string
          ai_insight?: string | null
          ai_score?: number | null
          body_angle?: string | null
          calls?: number | null
          client_feedback?: string | null
          client_id?: string
          comments?: number | null
          completion_rate?: number | null
          created_at?: string
          cta?: string | null
          dms?: number | null
          duration_seconds?: number | null
          estimated_sales_impact?: number | null
          format?: string | null
          hook?: string | null
          id?: string
          likes?: number | null
          objective?: string | null
          platform?: string | null
          publish_date?: string | null
          reach?: number | null
          recommendation?:
            | Database["public"]["Enums"]["video_recommendation"]
            | null
          retention_3s?: number | null
          retention_50pct?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          video_url?: string | null
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_agency_role: {
        Args: {
          _agency_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_of: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_saas_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "saas_admin"
        | "agency_owner"
        | "agency_team"
        | "content_creator"
        | "client_viewer"
      client_status: "active" | "paused" | "onboarding" | "churned"
      niche:
        | "real_estate"
        | "restaurant"
        | "lounge"
        | "dental"
        | "fitness"
        | "local_store"
        | "beauty"
        | "auto"
        | "hotel"
        | "custom"
      plan_tier: "starter" | "growth" | "unlimited" | "white_label"
      post_status:
        | "idea"
        | "script"
        | "filming"
        | "editing"
        | "sent_for_approval"
        | "approved"
        | "scheduled"
        | "published"
        | "analyzed"
      sub_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "paused"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "blocked" | "done"
      video_recommendation: "repeat" | "improve" | "stop"
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
      app_role: [
        "saas_admin",
        "agency_owner",
        "agency_team",
        "content_creator",
        "client_viewer",
      ],
      client_status: ["active", "paused", "onboarding", "churned"],
      niche: [
        "real_estate",
        "restaurant",
        "lounge",
        "dental",
        "fitness",
        "local_store",
        "beauty",
        "auto",
        "hotel",
        "custom",
      ],
      plan_tier: ["starter", "growth", "unlimited", "white_label"],
      post_status: [
        "idea",
        "script",
        "filming",
        "editing",
        "sent_for_approval",
        "approved",
        "scheduled",
        "published",
        "analyzed",
      ],
      sub_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "paused",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done"],
      video_recommendation: ["repeat", "improve", "stop"],
    },
  },
} as const
