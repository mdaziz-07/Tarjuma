#!/usr/bin/env node

/**
 * Pre-Release Bundle Security Scanner
 * Scans production distribution bundle for leaked secrets, service_role keys,
 * private credentials, or unauthorized API tokens.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist/assets');

console.log('🔒 Running Pre-Release Security Audit on Production Bundle...\n');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: "dist/assets" directory not found. Please run "npm run build" first.');
  process.exit(1);
}

const FORBIDDEN_PATTERNS = [
  { name: 'Supabase Service Role Key', regex: /service_role/i },
  { name: 'Hardcoded Keystore Password', regex: /keyfortarjuma/i },
  { name: 'Hardcoded Admin Password', regex: /myappistarjuma/i },
  { name: 'Cloudflare / AWS Access Key ID', regex: /(?:AKIA|ASIA|AROA)[A-Z0-9]{16}/ },
  { name: 'Cloudflare / AWS Secret Access Key Token', regex: /aws_secret_access_key|r2_secret_key/i },
  { name: 'RSA / OpenSSH Private Key Header', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Cloudinary Secret API Key Reference', regex: /cloudinary:\/\/[0-9]+:[a-zA-Z0-9_-]+/i }
];

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html'));

let totalViolations = 0;
let scannedFilesCount = 0;

for (const file of files) {
  const filePath = path.join(distDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  scannedFilesCount++;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.regex.test(content)) {
      console.error(`🚨 SECURITY VIOLATION in [${file}]:`);
      console.error(`   Found forbidden pattern: "${pattern.name}"`);
      totalViolations++;
    }
  }
}

console.log(`📊 Scanned ${scannedFilesCount} bundle assets in dist/assets`);

if (totalViolations > 0) {
  console.error(`\n❌ SECURITY AUDIT FAILED: ${totalViolations} potential secret leaks detected!`);
  process.exit(1);
} else {
  console.log('\n✅ SECURITY AUDIT PASSED: Zero secret leaks, private keys, or service_role tokens found in production bundle.');
  process.exit(0);
}
