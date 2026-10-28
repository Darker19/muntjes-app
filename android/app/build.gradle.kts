plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

// Elke build in GitHub Actions krijgt een hoger versienummer, zodat de tablet de update accepteert.
val bouwNummer = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "nl.darkesttimes.muntjes"
    compileSdk = 35

    defaultConfig {
        applicationId = "nl.darkesttimes.muntjes"
        minSdk = 26
        targetSdk = 35
        versionCode = bouwNummer
        versionName = "1.$bouwNummer"
    }

    // De sleutel komt uit de GitHub-geheimen. Altijd dezelfde sleutel, anders kan een update niet over de oude heen.
    signingConfigs {
        create("release") {
            storeFile = file("release.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = "muntjes"
            keyPassword = System.getenv("KEYSTORE_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.core:core-ktx:1.13.1")
}
