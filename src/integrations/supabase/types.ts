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
          ai_auto_execute_low: boolean
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
          ai_auto_execute_low?: boolean
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
          ai_auto_execute_low?: boolean
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
      ai_action_requests: {
        Row: {
          action_type: string
          agency_id: string | null
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          created_at: string
          description: string | null
          edited_payload: Json | null
          executed_at: string | null
          execution_error: string | null
          execution_result: Json | null
          id: string
          payload: Json
          reasoning: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_at: string
          requested_by_ai_output_id: string | null
          requested_by_user_id: string | null
          risk_level: Database["public"]["Enums"]["ai_action_risk"]
          status: Database["public"]["Enums"]["ai_action_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          edited_payload?: Json | null
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: Json | null
          id?: string
          payload?: Json
          reasoning?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by_ai_output_id?: string | null
          requested_by_user_id?: string | null
          risk_level?: Database["public"]["Enums"]["ai_action_risk"]
          status?: Database["public"]["Enums"]["ai_action_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          edited_payload?: Json | null
          executed_at?: string | null
          execution_error?: string | null
          execution_result?: Json | null
          id?: string
          payload?: Json
          reasoning?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by_ai_output_id?: string | null
          requested_by_user_id?: string | null
          risk_level?: Database["public"]["Enums"]["ai_action_risk"]
          status?: Database["public"]["Enums"]["ai_action_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_requests_requested_by_ai_output_id_fkey"
            columns: ["requested_by_ai_output_id"]
            isOneToOne: false
            referencedRelation: "ai_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          action_type: string
          agency_id: string
          client_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          executed_at: string | null
          id: string
          payload: Json
          reasoning: string | null
          requested_by_user_id: string | null
          result: Json | null
          run_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          agency_id: string
          client_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json
          reasoning?: string | null
          requested_by_user_id?: string | null
          result?: Json | null
          run_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          agency_id?: string
          client_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json
          reasoning?: string | null
          requested_by_user_id?: string | null
          result?: Json | null
          run_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_audit_events: {
        Row: {
          agency_id: string | null
          created_at: string
          event: string
          id: string
          level: string
          payload: Json
          source: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          event: string
          id?: string
          level?: string
          payload?: Json
          source?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          event?: string
          id?: string
          level?: string
          payload?: Json
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evaluations: {
        Row: {
          actual_output: string | null
          agency_id: string | null
          created_at: string
          dataset_name: string
          evaluator_notes: string | null
          expected_behavior: string | null
          feature: string | null
          id: string
          input_sample: Json | null
          metrics: Json
          passed: boolean | null
          prompt_key: string
          prompt_version: number
          prompt_version_id: string | null
          score: number
          test_name: string | null
        }
        Insert: {
          actual_output?: string | null
          agency_id?: string | null
          created_at?: string
          dataset_name: string
          evaluator_notes?: string | null
          expected_behavior?: string | null
          feature?: string | null
          id?: string
          input_sample?: Json | null
          metrics?: Json
          passed?: boolean | null
          prompt_key: string
          prompt_version: number
          prompt_version_id?: string | null
          score: number
          test_name?: string | null
        }
        Update: {
          actual_output?: string | null
          agency_id?: string | null
          created_at?: string
          dataset_name?: string
          evaluator_notes?: string | null
          expected_behavior?: string | null
          feature?: string | null
          id?: string
          input_sample?: Json | null
          metrics?: Json
          passed?: boolean | null
          prompt_key?: string
          prompt_version?: number
          prompt_version_id?: string | null
          score?: number
          test_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_scoreboard"
            referencedColumns: ["prompt_id"]
          },
          {
            foreignKeyName: "ai_evaluations_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          agency_id: string
          ai_feature: string | null
          category: string | null
          client_id: string | null
          comment: string | null
          correction: string | null
          created_at: string
          feedback_type: string | null
          id: string
          rating: number
          run_id: string
          user_id: string
          was_useful: boolean | null
        }
        Insert: {
          agency_id: string
          ai_feature?: string | null
          category?: string | null
          client_id?: string | null
          comment?: string | null
          correction?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          rating: number
          run_id: string
          user_id: string
          was_useful?: boolean | null
        }
        Update: {
          agency_id?: string
          ai_feature?: string | null
          category?: string | null
          client_id?: string | null
          comment?: string | null
          correction?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          rating?: number
          run_id?: string
          user_id?: string
          was_useful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_improvement_suggestions: {
        Row: {
          agency_id: string | null
          ai_reasoning: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          effort_score: number
          id: string
          impact_score: number
          implemented_at: string | null
          priority: string
          source_id: string | null
          source_type: string
          status: string
          suggested_prompt_for_lovable: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          effort_score?: number
          id?: string
          impact_score?: number
          implemented_at?: string | null
          priority?: string
          source_id?: string | null
          source_type?: string
          status?: string
          suggested_prompt_for_lovable?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          effort_score?: number
          id?: string
          impact_score?: number
          implemented_at?: string | null
          priority?: string
          source_id?: string | null
          source_type?: string
          status?: string
          suggested_prompt_for_lovable?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_improvement_suggestions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_sources: {
        Row: {
          agency_id: string
          client_id: string | null
          content_summary: string | null
          created_at: string
          extracted_facts: Json
          id: string
          last_processed_at: string | null
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["ai_knowledge_source_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          content_summary?: string | null
          created_at?: string
          extracted_facts?: Json
          id?: string
          last_processed_at?: string | null
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["ai_knowledge_source_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          content_summary?: string | null
          created_at?: string
          extracted_facts?: Json
          id?: string
          last_processed_at?: string | null
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["ai_knowledge_source_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_learning_events: {
        Row: {
          agency_id: string | null
          client_id: string | null
          created_at: string
          event_type: string
          id: string
          proposed_prompt_version_id: string | null
          recommended_change: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          proposed_prompt_version_id?: string | null
          recommended_change?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          proposed_prompt_version_id?: string | null
          recommended_change?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_proposed_prompt_version_id_fkey"
            columns: ["proposed_prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_scoreboard"
            referencedColumns: ["prompt_id"]
          },
          {
            foreignKeyName: "ai_learning_events_proposed_prompt_version_id_fkey"
            columns: ["proposed_prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_maintenance_tasks: {
        Row: {
          agency_id: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          suggestion_id: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          suggestion_id?: string | null
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          suggestion_id?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_maintenance_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_maintenance_tasks_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_improvement_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          agency_id: string
          client_id: string | null
          content: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          kind: string
          scope: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          kind?: string
          scope?: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          kind?: string
          scope?: string
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_memory_items: {
        Row: {
          agency_id: string
          client_id: string | null
          confidence_score: number
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          memory_type: Database["public"]["Enums"]["ai_memory_type"]
          source_id: string
          source_type: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["ai_memory_visibility"]
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          confidence_score?: number
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          memory_type: Database["public"]["Enums"]["ai_memory_type"]
          source_id: string
          source_type: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["ai_memory_visibility"]
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          confidence_score?: number
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          memory_type?: Database["public"]["Enums"]["ai_memory_type"]
          source_id?: string
          source_type?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["ai_memory_visibility"]
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_outputs: {
        Row: {
          agency_id: string | null
          client_id: string | null
          confidence_score: number | null
          context_type: string | null
          cost_usd: number | null
          created_at: string
          error_text: string | null
          feature: string
          id: string
          input_payload: Json
          latency_ms: number | null
          missing_data: Json
          model: string | null
          output_json: Json | null
          output_text: string | null
          prompt_key: string | null
          prompt_version: number | null
          prompt_version_id: string | null
          safety_flags: Json
          status: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
          warnings: Json
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          confidence_score?: number | null
          context_type?: string | null
          cost_usd?: number | null
          created_at?: string
          error_text?: string | null
          feature: string
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          missing_data?: Json
          model?: string | null
          output_json?: Json | null
          output_text?: string | null
          prompt_key?: string | null
          prompt_version?: number | null
          prompt_version_id?: string | null
          safety_flags?: Json
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
          warnings?: Json
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          confidence_score?: number | null
          context_type?: string | null
          cost_usd?: number | null
          created_at?: string
          error_text?: string | null
          feature?: string
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          missing_data?: Json
          model?: string | null
          output_json?: Json | null
          output_text?: string | null
          prompt_key?: string | null
          prompt_version?: number | null
          prompt_version_id?: string | null
          safety_flags?: Json
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_outputs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_scoreboard"
            referencedColumns: ["prompt_id"]
          },
          {
            foreignKeyName: "ai_outputs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_runs: {
        Row: {
          agency_id: string | null
          client_id: string | null
          cost_usd: number | null
          created_at: string
          error_text: string | null
          feature: string | null
          id: string
          input_messages: Json
          latency_ms: number | null
          model: string | null
          output_json: Json | null
          output_text: string | null
          prompt_key: string | null
          prompt_version: number | null
          prompt_version_id: string | null
          safety_flags: Json
          status: string
          tokens_in: number | null
          tokens_out: number | null
          tool_calls: Json | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_text?: string | null
          feature?: string | null
          id?: string
          input_messages?: Json
          latency_ms?: number | null
          model?: string | null
          output_json?: Json | null
          output_text?: string | null
          prompt_key?: string | null
          prompt_version?: number | null
          prompt_version_id?: string | null
          safety_flags?: Json
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_text?: string | null
          feature?: string | null
          id?: string
          input_messages?: Json
          latency_ms?: number | null
          model?: string | null
          output_json?: Json | null
          output_text?: string | null
          prompt_key?: string | null
          prompt_version?: number | null
          prompt_version_id?: string | null
          safety_flags?: Json
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_scoreboard"
            referencedColumns: ["prompt_id"]
          },
          {
            foreignKeyName: "ai_prompt_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          agency_id: string | null
          content: string
          created_at: string
          created_by: string | null
          developer_prompt: string | null
          feature: string | null
          id: string
          is_active: boolean
          key: string
          model: string | null
          notes: string | null
          output_schema: Json | null
          performance_score: number | null
          temperature: number | null
          updated_at: string
          user_prompt_template: string | null
          version: number
          version_name: string | null
        }
        Insert: {
          agency_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          developer_prompt?: string | null
          feature?: string | null
          id?: string
          is_active?: boolean
          key: string
          model?: string | null
          notes?: string | null
          output_schema?: Json | null
          performance_score?: number | null
          temperature?: number | null
          updated_at?: string
          user_prompt_template?: string | null
          version?: number
          version_name?: string | null
        }
        Update: {
          agency_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          developer_prompt?: string | null
          feature?: string | null
          id?: string
          is_active?: boolean
          key?: string
          model?: string | null
          notes?: string | null
          output_schema?: Json | null
          performance_score?: number | null
          temperature?: number | null
          updated_at?: string
          user_prompt_template?: string | null
          version?: number
          version_name?: string | null
        }
        Relationships: []
      }
      ai_safety_rules: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          pattern: string
          rule_key: string
          updated_at: string
        }
        Insert: {
          action?: string
          agency_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          pattern: string
          rule_key: string
          updated_at?: string
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          pattern?: string
          rule_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_website_audits: {
        Row: {
          agency_id: string | null
          ai_summary: string | null
          audit_type: string
          created_at: string
          created_by: string | null
          findings: Json
          id: string
          page_name: string | null
          page_url: string | null
          recommended_actions: Json
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_summary?: string | null
          audit_type: string
          created_at?: string
          created_by?: string | null
          findings?: Json
          id?: string
          page_name?: string | null
          page_url?: string | null
          recommended_actions?: Json
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_summary?: string | null
          audit_type?: string
          created_at?: string
          created_by?: string | null
          findings?: Json
          id?: string
          page_name?: string | null
          page_url?: string | null
          recommended_actions?: Json
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_website_audits_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_entries: {
        Row: {
          ad_spend: number | null
          agency_id: string
          bookings: number | null
          calls: number | null
          client_id: string
          comments: number | null
          cost_per_lead: number | null
          cost_per_purchase: number | null
          created_at: string
          created_by: string | null
          date_end: string | null
          date_start: string | null
          engagement_rate: number | null
          followers_end: number | null
          followers_gained: number | null
          followers_start: number | null
          id: string
          impressions: number | null
          leads: number | null
          likes: number | null
          messages: number | null
          month: number | null
          notes: string | null
          period_type: string
          platform: string
          profile_visits: number | null
          reach: number | null
          revenue: number | null
          roas: number | null
          sales: number | null
          saves: number | null
          shares: number | null
          source: string
          updated_at: string
          views: number | null
          website_clicks: number | null
          year: number | null
        }
        Insert: {
          ad_spend?: number | null
          agency_id: string
          bookings?: number | null
          calls?: number | null
          client_id: string
          comments?: number | null
          cost_per_lead?: number | null
          cost_per_purchase?: number | null
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          engagement_rate?: number | null
          followers_end?: number | null
          followers_gained?: number | null
          followers_start?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          messages?: number | null
          month?: number | null
          notes?: string | null
          period_type?: string
          platform?: string
          profile_visits?: number | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          sales?: number | null
          saves?: number | null
          shares?: number | null
          source?: string
          updated_at?: string
          views?: number | null
          website_clicks?: number | null
          year?: number | null
        }
        Update: {
          ad_spend?: number | null
          agency_id?: string
          bookings?: number | null
          calls?: number | null
          client_id?: string
          comments?: number | null
          cost_per_lead?: number | null
          cost_per_purchase?: number | null
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          engagement_rate?: number | null
          followers_end?: number | null
          followers_gained?: number | null
          followers_start?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          messages?: number | null
          month?: number | null
          notes?: string | null
          period_type?: string
          platform?: string
          profile_visits?: number | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          sales?: number | null
          saves?: number | null
          shares?: number | null
          source?: string
          updated_at?: string
          views?: number | null
          website_clicks?: number | null
          year?: number | null
        }
        Relationships: []
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
      campaigns: {
        Row: {
          agency_id: string
          budget: number | null
          channels: string[] | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          objective: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          budget?: number | null
          channels?: string[] | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          objective?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          budget?: number | null
          channels?: string[] | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          objective?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_briefs: {
        Row: {
          agency_id: string
          brand_tone: string | null
          budget_range: string | null
          business_description: string | null
          client_id: string
          completed: boolean
          content_donts: string | null
          content_dos: string | null
          created_at: string
          extra_notes: string | null
          id: string
          main_competitors: string | null
          main_objective: string | null
          posting_frequency: string | null
          preferred_platforms: string[] | null
          reviewed_at: string | null
          submitted_by: string | null
          target_audience: string | null
          unique_selling_points: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          brand_tone?: string | null
          budget_range?: string | null
          business_description?: string | null
          client_id: string
          completed?: boolean
          content_donts?: string | null
          content_dos?: string | null
          created_at?: string
          extra_notes?: string | null
          id?: string
          main_competitors?: string | null
          main_objective?: string | null
          posting_frequency?: string | null
          preferred_platforms?: string[] | null
          reviewed_at?: string | null
          submitted_by?: string | null
          target_audience?: string | null
          unique_selling_points?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          brand_tone?: string | null
          budget_range?: string | null
          business_description?: string | null
          client_id?: string
          completed?: boolean
          content_donts?: string | null
          content_dos?: string | null
          created_at?: string
          extra_notes?: string | null
          id?: string
          main_competitors?: string | null
          main_objective?: string | null
          posting_frequency?: string | null
          preferred_platforms?: string[] | null
          reviewed_at?: string | null
          submitted_by?: string | null
          target_audience?: string | null
          unique_selling_points?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_feedback: {
        Row: {
          agency_id: string
          bookings: number | null
          calls_received: number | null
          client_id: string
          created_at: string
          feedback_text: string | null
          id: string
          messages_received: number | null
          month: string
          objections: string | null
          promote_next_month: string | null
          real_life_impact: string | null
          sales_estimate: number | null
          submitted_by: string
        }
        Insert: {
          agency_id: string
          bookings?: number | null
          calls_received?: number | null
          client_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          messages_received?: number | null
          month?: string
          objections?: string | null
          promote_next_month?: string | null
          real_life_impact?: string | null
          sales_estimate?: number | null
          submitted_by: string
        }
        Update: {
          agency_id?: string
          bookings?: number | null
          calls_received?: number | null
          client_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          messages_received?: number | null
          month?: string
          objections?: string | null
          promote_next_month?: string | null
          real_life_impact?: string | null
          sales_estimate?: number | null
          submitted_by?: string
        }
        Relationships: []
      }
      client_health_scores: {
        Row: {
          agency_id: string
          ai_generated_at: string | null
          ai_recommendation: Json | null
          breakdown: Json
          business_impact_score: number | null
          client_engagement_score: number | null
          client_id: string
          content_consistency_score: number | null
          created_at: string
          goal_progress_score: number | null
          id: string
          missing_data: Json
          month: number
          performance_score: number | null
          period_end: string
          period_start: string
          score_status: string
          summary: string | null
          total_score: number
          updated_at: string
          year: number
        }
        Insert: {
          agency_id: string
          ai_generated_at?: string | null
          ai_recommendation?: Json | null
          breakdown?: Json
          business_impact_score?: number | null
          client_engagement_score?: number | null
          client_id: string
          content_consistency_score?: number | null
          created_at?: string
          goal_progress_score?: number | null
          id?: string
          missing_data?: Json
          month: number
          performance_score?: number | null
          period_end: string
          period_start: string
          score_status?: string
          summary?: string | null
          total_score?: number
          updated_at?: string
          year: number
        }
        Update: {
          agency_id?: string
          ai_generated_at?: string | null
          ai_recommendation?: Json | null
          breakdown?: Json
          business_impact_score?: number | null
          client_engagement_score?: number | null
          client_id?: string
          content_consistency_score?: number | null
          created_at?: string
          goal_progress_score?: number | null
          id?: string
          missing_data?: Json
          month?: number
          performance_score?: number | null
          period_end?: string
          period_start?: string
          score_status?: string
          summary?: string | null
          total_score?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      client_invites: {
        Row: {
          accepted_at: string | null
          agency_id: string
          client_id: string
          created_at: string
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          last_sent_at: string | null
          opened_at: string | null
          permissions: Json
          portal_role: string
          revoked_at: string | null
          send_count: number
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          client_id: string
          created_at?: string
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          opened_at?: string | null
          permissions?: Json
          portal_role?: string
          revoked_at?: string | null
          send_count?: number
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          client_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          opened_at?: string | null
          permissions?: Json
          portal_role?: string
          revoked_at?: string | null
          send_count?: number
          status?: string
          token?: string
        }
        Relationships: []
      }
      client_kpi_schemas: {
        Row: {
          agency_id: string
          business_impact_fields: Json
          client_id: string
          created_at: string
          custom_niche_label: string | null
          id: string
          kpi_fields: Json
          monthly_questions: Json
          niche_key: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          business_impact_fields?: Json
          client_id: string
          created_at?: string
          custom_niche_label?: string | null
          id?: string
          kpi_fields?: Json
          monthly_questions?: Json
          niche_key: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          business_impact_fields?: Json
          client_id?: string
          created_at?: string
          custom_niche_label?: string | null
          id?: string
          kpi_fields?: Json
          monthly_questions?: Json
          niche_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_kpi_schemas_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_kpi_schemas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_platforms: {
        Row: {
          active: boolean
          agency_id: string
          client_id: string
          created_at: string
          handle: string | null
          id: string
          objective: string | null
          platform: string
          starting_followers: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          agency_id: string
          client_id: string
          created_at?: string
          handle?: string | null
          id?: string
          objective?: string | null
          platform: string
          starting_followers?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          agency_id?: string
          client_id?: string
          created_at?: string
          handle?: string | null
          id?: string
          objective?: string | null
          platform?: string
          starting_followers?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      client_risk_alerts: {
        Row: {
          agency_id: string
          ai_generated_at: string | null
          ai_summary: string | null
          client_id: string
          created_at: string
          detected_at: string
          id: string
          recommended_actions: Json
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string
          risk_reasons: Json
          risk_score: number
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          ai_generated_at?: string | null
          ai_summary?: string | null
          client_id: string
          created_at?: string
          detected_at?: string
          id?: string
          recommended_actions?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          risk_reasons?: Json
          risk_score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          ai_generated_at?: string | null
          ai_summary?: string | null
          client_id?: string
          created_at?: string
          detected_at?: string
          id?: string
          recommended_actions?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          risk_reasons?: Json
          risk_score?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_users: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_login_at: string | null
          permissions: Json
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          permissions?: Json
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          permissions?: Json
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          agency_id: string
          ai_strategy_base: Json | null
          brand_color: string | null
          brand_voice: string | null
          budget_estimate: number | null
          city: string | null
          competitors: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          custom_niche: string | null
          health_score: number | null
          id: string
          logo_url: string | null
          monthly_retainer: number | null
          name: string
          niche: Database["public"]["Enums"]["niche"]
          niche_id: string | null
          notes: string | null
          objectives: string | null
          platforms: string[] | null
          services: Json
          social_links: Json
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"]
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          ai_strategy_base?: Json | null
          brand_color?: string | null
          brand_voice?: string | null
          budget_estimate?: number | null
          city?: string | null
          competitors?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_niche?: string | null
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_retainer?: number | null
          name: string
          niche?: Database["public"]["Enums"]["niche"]
          niche_id?: string | null
          notes?: string | null
          objectives?: string | null
          platforms?: string[] | null
          services?: Json
          social_links?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          ai_strategy_base?: Json | null
          brand_color?: string | null
          brand_voice?: string | null
          budget_estimate?: number | null
          city?: string | null
          competitors?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_niche?: string | null
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_retainer?: number | null
          name?: string
          niche?: Database["public"]["Enums"]["niche"]
          niche_id?: string | null
          notes?: string | null
          objectives?: string | null
          platforms?: string[] | null
          services?: Json
          social_links?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          tone_of_voice?: string | null
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
          {
            foreignKeyName: "clients_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_observations: {
        Row: {
          agency_id: string
          ai_analysis: Json
          caption: string | null
          client_id: string
          competitor_id: string
          content_angle: string | null
          content_type: string | null
          content_url: string | null
          created_at: string
          created_by: string | null
          estimated_performance: string | null
          hook: string | null
          id: string
          notes: string | null
          observed_date: string
          offer: string | null
          platform: string | null
          screenshot_url: string | null
          tags: string[]
          title: string
          updated_at: string
          visible_to_client: boolean
        }
        Insert: {
          agency_id: string
          ai_analysis?: Json
          caption?: string | null
          client_id: string
          competitor_id: string
          content_angle?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          estimated_performance?: string | null
          hook?: string | null
          id?: string
          notes?: string | null
          observed_date?: string
          offer?: string | null
          platform?: string | null
          screenshot_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Update: {
          agency_id?: string
          ai_analysis?: Json
          caption?: string | null
          client_id?: string
          competitor_id?: string
          content_angle?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          estimated_performance?: string | null
          hook?: string | null
          id?: string
          notes?: string | null
          observed_date?: string
          offer?: string | null
          platform?: string | null
          screenshot_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "competitor_observations_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          created_by: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          niche: string | null
          notes: string | null
          tiktok_url: string | null
          updated_at: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          niche?: string | null
          notes?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          niche?: string | null
          notes?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      content_approvals: {
        Row: {
          agency_id: string
          assigned_to_client_user: string | null
          client_id: string
          comment: string | null
          content_post_id: string
          created_at: string
          decided_by: string | null
          decision: string
          due_date: string | null
          feedback: string | null
          id: string
          requested_at: string
          requested_by: string | null
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to_client_user?: string | null
          client_id: string
          comment?: string | null
          content_post_id: string
          created_at?: string
          decided_by?: string | null
          decision?: string
          due_date?: string | null
          feedback?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to_client_user?: string | null
          client_id?: string
          comment?: string | null
          content_post_id?: string
          created_at?: string
          decided_by?: string | null
          decision?: string
          due_date?: string | null
          feedback?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_approvals_content_post_id_fkey"
            columns: ["content_post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metrics: {
        Row: {
          agency_id: string
          average_view_duration: number | null
          bookings: number | null
          client_id: string
          comments: number | null
          completion_rate: number | null
          content_item_id: string
          created_at: string
          created_by: string | null
          followers_gained: number | null
          hook_rate: number | null
          id: string
          impressions: number | null
          leads: number | null
          likes: number | null
          notes: string | null
          platform: string | null
          reach: number | null
          retention_rate: number | null
          revenue: number | null
          sales: number | null
          saves: number | null
          shares: number | null
          source: string
          updated_at: string
          views: number | null
          watch_time: number | null
        }
        Insert: {
          agency_id: string
          average_view_duration?: number | null
          bookings?: number | null
          client_id: string
          comments?: number | null
          completion_rate?: number | null
          content_item_id: string
          created_at?: string
          created_by?: string | null
          followers_gained?: number | null
          hook_rate?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          notes?: string | null
          platform?: string | null
          reach?: number | null
          retention_rate?: number | null
          revenue?: number | null
          sales?: number | null
          saves?: number | null
          shares?: number | null
          source?: string
          updated_at?: string
          views?: number | null
          watch_time?: number | null
        }
        Update: {
          agency_id?: string
          average_view_duration?: number | null
          bookings?: number | null
          client_id?: string
          comments?: number | null
          completion_rate?: number | null
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          followers_gained?: number | null
          hook_rate?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          likes?: number | null
          notes?: string | null
          platform?: string | null
          reach?: number | null
          retention_rate?: number | null
          revenue?: number | null
          sales?: number | null
          saves?: number | null
          shares?: number | null
          source?: string
          updated_at?: string
          views?: number | null
          watch_time?: number | null
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          agency_id: string
          agency_notes: string | null
          approval_status: string | null
          assets: Json
          assigned_to: string | null
          caption: string | null
          client_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          deadline: string | null
          format: string | null
          hook: string | null
          id: string
          platform: string | null
          post_url: string | null
          scheduled_for: string | null
          script: string | null
          status: Database["public"]["Enums"]["post_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agency_notes?: string | null
          approval_status?: string | null
          assets?: Json
          assigned_to?: string | null
          caption?: string | null
          client_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deadline?: string | null
          format?: string | null
          hook?: string | null
          id?: string
          platform?: string | null
          post_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agency_notes?: string | null
          approval_status?: string | null
          assets?: Json
          assigned_to?: string | null
          caption?: string | null
          client_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deadline?: string | null
          format?: string | null
          hook?: string | null
          id?: string
          platform?: string | null
          post_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          thumbnail_url?: string | null
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
      continuous_improvement_runs: {
        Row: {
          agency_id: string | null
          approved_improvements: Json
          created_at: string
          detected_patterns: Json
          id: string
          input_summary: Json
          performance_after: Json
          performance_before: Json
          recommended_improvements: Json
          rejected_improvements: Json
          run_type: string
          status: Database["public"]["Enums"]["cie_status"]
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          approved_improvements?: Json
          created_at?: string
          detected_patterns?: Json
          id?: string
          input_summary?: Json
          performance_after?: Json
          performance_before?: Json
          recommended_improvements?: Json
          rejected_improvements?: Json
          run_type: string
          status?: Database["public"]["Enums"]["cie_status"]
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          approved_improvements?: Json
          created_at?: string
          detected_patterns?: Json
          id?: string
          input_summary?: Json
          performance_after?: Json
          performance_before?: Json
          recommended_improvements?: Json
          rejected_improvements?: Json
          run_type?: string
          status?: Database["public"]["Enums"]["cie_status"]
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_niche_fields: {
        Row: {
          agency_id: string
          created_at: string
          field_type: string
          id: string
          key: string
          label: string
          niche_id: string
          sort_order: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          field_type?: string
          id?: string
          key: string
          label: string
          niche_id: string
          sort_order?: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          field_type?: string
          id?: string
          key?: string
          label?: string
          niche_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_niche_fields_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_niche_fields_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_niche_kpis: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          key: string
          kpi_type: string
          label: string
          niche_id: string
          reporting_frequency: string
          sort_order: number
          visible_to_client: boolean
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          key: string
          kpi_type?: string
          label: string
          niche_id: string
          reporting_frequency?: string
          sort_order?: number
          visible_to_client?: boolean
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          key?: string
          kpi_type?: string
          label?: string
          niche_id?: string
          reporting_frequency?: string
          sort_order?: number
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "custom_niche_kpis_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_niche_kpis_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_niche_questions: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          key: string
          label: string
          niche_id: string
          sort_order: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          key: string
          label: string
          niche_id: string
          sort_order?: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          niche_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_niche_questions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_niche_questions_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
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
          description: string | null
          folder: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          agency_id: string
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          folder?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          agency_id?: string
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          folder?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          uploaded_by?: string | null
          visibility?: string
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
      monthly_goals: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          created_by: string | null
          deadline: string | null
          final_result: string | null
          id: string
          metric: string | null
          month: string
          notes: string | null
          objective: string
          owner: string | null
          progress: number | null
          status: string
          target: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          final_result?: string | null
          id?: string
          metric?: string | null
          month?: string
          notes?: string | null
          objective: string
          owner?: string | null
          progress?: number | null
          status?: string
          target?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          final_result?: string | null
          id?: string
          metric?: string | null
          month?: string
          notes?: string | null
          objective?: string
          owner?: string | null
          progress?: number | null
          status?: string
          target?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_strategies: {
        Row: {
          action_items: Json
          agency_id: string
          based_on_report_id: string | null
          business_focus: Json
          client_id: string
          content_to_repeat: Json
          content_to_stop: Json
          created_at: string
          created_by: string | null
          executive_summary: string | null
          id: string
          key_insights: Json
          missing_data: Json
          month: number
          new_tests: Json
          recommended_campaigns: Json
          recommended_content_formats: Json
          recommended_hooks: Json
          risks: Json
          sent_to_client_at: string | null
          status: string
          strategy_title: string
          suggested_calendar_plan: Json
          updated_at: string
          what_did_not_work: Json
          what_worked: Json
          year: number
        }
        Insert: {
          action_items?: Json
          agency_id: string
          based_on_report_id?: string | null
          business_focus?: Json
          client_id: string
          content_to_repeat?: Json
          content_to_stop?: Json
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          id?: string
          key_insights?: Json
          missing_data?: Json
          month: number
          new_tests?: Json
          recommended_campaigns?: Json
          recommended_content_formats?: Json
          recommended_hooks?: Json
          risks?: Json
          sent_to_client_at?: string | null
          status?: string
          strategy_title?: string
          suggested_calendar_plan?: Json
          updated_at?: string
          what_did_not_work?: Json
          what_worked?: Json
          year: number
        }
        Update: {
          action_items?: Json
          agency_id?: string
          based_on_report_id?: string | null
          business_focus?: Json
          client_id?: string
          content_to_repeat?: Json
          content_to_stop?: Json
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          id?: string
          key_insights?: Json
          missing_data?: Json
          month?: number
          new_tests?: Json
          recommended_campaigns?: Json
          recommended_content_formats?: Json
          recommended_hooks?: Json
          risks?: Json
          sent_to_client_at?: string | null
          status?: string
          strategy_title?: string
          suggested_calendar_plan?: Json
          updated_at?: string
          what_did_not_work?: Json
          what_worked?: Json
          year?: number
        }
        Relationships: []
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
      niches: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_custom: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agency_id: string | null
          body: string | null
          client_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          advanced_analytics: boolean
          ai_reports: boolean
          ai_strategy_room: boolean
          approval_workflow: boolean
          client_portal: boolean
          competitor_tracking: boolean
          competitor_watch: boolean
          custom_branding: boolean
          health_score: boolean
          max_clients: number | null
          max_seats: number | null
          name: string
          niche_dashboards: boolean
          premium_pdf: boolean
          price_eur: number
          risk_detector: boolean
          stripe_price_id: string | null
          swipe_file: boolean
          tier: Database["public"]["Enums"]["plan_tier"]
          white_label: boolean
        }
        Insert: {
          advanced_analytics?: boolean
          ai_reports?: boolean
          ai_strategy_room?: boolean
          approval_workflow?: boolean
          client_portal?: boolean
          competitor_tracking?: boolean
          competitor_watch?: boolean
          custom_branding?: boolean
          health_score?: boolean
          max_clients?: number | null
          max_seats?: number | null
          name: string
          niche_dashboards?: boolean
          premium_pdf?: boolean
          price_eur: number
          risk_detector?: boolean
          stripe_price_id?: string | null
          swipe_file?: boolean
          tier: Database["public"]["Enums"]["plan_tier"]
          white_label?: boolean
        }
        Update: {
          advanced_analytics?: boolean
          ai_reports?: boolean
          ai_strategy_room?: boolean
          approval_workflow?: boolean
          client_portal?: boolean
          competitor_tracking?: boolean
          competitor_watch?: boolean
          custom_branding?: boolean
          health_score?: boolean
          max_clients?: number | null
          max_seats?: number | null
          name?: string
          niche_dashboards?: boolean
          premium_pdf?: boolean
          price_eur?: number
          risk_detector?: boolean
          stripe_price_id?: string | null
          swipe_file?: boolean
          tier?: Database["public"]["Enums"]["plan_tier"]
          white_label?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_saas_admin: boolean
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_saas_admin?: boolean
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_saas_admin?: boolean
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          agency_id: string
          client_id: string
          client_visible: boolean
          created_at: string
          created_by: string | null
          highlights: Json | null
          id: string
          metrics: Json | null
          period_end: string
          period_start: string
          recommendations: Json | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          highlights?: Json | null
          id?: string
          metrics?: Json | null
          period_end: string
          period_start: string
          recommendations?: Json | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          highlights?: Json | null
          id?: string
          metrics?: Json | null
          period_end?: string
          period_start?: string
          recommendations?: Json | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      swipe_files: {
        Row: {
          agency_id: string
          caption: string | null
          client_id: string | null
          content_angle: string | null
          content_format: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          hook: string | null
          id: string
          niche: string | null
          performance_notes: string | null
          performance_score: number | null
          platform: string | null
          script: string | null
          source_post_id: string | null
          source_url: string | null
          tags: string[]
          title: string
          type: string
          updated_at: string
          usage_count: number
          visibility: string
          why_it_worked: string | null
        }
        Insert: {
          agency_id: string
          caption?: string | null
          client_id?: string | null
          content_angle?: string | null
          content_format?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          hook?: string | null
          id?: string
          niche?: string | null
          performance_notes?: string | null
          performance_score?: number | null
          platform?: string | null
          script?: string | null
          source_post_id?: string | null
          source_url?: string | null
          tags?: string[]
          title: string
          type: string
          updated_at?: string
          usage_count?: number
          visibility?: string
          why_it_worked?: string | null
        }
        Update: {
          agency_id?: string
          caption?: string | null
          client_id?: string | null
          content_angle?: string | null
          content_format?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          hook?: string | null
          id?: string
          niche?: string | null
          performance_notes?: string | null
          performance_score?: number | null
          platform?: string | null
          script?: string | null
          source_post_id?: string | null
          source_url?: string | null
          tags?: string[]
          title?: string
          type?: string
          updated_at?: string
          usage_count?: number
          visibility?: string
          why_it_worked?: string | null
        }
        Relationships: []
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
      ai_prompt_scoreboard: {
        Row: {
          acceptance_rate: number | null
          agency_id: string | null
          avg_rating: number | null
          feature: string | null
          feedback_count: number | null
          hallucinated_count: number | null
          is_active: boolean | null
          last_used_at: string | null
          negative_count: number | null
          prompt_id: string | null
          runs_count: number | null
          useful_count: number | null
          version: number | null
          version_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_client_invite: { Args: { _token: string }; Returns: string }
      cie_fanout: {
        Args: { _run_type: string; _since_days: number }
        Returns: undefined
      }
      create_agency_for_current_user: {
        Args: { _name: string }
        Returns: string
      }
      get_invite_preview: {
        Args: { _token: string }
        Returns: {
          agency_name: string
          client_name: string
          email: string
          expires_at: string
          status: string
        }[]
      }
      has_agency_role: {
        Args: {
          _agency_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_viewer_of: {
        Args: { _client: string; _user: string }
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
      mark_invite_opened: { Args: { _token: string }; Returns: undefined }
      resend_client_invite: { Args: { _invite_id: string }; Returns: undefined }
      revoke_client_invite: { Args: { _invite_id: string }; Returns: undefined }
      touch_client_login: { Args: never; Returns: undefined }
    }
    Enums: {
      ai_action_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "executed"
        | "failed"
        | "auto_executed"
        | "cancelled"
      ai_action_risk: "low" | "medium" | "high" | "critical"
      ai_knowledge_source_status:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
        | "archived"
      ai_memory_type:
        | "agency_preference"
        | "client_brand_voice"
        | "client_goal"
        | "niche_insight"
        | "content_pattern"
        | "winning_hook"
        | "failed_hook"
        | "reporting_preference"
        | "business_context"
        | "audience_insight"
        | "competitor_insight"
      ai_memory_visibility:
        | "internal_agency"
        | "client_visible"
        | "super_admin_only"
      app_role:
        | "saas_admin"
        | "agency_owner"
        | "agency_team"
        | "content_creator"
        | "client_viewer"
      cie_status:
        | "collecting"
        | "evaluating"
        | "awaiting_review"
        | "completed"
        | "failed"
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
        | "ecommerce"
        | "medical"
        | "education"
        | "legal"
        | "finance"
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
        | "draft"
        | "internal_review"
        | "ready_for_client"
        | "pending_approval"
        | "changes_requested"
        | "rejected"
        | "posted"
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
      ai_action_request_status: [
        "pending",
        "approved",
        "rejected",
        "executed",
        "failed",
        "auto_executed",
        "cancelled",
      ],
      ai_action_risk: ["low", "medium", "high", "critical"],
      ai_knowledge_source_status: [
        "pending",
        "processing",
        "processed",
        "failed",
        "archived",
      ],
      ai_memory_type: [
        "agency_preference",
        "client_brand_voice",
        "client_goal",
        "niche_insight",
        "content_pattern",
        "winning_hook",
        "failed_hook",
        "reporting_preference",
        "business_context",
        "audience_insight",
        "competitor_insight",
      ],
      ai_memory_visibility: [
        "internal_agency",
        "client_visible",
        "super_admin_only",
      ],
      app_role: [
        "saas_admin",
        "agency_owner",
        "agency_team",
        "content_creator",
        "client_viewer",
      ],
      cie_status: [
        "collecting",
        "evaluating",
        "awaiting_review",
        "completed",
        "failed",
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
        "ecommerce",
        "medical",
        "education",
        "legal",
        "finance",
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
        "draft",
        "internal_review",
        "ready_for_client",
        "pending_approval",
        "changes_requested",
        "rejected",
        "posted",
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
