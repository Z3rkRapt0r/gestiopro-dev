
/** Set di helper per il fetch di dati da Supabase (admin, profil, logo, destinatari) */

export async function fetchAdminSettings(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("brevo_api_key")
    .eq("admin_id", userId)
    .maybeSingle();
  if (error || !data?.brevo_api_key) {
    throw new Error("No Brevo API key configured for this admin. Please configure it in the admin settings.");
  }
  return data.brevo_api_key;
}

export async function fetchAdminProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[Notification Email] Error fetching admin profile:", error);
    return null;
  }
  return data;
}

export async function fetchLogoUrl(supabase: any, userId: string) {
  try {
    const { data: logoData } = await supabase
      .storage
      .from("company-assets")
      .getPublicUrl(`${userId}/email-logo.png`);
    if (logoData?.publicUrl) {
      const cacheBuster = `v=${Date.now()}`;
      const logoUrlNoCache =
        logoData.publicUrl.indexOf("?") === -1
          ? `${logoData.publicUrl}?${cacheBuster}`
          : `${logoData.publicUrl}&${cacheBuster}`;
      console.log("[Notification Email] Found logoUrl for admin:", logoUrlNoCache);
      return logoUrlNoCache;
    }
    console.log("[Notification Email] No custom logo for admin, skipping logo.");
    return null;
  } catch (e) {
    console.error("[Notification Email] Error checking logo:", e);
    return null;
  }
}

export async function fetchRecipientEmails(supabase: any, recipientId: string | null) {
  if (recipientId && recipientId !== "ALL") {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", recipientId)
      .maybeSingle();

    if (profileError) {
      throw new Error("Failed to fetch recipient profile");
    }
    return profile?.email ? [profile.email] : [];
  } else {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_active", true)
      .not("email", "is", null);

    if (profilesError) {
      throw new Error("Failed to fetch user profiles");
    }
    return (profiles || []).map((p: any) => p.email).filter(Boolean);
  }
}
