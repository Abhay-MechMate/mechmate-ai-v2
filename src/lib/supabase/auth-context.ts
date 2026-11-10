import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

/** One Supabase client and one user lookup per request render. */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
  } catch {
    return { supabase, user: null };
  }
});
