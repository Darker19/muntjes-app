package nl.darkesttimes.muntjes

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
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

        private fun maakViews(c: Context): RemoteViews {
            val v = RemoteViews(c.packageName, R.layout.widget)
            val sleutel = Opslag.sleutel(c)
            val d = Opslag.data(c)

            // Tikken: niet gekoppeld → koppelen; wel gekoppeld → de kind-app openen.
            val tik = if (sleutel == null) Intent(c, MainActivity::class.java)
            else Intent(Intent.ACTION_VIEW, Uri.parse(Api.BASIS))
            v.setOnClickPendingIntent(R.id.widget, PendingIntent.getActivity(c, 0, tik,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))

            if (sleutel == null || d == null) {
                v.setTextViewText(R.id.naam, "Muntjes")
                v.setTextViewText(R.id.saldo, "–")
                v.setTextViewText(R.id.woord, "")
                v.setTextViewText(R.id.regel, if (sleutel == null) "Tik om te koppelen" else "Even laden…")
                v.setImageViewResource(R.id.mascotte, R.drawable.munt)
                v.setImageViewResource(R.id.eenheid, R.drawable.munt)
                v.setInt(R.id.achtergrond, "setColorFilter", Color.WHITE)
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
            return v
        }
    }
}
