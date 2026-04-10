const fs = require('fs');
const path = require('path');

const gradleFilePath = path.join(
  __dirname,
  '../node_modules/react-native-bluetooth-escpos-printer/android/build.gradle'
);

if (!fs.existsSync(gradleFilePath)) {
  console.log('patch-ble-printer: file not found, skipping');
  process.exit(0);
}

// ─── Patch build.gradle ─────────────────────────────────────────────────────

let content = fs.readFileSync(gradleFilePath, 'utf8');

// Detect orphaned preamble: file has content before 'apply plugin:' that isn't a
// valid buildscript block (i.e. the block header was stripped but the body wasn't).
const applyPluginIdx = content.indexOf('apply plugin:');
const hasOrphanedPreamble =
  applyPluginIdx > 0 &&
  !content.slice(0, applyPluginIdx).trim().startsWith('buildscript') &&
  content.slice(0, applyPluginIdx).trim().length > 0;

const needsGradlePatch =
  content.includes('buildscript') ||
  hasOrphanedPreamble ||
  content.includes('jcenter') ||
  /\bcompile\s+(fileTree|group:|'|")/.test(content) ||
  content.includes('compileSdkVersion 27') ||
  content.includes('com.android.support') ||
  (() => {
    const javaFile = path.join(__dirname, '../node_modules/react-native-bluetooth-escpos-printer/android/src/main/java/cn/jystudio/bluetooth/RNBluetoothManagerModule.java');
    return fs.existsSync(javaFile) && fs.readFileSync(javaFile, 'utf8').includes('android.support.v4');
  })();

if (needsGradlePatch) {
  // Remove the entire buildscript block (including any orphaned body left by a partial prior patch).
  // Strategy: strip everything before 'apply plugin:' — the buildscript block always precedes it.
  const applyIdx = content.indexOf('\napply plugin:');
  if (applyIdx !== -1) {
    content = content.slice(applyIdx + 1);
  } else {
    // Fallback: remove via brace-counting for files where apply plugin is on the first line
    content = content.replace(/^buildscript\s*\{[\s\S]*?\n\}\s*\n+/, '');
  }

  // Remove insecure jcenter/http maven lines from repositories block
  content = content.replace(/\s*jcenter\s*\{[^}]*\}\s*\n/g, '\n');
  content = content.replace(/\s*maven\s*\{[^}]*http:\/\/[^}]*\}\s*\n/g, '\n');

  // Replace deprecated `compile` configuration with `implementation`
  content = content.replace(/\bcompile\s+fileTree/g, 'implementation fileTree');
  content = content.replace(/\bcompile\s+group:/g, 'implementation group:');
  content = content.replace(/\bcompile\s+'/g, "implementation '");
  content = content.replace(/\bcompile\s+"/g, 'implementation "');

  // Bump SDK versions
  content = content.replace(/compileSdkVersion\s+\d+/, 'compileSdkVersion 34');
  content = content.replace(/buildToolsVersion\s+"[^"]*"\s*\n/, '');
  content = content.replace(/minSdkVersion\s+\d+/, 'minSdkVersion 21');
  content = content.replace(/targetSdkVersion\s+\d+/, 'targetSdkVersion 34');

  // Replace legacy support library with AndroidX
  content = content.replace(
    /implementation group: 'com\.android\.support'[^\n]+\n/,
    "    implementation 'androidx.core:core:1.12.0'\n"
  );

  fs.writeFileSync(gradleFilePath, content, 'utf8');
  console.log('patch-ble-printer: patched react-native-bluetooth-escpos-printer build.gradle');
} else {
  console.log('patch-ble-printer: build.gradle already patched, skipping');
}

// ─── Fix AndroidX imports in Java source files ──────────────────────────────

const javaFiles = [
  path.join(__dirname, '../node_modules/react-native-bluetooth-escpos-printer/android/src/main/java/cn/jystudio/bluetooth/RNBluetoothManagerModule.java'),
];

for (const javaFile of javaFiles) {
  if (!fs.existsSync(javaFile)) continue;
  let java = fs.readFileSync(javaFile, 'utf8');
  if (!java.includes('android.support.v4')) continue;
  java = java.replace(/import android\.support\.v4\.app\.ActivityCompat;/, 'import androidx.core.app.ActivityCompat;');
  java = java.replace(/import android\.support\.v4\.content\.ContextCompat;/, 'import androidx.core.content.ContextCompat;');
  fs.writeFileSync(javaFile, java, 'utf8');
  console.log('patch-ble-printer: fixed AndroidX imports in ' + path.basename(javaFile));
}

// ─── Inject sendRawData into RNBluetoothEscposPrinterModule ─────────────────

const escposModuleFile = path.join(
  __dirname,
  '../node_modules/react-native-bluetooth-escpos-printer/android/src/main/java/cn/jystudio/bluetooth/escpos/RNBluetoothEscposPrinterModule.java',
);

if (fs.existsSync(escposModuleFile)) {
  let escposJava = fs.readFileSync(escposModuleFile, 'utf8');
  if (!escposJava.includes('sendRawData')) {
    const sendRawDataMethod = `
    @ReactMethod
    public void sendRawData(String base64Data, final Promise promise) {
        try {
            byte[] data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
            if (sendDataByte(data)) {
                promise.resolve(null);
            } else {
                promise.reject("COMMAND_NOT_SEND", "Failed to send raw data - not connected");
            }
        } catch (Exception e) {
            promise.reject(e.getMessage(), e);
        }
    }

`;
    escposJava = escposJava.replace(
      '    private boolean sendDataByte',
      sendRawDataMethod + '    private boolean sendDataByte',
    );
    fs.writeFileSync(escposModuleFile, escposJava, 'utf8');
    console.log('patch-ble-printer: injected sendRawData into RNBluetoothEscposPrinterModule');
  } else {
    console.log('patch-ble-printer: sendRawData already present, skipping');
  }
}
