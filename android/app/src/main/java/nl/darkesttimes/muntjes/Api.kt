package nl.darkesttimes.muntjes

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Praat met api.php op muntjes.darkesttimes.nl. Altijd vanaf een achtergrond-thread aanroepen. */
object Api {
    const val BASIS = "https://muntjes.darkesttimes.nl/"

    class Fout(val code: Int, bericht: String) : Exception(bericht)

    fun verzoek(actie: String, body: JSONObject? = null, sleutel: String? = null): JSONObject {
        val c = URL(BASIS + "api.php?actie=" + actie).openConnection() as HttpURLConnection
        c.connectTimeout = 10_000
        c.readTimeout = 15_000
        if (sleutel != null) c.setRequestProperty("X-Widget", sleutel)
        if (body != null) {
            c.requestMethod = "POST"
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        try {
            val code = c.responseCode
            val stroom = if (code in 200..299) c.inputStream else c.errorStream
            val tekst = stroom?.bufferedReader()?.use { it.readText() } ?: ""
            val json = runCatching { JSONObject(tekst) }.getOrElse { JSONObject() }
            if (code !in 200..299) throw Fout(code, json.optString("fout", "Er ging iets mis ($code)."))
            return json
        } finally {
            c.disconnect()
        }
    }
}
