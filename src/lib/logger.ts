// src/lib/logger.ts

import { supabase } from '../../supabase/supabaseClient';

export async function logAction({
  userId,
  username,
  action,
  target,
  message,
}: {
  userId: string;
  username: string;
  action: string;
  target: string;
  message: string;
}) {
  const { error } = await supabase.from('logs').insert([
    {
      user_id: userId,
      username,
      action,
      target,
      message,
    },
  ]);

  if (error) {
    console.error('LOG ERROR:', error); // <-- make sure you log this!
  }
}
