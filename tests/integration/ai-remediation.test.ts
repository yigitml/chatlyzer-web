import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Pool } from "pg";

// Real PostgreSQL/transactions/handlers/provider schema; only external calls and
// auth wrappers are mocked here. Actual auth/rate limits are covered in app/auth tests.
const state = vi.hoisted(() => ({ userId: "", completion: vi.fn() }));
vi.mock("@/backend/middleware/jwtAuth", () => ({ withProtectedRoute: (handler: any) => (request: any) => { request.user = { id: state.userId }; return handler(request); } }));
vi.mock("@/backend/middleware/rateLimiter", () => ({ withRateLimiter: (handler: any) => handler, withAnalysisRateLimiter: (handler: any) => handler }));
vi.mock("openai", () => ({ OpenAI: class { chat = { completions: { create: state.completion } }; } }));
let prisma: any, pool: Pool, privacy: any, analysis: any, user: any, chatRoute: any, creditRoute: any, jobs: any, ai: any, commerce: any;
const users: string[] = [];
const events: string[] = [];
const messages = [
  { sender: "Alex", content: "Hello 🌻 one two", timestamp: "2026-01-01T12:00:01Z" },
  { sender: "Sam", content: "Hi three", timestamp: "2026-01-02T12:01:02Z" },
];
function sample(schema: any): any {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return sample(schema.anyOf.find((s: any) => s.type !== "null"));
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties || {}).map(([k,v])=>[k,sample(v)]));
  if (schema.type === "array") return [sample(schema.items)];
  if (schema.type === "number" || schema.type === "integer") return 1;
  if (schema.type === "boolean") return true;
  if (schema.type === "null") return null;
  return "Synthetic fixture";
}
const responseFor = (request: any) => ({ choices: [{ message: { content: JSON.stringify(sample(request.response_format.json_schema.schema)) } }] });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r=>{resolve=r}); return { promise, resolve }; }
function req(path: string, body?: any, method = "POST") { return new NextRequest(`https://remediation.invalid/api/${path}`, { method, headers: { "content-type":"application/json" }, ...(body ? {body:JSON.stringify(body)} : {}) }); }
const body = (extra = {}) => ({ title:"Synthetic private chat", isGhostMode:false, requestKey:"same-key", messages, ...extra });
const balance = async () => (await prisma.userCredit.findUnique({ where:{ userId_type:{userId:state.userId,type:"ANALYSIS"}}})).amount;
async function createChat() { return prisma.chat.create({data:{userId:state.userId,title:"Synthetic",messages:{create:messages.map(m=>({...m,timestamp:new Date(m.timestamp),userId:state.userId}))}}}); }

beforeAll(async () => {
  const db = new URL(process.env.DATABASE_URL || "http://missing");
  if (!db.pathname.endsWith("_test") || !["127.0.0.1","localhost"].includes(db.hostname)) throw new Error("Tests require disposable localhost _test database");
  pool = new Pool({connectionString:process.env.DATABASE_URL});
  prisma = (await import("../../src/backend/lib/prisma")).default;
  privacy = await import("../../src/app/api/privacy-analysis/route");
  analysis = await import("../../src/app/api/analysis/route");
  user = await import("../../src/app/api/user/route");
  chatRoute = await import("../../src/app/api/chat/route");
  jobs = await import("../../src/backend/lib/analysisJobs");
  ai = await import("../../src/backend/lib/openai");
  commerce = await import("../../src/backend/lib/revenueCat");
  creditRoute = await import("../../src/app/api/credit/route");
});
beforeEach(async () => {
  const u = await prisma.user.create({data:{name:"Synthetic",email:`ai-${crypto.randomUUID()}@example.invalid`}});
  state.userId=u.id; users.push(u.id);
  await prisma.userCredit.create({data:{userId:u.id,type:"ANALYSIS",amount:32,totalAmount:32}});
  state.completion.mockReset(); state.completion.mockImplementation(responseFor);
  vi.stubEnv("REVENUECAT_FULFILLMENT_MODE","sandbox");
});
afterAll(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  for (const id of users) {
    for (const table of ["Analysis","AnalysisJob","Message","File","Chat","RevenueCatPurchase","Order","UserCredit","Subscription","UserSession","UserDevice"]) await pool.query(`DELETE FROM "${table}" WHERE "userId"=$1`,[id]);
    await pool.query('DELETE FROM "User" WHERE "id"=$1',[id]);
  }
  for (const id of events) await pool.query('DELETE FROM "RevenueCatEvent" WHERE "id"=$1',[id]);
  await prisma.$disconnect(); await pool.end();
});

describe.sequential("AI financial and privacy invariants", () => {
  it("concurrent same-key privacy requests reserve and charge exactly once", async () => {
    const started=deferred(), release=deferred(); state.completion.mockImplementation(async(request:any)=>{started.resolve();await release.promise;return responseFor(request)});
    const first=privacy.POST(req("privacy-analysis",body())); await started.promise;
    const second=await privacy.POST(req("privacy-analysis",body())); expect(second.status).toBe(202);
    expect(await balance()).toBe(24); release.resolve(); expect((await first).status).toBe(200);
    expect(state.completion).toHaveBeenCalledOnce(); expect(await prisma.analysisJob.count({where:{userId:state.userId}})).toBe(1);
    expect(await prisma.analysis.count({where:{userId:state.userId,status:"COMPLETED"}})).toBe(8);
    expect((await privacy.POST(req("privacy-analysis",body()))).status).toBe(200); expect(await balance()).toBe(24);
    expect(await prisma.message.count({where:{userId:state.userId}})).toBe(0);
  });
  it("a schema-valid exactly 500-character message is analyzed in full", async () => {
    const response=await privacy.POST(req("privacy-analysis",body({messages:[{...messages[0],content:"a".repeat(500)}]})));
    expect(response.status).toBe(200); expect(state.completion.mock.calls[0][0].messages[1].content).toContain("a".repeat(500));
    expect(await balance()).toBe(24);
  });
  it("ghost retries never recharge and honestly cannot replay forgotten results", async () => {
    expect((await privacy.POST(req("privacy-analysis",body({isGhostMode:true})))).status).toBe(200);
    expect((await privacy.POST(req("privacy-analysis",body({isGhostMode:true})))).status).toBe(410);
    expect(await balance()).toBe(24); expect(await prisma.chat.count({where:{userId:state.userId}})).toBe(0);
    expect(await prisma.analysis.count({where:{userId:state.userId}})).toBe(0);
    const job=await prisma.analysisJob.findFirst({where:{userId:state.userId}});
    expect(JSON.stringify(job)).not.toContain(messages[0].content); expect(job).not.toHaveProperty("result");
  });
  for (const mode of ["STANDARD","PRIVACY","GHOST"]) it(`${mode} completion cannot write after account deletion`, async () => {
    const chat=mode==="STANDARD"?await createChat():null;
    const started=deferred(), release=deferred(); state.completion.mockImplementation(async(request:any)=>{started.resolve();await release.promise;return responseFor(request)});
    const pending=mode==="STANDARD"?analysis.POST(req("analysis",{chatId:chat.id,requestKey:"delete-race"})):privacy.POST(req("privacy-analysis",body({isGhostMode:mode==="GHOST"})));
    await started.promise; expect((await user.DELETE(req("user",undefined,"DELETE"))).status).toBe(200); release.resolve();
    expect((await pending).status).toBe(401);
    expect(await prisma.chat.count({where:{userId:state.userId,deletedAt:null}})).toBe(0);
    expect(Number((await pool.query('SELECT count(*) AS n FROM "Analysis" WHERE "userId"=$1 AND "result" IS NOT NULL AND LENGTH("result"::text)>2',[state.userId])).rows[0].n)).toBe(0);
    expect((await prisma.analysisJob.findFirst({where:{userId:state.userId}})).status).toBe("CANCELLED");
  });
  it("deleted messages never enter provider input; full ISO times, IDs, exact totals survive", async () => {
    const chat=await createChat(); await prisma.message.create({data:{chatId:chat.id,userId:state.userId,sender:"Deleted",content:"DELETED_PRIVATE_SECRET",timestamp:new Date(),deletedAt:new Date()}});
    const response=await analysis.POST(req("analysis",{chatId:chat.id,requestKey:"safe-input"})); expect(response.status).toBe(200);
    const input=state.completion.mock.calls[0][0].messages[1].content;
    expect(input).not.toContain("DELETED_PRIVATE_SECRET"); expect(input).toContain("2026-01-01T12:00:01.000Z");
    const rows=(await response.json()).data; const stats=rows.find((r:any)=>r.result.type==="chat_stats").result;
    expect(stats.totals.messageCount).toBe(2); expect(stats.totals.wordCount).toBe(6); expect(stats.chatStreak.maxConsecutiveDays).toBe(2);
    expect(stats.avgResponseTime.find((r:any)=>r.username==="Sam").responseTimeSeconds).toBe(86461);
  });
  it("equal-time standard placeholders complete and replay with all distinct result types in stable order", async () => {
    const chat=await createChat(), started=deferred(), release=deferred();
    state.completion.mockImplementation(async(request:any)=>{started.resolve();await release.promise;return responseFor(request)});
    const requestBody={chatId:chat.id,requestKey:"equal-time-results"};
    const pending=analysis.POST(req("analysis",requestBody)); await started.promise;
    await prisma.analysis.updateMany({where:{userId:state.userId,chatId:chat.id},data:{createdAt:new Date("2026-01-01T00:00:00Z")}});
    const placeholders=await prisma.analysis.findMany({where:{userId:state.userId,chatId:chat.id},orderBy:{id:"asc"}});
    release.resolve(); const response=await pending; expect(response.status).toBe(200);
    const rows=(await response.json()).data;
    expect(rows.map((row:any)=>row.id)).toEqual(placeholders.map((row:any)=>row.id));
    expect(rows.map((row:any)=>row.result.type)).toEqual(["vibe_check","chat_stats","red_flag","green_flag","simp_o_meter","ghost_risk","main_character_energy","emotional_depth"]);
    const replay=await analysis.POST(req("analysis",requestBody)); expect(replay.status).toBe(200);
    expect((await replay.json()).data.map((row:any)=>({id:row.id,type:row.result.type}))).toEqual(rows.map((row:any)=>({id:row.id,type:row.result.type})));
    expect(state.completion).toHaveBeenCalledOnce(); expect(await balance()).toBe(24);
  });
  it("provider failure and repeated reconciliation refund only once; fresh-key retry succeeds", async () => {
    state.completion.mockRejectedValueOnce(new Error("provider offline")); expect((await privacy.POST(req("privacy-analysis",body()))).status).toBe(500);
    expect(await balance()).toBe(32); const job=await prisma.analysisJob.findFirst({where:{userId:state.userId}});
    await jobs.failAnalysisJob(job.id); await jobs.reconcileAnalysisJobs(state.userId); expect(await balance()).toBe(32);
    expect((await privacy.POST(req("privacy-analysis",body()))).status).toBe(409);
    expect((await privacy.POST(req("privacy-analysis",body({requestKey:"retry"})))).status).toBe(200); expect(await balance()).toBe(24);
  });
  it("stale account generations cannot reserve jobs and interrupted old-generation debits are refunded", async () => {
    const {job}=await jobs.reserveAnalysisJob(state.userId,"GHOST","old-gen",undefined,0);
    await prisma.user.update({where:{id:state.userId},data:{tokenVersion:1}});
    await expect(jobs.reserveAnalysisJob(state.userId,"GHOST","stale",undefined,0)).rejects.toThrow("revoked");
    await expect(jobs.completeAnalysisJob(job.id,async()=>"obsolete output")).rejects.toThrow("revoked");
    await jobs.failAnalysisJob(job.id); expect(await balance()).toBe(32);
  });
  it("expired abandoned reservation recovers once and late completion is rejected", async () => {
    const {job}=await jobs.reserveAnalysisJob(state.userId,"GHOST","interrupted"); expect(await balance()).toBe(24);
    await prisma.analysisJob.update({where:{id:job.id},data:{leaseExpiresAt:new Date(0)}});
    await Promise.all([jobs.reconcileAnalysisJobs(state.userId),jobs.reconcileAnalysisJobs(state.userId)]);
    expect(await balance()).toBe(32); expect((await prisma.analysisJob.findUnique({where:{id:job.id}})).status).toBe("FAILED");
    await expect(jobs.completeAnalysisJob(job.id,async()=>"late output")).rejects.toThrow("lease expired");
  });
  it("scheduled recovery refunds an idle account without a user request or provider replay", async () => {
    const { job } = await jobs.reserveAnalysisJob(state.userId, "GHOST", "scheduled-recovery");
    await prisma.analysisJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
    const { recoverInterruptedAnalyses } = await import("../../src/instrumentation");
    await recoverInterruptedAnalyses();
    await recoverInterruptedAnalyses();
    expect(await balance()).toBe(32);
    expect((await prisma.analysisJob.findUnique({ where: { id: job.id } })).status).toBe("FAILED");
    expect(state.completion).not.toHaveBeenCalled();
  });
  it("partial privacy/standard persistence rolls back completely and refunds", async () => {
    // A trigger fails the fifth individual row write inside the real transaction.
    await pool.query(`CREATE FUNCTION ai_remediation_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${state.userId}' AND NEW."status" = 'COMPLETED' AND (SELECT count(*) FROM "Analysis" WHERE "userId" = NEW."userId" AND "status" = 'COMPLETED') >= 4 THEN RAISE EXCEPTION 'Injected result failure'; END IF; RETURN NEW; END $$`);
    await pool.query('CREATE TRIGGER ai_remediation_failure BEFORE INSERT OR UPDATE ON "Analysis" FOR EACH ROW EXECUTE FUNCTION ai_remediation_fail()');
    try {
      expect((await privacy.POST(req("privacy-analysis",body()))).status).toBe(500); expect(await balance()).toBe(32);
      expect(await prisma.chat.count({where:{userId:state.userId}})).toBe(0); expect(await prisma.analysis.count({where:{userId:state.userId}})).toBe(0);
      const chat=await createChat(); expect((await analysis.POST(req("analysis",{chatId:chat.id,requestKey:"partial"}))).status).toBe(500);
      expect(await balance()).toBe(32); expect(await prisma.analysis.count({where:{userId:state.userId,status:"COMPLETED"}})).toBe(0);
      expect(await prisma.analysis.count({where:{userId:state.userId,status:"FAILED"}})).toBe(8);
    } finally { await pool.query('DROP TRIGGER ai_remediation_failure ON "Analysis"'); await pool.query('DROP FUNCTION ai_remediation_fail()'); }
  });
  it("failed compensation stays recoverable and later refund commits exactly once", async () => {
    const {job}=await jobs.reserveAnalysisJob(state.userId,"GHOST","refund-failure");
    await pool.query(`CREATE FUNCTION ai_remediation_refund_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."id" = '${job.id}' AND NEW."status" = 'FAILED' THEN RAISE EXCEPTION 'Injected refund persistence failure'; END IF; RETURN NEW; END $$`);
    await pool.query('CREATE TRIGGER ai_remediation_refund_failure BEFORE UPDATE ON "AnalysisJob" FOR EACH ROW EXECUTE FUNCTION ai_remediation_refund_fail()');
    try { await expect(jobs.failAnalysisJob(job.id)).rejects.toThrow(); expect(await balance()).toBe(24); expect((await prisma.analysisJob.findUnique({where:{id:job.id}})).refundedAt).toBeNull(); }
    finally { await pool.query('DROP TRIGGER ai_remediation_refund_failure ON "AnalysisJob"'); await pool.query('DROP FUNCTION ai_remediation_refund_fail()'); }
    await prisma.analysisJob.update({where:{id:job.id},data:{leaseExpiresAt:new Date(0)}}); await jobs.reconcileAnalysisJobs(state.userId); await jobs.failAnalysisJob(job.id); expect(await balance()).toBe(32);
  });
  it("chat deletion cancels pending work and refunds without late write", async () => {
    const chat=await createChat(); const started=deferred(),release=deferred(); state.completion.mockImplementation(async(request:any)=>{started.resolve();await release.promise;return responseFor(request)});
    const pending=analysis.POST(req("analysis",{chatId:chat.id,requestKey:"delete-chat"})); await started.promise;
    expect((await chatRoute.DELETE(req("chat",{id:chat.id},"DELETE"))).status).toBe(200); release.resolve(); expect((await pending).status).toBe(409); expect(await balance()).toBe(32);
    expect(await prisma.analysis.count({where:{userId:state.userId,status:"COMPLETED"}})).toBe(0);
  });
  it("metadata is omitted and serialized sampling obeys even a tiny budget", async () => {
    const sampled=ai.smartChatSampler([{...messages[0],metadata:{secret:"x".repeat(500000)}}],100);
    expect(JSON.stringify(sampled)).not.toContain("metadata"); expect(JSON.stringify(sampled).length).toBeLessThan(500);
    expect(ai.smartChatSampler([{...messages[0],content:"x".repeat(20000)}],10)).toEqual([]);
    const repeated=await ai.analyzeAllChatTypesPrivate("Repeated fixture",[{...messages[0],content:"x".repeat(20000)}]);
    expect(repeated.analyses.chatStats.sampling.qualitativeSampled).toBe(true);
    expect(state.completion.mock.calls.at(-1)![0].messages[1].content).toContain("content excerpted");
    const output=await ai.analyzeAllChatTypesPrivate("Long fixture",Array.from({length:2000},(_,i)=>({...messages[i%2],content:"word ".repeat(30)})));
    expect(output.analyses.chatStats.totals.messageCount).toBe(2000); expect(output.analyses.chatStats.sampling.qualitativeSampled).toBe(true);
  });
});

describe.sequential("Purchase ledger policies", () => {
  function purchaseFetch(sandbox=true, id=`txn-${state.userId}`) { vi.stubGlobal("fetch",vi.fn(async()=>Response.json({subscriber:{non_subscriptions:{credits_24:[{id,transaction_id:id,is_sandbox:sandbox}]}}}))); return id; }
  function event(type:string,tx:string,extra={}) { const id=`event-${crypto.randomUUID()}`; events.push(id,`refund:sandbox:${tx}`,`refund:production:${tx}`); return {event:{id,type,transaction_id:tx,environment:"SANDBOX",product_id:"credits_24",event_timestamp_ms:Date.now(),...extra}}; }
  it("malformed webhook identities are client errors; disabled environments remain retryable", async () => {
    await expect(commerce.processRevenueCatWebhook({event:{id:17,type:"TRANSFER"}})).rejects.toMatchObject({status:400});
    await expect(commerce.processRevenueCatWebhook({event:{id:"bad-arrays",type:"TRANSFER",transferred_to:"not-an-array"}})).rejects.toMatchObject({status:400});
    const production=event("NON_RENEWING_PURCHASE","future-production",{app_user_id:state.userId,environment:"PRODUCTION"});
    await expect(commerce.processRevenueCatWebhook(production)).rejects.toMatchObject({status:503});
    expect(await prisma.revenueCatEvent.findUnique({where:{id:production.event.id}})).toBeNull();
    vi.stubEnv("REVENUECAT_FULFILLMENT_MODE","production"); await commerce.processRevenueCatWebhook(production);
    expect(await balance()).toBe(56);
  });
  it("v1 id-only purchases await a signed stable transaction webhook", async () => {
    const transaction=`stable-${state.userId}`;
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({subscriber:{non_subscriptions:{credits_24:[{id:"revenuecat-identity",is_sandbox:true}]}}})));
    expect((await commerce.syncRevenueCatCreditsForUser(state.userId)).pendingVerification).toBe(1);
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(0);
    const purchase=event("NON_RENEWING_PURCHASE",transaction,{app_user_id:state.userId});
    await commerce.processRevenueCatWebhook(purchase); await commerce.processRevenueCatWebhook(purchase);
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(24);
  });
  it("public credit availability preserves isolated pools and accurately gates eight-credit jobs", async () => {
    await prisma.userCredit.updateMany({where:{userId:state.userId},data:{amount:6,sandboxAmount:6}});
    let credit=(await (await creditRoute.GET(req("credit",undefined,"GET"))).json()).data[0];
    expect(credit).toMatchObject({amount:6,sandboxAmount:6,availableAmount:12,canAnalyze:false,billingEnvironment:"sandbox"});
    await prisma.userCredit.updateMany({where:{userId:state.userId},data:{sandboxAmount:24}});
    credit=(await (await creditRoute.GET(req("credit",undefined,"GET"))).json()).data[0]; expect(credit.canAnalyze).toBe(true);
    vi.stubEnv("REVENUECAT_FULFILLMENT_MODE","production");
    credit=(await (await creditRoute.GET(req("credit",undefined,"GET"))).json()).data[0]; expect(credit.availableAmount).toBe(6); expect(credit.canAnalyze).toBe(false);
  });
  it("concurrent grants are exactly once, sandbox balances stay isolated", async () => {
    purchaseFetch(); await Promise.all([commerce.syncRevenueCatCreditsForUser(state.userId),commerce.syncRevenueCatCreditsForUser(state.userId)]);
    const c=await prisma.userCredit.findFirst({where:{userId:state.userId}}); expect(c.amount).toBe(32); expect(c.sandboxAmount).toBe(24);
    vi.stubEnv("REVENUECAT_FULFILLMENT_MODE","production"); const {job}=await jobs.reserveAnalysisJob(state.userId,"GHOST","production"); expect(job.debitEnvironment).toBe("production");
    await prisma.userCredit.update({where:{id:c.id},data:{amount:0}}); await expect(jobs.reserveAnalysisJob(state.userId,"GHOST","blocked-sandbox")).rejects.toThrow("Insufficient");
  });
  it("mapped historical sandbox grants match refunds and signed replays by store transaction ID", async () => {
    const tx=`legacy-store-${state.userId}`;
    await prisma.revenueCatPurchase.create({data:{userId:state.userId,revenueCatTransactionId:`revenuecat-old-${state.userId}`,storeTransactionId:tx,environment:"sandbox",creditsGranted:24,productId:"credits_24"}});
    await prisma.userCredit.updateMany({where:{userId:state.userId},data:{sandboxAmount:24}});
    await commerce.processRevenueCatWebhook(event("NON_RENEWING_PURCHASE",tx,{app_user_id:state.userId}));
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(24);
    await commerce.processRevenueCatWebhook(event("CANCELLATION",tx,{cancel_reason:"CUSTOMER_SUPPORT"}));
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(0);
  });
  it("refunds, replay and reversal preserve spent-credit debt exactly once", async () => {
    const tx=purchaseFetch(); await commerce.syncRevenueCatCreditsForUser(state.userId);
    await prisma.userCredit.updateMany({where:{userId:state.userId},data:{sandboxAmount:4}});
    const refund=event("CANCELLATION",tx,{cancel_reason:"CUSTOMER_SUPPORT"}); await commerce.processRevenueCatWebhook(refund); await commerce.processRevenueCatWebhook(refund);
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(-20);
    await commerce.syncRevenueCatCreditsForUser(state.userId); expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(-20);
    const reversal=event("REFUND_REVERSED",tx); await commerce.processRevenueCatWebhook(reversal); await commerce.processRevenueCatWebhook(reversal);
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(4);
  });
  it("delayed older refunds cannot undo a newer refund reversal", async () => {
    const tx=purchaseFetch(); await commerce.syncRevenueCatCreditsForUser(state.userId);
    await commerce.processRevenueCatWebhook(event("CANCELLATION",tx,{cancel_reason:"CUSTOMER_SUPPORT",event_timestamp_ms:1000}));
    await commerce.processRevenueCatWebhook(event("REFUND_REVERSED",tx,{event_timestamp_ms:3000}));
    await commerce.processRevenueCatWebhook(event("CANCELLATION",tx,{cancel_reason:"CUSTOMER_SUPPORT",event_timestamp_ms:2000}));
    expect((await prisma.userCredit.findFirst({where:{userId:state.userId}})).sandboxAmount).toBe(24);
  });
  it("refund-before-sync tombstone blocks a later grant", async () => {
    const tx=purchaseFetch(); await commerce.processRevenueCatWebhook(event("CANCELLATION",tx,{cancel_reason:"CUSTOMER_SUPPORT"}));
    expect((await commerce.syncRevenueCatCreditsForUser(state.userId)).creditsGranted).toBe(0);
  });
  it("transfer event records immutable consumable ownership and never reissues grants", async () => {
    const tx=purchaseFetch(); await commerce.syncRevenueCatCreditsForUser(state.userId);
    const original=state.userId; const dest=await prisma.user.create({data:{name:"Destination",email:`dest-${crypto.randomUUID()}@example.invalid`}}); users.push(dest.id);
    await prisma.userCredit.create({data:{userId:dest.id,type:"ANALYSIS"}});
    const transfer=event("TRANSFER",tx,{transferred_from:[original],transferred_to:[dest.id]}); expect((await commerce.processRevenueCatWebhook(transfer)).policy).toBe("consumable_owner_unchanged");
    await commerce.syncRevenueCatCreditsForUser(dest.id); expect((await prisma.userCredit.findFirst({where:{userId:dest.id}})).sandboxAmount).toBe(0);
    expect((await prisma.revenueCatPurchase.findFirst({where:{storeTransactionId:tx}})).userId).toBe(original);
  });
});
