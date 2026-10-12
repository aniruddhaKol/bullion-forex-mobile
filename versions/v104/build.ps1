$ErrorActionPreference = 'Stop'
foreach ($name in @('SIGNING_KEYSTORE','SIGNING_ALIAS','SIGNING_STORE_PASSWORD','SIGNING_KEY_PASSWORD')) { if (![Environment]::GetEnvironmentVariable($name)) { throw "Set $name locally before signing. Existing app upgrades require the original signing key." } }
$ErrorActionPreference = 'Stop'
$sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$buildTools = Join-Path $sdkPath 'build-tools\36.0.0'
if (!$env:JAVA_HOME) { throw 'Set JAVA_HOME to your JDK installation' }
$env:SKIP_JDK_VERSION_CHECK = '1'
$env:JAVA_OPTS = '--enable-native-access=ALL-UNNAMED'
function RequireSuccess($step) { if ($LASTEXITCODE -ne 0) { throw "$step failed ($LASTEXITCODE)" } }
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force -Path classes,dex | Out-Null
    & "$buildTools\aapt.exe" package -f -m -M AndroidManifest.xml -I "$sdkPath\platforms\android-36\android.jar" -S res -J src
    RequireSuccess 'Resource generation'
    & "$env:JAVA_HOME\bin\javac.exe" --release 8 -classpath "$sdkPath\platforms\android-36\android.jar" -d classes (Get-ChildItem -LiteralPath src -Recurse -Filter '*.java' | ForEach-Object FullName)
    RequireSuccess 'Java compilation'
    & "$buildTools\d8.bat" --lib "$sdkPath\platforms\android-36\android.jar" --min-api 26 --output dex (Get-ChildItem -LiteralPath 'classes\com\bullionforex\app' -Filter '*.class' | ForEach-Object FullName)
    RequireSuccess 'DEX compilation'
    & "$buildTools\aapt.exe" package -f -M AndroidManifest.xml -I "$sdkPath\platforms\android-36\android.jar" -S res -A assets -F unsigned.apk
    RequireSuccess 'APK packaging'
    Push-Location dex
    try {
        & "$buildTools\aapt.exe" add -f '..\unsigned.apk' classes.dex
        RequireSuccess 'DEX packaging'
    } finally { Pop-Location }
    & "$buildTools\zipalign.exe" -f -p 4 unsigned.apk aligned.apk
    RequireSuccess 'APK alignment'
    & "$buildTools\apksigner.bat" sign --ks $env:SIGNING_KEYSTORE --ks-key-alias $env:SIGNING_ALIAS --ks-pass env:SIGNING_STORE_PASSWORD --key-pass env:SIGNING_KEY_PASSWORD --out Bullion-Forex.apk aligned.apk
    RequireSuccess 'APK signing'
    & "$buildTools\apksigner.bat" verify --verbose Bullion-Forex.apk
    RequireSuccess 'Signature verification'
} finally { Pop-Location }
