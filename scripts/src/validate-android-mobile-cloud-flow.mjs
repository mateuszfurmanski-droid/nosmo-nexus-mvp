import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message ?? `Missing required marker: ${value}`);
};
const forbidText = (source, value, message) => {
  if (source.includes(value)) throw new Error(message ?? `Forbidden marker present: ${value}`);
};

const auth = read('artifacts/api-server/src/routes/auth.ts');
const manifest = read('native/nexus-work-mode-native/app/src/main/AndroidManifest.xml');
const session = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/NexusMobileSession.java');
const authCallback = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/MobileAuthResultActivity.java');
const cloud = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/NexusCloudUploadClient.java');
const cloudUi = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/CloudEvidenceActivity.java');
const handoffCallback = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/HandoffResultActivity.java');
const bindingStore = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/EvidenceBindingStore.java');
const shortcutActivity = read('native/nexus-work-mode-native/app/src/main/java/tech/nosmo/nexus/workmode/CloudEvidenceShortcutActivity.java');

requireText(auth, 'router.get("/mobile-auth/start"', 'mobile auth start route missing');
requireText(auth, 'const callbackUrl = getOidcCallbackUrl(req);', 'mobile auth must reuse canonical HTTPS callback');
requireText(auth, 'code_challenge_method: "S256"', 'mobile auth must require PKCE S256');
requireText(auth, 'MOBILE_AUTH_CALLBACK = "nosmo-nexus-workmode://auth-result"', 'fixed Android auth callback missing');
requireText(auth, 'redirect_uri !== expectedRedirectUri', 'token exchange must reject alternate redirect URI');
requireText(auth, 'NEXUS_MOBILE_AUTH_REDIRECT_MISMATCH', 'redirect mismatch fail-closed code missing');
forbidText(auth, 'appendQueryParameter("token"', 'server must never put Nexus session token in a callback URL');

requireText(manifest, 'android.permission.INTERNET', 'native Cloud upload requires explicit INTERNET permission');
requireText(manifest, 'android:host="auth-result"', 'mobile auth callback activity is not registered');
requireText(manifest, 'android:name=".CloudEvidenceActivity"', 'Cloud evidence activity missing from manifest');
requireText(manifest, 'android:name=".CloudEvidenceActivity"\n            android:exported="false"', 'Cloud evidence activity must not be exported');
requireText(manifest, 'android:name=".CloudEvidenceShortcutActivity"', 'Cloud evidence shortcut trampoline missing');

requireText(session, 'AndroidKeyStore', 'mobile session must be backed by Android Keystore');
requireText(session, 'AES/GCM/NoPadding', 'mobile session must use authenticated encryption');
requireText(session, 'mobileSessionCiphertext', 'encrypted session persistence missing');
requireText(session, '/api/mobile-auth/start', 'native PKCE start route missing');
requireText(session, '/api/mobile-auth/token-exchange', 'native token exchange route missing');
requireText(session, 'redirect_uri', 'native token exchange must submit exact provider redirect URI');
requireText(session, '/api/mobile-auth/logout', 'native server-side logout path missing');
requireText(session, 'Authorization", "Bearer " + token', 'mobile logout must revoke the exact bearer session');
requireText(session, 'local session retained', 'logout transport failure must not pretend the local session was revoked');
forbidText(session, '.putString("token"', 'raw session token must not be persisted under a plaintext token key');

requireText(authCallback, 'callbackMatchesPendingState', 'auth deep link must match app-owned state');
requireText(authCallback, 'exchangeAuthorizationCode', 'auth deep link must exchange code through HTTPS server endpoint');
requireText(authCallback, 'CloudEvidenceActivity.class', 'successful mobile auth must return to Cloud evidence surface');
forbidText(authCallback, 'getQueryParameter("token")', 'auth deep link must never accept a Nexus session token');

requireText(cloud, '"/api/nexus/cloud/files"', 'Android must use canonical Nexus Cloud endpoint');
requireText(cloud, 'Authorization", "Bearer " + sessionToken', 'Cloud upload must use existing Bearer Nexus session');
requireText(cloud, 'Idempotency-Key', 'Cloud upload must use stable idempotency key');
requireText(cloud, '25L * 1024L * 1024L', 'Android must enforce canonical 25 MiB Cloud limit');
requireText(cloud, 'providerWriteConfirmed', 'Cloud success must require provider confirmation');
requireText(cloud, 'projectMemoryCommitted', 'Cloud success must require canonical Project Memory commit');
requireText(cloud, 'TRANSFER_CONFIRMED', 'Cloud client must expose explicit confirmed outcome');
forbidText(cloud, 'drive.google.com', 'APK must not contain its own Google Drive network implementation');
forbidText(cloud, 'GoogleAuthorizationCodeFlow', 'APK must not contain provider OAuth implementation');

requireText(handoffCallback, 'EvidenceBindingStore.bindConfirmedMetadata', 'metadata receipt must persist exact routing outside mutable queue');
requireText(handoffCallback, 'handoffProjectId', 'metadata receipt compatibility project field missing');
requireText(handoffCallback, 'handoffWorldId', 'metadata receipt compatibility world field missing');
requireText(handoffCallback, 'publishCloudEvidenceShortcut', 'confirmed raw evidence must publish durable launcher access');
requireText(handoffCallback, 'pushDynamicShortcut', 'Cloud evidence shortcut must be attached to the existing app icon');
requireText(handoffCallback, 'CloudEvidenceShortcutActivity.class', 'shortcut must use parameter-free local trampoline');
requireText(handoffCallback, 'openCloudEvidence', 'confirmed raw evidence must enter explicit Cloud review surface');
forbidText(handoffCallback, 'item.put(EVIDENCE_STATE_KEY, "TRANSFER_CONFIRMED")', 'metadata callback must never confirm raw binary transfer');

requireText(bindingStore, 'nexus_work_mode_v060_evidence_bindings', 'evidence routing must use an app-private sidecar store');
requireText(bindingStore, 'recordCloudCommit', 'canonical Cloud receipt sidecar persistence missing');
requireText(bindingStore, 'pruneToCandidates', 'orphaned local evidence bindings must be prunable after local candidate removal');

requireText(cloudUi, 'HANDOFF_DONE', 'Cloud upload must require confirmed metadata handoff');
requireText(cloudUi, 'EvidenceBindingStore.get', 'Cloud upload must consume receipt-bound routing sidecar');
requireText(cloudUi, 'binding.projectId', 'Cloud upload must use receipt-bound project, not mutable global project');
requireText(cloudUi, 'binding.worldId', 'Cloud upload must use receipt-bound world, not mutable global world');
requireText(cloudUi, 'pruneToCandidates', 'Cloud evidence UI must prune orphaned sidecar entries');
requireText(cloudUi, 'android-evidence-', 'Cloud upload idempotency key must be stable per candidate');
requireText(cloudUi, 'Outcome.TRANSFER_CONFIRMED', 'UI may confirm evidence only from canonical Cloud result');
requireText(cloudUi, 'recordCloudCommit', 'canonical Cloud receipt must survive mutable queue rewrites');
requireText(cloudUi, 'Sign out Nexus mobile session', 'Cloud UI must expose server-confirmed mobile logout');

requireText(shortcutActivity, 'CloudEvidenceActivity.class', 'launcher shortcut trampoline must only route to local Cloud evidence UI');
forbidText(shortcutActivity, 'getStringExtra', 'shortcut trampoline must not accept caller authority extras');
forbidText(shortcutActivity, 'getData()', 'shortcut trampoline must not accept caller routing data');

console.log('Android mobile auth + canonical Cloud evidence validator: PASS');
