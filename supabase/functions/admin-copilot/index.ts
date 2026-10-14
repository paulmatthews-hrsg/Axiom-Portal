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

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface ToolArgs {
  status?: string;
  customer_base?: string;
  vrn?: string;
  offence_type?: string;
  limit?: number;
  vendor_name?: string;
  vendor_category?: string;
  agreement_status?: string;
  vehicle_status?: string;
  make?: string;
  search?: string;
}

interface CopilotRequest {
  query: string;
  conversationId?: string;
  user: {
    id: string;
    name: string;
    role: string;
    allowedFleets: string[];
  };
  history?: Array<{ role: string; content: string }>;
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; items?: { type: string } }>;
    required?: string[];
  };
}

const SYSTEM_INSTRUCTION = `You are the PennyOS Admin Copilot, a read-only operations assistant for a fleet management back-office platform called PennyOS.

Your role:
- Help staff query and understand fleet operations data: infringements (traffic fines), vehicles, BPA agreements (business purchase agreements), maintenance invoices, email logs, and audit logs.
- You are READ-ONLY. You cannot create, update, delete, or send anything. If asked to make changes, explain that you are a read-only assistant and suggest they use the relevant section of PennyOS directly.
- Be concise and practical. Use tables or bullet points for lists of records.
- When referencing data, include key identifiers like internal_id, VRN, agreement_number, or reference_number.
- If data is missing or you cannot find what was asked, say so clearly rather than guessing.
- You can see data only for the fleet customer bases the user has access to. Respect this restriction.
- Monetary amounts are in AUD unless stated otherwise.
- Dates are in Australian format (DD/MM/YYYY) when presenting to users.

Available tools let you search infringements, vehicles, BPA agreements, maintenance records, email logs, and audit logs. Use them when the user asks about specific data.`;

const TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "search_infringements",
    description: "Search and filter infringement records (traffic fines). Returns details like internal_id, VRN, offence type, status, fine amount, due date, customer base, and assigned driver.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by infringement status (e.g. 'New', 'Pending Driver Nomination', 'Stat Dec Pending', 'Pending Fleet Payment', 'Awaiting Reimbursement (Xero)', 'Closed', 'Voided')" },
        customer_base: { type: "string", description: "Filter by fleet customer base (e.g. 'GigCar', 'Fleetcar', 'Yonder')" },
        vrn: { type: "string", description: "Filter by vehicle registration number" },
        offence_type: { type: "string", description: "Filter by offence type (e.g. 'Speeding', 'Red Light', 'Parking', 'Toll Violation', 'Mobile Phone')" },
        limit: { type: "string", description: "Maximum number of results to return (default 20, max 50)" },
      },
    },
  },
  {
    name: "get_infringement_stats",
    description: "Get summary statistics about infringements: counts by status, total fine amounts, counts by customer base, and counts by offence type. Use this for questions like 'how many fines are pending' or 'what's the total fine amount'.",
    parameters: {
      type: "object",
      properties: {
        customer_base: { type: "string", description: "Filter stats by fleet customer base" },
      },
    },
  },
  {
    name: "search_vehicles",
    description: "Search the vehicle registry. Returns vehicle name, VIN, license plate, make, model, year, and status.",
    parameters: {
      type: "object",
      properties: {
        make: { type: "string", description: "Filter by vehicle manufacturer (e.g. 'Toyota', 'Ford')" },
        vehicle_status: { type: "string", description: "Filter by vehicle status (e.g. 'Active', 'In Service', 'Retired')" },
        search: { type: "string", description: "Search across vehicle name, VIN, license plate" },
        limit: { type: "string", description: "Maximum number of results (default 20, max 50)" },
      },
    },
  },
  {
    name: "search_bpa_agreements",
    description: "Search Business Purchase Agreement (BPA) records. Returns agreement number, vendor name, category, total value, status, dates, and contact info.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Filter by vendor/supplier name" },
        vendor_category: { type: "string", description: "Filter by category (e.g. 'Vehicle Supply', 'Parts & Maintenance', 'Fuel', 'Insurance', 'Tyres')" },
        agreement_status: { type: "string", description: "Filter by agreement status (e.g. 'Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated')" },
        limit: { type: "string", description: "Maximum results (default 20, max 50)" },
      },
    },
  },
  {
    name: "get_bpa_stats",
    description: "Get summary statistics about BPA agreements: total contracted value, counts by status, counts by category, and expiring soon count.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_email_logs",
    description: "Search email delivery logs for infringement-related emails. Returns recipient, subject, status, delivery status, sent date.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by send status (e.g. 'sent', 'failed')" },
        limit: { type: "string", description: "Maximum results (default 20, max 50)" },
      },
    },
  },
  {
    name: "search_audit_logs",
    description: "Search audit trail logs for compliance and activity tracking. Returns actor, action, timestamp, and infringement reference.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "string", description: "Maximum results (default 20, max 50)" },
      },
    },
  },
];

// --- Tool implementations (all read-only) ---

async function executeTool(name: string, args: ToolArgs, allowedFleets: string[]): Promise<{ result: unknown; summary: string }> {
  const limit = Math.min(parseInt(String(args.limit || "20"), 10) || 20, 50);

  switch (name) {
    case "search_infringements": {
      let query = supabase
        .from("infringements")
        .select("internal_id, customer_base, vrn, offence_type, offence_date, status, fine_amount, total_amount_payable, due_date, assigned_driver, reference_number, issuing_state, issuing_authority")
        .order("date_received", { ascending: false })
        .limit(limit);

      if (args.status) query = query.eq("status", args.status);
      if (args.customer_base && allowedFleets.includes(args.customer_base)) query = query.eq("customer_base", args.customer_base);
      if (args.vrn) query = query.ilike("vrn", `%${args.vrn}%`);
      if (args.offence_type) query = query.ilike("offence_type", `%${args.offence_type}%`);

      // If user does not have full access, filter to their allowed fleets
      if (!allowedFleets.includes("GigCar") || !allowedFleets.includes("Fleetcar") || !allowedFleets.includes("Yonder")) {
        query = query.in("customer_base", allowedFleets);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);
      const summary = `Found ${data.length} infringement(s)${args.status ? ` with status '${args.status}'` : ""}${args.customer_base ? ` for ${args.customer_base}` : ""}`;
      return { result: data, summary };
    }

    case "get_infringement_stats": {
      let query = supabase.from("infringements").select("status, fine_amount, total_amount_payable, customer_base, offence_type");
      if (args.customer_base) query = query.eq("customer_base", args.customer_base);

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);

      const byStatus: Record<string, { count: number; totalFines: number }> = {};
      const byBase: Record<string, number> = {};
      const byOffence: Record<string, number> = {};
      let totalFines = 0;

      for (const row of data) {
        if (!byStatus[row.status]) byStatus[row.status] = { count: 0, totalFines: 0 };
        byStatus[row.status].count++;
        byStatus[row.status].totalFines += Number(row.fine_amount || 0);
        totalFines += Number(row.fine_amount || 0);
        byBase[row.customer_base] = (byBase[row.customer_base] || 0) + 1;
        byOffence[row.offence_type] = (byOffence[row.offence_type] || 0) + 1;
      }

      const stats = { totalRecords: data.length, totalFines, byStatus, byBase, byOffence };
      const summary = `${data.length} total infringements, $${totalFines.toFixed(2)} in fines across ${Object.keys(byBase).length} fleet(s)`;
      return { result: stats, summary };
    }

    case "search_vehicles": {
      let query = supabase
        .from("vehicles")
        .select("vehicle_name, vin, license_plate, make, model, year, status")
        .limit(limit);

      if (args.make) query = query.ilike("make", `%${args.make}%`);
      if (args.vehicle_status) query = query.ilike("status", `%${args.vehicle_status}%`);
      if (args.search) {
        query = query.or(`vehicle_name.ilike.%${args.search}%,vin.ilike.%${args.search}%,license_plate.ilike.%${args.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);
      const summary = `Found ${data.length} vehicle(s)`;
      return { result: data, summary };
    }

    case "search_bpa_agreements": {
      let query = supabase
        .from("bpa_agreements")
        .select("agreement_number, vendor_name, vendor_category, total_value, currency, start_date, end_date, status, contact_name, contact_email")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (args.vendor_name) query = query.ilike("vendor_name", `%${args.vendor_name}%`);
      if (args.vendor_category) query = query.ilike("vendor_category", `%${args.vendor_category}%`);
      if (args.agreement_status) query = query.eq("status", args.agreement_status);

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);
      const summary = `Found ${data.length} BPA agreement(s)`;
      return { result: data, summary };
    }

    case "get_bpa_stats": {
      const { data, error } = await supabase.from("bpa_agreements").select("status, total_value, vendor_category, end_date");
      if (error) throw new Error(`Database error: ${error.message}`);

      const byStatus: Record<string, { count: number; totalValue: number }> = {};
      const byCategory: Record<string, { count: number; totalValue: number }> = {};
      let totalContracted = 0;
      let expiringSoon = 0;
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const row of data) {
        if (!byStatus[row.status]) byStatus[row.status] = { count: 0, totalValue: 0 };
        byStatus[row.status].count++;
        byStatus[row.status].totalValue += Number(row.total_value || 0);
        totalContracted += Number(row.total_value || 0);

        if (!byCategory[row.vendor_category]) byCategory[row.vendor_category] = { count: 0, totalValue: 0 };
        byCategory[row.vendor_category].count++;
        byCategory[row.vendor_category].totalValue += Number(row.total_value || 0);

        if (row.end_date && row.status === "Active") {
          const endDate = new Date(row.end_date);
          if (endDate <= thirtyDays && endDate >= now) expiringSoon++;
        }
      }

      const stats = { totalAgreements: data.length, totalContracted, byStatus, byCategory, expiringSoon };
      const summary = `${data.length} BPAs, $${totalContracted.toFixed(2)} total contracted, ${expiringSoon} expiring soon`;
      return { result: stats, summary };
    }

    case "search_email_logs": {
      let query = supabase
        .from("email_logs")
        .select("recipient_email, recipient_name, subject, status, delivery_status, sent_at, delivered_at, read_at")
        .order("sent_at", { ascending: false })
        .limit(limit);

      if (args.status) query = query.eq("status", args.status);

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);
      const summary = `Found ${data.length} email log(s)`;
      return { result: data, summary };
    }

    case "search_audit_logs": {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("actor, actor_type, action, timestamp, infringement_id")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Database error: ${error.message}`);
      const summary = `Found ${data.length} audit log entr(y/ies)`;
      return { result: data, summary };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, summary: `Unknown tool: ${name}` };
  }
}

function buildGeminiRequest(query: string, history: Array<{ role: string; content: string }>, functionDeclarations: GeminiFunctionDeclaration[], systemInstruction: string) {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  contents.push({ role: "user", parts: [{ text: query }] });

  return {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: [{ functionDeclarations }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };
}

async function callGemini(body: unknown): Promise<any> {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  return response.json();
}

function extractFunctionCalls(geminiResponse: any): Array<{ name: string; args: ToolArgs; id: string }> {
  const candidate = geminiResponse?.candidates?.[0];
  if (!candidate?.content?.parts) return [];

  const calls: Array<{ name: string; args: ToolArgs; id: string }> = [];
  for (const part of candidate.content.parts) {
    if (part.functionCall) {
      calls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {},
        id: part.functionCall.name,
      });
    }
  }
  return calls;
}

function extractText(geminiResponse: any): string {
  const candidate = geminiResponse?.candidates?.[0];
  if (!candidate?.content?.parts) return "";
  return candidate.content.parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("");
}

function buildToolResponseContent(functionCall: { name: string; id: string }, toolResult: unknown): any {
  return {
    role: "user",
    parts: [
      {
        functionResponse: {
          name: functionCall.name,
          id: functionCall.id,
          response: { result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult) },
        },
      },
    ],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Gemini API key not configured. Set GEMINI_API_KEY as an edge function secret." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: CopilotRequest = await req.json();
    const { query, user, history = [] } = body;

    if (!query || !user) {
      return new Response(JSON.stringify({ error: "Missing required fields: query, user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: guidanceRows } = await supabase
      .from('copilot_guidance')
      .select('title, instruction, scope')
      .eq('status', 'active')
      .order('approved_at', { ascending: false })
      .limit(25);
    const approvedGuidance = (guidanceRows || []).map((item) => `- ${item.title} (${item.scope}): ${item.instruction}`).join('\\n');
    const systemInstruction = approvedGuidance
      ? `${SYSTEM_INSTRUCTION}\\n\\nApproved operational guidance (use only when relevant):\\n${approvedGuidance}`
      : SYSTEM_INSTRUCTION;

    // Build initial Gemini request
    const geminiBody = buildGeminiRequest(query, history, TOOL_DECLARATIONS, systemInstruction);
    let geminiResponse = await callGemini(geminiBody);

    // Handle function calling loop (max 3 rounds)
    const auditEntries: Array<{ tool_name: string; tool_args: unknown; tool_result_summary: string }> = [];
    let round = 0;
    const MAX_ROUNDS = 3;

    while (round < MAX_ROUNDS) {
      const functionCalls = extractFunctionCalls(geminiResponse);
      if (functionCalls.length === 0) break;

      // Execute all function calls and build tool response parts
      const toolResponseParts: any[] = [];
      const currentContents = geminiBody.contents as any[];

      // Add the model's function call content
      const candidate = geminiResponse?.candidates?.[0];
      if (candidate?.content) {
        currentContents.push(candidate.content);
      }

      for (const fc of functionCalls) {
        const { result, summary } = await executeTool(fc.name, fc.args, user.allowedFleets);
        auditEntries.push({ tool_name: fc.name, tool_args: fc.args, tool_result_summary: summary });
        toolResponseParts.push(buildToolResponseContent(fc, result));
      }

      // Add tool responses and continue conversation
      for (const part of toolResponseParts) {
        currentContents.push(part);
      }

      geminiBody.contents = currentContents;
      geminiResponse = await callGemini(geminiBody);
      round++;
    }

    const finalText = extractText(geminiResponse) || "I was unable to generate a response. Please try rephrasing your question.";

    // Persist conversation
    let conversationId = body.conversationId;
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content, timestamp: new Date().toISOString() })),
      { role: "user", content: query, timestamp: new Date().toISOString() },
      { role: "assistant", content: finalText, timestamp: new Date().toISOString() },
    ];

    if (conversationId) {
      await supabase
        .from("copilot_conversations")
        .update({ messages, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } else {
      const conversationTitle = query.length > 60 ? query.slice(0, 57) + "..." : query;
      const { data: conv } = await supabase
        .from("copilot_conversations")
        .insert({
          user_id: user.id,
          user_name: user.name,
          user_role: user.role,
          allowed_fleets: user.allowedFleets,
          messages,
          title: conversationTitle,
        })
        .select("id")
        .single();
      conversationId = conv?.id;
    }

    // Persist audit logs for each tool call
    for (const entry of auditEntries) {
      await supabase.from("copilot_audit_logs").insert({
        conversation_id: conversationId,
        user_id: user.id,
        tool_name: entry.tool_name,
        tool_args: entry.tool_args,
        tool_result_summary: entry.tool_result_summary,
        user_query: query,
        ai_response: finalText,
      });
    }

    return new Response(
      JSON.stringify({
        response: finalText,
        conversationId,
        toolsUsed: auditEntries.map((e) => e.tool_name),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
