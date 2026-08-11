import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const schema = read("lib/db/src/schema/nexus-identity.ts");
const schemaIndex = read("lib/db/src/schema/index.ts");
const resolver = read("artifacts/api-server/src/lib/nexus-person-binding.ts");
const session = read("artifacts/api-server/src/lib/nexus-browser-session.ts");
const route = read("artifacts/api-server/src/routes/nexus-session.ts");

assert(schema.includes('pgTable("nexus_persons"'), "canonical Nexus Person table missing");
assert(schema.includes('pgTable(\n  "nexus_identity_bindings"'), "identity binding table missing");
assert(schema.includes('uniqueIndex("UQ_nexus_identity_provider_subject")'), "provider+subject uniqueness missing");
assert(schema.includes('.references(() => nexusPersonsTable.id, { onDelete: "restrict" })'), "binding must reference canonical Person");
assert(schemaIndex.includes('export * from "./nexus-identity"'), "identity schema not exported");

assert(resolver.includes('NEXUS_IDENTITY_BINDING_MODE === "postgres"'), "Postgres binding store must require explicit opt-in");
assert(resolver.includes('eq(nexusIdentityBindingsTable.providerSubject, providerSubject)'), "exact provider subject match missing");
assert(resolver.includes('eq(nexusIdentityBindingsTable.provider, provider)'), "provider/issuer scope missing");
assert(resolver.includes('eq(nexusIdentityBindingsTable.status, "ACTIVE")'), "active binding gate missing");
assert(resolver.includes('isNull(nexusIdentityBindingsTable.revokedAt)'), "revocation gate missing");
assert(!/eq\([^\n]*email/i.test(resolver), "email matching must not create identity authority");
assert(!/firstName|lastName/.test(resolver), "name matching must not create identity authority");

assert(session.includes('bindingStatus: "BOUND"'), "BOUND session state missing");
assert(session.includes('personId: person.personId'), "BOUND state must use canonical Person ID");
assert((session.match(/canIssueContextTicket: false/g) || []).length >= 3, "context ticket must remain disabled in all Slice B states");

assert(route.includes('resolveNexusPersonBinding(req.user.id)'), "authenticated provider subject must resolve server-side");
assert(route.includes('IDENTITY_BINDING_STORE_UNAVAILABLE'), "binding-store failure must fail closed");
assert(route.includes('res.status(503)'), "binding-store failure must be explicit 503");
assert(!route.includes('req.body'), "session route must not accept client identity input");
assert(!route.includes('req.query'), "session route must not accept client identity input");

console.log("PASS validate-nexus-person-binding");
