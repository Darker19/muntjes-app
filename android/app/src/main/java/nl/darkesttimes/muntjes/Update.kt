package nl.darkesttimes.muntjes

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Zelf updaten: kijkt bij GitHub of er een nieuwere widget-app is, downloadt de APK
 * en opent het installatiescherm van Android (dat vraagt altijd om een bevestiging).
 */
object Update {
    private const val NIEUWSTE = "https://api.github.com/repos/Darker19/muntjes-app/releases/latest"
    private const val ELKE = 6 * 60 * 60 * 1000L   // hoe vaak de achtergrond-controle naar GitHub kijkt

    data class Info(val versie: Long, val naam: String, val url: String)

    private fun prefs(c: Context) = c.getSharedPreferences("muntjes", Context.MODE_PRIVATE)

    fun huidigeVersie(c: Context): Long {
        val p = c.packageManager.getPackageInfo(c.packageName, 0)
        @Suppress("DEPRECATION")
        return if (Build.VERSION.SDK_INT >= 28) p.longVersionCode else p.versionCode.toLong()
    }

    /** De bekende nieuwere versie, of null als deze app al de nieuwste is. */
    fun beschikbaar(c: Context): Info? {
        val p = prefs(c)
        val versie = p.getLong("updateVersie", 0)
        val url = p.getString("updateUrl", null) ?: return null
        return if (versie > huidigeVersie(c)) Info(versie, p.getString("updateNaam", "") ?: "", url) else null
    }

    /** Vraagt GitHub naar de nieuwste versie (niet op de hoofd-thread). */
    fun controleer(c: Context, altijd: Boolean = false): Info? {
        val p = prefs(c)
        val nu = System.currentTimeMillis()
        if (!altijd && nu - p.getLong("updateGecontroleerd", 0) < ELKE) return beschikbaar(c)
        try {
            val conn = URL(NIEUWSTE).openConnection() as HttpURLConnection
            conn.setRequestProperty("Accept", "application/vnd.github+json")
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            if (conn.responseCode == 200) {
                val j = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val versie = j.optString("tag_name").removePrefix("widget-").toLongOrNull()
                val bestanden = j.optJSONArray("assets")
                var url: String? = null
                for (i in 0 until (bestanden?.length() ?: 0)) {
                    val b = bestanden!!.getJSONObject(i)
                    if (b.optString("name") == "muntjes-widget.apk") url = b.optString("browser_download_url")
                }
                if (versie != null && url != null) {
                    p.edit().putLong("updateVersie", versie).putString("updateUrl", url)
                        .putString("updateNaam", j.optString("name")).apply()
                }
            }
            conn.disconnect()
            p.edit().putLong("updateGecontroleerd", nu).apply()
        } catch (e: Exception) {
            // geen internet of GitHub even niet bereikbaar: later opnieuw
        }
        return beschikbaar(c)
    }

    private fun apkBestand(c: Context) = File(c.cacheDir, "updates/muntjes-widget.apk")

    fun download(c: Context, info: Info): File {
        val f = apkBestand(c)
        f.parentFile?.mkdirs()
        val conn = URL(info.url).openConnection() as HttpURLConnection   // GitHub stuurt door naar de download
        conn.connectTimeout = 15_000
        conn.readTimeout = 60_000
        try {
            if (conn.responseCode != 200) throw Exception("Downloaden mislukt (${conn.responseCode}).")
            conn.inputStream.use { inp -> f.outputStream().use { inp.copyTo(it) } }
        } finally {
            conn.disconnect()
        }
        return f
    }

    /** Mag deze app installaties starten? Zo niet, dan eerst toestaan bij "Onbekende apps installeren". */
    fun magInstalleren(c: Context) = Build.VERSION.SDK_INT < 26 || c.packageManager.canRequestPackageInstalls()

    fun installeer(a: Activity, f: File) {
        val uri = FileProvider.getUriForFile(a, a.packageName + ".bestanden", f)
        a.startActivity(Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
    }

    /** Opruimen na een geslaagde update. */
    fun ruimOp(c: Context) {
        if (beschikbaar(c) == null) apkBestand(c).delete()
    }
}
