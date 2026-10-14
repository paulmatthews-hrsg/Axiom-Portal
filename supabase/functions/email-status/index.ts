import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (request.method === "GET") {
      const token = new URL(request.url).searchParams.get("token");
      if (isUuid(token)) {
        await supabase
          .from("email_logs")
          .update({ delivery_status: "read", delivered_at: new Date().toISOString(), read_at: new Date().toISOString() })
          .eq("tracking_token", token)
          .neq("delivery_status", "failed");
      }

      const pixel = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="), (character) => character.charCodeAt(0));
      return new Response(pixel, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

    const payload = await request.json();
    const token = payload?.tracking_token ?? payload?.token ?? payload?.data?.tracking_token ?? payload?.data?.token;
    const rawStatus = String(payload?.status ?? payload?.event ?? payload?.data?.status ?? payload?.data?.event ?? "").toLowerCase();
    const status = rawStatus.includes("read") || rawStatus.includes("open") ? "read" : rawStatus.includes("deliver") ? "delivered" : rawStatus.includes("fail") || rawStatus.includes("bounce") ? "failed" : null;

    if (!isUuid(token) || !status) return response({ error: "Invalid status event" }, 400);

    const now = new Date().toISOString();
    const update = status === "read"
      ? { delivery_status: "read", delivered_at: now, read_at: now }
      : status === "delivered"
        ? { delivery_status: "delivered", delivered_at: now }
        : { delivery_status: "failed" };

    let updateQuery = supabase.from("email_logs").update(update).eq("tracking_token", token);
    if (status === "read") updateQuery = updateQuery.neq("delivery_status", "failed");
    if (status === "delivered") updateQuery = updateQuery.neq("delivery_status", "read").neq("delivery_status", "failed");
    if (status === "failed") updateQuery = updateQuery.neq("delivery_status", "read");

    const { error } = await updateQuery;
    if (error) return response({ error: "Status update failed" }, 500);

    return response({ ok: true });
  } catch {
    return response({ error: "Unable to process status event" }, 500);
  }
});
