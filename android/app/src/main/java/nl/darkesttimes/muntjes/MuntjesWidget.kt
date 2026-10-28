package nl.darkesttimes.muntjes

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.widget.RemoteViews
import kotlin.concurrent.thread

class MuntjesWidget : AppWidgetProvider() {

    override fun onUpdate(c: Context, mgr: AppWidgetManager, ids: IntArray) {
        tekenAlle(c)
        Ververs.plan(c)
        val klaar = goAsync()
        thread {
            try { Ververs.direct(c) } finally { klaar.finish() }
        }
    }

    override fun onEnabled(c: Context) = Ververs.plan(c)

    override fun onDisabled(c: Context) = Ververs.stopPlan(c)

    companion object {
        fun tekenAlle(c: Context) {
            val mgr = AppWidgetManager.getInstance(c)
            val ids = mgr.getAppWidgetIds(ComponentName(c, MuntjesWidget::class.java))
            if (ids.isNotEmpty()) mgr.updateAppWidget(ids, maakViews(c))
        }

        private fun kleur(tekst: String?, standaard: Int) =
            runCatching { Color.parseColor(tekst) }.getOrDefault(standaard)

        // Sterren naast het saldo en de gekozen taken van deze week, bijv. "Zelf aankleden ★★★☆☆".
        private fun toonTaken(v: RemoteViews, d: org.json.JSONObject) {
            val heeftTaken = d.optBoolean("heeftTaken")
            val zichtbaar = if (heeftTaken) View.VISIBLE else View.GONE
            v.setViewVisibility(R.id.ster_icoon, zichtbaar)
            v.setViewVisibility(R.id.sterren, zichtbaar)
            v.setViewVisibility(R.id.taken, zichtbaar)
            v.setTextViewText(R.id.sterren, d.optInt("sterren").toString())

            val regels = listOf(R.id.taak1, R.id.taak2, R.id.taak3)
            val taken = d.optJSONArray("taken")
            val aantal = taken?.length() ?: 0
            regels.forEachIndexed { i, id ->
                when {
                    i < aantal -> {
                        val t = taken!!.getJSONObject(i)
                        v.setTextViewText(id, taakTekst(t.optString("naam"), t.optInt("sterren"), t.optInt("doel"), t.optBoolean("klaar")))
                        v.setViewVisibility(id, View.VISIBLE)
                    }
                    i == 0 && heeftTaken -> {
                        v.setTextViewText(id, "Nog geen taken gekozen voor deze week")
                        v.setViewVisibility(id, View.VISIBLE)
                    }
                    else -> v.setViewVisibility(id, View.GONE)
                }
            }
        }

        private fun taakTekst(naam: String, n: Int, doel: Int, klaar: Boolean): CharSequence {
            val t = SpannableStringBuilder(naam).append("  ")
            fun kleur(tekst: String, k: Int) {
                val begin = t.length
                t.append(tekst)
                t.setSpan(ForegroundColorSpan(k), begin, t.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            kleur("★".repeat(n), Color.parseColor("#F59E0B"))
            kleur("☆".repeat((doel - n).coerceAtLeast(0)), Color.parseColor("#AEB6C1"))
            if (klaar) kleur("  ✓ voltooid", Color.parseColor("#22784A"))
            return t
        }

        private fun maakViews(c: Context): RemoteViews {
            val v = RemoteViews(c.packageName, R.layout.widget)
            val sleutel = Opslag.sleutel(c)
            val d = Opslag.data(c)

            // Tikken: niet gekoppeld → koppelen; wel gekoppeld → de kind-app openen.
            val tik = if (sleutel == null) Intent(c, MainActivity::class.java)
            else Intent(Intent.ACTION_VIEW, Uri.parse(Api.BASIS))
            v.setOnClickPendingIntent(R.id.widget, PendingIntent.getActivity(c, 0, tik,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))

            // Nieuwe versie van de widget-app? Label "Update" → tik opent de app met de update-knop.
            val update = Update.beschikbaar(c) != null
            v.setViewVisibility(R.id.update, if (update) View.VISIBLE else View.GONE)
            if (update) {
                v.setOnClickPendingIntent(R.id.update, PendingIntent.getActivity(c, 1, Intent(c, MainActivity::class.java),
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            }

            if (sleutel == null || d == null) {
                v.setTextViewText(R.id.naam, "Muntjes")
                v.setTextViewText(R.id.saldo, "–")
                v.setTextViewText(R.id.woord, "")
                v.setTextViewText(R.id.regel, if (sleutel == null) "Tik om te koppelen" else "Even laden…")
                v.setImageViewResource(R.id.mascotte, R.drawable.munt)
                v.setImageViewResource(R.id.eenheid, R.drawable.munt)
                v.setInt(R.id.achtergrond, "setColorFilter", Color.WHITE)
                v.setViewVisibility(R.id.ster_icoon, View.GONE)
                v.setViewVisibility(R.id.sterren, View.GONE)
                v.setViewVisibility(R.id.taken, View.GONE)
                return v
            }

            val thema = d.optString("thema", "geen")
            val (mascotte, eenheid, een, veel) = when (thema) {
                "eenhoorn" -> listOf(R.drawable.mascotte_eenhoorn, R.drawable.hart, "hartje", "hartjes")
                "dino" -> listOf(R.drawable.mascotte_dino, R.drawable.vlees, "stukje vlees", "stukjes vlees")
                else -> listOf(R.drawable.munt, R.drawable.munt, "muntje", "muntjes")
            }
            val saldo = d.optInt("saldo")
            val open = d.optInt("open")

            v.setImageViewResource(R.id.mascotte, mascotte as Int)
            v.setImageViewResource(R.id.eenheid, eenheid as Int)
            v.setInt(R.id.achtergrond, "setColorFilter", kleur(d.optString("zacht"), Color.WHITE))
            v.setTextViewText(R.id.naam, d.optString("naam"))
            v.setTextColor(R.id.naam, kleur(d.optString("kleur"), Color.DKGRAY))
            v.setTextViewText(R.id.saldo, saldo.toString())
            v.setTextViewText(R.id.woord, if (saldo == 1) een as String else veel as String)
            v.setTextViewText(R.id.regel, when {
                open == 1 -> "1 aanvraag wacht op goedkeuring"
                open > 1 -> "$open aanvragen wachten op goedkeuring"
                else -> "Deze week ${d.optInt("week")} van ${d.optInt("maxWeek", 7)} verdiend"
            })
            toonTaken(v, d)
            return v
        }
    }
}
