import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixturesRoot = resolve(process.cwd(), 'artifacts/nosmo-nexus/public/fixtures');
const ifcPath = resolve(fixturesRoot, 'nexus_fabstation_smoke.ifc');
const kssPath = resolve(fixturesRoot, 'nexus_fabstation_smoke.kss');

const expected = {
  ifc: {
    bytes: 431,
    sha256: 'a99150194945261c278c41e397375ec97aeae9c9864127eb1a557f6bf3255e52',
  },
  kss: {
    bytes: 135,
    sha256: '5fb4daec88a5b1105818ebe844bdf9214fe8ecb34104803d6e543730833f0e70',
  },
};

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const fail = (message) => {
  throw new Error(`FABSTATION_SMOKE_FIXTURE_BLOCKED: ${message}`);
};

const ifc = readFileSync(ifcPath);
const kss = readFileSync(kssPath);
const ifcText = ifc.toString('utf8');
const kssText = kss.toString('utf8');

if (ifc.byteLength !== expected.ifc.bytes) fail(`IFC byte length ${ifc.byteLength} != ${expected.ifc.bytes}`);
if (sha256(ifc) !== expected.ifc.sha256) fail('IFC SHA-256 drifted');
if (!ifcText.includes('ISO-10303-21')) fail('IFC STEP header missing');
if (!/FILE_SCHEMA\s*\(\s*\(\s*'IFC2X3'\s*\)\s*\)/i.test(ifcText)) fail('IFC2X3 schema marker missing');
if (!ifcText.includes("IFCPROJECT('0NXSFSPROJECT000000001'")) fail('IFCPROJECT GlobalId drifted');
if (!ifcText.includes("IFCBEAM('0NXSFSBEAM000000000001'")) fail('IFCBEAM GlobalId drifted');

if (kss.byteLength !== expected.kss.bytes) fail(`KSS byte length ${kss.byteLength} != ${expected.kss.bytes}`);
if (sha256(kss) !== expected.kss.sha256) fail('KSS SHA-256 drifted');
const kssLines = kssText.trimEnd().split(/\r?\n/);
if (kssLines[0] !== 'KISS,1.0,NOSMO Nexus') fail('KSS identification line drifted');
if (!kssLines.some((line) => line.startsWith('H,NXS-FS-SMOKE,'))) fail('KSS header line missing');
if (!kssLines.some((line) => line.startsWith('D,B1007,0,B1007,B1007,1,W,18X40,A992,3000,PRIMED,BEAM'))) {
  fail('KSS detail line missing');
}
if (kssLines.some((line) => line.length > 254)) fail('KSS contains a line longer than 254 characters');

console.log('FABSTATION_SMOKE_FIXTURES_PASS');
