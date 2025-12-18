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
          name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "student" | "instructor";
          name?: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "admin" | "student" | "instructor";
          name?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          subject: string;
          image_url: string | null;
          grade_range: string;
          duration_minutes: number;
          capacity: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subject: string;
          image_url?: string | null;
          grade_range: string;
          duration_minutes?: number;
          capacity?: number;
          created_by?: string | null;
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
        };
        Insert: {
          id?: string;
          course_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
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
      availability_slots: {
        Row: {
          id: string;
          course_id: string | null;
          user_id: string;
          role: "student" | "instructor";
          start_at: string;
          end_at: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          user_id: string;
          role: "student" | "instructor";
          start_at: string;
          end_at: string;
          capacity?: number;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["availability_slots"]["Row"], "id" | "user_id" | "role" | "created_at">>;
      };
      matches: {
        Row: {
          id: string;
          course_id: string;
          slot_start_at: string;
          slot_end_at: string;
          instructor_id: string;
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
          instructor_id: string;
          status?: "proposed" | "confirmed" | "rescheduled" | "cancelled";
          updated_by?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "created_at">>;
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
