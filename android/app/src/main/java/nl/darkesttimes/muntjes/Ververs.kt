package nl.darkesttimes.muntjes

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/** Haalt het saldo op en tekent de widget opnieuw. Niet op de hoofd-thread aanroepen. */
object Ververs {
    fun direct(c: Context): Boolean {
        val sleutel = Opslag.sleutel(c)
        if (sleutel == null) {
            MuntjesWidget.tekenAlle(c)
            return false
        }
        return try {
            Opslag.zetData(c, Api.verzoek("widget", sleutel = sleutel))
            MuntjesWidget.tekenAlle(c)
            true
        } catch (e: Api.Fout) {
            // Ontkoppeld door een ouder, of het kind bestaat niet meer
            if (e.code == 401 || e.code == 410) Opslag.wis(c)
            MuntjesWidget.tekenAlle(c)
            false
        } catch (e: Exception) {
            false   // geen internet: de widget houdt het laatst bekende saldo
        }
    }

    /** Vangnet naast de pushberichten: elke 15 minuten zelf kijken (vaker mag niet van Android). */
    fun plan(c: Context) {
        val netwerk = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val werk = PeriodicWorkRequestBuilder<VerversWerk>(15, TimeUnit.MINUTES).setConstraints(netwerk).build()
        WorkManager.getInstance(c).enqueueUniquePeriodicWork("ververs", ExistingPeriodicWorkPolicy.KEEP, werk)
    }

    fun stopPlan(c: Context) {
        WorkManager.getInstance(c).cancelUniqueWork("ververs")
    }
}

class VerversWerk(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {
    override suspend fun doWork(): Result {
        withContext(Dispatchers.IO) { Ververs.direct(applicationContext) }
        return Result.success()
    }
}
