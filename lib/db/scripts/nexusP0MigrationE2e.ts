import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const url = new URL(process.env.DATABASE_URL!);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && process.env.NEXUS_P0_E2E==='1');
const admin = new pg.Client({connectionString:url.toString()}); await admin.connect();
const temp = fs.mkdtempSync(path.join(root,'lib/db/.p0-migrations-'));
fs.mkdirSync(path.join(temp,'scripts')); fs.mkdirSync(path.join(temp,'migrations'));
fs.copyFileSync(path.join(root,'lib/db/scripts/migrate.ts'),path.join(temp,'scripts/migrate.ts'));
const files = fs.readdirSync(path.join(root,'lib/db/migrations')).filter(f=>f.endsWith('.sql')).sort();
function setFiles(selected:string[]) {
  for(const f of fs.readdirSync(path.join(temp,'migrations'))) fs.unlinkSync(path.join(temp,'migrations',f));
  for(const f of selected) fs.copyFileSync(path.join(root,'lib/db/migrations',f),path.join(temp,'migrations',f));
}
function run(dbUrl:string,script=path.join(temp,'scripts/migrate.ts'),expected?:string) {
  const r=spawnSync(process.execPath,[path.join(root,'scripts/node_modules/tsx/dist/cli.mjs'),script],{cwd:root,encoding:'utf8',env:{...process.env,DATABASE_URL:dbUrl}});
  const output=r.stdout+r.stderr;
  if(expected) { assert.notEqual(r.status,0); assert.ok(output.includes(expected),output); }
  else assert.equal(r.status,0,output);
  return output;
}
try {
  for(const mode of ['a_upgrade','c2_upgrade','clean']) {
    const name=`nexus_p0_${mode}`; await admin.query(`create database ${name}`); const target=new URL(url);target.pathname=`/${name}`;
    const c=new pg.Client({connectionString:target.toString()});await c.connect();
    try {
      if(mode==='a_upgrade') {
        setFiles(files.filter(f=>f.slice(0,4)<='0002'));run(target.toString());
        run(target.toString(),path.join(root,'lib/db/scripts/nexusCoreDbSmoke.ts'));
      } else if(mode==='c2_upgrade') {
        setFiles(files.filter(f=>['0000','0001','0002','0004'].includes(f.slice(0,4))));run(target.toString());
        run(target.toString(),path.join(root,'lib/db/scripts/nexusWorkPackageDbSmoke.ts'));
      }
      const prior=(await c.query('select version,checksum from nexus_schema_migrations order by version').catch(()=>({rows:[]}))).rows;
      setFiles(files);run(target.toString()); const replay=run(target.toString());assert.match(replay,/"appliedNow": \[\]/);
      const current=(await c.query('select version,checksum from nexus_schema_migrations order by version')).rows;assert.equal(current.length,6);
      for(const p of prior) assert.equal(current.find(r=>r.version===p.version).checksum,p.checksum);
      fs.appendFileSync(path.join(temp,'migrations',files[0]!), '\n-- synthetic checksum drift\n');run(target.toString(),undefined,'NEXUS_DB_MIGRATION_CHECKSUM_MISMATCH');setFiles(files);
      fs.writeFileSync(path.join(temp,'migrations/0006_synthetic_failure.sql'),"create table p0_must_rollback(id integer); select 1/0;");
      run(target.toString(),undefined,'division by zero');
      assert.equal((await c.query("select to_regclass('p0_must_rollback') as name")).rows[0].name,null);
      assert.equal((await c.query("select count(*)::int n from nexus_schema_migrations where version='0006_synthetic_failure'")).rows[0].n,0);
      console.log(`P0_MIGRATIONS_PASS ${mode} / replay / preserved checksums / failed migration rollback`);
    } finally {await c.end();}
  }
  run('postgresql://example:example@db.example.invalid/nexus',undefined,'NEXUS_DB_MIGRATION_REMOTE_APPROVAL_REQUIRED');
  console.log('NEXUS_P0_MIGRATION_E2E_PASS');
} finally {fs.rmSync(temp,{recursive:true,force:true});await admin.end();}
