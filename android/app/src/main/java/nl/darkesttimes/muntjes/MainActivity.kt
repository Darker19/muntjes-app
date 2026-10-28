package nl.darkesttimes.muntjes

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import kotlin.concurrent.thread

/** Koppelen aan een kind (met de pincode van een ouder) en uitleg om de widget te plaatsen. */
class MainActivity : Activity() {
    private lateinit var lijst: LinearLayout
    private lateinit var status: TextView

    override fun onResume() {
        super.onResume()
        Update.ruimOp(this)
        toon()
        // Bij openen altijd even bij GitHub kijken of er een nieuwe versie is.
        val wasBekend = Update.beschikbaar(this)?.versie
        thread {
            val nieuw = Update.controleer(this, altijd = true)?.versie
            if (nieuw != wasBekend) runOnUiThread {
                toon()
                MuntjesWidget.tekenAlle(this)
            }
        }
    }

    private fun dp(x: Int) = (x * resources.displayMetrics.density).toInt()

    private fun tekst(t: String, grootte: Float = 16f, vet: Boolean = false) = TextView(this).apply {
        text = t
        textSize = grootte
        setTextColor(0xFF1D2733.toInt())
        if (vet) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(8), 0, dp(8))
    }

    private fun knop(t: String, actie: () -> Unit) = Button(this).apply {
        text = t
        isAllCaps = false
        textSize = 16f
        setOnClickListener { actie() }
    }

    private fun toon() {
        lijst = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(32), dp(24), dp(24))
        }
        setContentView(ScrollView(this).apply { addView(lijst) })
        lijst.addView(tekst("Muntjes widget", 26f, true))
        status = tekst("", 15f).apply { setTextColor(0xFF8C1D16.toInt()) }
        Update.beschikbaar(this)?.let { toonUpdate(it) }
        if (Opslag.sleutel(this) == null) toonKoppelen() else toonGekoppeld()
        lijst.addView(tekst("Versie 1.${Update.huidigeVersie(this)}", 13f).apply { setTextColor(0xFF5B6675.toInt()) })
    }

    private fun toonUpdate(info: Update.Info) {
        lijst.addView(tekst("Er is een nieuwe versie (1.${info.versie})", 18f, true).apply { setTextColor(0xFF2457C5.toInt()) })
        val updateStatus = tekst("", 15f)
        lijst.addView(knop("Update installeren") {
            if (!Update.magInstalleren(this)) {
                updateStatus.text = "Sta eerst toe dat deze app updates mag installeren (schakelaar aanzetten), en tik dan nog een keer op Update installeren."
                startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
                return@knop
            }
            updateStatus.text = "Bezig met downloaden…"
            thread {
                try {
                    val f = Update.download(this, info)
                    runOnUiThread {
                        updateStatus.text = "Tik op Installeren of Bijwerken in het volgende scherm."
                        Update.installeer(this, f)
                    }
                } catch (e: Exception) {
                    runOnUiThread { updateStatus.text = e.message ?: "Downloaden is niet gelukt." }
                }
            }
        })
        lijst.addView(updateStatus)
        lijst.addView(tekst("Lukt het niet? Zet in Family Link \"Apps uit onbekende bronnen\" even aan.", 13f).apply { setTextColor(0xFF5B6675.toInt()) })
    }

    private fun toonKoppelen() {
        lijst.addView(tekst("Koppel deze tablet aan een kind. Daarna laat de widget het saldo van dat kind zien."))
        val pin = EditText(this).apply {
            hint = "Pincode van papa of mama"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            textSize = 20f
        }
        lijst.addView(pin)
        lijst.addView(knop("Verder") {
            status.text = "Even geduld…"
            val code = pin.text.toString()
            thread {
                try {
                    val r = Api.verzoek("widget_start", JSONObject().put("pin", code))
                    runOnUiThread { toonKinderen(r) }
                } catch (e: Exception) {
                    runOnUiThread { status.text = e.message ?: "Geen verbinding met de server." }
                }
            }
        })
        lijst.addView(status)
    }

    private fun toonKinderen(r: JSONObject) {
        val kids = r.optJSONArray("kids")
        lijst.removeViews(1, lijst.childCount - 1)
        if (kids == null || kids.length() == 0) {
            lijst.addView(tekst("Er zijn nog geen kinderen. Voeg ze eerst toe in de app (Beheer)."))
            lijst.addView(knop("Terug") { toon() })
            return
        }
        lijst.addView(tekst("Van wie is deze tablet?", 18f, true))
        for (i in 0 until kids.length()) {
            val k = kids.getJSONObject(i)
            lijst.addView(knop(k.getString("naam")) { koppel(r.getString("kaartje"), k.getString("id")) })
        }
        lijst.addView(status)
    }

    private fun koppel(kaartje: String, kid: String) {
        status.text = "Bezig met koppelen…"
        // Eerst het Firebase-adres ophalen, zodat de server seintjes kan sturen.
        FirebaseMessaging.getInstance().token.addOnCompleteListener { taak ->
            val fcm = if (taak.isSuccessful) taak.result else null
            thread {
                try {
                    val body = JSONObject().put("kaartje", kaartje).put("kid", kid).put("fcm", fcm ?: JSONObject.NULL)
                    val r = Api.verzoek("widget_koppel", body)
                    Opslag.zetSleutel(this, r.getString("sleutel"))
                    if (fcm != null) Opslag.zetFcm(this, fcm)
                    Ververs.direct(this)
                    Ververs.plan(this)
                    runOnUiThread { toon() }
                } catch (e: Exception) {
                    runOnUiThread { status.text = e.message ?: "Koppelen is niet gelukt." }
                }
            }
        }
    }

    private fun toonGekoppeld() {
        val naam = Opslag.data(this)?.optString("naam") ?: "…"
        lijst.addView(tekst("Gekoppeld aan $naam ✓", 20f, true))
        lijst.addView(tekst("Widget op het beginscherm zetten:", 17f, true))
        lijst.addView(tekst("1. Houd een lege plek op het beginscherm ingedrukt.\n2. Tik op Widgets en zoek \"Muntjes widget\".\n3. Houd de widget vast en sleep hem naar het beginscherm."))
        lijst.addView(tekst("Snel bijwerken op een Samsung-tablet:", 17f, true))
        lijst.addView(tekst("Tik hieronder op App-instellingen › Batterij en kies \"Onbeperkt\". Anders zet Samsung de widget in de slaapstand en komen nieuwe muntjes pas later binnen."))
        lijst.addView(knop("App-instellingen") {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        })
        lijst.addView(knop("Widget nu verversen") {
            thread {
                val gelukt = Ververs.direct(this)
                runOnUiThread {
                    Toast.makeText(this, if (gelukt) "Bijgewerkt" else "Niet gelukt: geen verbinding?", Toast.LENGTH_SHORT).show()
                    toon()
                }
            }
        })
        lijst.addView(knop("Muntjes openen") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Api.BASIS)))
        })
        lijst.addView(knop("Ontkoppelen") {
            AlertDialog.Builder(this)
                .setMessage("Widget ontkoppelen van $naam?")
                .setPositiveButton("Ontkoppelen") { _, _ ->
                    val sleutel = Opslag.sleutel(this)
                    thread {
                        runCatching { Api.verzoek("widget_ontkoppel", JSONObject(), sleutel) }
                        Opslag.wis(this)
                        MuntjesWidget.tekenAlle(this)
                        runOnUiThread { toon() }
                    }
                }
                .setNegativeButton("Annuleren", null)
                .show()
        })
    }
}
