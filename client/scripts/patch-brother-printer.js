const fs = require('fs');
const path = require('path');

const gradleFilePath = path.join(
  __dirname,
  '../node_modules/react-native-brother-printers/android/build.gradle'
);

if (!fs.existsSync(gradleFilePath)) {
  console.log('patch-brother-printer: file not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(gradleFilePath, 'utf8');

if (!content.includes("apply plugin: 'maven'")) {
  console.log('patch-brother-printer: already patched, skipping');
  process.exit(0);
}

// Remove the legacy 'maven' plugin application — removed in Gradle 7+.
// The maven plugin is only used for the installArchives publishing task,
// which is not needed when consuming the library as a dependency.
content = content.replace(/^apply plugin: 'maven'\n/m, '');

// Remove configureReactNativePom helper and the entire afterEvaluate block
// (both depend on the maven plugin's archives/mavenDeployer APIs).
const cutIndex = content.indexOf('\ndef configureReactNativePom');
if (cutIndex !== -1) {
  content = content.slice(0, cutIndex).trimEnd() + '\n';
}

fs.writeFileSync(gradleFilePath, content, 'utf8');
console.log('patch-brother-printer: removed legacy maven plugin from build.gradle');
