package com.dxbbeauty.app.ui

import android.annotation.SuppressLint
import android.graphics.Color as AColor
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.webkit.WebViewAssetLoader
import com.dxbbeauty.app.Scan
import org.json.JSONArray
import org.json.JSONObject

/** concern label -> (face anchor on the 3D head, callout on the left side of the face?) */
private val anchors = listOf(
    Triple("Dark Circles", "templeL", true),
    Triple("Redness", "cheekR", false),
    Triple("Spots", "jawL", true),
    Triple("Texture", "templeR", false),
    Triple("Pores", "chin", false),
)

private fun calloutsJson(scan: Scan?): String? {
    if (scan == null) return null
    val arr = JSONArray()
    anchors.forEach { (label, at, left) ->
        scan.concerns.firstOrNull { it.label.equals(label, true) }?.let {
            arr.put(JSONObject().put("at", at).put("label", label.uppercase()).put("value", "${it.level} · ${it.severity}").put("left", left))
        }
    }
    return if (arr.length() >= 2) arr.toString() else null
}

/**
 * The website's 3D hero (real female head model, scan beam, landmarks, callouts) rendered by three.js in a WebView
 * from bundled assets, so it works offline. If WebGL fails the simple wireframe hologram stays visible instead.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun Hero3D(scan: Scan?, modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    var ready by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    var web by remember { mutableStateOf<WebView?>(null) }
    val json = remember(scan?.id) { calloutsJson(scan) }

    LaunchedEffect(ready, json) {
        if (ready && json != null) web?.evaluateJavascript("window.setCallouts(${JSONObject.quote(json)})", null)
    }
    val owner = LocalLifecycleOwner.current
    // Keyed on the lifecycle owner only: `web` is read at call time, so the effect must not restart (and destroy the view) when it is set.
    DisposableEffect(owner) {
        val obs = LifecycleEventObserver { _, e ->
            when (e) {
                Lifecycle.Event.ON_PAUSE -> { web?.evaluateJavascript("window.dxb && dxb.pause()", null); web?.onPause() }
                Lifecycle.Event.ON_RESUME -> { web?.onResume(); web?.evaluateJavascript("window.dxb && dxb.resume()", null) }
                else -> Unit
            }
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs); web?.destroy() }
    }

    Box(modifier) {
        if (!ready || failed) HologramHead(Modifier.fillMaxSize(), interactive = true)
        if (!failed) {
            AndroidView(
                factory = { c ->
                    val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(c)).build()
                    WebView(c).apply {
                        setBackgroundColor(AColor.TRANSPARENT)
                        overScrollMode = WebView.OVER_SCROLL_NEVER
                        isVerticalScrollBarEnabled = false
                        isHorizontalScrollBarEnabled = false
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.allowFileAccess = false
                        settings.allowContentAccess = false
                        webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                                loader.shouldInterceptRequest(request.url)
                        }
                        addJavascriptInterface(object {
                            @JavascriptInterface fun onReady() { post { ready = true } }
                            @JavascriptInterface fun onFail() { post { failed = true } }
                        }, "Android")
                        loadUrl("https://appassets.androidplatform.net/assets/hero/index.html")
                        web = this
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )
            // Horizontal drags rotate the head; vertical drags fall through so the screen still scrolls.
            Box(
                Modifier.fillMaxSize().pointerInput(Unit) {
                    detectHorizontalDragGestures { _, dx -> web?.evaluateJavascript("window.dxb && dxb.drag($dx, 0)", null) }
                },
            )
        }
    }
}
