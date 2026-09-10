/* ---------------------------------------------------------------------------
   GENERATED FILE - do not edit by hand.

   Produced from the migrations in supabase/migrations by:
       ./scripts/gen-db-types.sh

   Regenerate after any schema change so the client and the database cannot
   drift apart.
--------------------------------------------------------------------------- */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          target_label: string
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type?: string
          entity_id?: string | null
          target_label?: string
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          target_label?: string
          meta?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          priority: Database["public"]["Enums"]['announcement_priority']
          audience: Database["public"]["Enums"]['user_role'][]
          status: Database["public"]["Enums"]['content_status']
          created_by: string | null
          created_at: string
          updated_at: string
          published_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: string
          priority?: Database["public"]["Enums"]['announcement_priority']
          audience?: Database["public"]["Enums"]['user_role'][]
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          priority?: Database["public"]["Enums"]['announcement_priority']
          audience?: Database["public"]["Enums"]['user_role'][]
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'announcements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      assessment_answers: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          choice_ids: string[]
          text_answer: string | null
          is_correct: boolean | null
          points_awarded: number
          answered_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          choice_ids?: string[]
          text_answer?: string | null
          is_correct?: boolean | null
          points_awarded?: number
          answered_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          choice_ids?: string[]
          text_answer?: string | null
          is_correct?: boolean | null
          points_awarded?: number
          answered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assessment_answers_attempt_id_fkey'
            columns: ['attempt_id']
            isOneToOne: false
            referencedRelation: 'assessment_attempts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assessment_answers_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'assessment_questions'
            referencedColumns: ['id']
          }
        ]
      }
      assessment_attempts: {
        Row: {
          id: string
          assessment_id: string
          user_id: string
          attempt_number: number
          status: Database["public"]["Enums"]['attempt_status']
          score: number | null
          max_score: number | null
          percentage: number | null
          passed: boolean | null
          started_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          assessment_id: string
          user_id: string
          attempt_number: number
          status?: Database["public"]["Enums"]['attempt_status']
          score?: number | null
          max_score?: number | null
          percentage?: number | null
          passed?: boolean | null
          started_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          assessment_id?: string
          user_id?: string
          attempt_number?: number
          status?: Database["public"]["Enums"]['attempt_status']
          score?: number | null
          max_score?: number | null
          percentage?: number | null
          passed?: boolean | null
          started_at?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'assessment_attempts_assessment_id_fkey'
            columns: ['assessment_id']
            isOneToOne: false
            referencedRelation: 'assessments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assessment_attempts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      assessment_choices: {
        Row: {
          id: string
          question_id: string
          text: string
          is_correct: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          question_id: string
          text: string
          is_correct?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          question_id?: string
          text?: string
          is_correct?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'assessment_choices_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'assessment_questions'
            referencedColumns: ['id']
          }
        ]
      }
      assessment_questions: {
        Row: {
          id: string
          assessment_id: string
          type: Database["public"]["Enums"]['question_type']
          prompt: string
          explanation: string
          points: number
          sort_order: number
          correct_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          type?: Database["public"]["Enums"]['question_type']
          prompt: string
          explanation?: string
          points?: number
          sort_order?: number
          correct_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          type?: Database["public"]["Enums"]['question_type']
          prompt?: string
          explanation?: string
          points?: number
          sort_order?: number
          correct_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assessment_questions_assessment_id_fkey'
            columns: ['assessment_id']
            isOneToOne: false
            referencedRelation: 'assessments'
            referencedColumns: ['id']
          }
        ]
      }
      assessments: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          instructions: string
          module_id: string | null
          passing_score: number
          time_limit_minutes: number | null
          attempts_allowed: number
          randomize_questions: boolean
          randomize_choices: boolean
          show_correct_answers: boolean
          status: Database["public"]["Enums"]['content_status']
          version: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string
          instructions?: string
          module_id?: string | null
          passing_score?: number
          time_limit_minutes?: number | null
          attempts_allowed?: number
          randomize_questions?: boolean
          randomize_choices?: boolean
          show_correct_answers?: boolean
          status?: Database["public"]["Enums"]['content_status']
          version?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          instructions?: string
          module_id?: string | null
          passing_score?: number
          time_limit_minutes?: number | null
          attempts_allowed?: number
          randomize_questions?: boolean
          randomize_choices?: boolean
          show_correct_answers?: boolean
          status?: Database["public"]["Enums"]['content_status']
          version?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'assessments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assessments_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assessments_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      assignments: {
        Row: {
          id: string
          user_id: string
          target_type: Database["public"]["Enums"]['assignment_target']
          target_id: string
          assigned_by: string | null
          assigned_at: string
          due_at: string | null
          status: Database["public"]["Enums"]['assignment_status']
          note: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          target_type: Database["public"]["Enums"]['assignment_target']
          target_id: string
          assigned_by?: string | null
          assigned_at?: string
          due_at?: string | null
          status?: Database["public"]["Enums"]['assignment_status']
          note?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: Database["public"]["Enums"]['assignment_target']
          target_id?: string
          assigned_by?: string | null
          assigned_at?: string
          due_at?: string | null
          status?: Database["public"]["Enums"]['assignment_status']
          note?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'assignments_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assignments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          accent: string
          icon: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          accent?: string
          icon?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          accent?: string
          icon?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      competencies: {
        Row: {
          id: string
          slug: string
          name: string
          definition: string
          cluster: string
          behavioral_indicators: string[]
          sort_order: number
          status: Database["public"]["Enums"]['content_status']
        }
        Insert: {
          id?: string
          slug: string
          name: string
          definition?: string
          cluster?: string
          behavioral_indicators?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          definition?: string
          cluster?: string
          behavioral_indicators?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
        }
        Relationships: []
      }
      competency_levels: {
        Row: {
          level: number
          label: string
          description: string
        }
        Insert: {
          level: number
          label: string
          description?: string
        }
        Update: {
          level?: number
          label?: string
          description?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          id: string
          lesson_id: string
          type: Database["public"]["Enums"]['block_type']
          data: Json
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          type: Database["public"]["Enums"]['block_type']
          data?: Json
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          type?: Database["public"]["Enums"]['block_type']
          data?: Json
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'content_blocks_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'lessons'
            referencedColumns: ['id']
          }
        ]
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          target_type: string
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: string
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: string
          target_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          email: string
          role: Database["public"]["Enums"]['user_role']
          department: string | null
          position: string | null
          full_name: string | null
          permissions: string[]
          invited_by: string | null
          created_at: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          revoked_at: string | null
          note: string
          username: string | null
        }
        Insert: {
          id?: string
          email: string
          role?: Database["public"]["Enums"]['user_role']
          department?: string | null
          position?: string | null
          full_name?: string | null
          permissions?: string[]
          invited_by?: string | null
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          revoked_at?: string | null
          note?: string
          username?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: Database["public"]["Enums"]['user_role']
          department?: string | null
          position?: string | null
          full_name?: string | null
          permissions?: string[]
          invited_by?: string | null
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          revoked_at?: string | null
          note?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      learning_path_items: {
        Row: {
          id: string
          path_id: string
          module_id: string | null
          assessment_id: string | null
          sort_order: number
          required: boolean
        }
        Insert: {
          id?: string
          path_id: string
          module_id?: string | null
          assessment_id?: string | null
          sort_order?: number
          required?: boolean
        }
        Update: {
          id?: string
          path_id?: string
          module_id?: string | null
          assessment_id?: string | null
          sort_order?: number
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'learning_path_items_assessment_fk'
            columns: ['assessment_id']
            isOneToOne: false
            referencedRelation: 'assessments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'learning_path_items_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'learning_path_items_path_id_fkey'
            columns: ['path_id']
            isOneToOne: false
            referencedRelation: 'learning_paths'
            referencedColumns: ['id']
          }
        ]
      }
      learning_paths: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          audience: Database["public"]["Enums"]['user_role'][]
          accent: string
          status: Database["public"]["Enums"]['content_status']
          created_by: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string
          audience?: Database["public"]["Enums"]['user_role'][]
          accent?: string
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          audience?: Database["public"]["Enums"]['user_role'][]
          accent?: string
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'learning_paths_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          module_id: string
          completed: boolean
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          module_id: string
          completed?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          module_id?: string
          completed?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lesson_progress_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'lessons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lesson_progress_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lesson_progress_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          summary: string
          sort_order: number
          status: Database["public"]["Enums"]['content_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          summary?: string
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          summary?: string
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lessons_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          }
        ]
      }
      module_progress: {
        Row: {
          id: string
          user_id: string
          module_id: string
          state: Database["public"]["Enums"]['progress_state']
          started_at: string | null
          completed_at: string | null
          last_viewed_at: string | null
          last_viewed_lesson_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          state?: Database["public"]["Enums"]['progress_state']
          started_at?: string | null
          completed_at?: string | null
          last_viewed_at?: string | null
          last_viewed_lesson_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_id?: string
          state?: Database["public"]["Enums"]['progress_state']
          started_at?: string | null
          completed_at?: string | null
          last_viewed_at?: string | null
          last_viewed_lesson_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'module_progress_last_viewed_lesson_id_fkey'
            columns: ['last_viewed_lesson_id']
            isOneToOne: false
            referencedRelation: 'lessons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'module_progress_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'module_progress_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      modules: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          category_id: string | null
          module_number: number
          status: Database["public"]["Enums"]['content_status']
          difficulty: Database["public"]["Enums"]['difficulty']
          duration_minutes: number
          audience: Database["public"]["Enums"]['user_role'][]
          teams: string[]
          tags: string[]
          thumbnail_url: string | null
          icon: string | null
          needs_claim_review: boolean
          version: number
          created_by: string | null
          updated_by: string | null
          published_by: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string
          category_id?: string | null
          module_number?: number
          status?: Database["public"]["Enums"]['content_status']
          difficulty?: Database["public"]["Enums"]['difficulty']
          duration_minutes?: number
          audience?: Database["public"]["Enums"]['user_role'][]
          teams?: string[]
          tags?: string[]
          thumbnail_url?: string | null
          icon?: string | null
          needs_claim_review?: boolean
          version?: number
          created_by?: string | null
          updated_by?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          category_id?: string | null
          module_number?: number
          status?: Database["public"]["Enums"]['content_status']
          difficulty?: Database["public"]["Enums"]['difficulty']
          duration_minutes?: number
          audience?: Database["public"]["Enums"]['user_role'][]
          teams?: string[]
          tags?: string[]
          thumbnail_url?: string | null
          icon?: string | null
          needs_claim_review?: boolean
          version?: number
          created_by?: string | null
          updated_by?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'modules_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'modules_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'modules_published_by_fkey'
            columns: ['published_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'modules_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          kind: Database["public"]["Enums"]['notification_kind']
          title: string
          body: string
          href: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: Database["public"]["Enums"]['notification_kind']
          title: string
          body?: string
          href?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: Database["public"]["Enums"]['notification_kind']
          title?: string
          body?: string
          href?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      objections: {
        Row: {
          id: string
          slug: string
          objection: string
          translation: string
          category: string
          frequency: string
          difficulty: Database["public"]["Enums"]['difficulty']
          acknowledge: string
          clarify: string
          address: string
          close: string
          pitfalls: string[]
          notes: string
          claim_sensitive: boolean
          status: Database["public"]["Enums"]['content_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          objection: string
          translation?: string
          category?: string
          frequency?: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          acknowledge?: string
          clarify?: string
          address?: string
          close?: string
          pitfalls?: string[]
          notes?: string
          claim_sensitive?: boolean
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          objection?: string
          translation?: string
          category?: string
          frequency?: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          acknowledge?: string
          clarify?: string
          address?: string
          close?: string
          pitfalls?: string[]
          notes?: string
          claim_sensitive?: boolean
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          key: string
          label: string
          description: string
          category: string
          sort_order: number
        }
        Insert: {
          key: string
          label: string
          description?: string
          category: string
          sort_order?: number
        }
        Update: {
          key?: string
          label?: string
          description?: string
          category?: string
          sort_order?: number
        }
        Relationships: []
      }
      practice_scenarios: {
        Row: {
          id: string
          slug: string
          title: string
          channel: string
          personality: string
          difficulty: Database["public"]["Enums"]['difficulty']
          setup: string
          goal: string
          turns: Json
          coaching: string[]
          status: Database["public"]["Enums"]['content_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          channel: string
          personality: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          setup?: string
          goal?: string
          turns?: Json
          coaching?: string[]
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          channel?: string
          personality?: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          setup?: string
          goal?: string
          turns?: Json
          coaching?: string[]
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          display_name: string | null
          avatar_url: string | null
          role: Database["public"]["Enums"]['user_role']
          status: Database["public"]["Enums"]['user_status']
          department: string | null
          position: string | null
          created_at: string
          updated_at: string
          last_login_at: string | null
          username: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          display_name?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]['user_role']
          status?: Database["public"]["Enums"]['user_status']
          department?: string | null
          position?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          username?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]['user_role']
          status?: Database["public"]["Enums"]['user_status']
          department?: string | null
          position?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      quick_reference_items: {
        Row: {
          id: string
          slug: string
          title: string
          kicker: string
          kind: string
          channel: string
          blocks: Json
          sort_order: number
          status: Database["public"]["Enums"]['content_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          kicker?: string
          kind: string
          channel?: string
          blocks?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          kicker?: string
          kind?: string
          channel?: string
          blocks?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          role: Database["public"]["Enums"]['user_role']
          permission_key: string
        }
        Insert: {
          role: Database["public"]["Enums"]['user_role']
          permission_key: string
        }
        Update: {
          role?: Database["public"]["Enums"]['user_role']
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_key_fkey'
            columns: ['permission_key']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['key']
          }
        ]
      }
      sales_bible_entries: {
        Row: {
          id: string
          section_id: string
          label: string
          value: string | null
          detail: string
          verified: boolean
          requires_approval: boolean
          sort_order: number
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          section_id: string
          label: string
          value?: string | null
          detail?: string
          verified?: boolean
          requires_approval?: boolean
          sort_order?: number
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          section_id?: string
          label?: string
          value?: string | null
          detail?: string
          verified?: boolean
          requires_approval?: boolean
          sort_order?: number
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sales_bible_entries_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sales_bible_sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_bible_entries_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      sales_bible_sections: {
        Row: {
          id: string
          slug: string
          title: string
          summary: string
          sort_order: number
        }
        Insert: {
          id?: string
          slug: string
          title: string
          summary?: string
          sort_order?: number
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          summary?: string
          sort_order?: number
        }
        Relationships: []
      }
      scenario_runs: {
        Row: {
          id: string
          scenario_id: string
          user_id: string
          best_count: number
          turn_count: number
          completed_at: string
        }
        Insert: {
          id?: string
          scenario_id: string
          user_id: string
          best_count?: number
          turn_count?: number
          completed_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string
          user_id?: string
          best_count?: number
          turn_count?: number
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scenario_runs_scenario_id_fkey'
            columns: ['scenario_id']
            isOneToOne: false
            referencedRelation: 'practice_scenarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scenario_runs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      scripts: {
        Row: {
          id: string
          slug: string
          title: string
          kind: string
          channel: string
          situation: string
          language: string
          lines: string[]
          notes: string
          tags: string[]
          status: Database["public"]["Enums"]['content_status']
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          kind: string
          channel?: string
          situation?: string
          language?: string
          lines?: string[]
          notes?: string
          tags?: string[]
          status?: Database["public"]["Enums"]['content_status']
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          kind?: string
          channel?: string
          situation?: string
          language?: string
          lines?: string[]
          notes?: string
          tags?: string[]
          status?: Database["public"]["Enums"]['content_status']
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_activities: {
        Row: {
          id: string
          slug: string
          title: string
          objective: string
          description: string
          duration_minutes: number
          participants: string
          difficulty: Database["public"]["Enums"]['difficulty']
          instructions: string[]
          facilitator_notes: string[]
          expected_outcome: string
          materials: string[]
          tags: string[]
          category_id: string | null
          status: Database["public"]["Enums"]['content_status']
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          objective?: string
          description?: string
          duration_minutes?: number
          participants?: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          instructions?: string[]
          facilitator_notes?: string[]
          expected_outcome?: string
          materials?: string[]
          tags?: string[]
          category_id?: string | null
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          objective?: string
          description?: string
          duration_minutes?: number
          participants?: string
          difficulty?: Database["public"]["Enums"]['difficulty']
          instructions?: string[]
          facilitator_notes?: string[]
          expected_outcome?: string
          materials?: string[]
          tags?: string[]
          category_id?: string | null
          status?: Database["public"]["Enums"]['content_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_activities_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_activities_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      user_competencies: {
        Row: {
          id: string
          user_id: string
          competency_id: string
          level: number
          assessed_by: string | null
          note: string
          assessed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          competency_id: string
          level: number
          assessed_by?: string | null
          note?: string
          assessed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          competency_id?: string
          level?: number
          assessed_by?: string | null
          note?: string
          assessed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_competencies_assessed_by_fkey'
            columns: ['assessed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_competencies_competency_id_fkey'
            columns: ['competency_id']
            isOneToOne: false
            referencedRelation: 'competencies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_competencies_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      user_permissions: {
        Row: {
          user_id: string
          permission_key: string
          granted: boolean
          granted_by: string | null
          granted_at: string
          note: string
        }
        Insert: {
          user_id: string
          permission_key: string
          granted: boolean
          granted_by?: string | null
          granted_at?: string
          note?: string
        }
        Update: {
          user_id?: string
          permission_key?: string
          granted?: boolean
          granted_by?: string | null
          granted_at?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_permissions_granted_by_fkey'
            columns: ['granted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_permissions_permission_key_fkey'
            columns: ['permission_key']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'user_permissions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      wording_pairs: {
        Row: {
          id: string
          avoid: string
          use: string
          context: string
          note: string
          tags: string[]
          sort_order: number
          status: Database["public"]["Enums"]['content_status']
        }
        Insert: {
          id?: string
          avoid: string
          use: string
          context?: string
          note?: string
          tags?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
        }
        Update: {
          id?: string
          avoid?: string
          use?: string
          context?: string
          note?: string
          tags?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]['content_status']
        }
        Relationships: []
      }
    }
    Views: {
      admin_assessment_choices: {
        Row: {
          id: string | null
          question_id: string | null
          text: string | null
          is_correct: boolean | null
          sort_order: number | null
        }
        Relationships: []
      }
      admin_assessment_questions: {
        Row: {
          id: string | null
          assessment_id: string | null
          type: Database["public"]["Enums"]['question_type'] | null
          prompt: string | null
          explanation: string | null
          points: number | null
          sort_order: number | null
          correct_text: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign: {
        Args: {
          p_user_ids: string[] | null
          p_target_type: Database["public"]["Enums"]['assignment_target'] | null
          p_target_id: string | null
          p_due_at?: string | null
          p_note?: string | null
        }
        Returns: number
      }
      admin_create_account: {
        Args: {
          p_username: string | null
          p_full_name?: string | null
          p_role?: Database["public"]["Enums"]['user_role'] | null
          p_department?: string | null
          p_position?: string | null
          p_permissions?: string[] | null
          p_email?: string | null
          p_note?: string | null
        }
        Returns: unknown[]
      }
      admin_dashboard_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      admin_discard_pending_account: {
        Args: {
          p_invitation_id: string | null
        }
        Returns: unknown
      }
      admin_invite_user: {
        Args: {
          p_email: string | null
          p_full_name?: string | null
          p_role?: Database["public"]["Enums"]['user_role'] | null
          p_department?: string | null
          p_position?: string | null
          p_permissions?: string[] | null
          p_note?: string | null
        }
        Returns: string
      }
      admin_revoke_invitation: {
        Args: {
          p_id: string | null
        }
        Returns: unknown
      }
      admin_save_question: {
        Args: {
          p_assessment_id: string | null
          p_question_id: string | null
          p_type: Database["public"]["Enums"]['question_type'] | null
          p_prompt: string | null
          p_explanation: string | null
          p_points: number | null
          p_sort_order: number | null
          p_correct_text: string | null
          p_choices: Json | null
        }
        Returns: string
      }
      admin_set_permission: {
        Args: {
          p_user_id: string | null
          p_key: string | null
          p_granted: boolean | null
          p_note?: string | null
        }
        Returns: unknown
      }
      admin_set_user_role: {
        Args: {
          p_user_id: string | null
          p_role: Database["public"]["Enums"]['user_role'] | null
        }
        Returns: unknown
      }
      admin_set_user_status: {
        Args: {
          p_user_id: string | null
          p_status: Database["public"]["Enums"]['user_status'] | null
        }
        Returns: unknown
      }
      assignment_effective_status: {
        Args: {
          p_status: Database["public"]["Enums"]['assignment_status'] | null
          p_due_at: string | null
        }
        Returns: unknown
      }
      attempt_review: {
        Args: {
          p_attempt_id: string | null
        }
        Returns: unknown[]
      }
      can: {
        Args: {
          p_key: string | null
        }
        Returns: boolean
      }
      complete_lesson: {
        Args: {
          p_lesson_id: string | null
          p_completed?: boolean | null
        }
        Returns: unknown
      }
      invitation_exists: {
        Args: {
          p_email: string | null
        }
        Returns: boolean
      }
      is_active_user: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_action: string | null
          p_entity_type?: string | null
          p_entity_id?: string | null
          p_target_label?: string | null
          p_meta?: Json | null
        }
        Returns: unknown
      }
      my_permissions: {
        Args: Record<string, never>
        Returns: unknown[]
      }
      my_progress_summary: {
        Args: Record<string, never>
        Returns: Json
      }
      report_assessment_performance: {
        Args: Record<string, never>
        Returns: unknown[]
      }
      report_module_engagement: {
        Args: Record<string, never>
        Returns: unknown[]
      }
      report_training_completion: {
        Args: Record<string, never>
        Returns: unknown[]
      }
      revoke_anon_access: {
        Args: Record<string, never>
        Returns: unknown
      }
      save_answer: {
        Args: {
          p_attempt_id: string | null
          p_question_id: string | null
          p_choice_ids?: string[] | null
          p_text_answer?: string | null
        }
        Returns: unknown
      }
      start_assessment_attempt: {
        Args: {
          p_assessment_id: string | null
        }
        Returns: unknown
      }
      submit_assessment_attempt: {
        Args: {
          p_attempt_id: string | null
        }
        Returns: unknown
      }
      touch_last_login: {
        Args: Record<string, never>
        Returns: unknown
      }
      touch_module_view: {
        Args: {
          p_module_id: string | null
          p_lesson_id?: string | null
        }
        Returns: unknown
      }
      validate_question_choices: {
        Args: {
          p_question_id: string | null
        }
        Returns: unknown
      }
    }
    Enums: {
      announcement_priority: 'normal' | 'important' | 'critical'
      assignment_status: 'not-started' | 'in-progress' | 'completed' | 'overdue'
      assignment_target: 'module' | 'path' | 'assessment' | 'activity'
      attempt_status: 'in_progress' | 'submitted' | 'abandoned'
      block_type: 'heading' | 'text' | 'bullets' | 'numbered' | 'checklist' | 'callout' | 'dosdonts' | 'script' | 'comparison' | 'formula' | 'scenario' | 'quote' | 'quiz' | 'activity' | 'wording' | 'tip' | 'warning' | 'image' | 'video'
      content_status: 'draft' | 'published' | 'archived'
      difficulty: 'foundation' | 'intermediate' | 'advanced'
      notification_kind: 'assignment' | 'announcement' | 'result' | 'content' | 'due' | 'mention'
      progress_state: 'not-started' | 'in-progress' | 'completed'
      question_type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'short_answer'
      user_role: 'admin' | 'sales'
      user_status: 'active' | 'inactive' | 'pending'
    }
    CompositeTypes: Record<string, never>
  }
}

/** Convenience aliases so call sites read as domain types, not table lookups. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

