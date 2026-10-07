# ==============================================================================
# Tarjuma App — ProGuard/R8 Rules
# ==============================================================================

# Preserve Capacitor Bridge classes (critical for WebView ↔ native communication)
-keep class com.getcapacitor.** { *; }
-keep class com.tarjuma.app.** { *; }

# Keep JavaScript interface classes for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Capacitor plugin classes
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Preserve Cordova compatibility classes
-keep class org.apache.cordova.** { *; }

# Media Session plugin
-keep class io.github.jofr.capacitor.mediasessionplugin.** { *; }

# Preserve line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name (security obfuscation)
-renamesourcefileattribute SourceFile

# Suppress warnings for common third-party libraries
-dontwarn com.google.android.gms.**
-dontwarn org.apache.http.**
-dontwarn android.net.http.**
