package nl.darkesttimes.muntjes

import android.content.Context
import org.json.JSONObject

/** Wat de app onthoudt: de widget-sleutel, het Firebase-adres en het laatst opgehaalde saldo. */
object Opslag {
    private fun prefs(c: Context) = c.getSharedPreferences("muntjes", Context.MODE_PRIVATE)

    fun sleutel(c: Context): String? = prefs(c).getString("sleutel", null)
    fun zetSleutel(c: Context, s: String) = prefs(c).edit().putString("sleutel", s).apply()

    fun fcm(c: Context): String? = prefs(c).getString("fcm", null)
    fun zetFcm(c: Context, t: String) = prefs(c).edit().putString("fcm", t).apply()

    fun data(c: Context): JSONObject? =
        prefs(c).getString("data", null)?.let { runCatching { JSONObject(it) }.getOrNull() }
    fun zetData(c: Context, j: JSONObject) =
        prefs(c).edit().putString("data", j.toString()).putLong("bijgewerkt", System.currentTimeMillis()).apply()

    fun wis(c: Context) = prefs(c).edit().remove("sleutel").remove("data").apply()
}
