import { simulateOnline, onlineView, journeyMatch, campaignEngineVersion } from "./engine.js";
import { prepareCampaignContract, advanceCampaignVerification } from "./campaign.js";
import { battleUser, uuid } from "./auth.ts";
import deployment from "./region.json" with { type: "json" };

declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const preferredRegion = Deno.env.get("ARENA_COMBAT_REGION") ?? deployment.region;
const combatRegion = preferredRegion && /^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(preferredRegion) ? preferredRegion : null;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Server-Timing, x-sb-edge-region",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

async function db(functionName: string, args: object) {
  const response = await fetch(url + "/rest/v1/rpc/" + functionName, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw Error(functionName + " failed with HTTP " + response.status);
  return await response.json();
}

// A submitted spar can finish after the challenger closes the tab. Every slice is resumable.
async function finishSparInBackground(playerId:string,runId:string) {
  for(let slice=0;slice<40;slice++){
    const run=await db('arena_journey_read',{player_id:playerId,run_id:runId});
    if(!run || run.kind!=='spar' || run.status!=='playing')return;
    const next=simulateOnline(journeyMatch(run),run.state,480,null,'host');
    const saved=await db('arena_journey_checkpoint',{run_id:run.id,expected:run.revision,new_state:next.result?null:next.state,winner:next.result,health:null});
    if(saved && next.result)return;
    if(!saved)return;
  }
}

type BattlePacket = { turn: number; result: string | null; battle: ReturnType<typeof onlineView>; serverMs?: number };

async function broadcastSnapshots(id: string, packets: Record<string, BattlePacket>) {
  const started = performance.now();
  try {
    const messages = Object.entries(packets).map(([side, payload]) => ({
      topic: "arena:" + id + ":" + side, event: "snapshot", private: true, payload,
    }));
    const response = await fetch(url + "/realtime/v1/api/broadcast", {
      method: "POST", signal: AbortSignal.timeout(1000),
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw Error("HTTP " + response.status);
  } catch (error) {
    console.warn("Arena broadcast unavailable", { match: id, turn: packets.host.turn, ms: Math.round(performance.now() - started), error: String(error) });
  }
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
  const started = performance.now();
  const timings = { auth: 0, read: 0, sim: 0, commit: 0, view: 0 };
  let id = "", mode = "", turn = 0, conflicts = 0;
  async function timedDb(stage: "read" | "commit", fn: string, args: object) {
    const at = performance.now();
    try { return await db(fn, args); }
    finally { timings[stage] += performance.now() - at; }
  }
  function finish(body: object, kind: string, status = 200) {
    const response = reply(body, status);
    const total = performance.now() - started;
    const stages = Object.entries({ ...timings, total }).map(([key, time]) => key + ";dur=" + time.toFixed(1));
    response.headers.set("Server-Timing", stages.join(", "));
    if (kind === "error" || total >= 250 || (kind === "advance" && turn % 32 === 0)) {
      console.info(JSON.stringify({ event: "arena_turn", match: id, mode, turn, kind, status, conflicts,
        region: Deno.env.get("SB_REGION"), ...Object.fromEntries(Object.entries({ ...timings, total }).map(([key, time]) => [key, Math.round(time)])) }));
    }
    return response;
  }
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to battle." }, 401);
    const body = await request.json();
    const authStart = performance.now();
    const user = await battleUser(authorization, Boolean(body?.campaign || body?.journey));
    timings.auth = performance.now() - authStart;
    if (!user) return reply({ error: "Sign in to battle." }, 401);
    if (body?.journey) {
      if (!['prepare','verify'].includes(body.journey) || typeof body.run_id !== 'string' || !uuid.test(body.run_id))
        return reply({error:'Invalid challenge.'},400);
      const run = await db('arena_journey_read',{player_id:user.id,run_id:body.run_id});
      if (!run) return reply({error:'This challenge is unavailable.'},404);
      if (body.journey === 'prepare') {
        if (run.kind !== 'champion' || run.status !== 'playing') return reply({error:'Choose a weekly battle first.'},409);
        return reply({match:journeyMatch(run),version:campaignEngineVersion});
      }
      if (run.status !== 'playing') return reply({status:run.status,stage:run.stage});
      if (run.kind === 'champion' && body.stage !== run.stage) return reply({status:run.status,stage:run.stage});
      const next=simulateOnline(journeyMatch(run),run.state,480,null,'host');
      const winner=next.result==='host' && run.kind==='champion' && next.state.enemies.some((p:{hp:number})=>p.hp>0)?'guest':next.result;
      const committed=await db('arena_journey_checkpoint',{run_id:run.id,expected:run.revision,
        new_state:winner?null:next.state,winner,health:winner?next.state.allies.map((p:{hp:number})=>p.hp):null});
      if(run.kind==='spar' && committed && !winner && run.revision===0 && typeof EdgeRuntime!=='undefined'){
        EdgeRuntime.waitUntil(finishSparInBackground(user.id,run.id).catch(()=>{}));
      }
      return reply(committed && winner?{complete:true,winner}:{pending:true});
    }
    if (body?.campaign) {
      if (!['prepare','verify'].includes(body.campaign) || typeof body.run_id!=='string' || !uuid.test(body.run_id)) return reply({ error: 'Invalid contract.' }, 400);
      const run = await db('arena_campaign_read', { player_id: user.id, run_id: body.run_id });
      if (!run) return reply({ error: 'This contract is unavailable. Return to Regional Progress.' }, 404);
      if (body.campaign === 'prepare') return reply(prepareCampaignContract(run));
      if (run.verified) return reply({ won: run.won, duration: run.duration });
      const result = advanceCampaignVerification(run);
      const committed = await db('arena_campaign_checkpoint', { player_id: user.id, run_id: body.run_id, revision: run.verification_revision, state: result.state, won: result.complete ? result.won : null });
      return reply(committed && result.complete ? { won: result.won, duration: result.duration } : { pending: true });
    }
    if (typeof body?.id !== "string" || !uuid.test(body.id)) return reply({ error: "Invalid match." }, 400);
    id = body.id;
    const command = body.command;
    if (command?.raidFocus && (Object.keys(command).length !== 1 || !Number.isInteger(command.raidFocus.cycle) ||
      !['left','right','boss'].includes(command.raidFocus.target))) return reply({ error: 'Invalid vent call.' }, 400);
    if (command && !command.raidFocus && !command.ai && typeof command.normalAttacks !== "boolean" && (!/^(host|guest):[0-5]$/.test(command.incoming) ||
      !Number.isInteger(command.slot) || command.slot < 0 || command.slot > 5)) return reply({ error: "Invalid send-out." }, 400);

    for (let attempt = 0; attempt < 5; attempt++) {
      const match = await timedDb("read", "arena_combat_turn_read", { match_id: id, player_id: user.id, verified_session: user.session });
      if (match?.session_expired) return finish({ error: "Sign in to battle." }, "session", 401);
      if (!match) return finish({ error: "Match unavailable." }, "missing", 404);
      mode = match.mode;
      turn = match.turn;
      const side = match.side;
      const prior = match.combat_state;
      const view = (state: Parameters<typeof onlineView>[0], viewer: string) => {
        const at = performance.now();
        const battle = onlineView(state, viewer, mode);
        timings.view += performance.now() - at;
        return battle;
      };
      if (match.result) return finish({ turn, result: match.result, battle: prior ? view(prior, side) : undefined, combatRegion }, "result");
      if (!match.ready) return finish({ error: "Both players must be ready." }, "pending", 409);
      const elapsed = Date.parse(match.server_now) - Date.parse(match.next_tick);
      const steps = prior ? Math.min(60, Math.max(0, Math.floor(elapsed * 0.06))) : 0;
      // A competing poll already advanced this turn. Only a pending command needs a fresh simulation.
      if (!command && prior && (steps < 4 || attempt > 0)) return finish({ turn, battle: view(prior, side), combatRegion }, "read");

      const simStart = performance.now();
      let next: ReturnType<typeof simulateOnline>;
      try { next = simulateOnline(match, prior, steps, command, side); }
      catch (error) {
        if (!command) throw error;
        return finish({ error: error instanceof Error ? error.message : "Send-out unavailable." }, "command", 409);
      } finally { timings.sim += performance.now() - simStart; }
      const saved = await timedDb("commit", "arena_combat_commit", { match_id: id, revision: turn, state: next.state, outcome: next.result, steps });
      if (!saved) { conflicts++; continue; }

      turn++;
      const packetFor = (viewer: string): BattlePacket => ({ turn, result: next.result, battle: view(next.state, viewer) });
      const packet = packetFor(side);
      if (!mode.startsWith("coop")) {
        const other = side === "host" ? "guest" : "host";
        const peer = packetFor(other);
        if (steps > 0) peer.serverMs = packet.serverMs = Math.round((performance.now() - started) * 10) / 10;
        EdgeRuntime.waitUntil(broadcastSnapshots(id, { [side]: packet, [other]: peer }));
      }
      return finish({ ...packet, combatRegion }, prior ? "advance" : "start");
    }
    return finish({ error: "Match is busy. Try again." }, "busy", 409);
  } catch (error) {
    console.error(error);
    return finish({ error: "The battle server could not process this request." }, "error", 500);
  }
});
