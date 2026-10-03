plugins { id("com.android.application") }
android {
    namespace = "com.dersprogramim.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.dersprogramim.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 2
        versionName = "1.1"
    }
}

dependencies {
    implementation("com.google.mlkit:text-recognition:16.0.1")
}
