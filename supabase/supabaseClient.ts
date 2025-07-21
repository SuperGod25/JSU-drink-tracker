import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhjrheoyikbvmwqzoiiw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoanJoZW95aWtidm13cXpvaWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzExMjcsImV4cCI6MjA2ODM0NzEyN30.v2jobVQeVTi6MvEK4l-wSe3-Chf07JPQBDEofmZd8sg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
