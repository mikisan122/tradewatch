/**
 * Abre TradeWatch en todos los emuladores Android conectados:
 *  - Emulador de teléfono  → app TradeWatch
 *  - Emulador Wear OS      → Smartwatch Virtual
 * Crea los túneles adb (Metro + sincronización) e instala Expo Go si falta.
 *
 * Uso: npm run devices   (con "npx expo start" y "npm run sync" ya corriendo)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const METRO_PORT = Number(process.env.METRO_PORT) || 8081;
const SYNC_PORT = Number(process.env.SYNC_PORT) || 8090;

function findAdb() {
  const roots = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME, path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'), path.join(os.homedir(), 'Library', 'Android', 'sdk'), path.join(os.homedir(), 'Android', 'Sdk')].filter(Boolean);
  for (const r of roots) {
    for (const sub of [path.join(r, 'platform-tools'), path.join(r, 'Sdk', 'platform-tools')]) {
      const exe = path.join(sub, process.platform === 'win32' ? 'adb.exe' : 'adb');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'adb';
}

const ADB = findAdb();
const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8' }).trim();

function expoGoApk() {
  const dir = path.join(os.homedir(), '.expo', 'android-apk-cache');
  if (!fs.existsSync(dir)) return null;
  const apk = fs.readdirSync(dir).filter((f) => f.endsWith('.apk')).sort().pop();
  return apk ? path.join(dir, apk) : null;
}

const devices = adb('devices')
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.trim().split(/\s+/))
  .filter((p) => p[1] === 'device')
  .map((p) => p[0]);

if (!devices.length) {
  console.log('No hay emuladores encendidos. Inicia el del teléfono y el del reloj (Wear OS) desde Android Studio.');
  process.exit(1);
}

for (const id of devices) {
  const isWatch = adb('-s', id, 'shell', 'getprop', 'ro.build.characteristics').includes('watch');
  const label = isWatch ? 'RELOJ (Wear OS)' : 'TELÉFONO';
  adb('-s', id, 'reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`);
  adb('-s', id, 'reverse', `tcp:${SYNC_PORT}`, `tcp:${SYNC_PORT}`);

  const hasExpoGo = adb('-s', id, 'shell', 'pm', 'list', 'packages', 'host.exp.exponent').includes('host.exp.exponent');
  if (!hasExpoGo) {
    const apk = expoGoApk();
    if (!apk) {
      console.log(`${id} (${label}): falta Expo Go. Ejecuta una vez "npx expo start --android" para descargarlo.`);
      continue;
    }
    console.log(`${id} (${label}): instalando Expo Go…`);
    adb('-s', id, 'install', '-r', apk);
  }

  const url = `exp://localhost:${METRO_PORT}?__expo_disable_fab=1&__expo_disable_onboarding=1`;
  adb('-s', id, 'shell', 'am', 'force-stop', 'host.exp.exponent');
  adb('-s', id, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`);
  console.log(`${id}: abriendo ${label} → ${url}`);
}
