package nl.darkesttimes.muntjes

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

/** Ontvangt het seintje van de server ("er is iets veranderd") en ververst meteen de widget. */
class PushService : FirebaseMessagingService() {
    override fun onMessageReceived(bericht: RemoteMessage) {
        // Draait al op een achtergrond-thread, dus direct ophalen mag.
        Ververs.direct(applicationContext)
    }

    override fun onNewToken(token: String) {
        Opslag.zetFcm(this, token)
        val sleutel = Opslag.sleutel(this) ?: return
        runCatching { Api.verzoek("widget_fcm", JSONObject().put("fcm", token), sleutel) }
    }
}
