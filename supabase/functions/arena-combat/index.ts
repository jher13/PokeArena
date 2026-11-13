import { simulateOnline, onlineView } from "./engine.js";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

async function db(functionName: string, args: object) {
  const response = await fetch(url + "/rest/v1/rpc/" + functionName, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw Error("Combat database request failed.");
  return await response.json();
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to battle." }, 401);
    const auth = await fetch(url + "/auth/v1/user", { headers: { apikey: serviceKey, Authorization: authorization } });
    if (!auth.ok) return reply({ error: "Sign in to battle." }, 401);
    const { id: player } = await auth.json();
    const { id, command } = await request.json();
    if (typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return reply({ error: "Invalid match." }, 400);
    if (command && (!/^(host|guest):[0-5]$/.test(command.incoming) ||
      !Number.isInteger(command.slot) || command.slot < 0 || command.slot > 2))
      return reply({ error: "Invalid send-out." }, 400);

    for (let attempt = 0; attempt < 5; attempt++) {
      const match = await db("arena_combat_read", { match_id: id, player_id: player });
      if (!match) return reply({ error: "Match unavailable." }, 404);
      const side = match.host === player ? "host" : "guest";
      if (match.result) return reply({ result: match.result, turn: match.turn });
      if (!match.field || !match.host_entries || !match.guest_entries)
        return reply({ error: "Both players must be ready." }, 409);
      const elapsed = Date.parse(match.server_now) - Date.parse(match.next_tick);
      const steps = match.combat_state ? Math.min(60, Math.max(0, Math.floor(elapsed * 0.06))) : 0;
      if (!command && match.combat_state && steps < 6)
        return reply({ turn: match.turn, battle: onlineView(match.combat_state, side) });

      let next;
      try { next = simulateOnline(match, match.combat_state, steps, command, side); }
      catch (error) {
        if (!command) throw error;
        return reply({ error: error instanceof Error ? error.message : "Send-out unavailable." }, 409);
      }
      const saved = await db("arena_combat_commit", {
        match_id: id, revision: match.turn, state: next.state, outcome: next.result, steps,
      });
      if (saved) return reply({ turn: match.turn + 1, result: next.result,
        battle: onlineView(next.state, side) });
    }
    return reply({ error: "Match is busy. Try again." }, 409);
  } catch (error) {
    console.error(error);
    return reply({ error: "The battle server could not process this request." }, 500);
  }
});
