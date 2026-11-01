package nl.darkesttimes.muntjes

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * De kind-app (Muntjes) in een eigen venster, zonder Chrome.
 * Zo is Muntjes voor Family Link een losse app die altijd mag, terwijl Chrome een tijdslimiet houdt.
 * Alleen Muntjes en het spelletje openen; andere sites worden geblokkeerd, zodat de app
 * geen achterdeur naar internet is.
 */
class KindActivity : Activity() {
    private lateinit var web: WebView

    companion object {
        /** Adressen die in de app mogen openen. */
        private val TOEGESTAAN = setOf("muntjes.darkesttimes.nl", "spelletjes.darkesttimes.nl")
        fun magOpenen(uri: Uri?) = uri != null && uri.scheme == "https" && uri.host in TOEGESTAAN

        private const val GEEN_INTERNET = """<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:sans-serif;background:#F3F5F8;color:#1D2733;text-align:center}
div{padding:24px}h1{font-size:26px;margin:12px 0}p{font-size:18px;color:#5B6675}
a{display:inline-block;margin-top:18px;padding:14px 28px;border-radius:16px;background:#2457C5;color:#fff;font-size:20px;font-weight:bold;text-decoration:none}
</style></head><body><div><div style="font-size:64px">📶</div><h1>Geen internet</h1>
<p>Muntjes kan de server niet bereiken.</p><a href="https://muntjes.darkesttimes.nl/">Opnieuw proberen</a></div></body></html>"""
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false   // geluidjes bij een goedgekeurd klusje
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            setSupportMultipleWindows(false)           // window.open opent in hetzelfde venster
            javaScriptCanOpenWindowsAutomatically = false
            userAgentString = "$userAgentString MuntjesApp/${Update.huidigeVersie(this@KindActivity)}"
        }
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                // true = niet openen. Alleen onze eigen sites; al het andere blijft dicht.
                return !magOpenen(req.url)
            }

            override fun onReceivedError(view: WebView, req: WebResourceRequest, err: WebResourceError) {
                if (req.isForMainFrame) view.loadDataWithBaseURL("https://muntjes.darkesttimes.nl/", GEEN_INTERNET, "text/html", "utf-8", null)
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                // Voor de zekerheid: kwam er toch een ander adres binnen (bijv. via een doorverwijzing), dan terug naar Muntjes.
                val uri = url?.let { Uri.parse(it) }
                if (uri != null && uri.scheme != "data" && uri.scheme != "about" && !magOpenen(uri)) {
                    view.stopLoading()
                    view.loadUrl(Api.BASIS)
                }
            }
        }
        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl(Api.BASIS)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        // Terug in het spel → terug naar Muntjes; in Muntjes zelf → app naar de achtergrond.
        if (web.canGoBack()) web.goBack() else moveTaskToBack(true)
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
