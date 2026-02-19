export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin" | "student" | "instructor";
          username: string;
          name: string;
          email: string;
          phone: string | null;
          birthdate: string | null;
          kakao_id: string | null;
          country: string | null;
          guardian_name: string | null;
          student_course: "international_school" | "local_school" | "homeschool" | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "student" | "instructor";
          username?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          birthdate?: string | null;
          kakao_id?: string | null;
          country?: string | null;
          guardian_name?: string | null;
          student_course?: "international_school" | "local_school" | "homeschool" | null;
          created_at?: string;
        };
        Update: {
          role?: "admin" | "student" | "instructor";
          username?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          birthdate?: string | null;
          kakao_id?: string | null;
          country?: string | null;
          guardian_name?: string | null;
          student_course?: "international_school" | "local_school" | "homeschool" | null;
          created_at?: string;
        };
      };
      user_consents: {
        Row: {
          user_id: string;
          terms_accepted_at: string;
          privacy_accepted_at: string;
          age_confirmed: boolean;
          guardian_email: string | null;
          guardian_status: "not_required" | "pending" | "confirmed";
          guardian_token: string | null;
          guardian_confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          terms_accepted_at?: string;
          privacy_accepted_at?: string;
          age_confirmed?: boolean;
          guardian_email?: string | null;
          guardian_status?: "not_required" | "pending" | "confirmed";
          guardian_token?: string | null;
          guardian_confirmed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["user_consents"]["Row"], "user_id">>;
      };
      courses: {
        Row: {
          id: string;
          title: string;
          subject: string;
          grade_range: string;
          description: string | null;
          weeks: number;
          duration_minutes: number;
          capacity: number;
          image_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subject: string;
          grade_range: string;
          description?: string | null;
          weeks?: number;
          duration_minutes?: number;
          capacity?: number;
          image_url?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["courses"]["Row"], "id" | "created_by" | "created_at">>;
      };
      course_time_windows: {
        Row: {
          id: string;
          course_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          instructor_id: string | null;
          instructor_name: string | null;
          capacity: number;
        };
        Insert: {
          id?: string;
          course_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          instructor_id?: string | null;
          instructor_name?: string | null;
          capacity?: number;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["course_time_windows"]["Row"], "id" | "course_id">>;
      };
      instructor_subjects: {
        Row: {
          id: string;
          instructor_id: string;
          subject: string;
          grade_range: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          subject: string;
          grade_range: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["instructor_subjects"]["Row"], "id" | "instructor_id">>;
      };
      applications: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          status: "pending" | "matched" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          status?: "pending" | "matched" | "cancelled";
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["applications"]["Row"], "id" | "course_id" | "student_id" | "created_at">>;
      };
      matches: {
        Row: {
          id: string;
          course_id: string;
          slot_start_at: string;
          slot_end_at: string;
          instructor_id: string | null;
          instructor_name: string | null;
          status: "proposed" | "confirmed" | "rescheduled" | "cancelled";
          updated_by: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          slot_start_at: string;
          slot_end_at: string;
          instructor_id?: string | null;
          instructor_name?: string | null;
          status?: "proposed" | "confirmed" | "rescheduled" | "cancelled";
          updated_by?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "created_at">>;
      };
      application_time_choices: {
        Row: {
          id: string;
          application_id: string;
          window_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          window_id: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["application_time_choices"]["Row"], "id" | "application_id" | "window_id">>;
      };
      application_time_requests: {
        Row: {
          id: string;
          application_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["application_time_requests"]["Row"], "id" | "application_id">>;
      };
      match_students: {
        Row: {
          id: string;
          match_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["match_students"]["Row"], "id" | "match_id" | "student_id">>;
      };
      email_batches: {
        Row: {
          id: string;
          created_by: string;
          subject: string;
          body: string;
          status: "draft" | "running" | "done" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          subject: string;
          body: string;
          status?: "draft" | "running" | "done" | "failed";
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["email_batches"]["Row"], "id" | "created_by" | "created_at">>;
      };
      admin_notification_emails: {
        Row: {
          id: string;
          email: string;
          label: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          label?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["admin_notification_emails"]["Row"], "id" | "created_at">>;
      };
      signup_error_logs: {
        Row: {
          id: string;
          context: string;
          email: string | null;
          username: string | null;
          error_message: string;
          error_code: string | null;
          error_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          context?: string;
          email?: string | null;
          username?: string | null;
          error_message: string;
          error_code?: string | null;
          error_payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["signup_error_logs"]["Row"], "id" | "created_at">>;
      };
      matching_runs: {
        Row: {
          id: string;
          course_id: string;
          status: "running" | "done" | "failed";
          from: string;
          to: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          status: "running" | "done" | "failed";
          from: string;
          to: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["matching_runs"]["Row"], "id" | "course_id" | "from" | "to" | "created_by" | "created_at">>;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
