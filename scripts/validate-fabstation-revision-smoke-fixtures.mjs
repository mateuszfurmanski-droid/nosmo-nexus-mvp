import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'artifacts/nosmo-nexus/public/fixtures');
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const fail = (message) => { throw new Error(`FABSTATION_REVISION_FIXTURE_BLOCKED: ${message}`); };

const fixtures = {
  ifcR2: {
    path: resolve(root, 'nexus_fabstation_smoke_r2.ifc'),
    bytes: 474,
    sha256: 'f9bac5b926087d2c40718b53cbd4506fefd0c1d96fe147616f7fb62e5ac72510',
  },
  kssR2: {
    path: resolve(root, 'nexus_fabstation_smoke_r2.kss'),
    bytes: 135,
    sha256: 'c0504ca7bfb7bba8b0c8c4165d6955e7a6db07c99b2ff25addb75afa8bf9fb0f',
  },
  kssCorrection: {
    path: resolve(root, 'nexus_fabstation_smoke_correction.kss'),
    bytes: 146,
    sha256: 'a19d16b0e995845ca817754218b6849a6e54687a6de1a1e4b6d6d01de850eb6a',
  },
};

for (const [name, fixture] of Object.entries(fixtures)) {
  const bytes = readFileSync(fixture.path);
  if (bytes.byteLength !== fixture.bytes) fail(`${name} byte length ${bytes.byteLength} != ${fixture.bytes}`);
  if (sha256(bytes) !== fixture.sha256) fail(`${name} SHA-256 drifted`);
}

const ifcR2 = readFileSync(fixtures.ifcR2.path, 'utf8');
if (!/FILE_SCHEMA\s*\(\s*\(\s*'IFC2X3'\s*\)\s*\)/i.test(ifcR2)) fail('revision B IFC2X3 schema marker missing');
if (!ifcR2.includes("IFCPROJECT('0NXSFSPROJECT000000001'")) fail('revision B IFCPROJECT GlobalId drifted');
if (!ifcR2.includes("#200=IFCBEAM('0NXSFSBEAM000000000001'")) fail('revision B IFCBEAM GlobalId/STEP ID drifted');
if (!ifcR2.includes("'B1007 Rev 1','Revised beam'")) fail('revision B bounded metadata change missing');

const validateKss = (text, expectedRevision, label) => {
  const lines = text.trimEnd().split(/\r?\n/);
  if (lines[0] !== 'KISS,1.0,NOSMO Nexus') fail(`${label} KISS identification drifted`);
  if (lines.some((line) => line.length > 254)) fail(`${label} contains a KSS line longer than 254 characters`);
  const detail = lines.find((line) => line.startsWith('D,B1007,'));
  if (!detail) fail(`${label} B1007 detail row missing`);
  const fields = detail.split(',');
  if (fields[2] !== expectedRevision) fail(`${label} expected B1007 revision ${expectedRevision}, got ${fields[2]}`);
  if (fields[3] !== 'B1007') fail(`${label} assembly mark drifted`);
};

validateKss(readFileSync(fixtures.kssR2.path, 'utf8'), '1', 'revision B KSS');
validateKss(readFileSync(fixtures.kssCorrection.path, 'utf8'), '0', 'same-revision correction KSS');

console.log('FABSTATION_REVISION_SMOKE_FIXTURES_PASS');
