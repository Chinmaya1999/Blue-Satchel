package com.dxbbeauty.app.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.ImageLoader
import coil.compose.AsyncImage
import com.dxbbeauty.app.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

private enum class Phase { Idle, Camera, Analyzing }

private class ScanMode(val key: String, val title: String, val blurb: String, val steps: List<Pair<String, String>>)

private val modes = listOf(
    ScanMode("quick", "Quick", "1 selfie · fastest", listOf("front" to "Look straight at the camera")),
    ScanMode("detailed", "Detailed", "3 angles · most accurate", listOf("front" to "Look straight at the camera", "left" to "Turn your head to the left", "right" to "Turn your head to the right")),
    ScanMode("focus", "Focus", "1 selfie · targeted", listOf("front" to "Look straight at the camera")),
)

@Composable
fun ScanTab(session: Session?, settings: StoreSettings, uploadRequest: Boolean, onUploadHandled: () -> Unit, onFullscreen: (Boolean) -> Unit, onLogin: () -> Unit, onCredits: () -> Unit, onResult: (Scan) -> Unit) {
    val ctx = LocalContext.current
    val store = remember { Store(ctx) }
    val scope = rememberCoroutineScope()
    var phase by remember { mutableStateOf(Phase.Idle) }
    var mode by remember { mutableStateOf(modes[0]) }
    var credits by remember { mutableStateOf<Credits?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var askConsent by remember { mutableStateOf(false) }
    // The camera and analysing screens take over the whole display (the tab bar is hidden meanwhile).
    LaunchedEffect(phase) { onFullscreen(phase != Phase.Idle) }
    DisposableEffect(Unit) { onDispose { onFullscreen(false) } }
    var pendingAfterConsent by remember { mutableStateOf<(() -> Unit)?>(null) }
    LaunchedEffect(session?.token, phase) { session?.let { s -> Api.credits(s.token).onSuccess { credits = it } } }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) phase = Phase.Camera else error = "Camera permission is needed to scan your skin."
    }

    fun startCamera() {
        error = null
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) phase = Phase.Camera
        else permission.launch(Manifest.permission.CAMERA)
    }

    // Photo-library upload (no storage permission needed: the system picker hands back just the chosen photos).
    fun fromUris(uris: List<Uri>) {
        val keys = mode.steps.map { it.first }
        if (uris.size < keys.size) { error = "Please choose ${keys.size} photo${if (keys.size == 1) "" else "s"} (${keys.joinToString(", ")})."; return }
        phase = Phase.Analyzing
        scope.launch {
            val files = withContext(Dispatchers.IO) { keys.zip(uris).associate { (k, u) -> k to copyToCache(ctx, u) } }
            if (files.values.any { it == null }) { error = "Could not read that photo."; phase = Phase.Idle; return@launch }
            @Suppress("UNCHECKED_CAST") val ready = files as Map<String, File>
            val normalized = ready.mapValues { (k, v) -> prepareGalleryPhoto(v, tight = mode.key == "detailed" && k == "front") }
            Api.scan(session!!.token, mode.key, normalized)
                .onSuccess { onResult(it); phase = Phase.Idle }
                .onFailure { error = it.message; phase = Phase.Idle }
            normalized.values.forEach { it.delete() }
        }
    }
    val pickOne = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { u -> if (u != null) fromUris(listOf(u)) }
    val pickThree = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(3)) { l -> if (l.isNotEmpty()) fromUris(l) }
    fun startUpload() {
        error = null
        val req = androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
        if (mode.steps.size > 1) pickThree.launch(req) else pickOne.launch(req)
    }
    fun gate(after: () -> Unit) {
        if (session == null) onLogin() else if (!store.consented) { pendingAfterConsent = after; askConsent = true } else after()
    }
    LaunchedEffect(uploadRequest) { if (uploadRequest) { onUploadHandled(); gate(::startUpload) } }

    fun analyze(files: Map<String, File>) {
        phase = Phase.Analyzing
        scope.launch {
            Api.scan(session!!.token, mode.key, files)
                .onSuccess { onResult(it); phase = Phase.Idle }
                .onFailure { error = it.message; phase = Phase.Idle }
            files.values.forEach { it.delete() }
        }
    }

    when (phase) {
        Phase.Camera -> AutoCameraScreen(mode.key, mode.steps, onCancel = { phase = Phase.Idle }, onCaptured = ::analyze, onError = { error = it; phase = Phase.Idle })
        Phase.Analyzing -> AnalyzingScreen()
        Phase.Idle -> ScanIntro(
            mode = mode, onMode = { mode = it }, credits = credits, settings = settings, error = error,
            needsLogin = session == null,
            onStart = { gate(::startCamera) },
            onUpload = { gate(::startUpload) },
            onCredits = { if (session == null) onLogin() else onCredits() },
        )
    }

    if (askConsent) AlertDialog(
        onDismissRequest = { askConsent = false },
        containerColor = Color.White,
        title = { Text("Photo analysis", fontFamily = Dxb.Serif) },
        text = { Text("Your selfie is sent securely to DXB Beauty to analyse your skin. By continuing you agree to the photo analysis terms and privacy policy.") },
        confirmButton = {
            TextButton({
                askConsent = false
                scope.launch {
                    Api.acceptConsent(session!!.token)
                        .onSuccess { store.consented = true; (pendingAfterConsent ?: ::startCamera)(); pendingAfterConsent = null }
                        .onFailure { error = it.message }
                }
            }) { Text("I agree", color = Dxb.Rose, fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton({ askConsent = false }) { Text("Cancel", color = Dxb.Muted) } },
    )
}

@Composable
private fun ScanIntro(
    mode: ScanMode, onMode: (ScanMode) -> Unit, credits: Credits?, settings: StoreSettings, error: String?,
    needsLogin: Boolean, onStart: () -> Unit, onUpload: () -> Unit, onCredits: () -> Unit,
) {
    val t by rememberInfiniteTransition(label = "ring").animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "t")
    val sweep by rememberInfiniteTransition(label = "sw").animateFloat(0.15f, 0.85f, infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "s")
    val enabled = settings.enabled[mode.key] != false
    Column(Modifier.fillMaxSize().background(Dxb.NightGradient).statusBarsPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("AI Skin Scan", Modifier.weight(1f), color = Color.White, style = MaterialTheme.typography.headlineMedium)
            credits?.let {
                Text(if (it.unlimited) "∞ credits" else "${it.balance} credits", color = Dxb.Gold, fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                    modifier = Modifier.clip(CircleShape).background(Color(0x22FFFFFF)).clickable(onClick = onCredits).padding(horizontal = 12.dp, vertical = 7.dp))
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            modes.forEach { m ->
                val sel = m.key == mode.key
                val cost = credits?.costs?.get(m.key)
                Column(
                    Modifier.weight(1f).clip(RoundedCornerShape(18.dp)).background(if (sel) Dxb.Rose else Color(0x22FFFFFF)).clickable { onMode(m) }.padding(vertical = 10.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(m.title, color = Color.White, fontWeight = FontWeight.Bold)
                    Text(if (cost == null) m.steps.size.let { if (it == 1) "1 photo" else "$it photos" } else if (cost == 0) "Free" else "$cost credits", color = if (sel) Color.White else Dxb.Gold, fontSize = 11.sp)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(mode.blurb, color = Dxb.Gold, fontSize = 13.sp)
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(280.dp)) { faceFrame(t, sweep) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("Good light", "No makeup", "Face forward").forEach {
                Text(it, color = Color.White, fontSize = 12.sp, modifier = Modifier.clip(CircleShape).background(Color(0x22FFFFFF)).padding(horizontal = 12.dp, vertical = 7.dp))
            }
        }
        error?.let { Text(it, color = Color(0xFFFFB4AB), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 14.dp), style = MaterialTheme.typography.bodyMedium) }
        if (!enabled) Text("${mode.title} scan is unavailable right now.", color = Color(0xFFFFB4AB), modifier = Modifier.padding(top = 14.dp))
        Spacer(Modifier.height(20.dp))
        PrimaryButton(if (needsLogin) "Sign in to scan" else "Scan Your Face", Modifier.fillMaxWidth(), enabled = enabled, leading = { Icon(Icons.Rounded.CameraAlt, null, tint = Color.White, modifier = Modifier.size(20.dp)) }, onClick = onStart)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth().height(52.dp).clip(CircleShape).background(Color.White).clickable(enabled = enabled, onClick = onUpload), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.PhotoLibrary, null, tint = Dxb.Ink, modifier = Modifier.size(20.dp)); Spacer(Modifier.width(8.dp))
            Text(if (mode.steps.size > 1) "Upload 3 Photos" else "Upload Photo", color = Dxb.Ink, fontWeight = FontWeight.SemiBold)
        }
        Text("Buy scan credits", color = Dxb.Gold, modifier = Modifier.padding(top = 14.dp).clickable(onClick = onCredits))
        Spacer(Modifier.height(96.dp))
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.faceFrame(t: Float, sweep: Float) {
    val c = center
    val w = 190.dp.toPx(); val h = 250.dp.toPx()
    for (i in 0 until 2) {
        val p = (t + i * 0.5f) % 1f
        drawOval(Dxb.Gold.copy(alpha = (1f - p) * 0.4f), Offset(c.x - w / 2 - p * 40.dp.toPx(), c.y - h / 2 - p * 40.dp.toPx()), Size(w + p * 80.dp.toPx(), h + p * 80.dp.toPx()), style = Stroke(1.5.dp.toPx()))
    }
    drawOval(Color.White.copy(alpha = 0.9f), Offset(c.x - w / 2, c.y - h / 2), Size(w, h), style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(18f, 14f))))
    val y = c.y - h / 2 + h * sweep
    drawLine(Brush.horizontalGradient(listOf(Color.Transparent, Dxb.Gold, Color.Transparent), c.x - w / 2, c.x + w / 2), Offset(c.x - w / 2, y), Offset(c.x + w / 2, y), 2.5.dp.toPx())
}

fun copyToCache(ctx: android.content.Context, uri: Uri): File? = runCatching {
    val f = File.createTempFile("pick", ".jpg", ctx.cacheDir)
    ctx.contentResolver.openInputStream(uri)?.use { i -> f.outputStream().use { o -> i.copyTo(o) } } ?: return null
    f
}.getOrNull()

/** Applies the EXIF rotation and shrinks the photo so uploads stay small. */
private fun normalize(file: File): File {
    val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, opts)
    var sample = 1
    while (maxOf(opts.outWidth, opts.outHeight) / sample > 2000) sample *= 2
    val bmp = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return file
    val rotation = when (ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
    }
    val out = if (rotation == 0f) bmp else Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, Matrix().apply { postRotate(rotation) }, true)
    file.outputStream().use { out.compress(Bitmap.CompressFormat.JPEG, 88, it) }
    return file
}

@Composable
private fun AnalyzingScreen() {
    val t by rememberInfiniteTransition(label = "an").animateFloat(0f, 1f, infiniteRepeatable(tween(1800, easing = LinearEasing)), label = "t")
    val steps = listOf("Mapping your face…", "Reading pores & texture…", "Checking redness & spots…", "Building your routine…")
    var step by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { while (true) { kotlinx.coroutines.delay(2200); step = (step + 1) % steps.size } }
    Column(Modifier.fillMaxSize().background(Dxb.NightGradient), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(Modifier.size(180.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                drawCircle(Dxb.Gold.copy(alpha = 0.2f), style = Stroke(2.dp.toPx()))
                drawArc(Dxb.RoseGradient, t * 360f, 100f, false, style = Stroke(5.dp.toPx(), cap = StrokeCap.Round))
            }
            Text("✦", color = Dxb.Gold, fontSize = 40.sp)
        }
        Spacer(Modifier.height(28.dp))
        Text("Analysing your skin", color = Color.White, style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(8.dp))
        Text(steps[step], color = Dxb.Gold)
    }
}

@Composable
fun ResultScreen(scan: Scan, userName: String, loader: ImageLoader, onBack: () -> Unit, onProduct: (Product) -> Unit, onChat: (String) -> Unit, onDerms: () -> Unit) {
    BackHandler(onBack = onBack)
    val anim = remember { Animatable(0f) }
    LaunchedEffect(scan.id) { anim.animateTo(1f, tween(1400, easing = FastOutSlowInEasing)) }
    LazyColumn(Modifier.fillMaxSize().background(Dxb.PageGradient), contentPadding = PaddingValues(bottom = 40.dp)) {
        item {
            Column(Modifier.fillMaxWidth().background(Dxb.NightGradient, RoundedCornerShape(bottomStart = 36.dp, bottomEnd = 36.dp)).statusBarsPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onBack, Modifier.clip(CircleShape).background(Color(0x22FFFFFF))) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Color.White) }
                    Spacer(Modifier.weight(1f))
                    Text(scan.createdAt, color = Dxb.Gold, fontSize = 13.sp, modifier = Modifier.padding(end = 10.dp))
                    DownloadMenu(scan, userName, loader)
                }
                Spacer(Modifier.height(8.dp))
                Box(Modifier.size(190.dp), contentAlignment = Alignment.Center) {
                    Canvas(Modifier.fillMaxSize().padding(8.dp)) {
                        drawArc(Color(0x22FFFFFF), 135f, 270f, false, style = Stroke(14.dp.toPx(), cap = StrokeCap.Round))
                        drawArc(Dxb.RoseGradient, 135f, 270f * (scan.score / 100f) * anim.value, false, style = Stroke(14.dp.toPx(), cap = StrokeCap.Round))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${(scan.score * anim.value).toInt()}", color = Color.White, fontFamily = Dxb.Serif, fontSize = 54.sp)
                        Text("Skin health", color = Dxb.Gold, fontSize = 12.sp)
                    }
                }
                Text(scan.label, color = Color.White, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(14.dp))
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ResultAction("Skin advisor", Icons.Rounded.SmartToy, Modifier.weight(1f)) { onChat("advisor") }
                ResultAction("K-beauty", Icons.Rounded.Spa, Modifier.weight(1f)) { onChat("kbeauty") }
                ResultAction("Derms near me", Icons.Rounded.LocationOn, Modifier.weight(1f), onDerms)
            }
        }
        val hasAi = scan.raw?.let { it.has("rupamOutput") || it.has("perfectCorpOutput") } == true
        if (scan.leftPhoto.isNotBlank() || scan.rightPhoto.isNotBlank()) item {
            Column(Modifier.padding(top = 22.dp)) {
                Text("Your photos", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink, modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp))
                Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("Front" to scan.photo, "Left" to scan.leftPhoto, "Right" to scan.rightPhoto).filter { it.second.isNotBlank() }.forEach { (n, u) ->
                        Box(Modifier.weight(1f).aspectRatio(0.8f).clip(RoundedCornerShape(18.dp)).background(Dxb.Blush)) {
                            AsyncImage(u, n, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            Text(n, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp).clip(CircleShape).background(Color(0x99000000)).padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
            }
        }
        fullAnalysis(scan, loader)
        if (!hasAi) item { Text("Your concerns", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink, modifier = Modifier.padding(20.dp, 24.dp, 20.dp, 10.dp)) }
        if (!hasAi) items(scan.concerns) { c ->
            Column(Modifier.padding(horizontal = 20.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(16.dp)) {
                Row {
                    Text(c.label, Modifier.weight(1f), fontWeight = FontWeight.SemiBold, color = Dxb.Ink)
                    Text(c.level, color = levelColor(c.level), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
                Spacer(Modifier.height(10.dp))
                Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(Dxb.Blush)) {
                    Box(Modifier.fillMaxHeight().fillMaxWidth(c.severity / 100f * anim.value).clip(CircleShape).background(levelColor(c.level)))
                }
            }
        }
        if (scan.products.isNotEmpty()) {
            item { Text("Recommended for you", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink, modifier = Modifier.padding(20.dp, 24.dp, 20.dp, 10.dp)) }
            item {
                androidx.compose.foundation.lazy.LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(scan.products) { p ->
                        Column(Modifier.width(150.dp).clip(RoundedCornerShape(20.dp)).background(Color.White).clickable { onProduct(p) }.padding(10.dp)) {
                            AsyncImage(p.imageUrl, p.name, loader, Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(14.dp)).background(Dxb.BlushSoft), contentScale = ContentScale.Fit)
                            Spacer(Modifier.height(8.dp))
                            Text(p.name, maxLines = 2, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Dxb.Ink, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            Text(formatPrice(p), color = Dxb.RoseDeep, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}

fun levelColor(level: String) = when (level) { "High" -> Color(0xFFC0504D); "Medium" -> Color(0xFFD99A4E); else -> Dxb.Sage }

@Composable
private fun ResultAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(20.dp)).background(Color.White).clickable(onClick = onClick).padding(vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Color.White, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.height(6.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Dxb.Ink)
    }
}

@Composable
fun ProductDetail(p: Product, loader: ImageLoader, shopEnabled: Boolean, onBack: () -> Unit, onBag: () -> Unit, onWeb: (String) -> Unit) {
    val ctx = LocalContext.current
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Dxb.PageGradient).navigationBarsPadding()) {
        Box(Modifier.fillMaxWidth().weight(1f)) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Box(Modifier.fillMaxWidth().height(380.dp).background(Dxb.Blush, RoundedCornerShape(bottomStart = 36.dp, bottomEnd = 36.dp)), contentAlignment = Alignment.Center) {
                    AsyncImage(p.imageUrl, p.name, loader, Modifier.fillMaxSize().statusBarsPadding().padding(40.dp), contentScale = ContentScale.Fit)
                }
                Column(Modifier.padding(24.dp)) {
                    Text(p.brand.uppercase(), color = Dxb.Rose, style = MaterialTheme.typography.labelSmall)
                    Spacer(Modifier.height(6.dp))
                    Text(p.name, style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(formatPrice(p), color = Dxb.RoseDeep, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                        p.compareAt?.takeIf { it > p.price }?.let { Text("  ${formatPrice(p.copy(price = it))}", color = Dxb.Muted, textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough) }
                        Spacer(Modifier.weight(1f))
                        if (p.rating > 0) { Icon(Icons.Rounded.Star, null, tint = Color(0xFFE6A23C), modifier = Modifier.size(18.dp)); Text(" %.1f".format(p.rating), color = Dxb.Muted) }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(p.description, color = Dxb.Ink.copy(alpha = 0.8f), style = MaterialTheme.typography.bodyLarge)
                }
            }
            IconButton(onBack, Modifier.statusBarsPadding().padding(12.dp).clip(CircleShape).background(Color.White)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Dxb.Ink) }
        }
        var added by remember { mutableStateOf(false) }
        when {
            shopEnabled && !added -> PrimaryButton("Add to bag", Modifier.fillMaxWidth().padding(20.dp)) { Cart.add(p); added = true }
            shopEnabled -> PrimaryButton("View bag (${Cart.count})", Modifier.fillMaxWidth().padding(20.dp), onClick = onBag)
            p.productUrl.isNotBlank() -> PrimaryButton("View on brand site", Modifier.fillMaxWidth().padding(20.dp)) { onWeb(p.productUrl) }
            else -> Text("Online ordering opens soon.", color = Dxb.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(20.dp))
        }
    }
}

@Composable
fun HistoryScreen(session: Session, loader: ImageLoader, onBack: () -> Unit, onOpen: (Scan) -> Unit) {
    BackHandler(onBack = onBack)
    var scans by remember { mutableStateOf<List<Scan>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { Api.scans(session.token).onSuccess { scans = it }.onFailure { err = it.message } }
    Column(Modifier.fillMaxSize().background(Dxb.PageGradient).statusBarsPadding().padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onBack, Modifier.clip(CircleShape).background(Color.White)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Dxb.Ink) }
            Spacer(Modifier.width(12.dp))
            Text("Scan history", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        }
        Spacer(Modifier.height(16.dp))
        when {
            err != null -> Text(err!!, color = Dxb.Muted)
            scans == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
            scans!!.isEmpty() -> Text("No scans yet — take your first scan!", color = Dxb.Muted)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(scans!!) { s ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).clickable { onOpen(s) }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        ScanThumb(s, loader, 64)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) { Text("${s.score}/100 · ${s.label}", fontWeight = FontWeight.SemiBold, color = Dxb.Ink); Text(s.createdAt + " · " + s.mode.replaceFirstChar { it.uppercase() } + " scan", color = Dxb.Muted, fontSize = 13.sp) }
                        Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                    }
                }
            }
        }
    }
}

/** A scan's photo as a round thumbnail with its score badge; falls back to the score alone when there is no photo. */
@Composable
fun ScanThumb(s: Scan, loader: ImageLoader, size: Int) {
    Box(Modifier.size(size.dp)) {
        if (s.photo.isNotBlank()) AsyncImage(s.photo, "Scan photo", loader, Modifier.fillMaxSize().clip(CircleShape).background(Dxb.Blush), contentScale = ContentScale.Crop)
        else Box(Modifier.fillMaxSize().clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Text("${s.score}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size * 0.35f).sp) }
        if (s.photo.isNotBlank()) Text("${s.score}", color = Color.White, fontSize = (size * 0.2f).sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.BottomEnd).clip(CircleShape).background(Dxb.Rose).padding(horizontal = 6.dp, vertical = 2.dp))
    }
}

/** "Download" on a result: a PDF report or the raw API data (JSON), saved to Downloads and offered to share. */
@Composable
private fun DownloadMenu(scan: Scan, userName: String, loader: ImageLoader) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var open by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    fun done(uri: Uri?, mime: String, what: String) {
        busy = false
        if (uri == null) android.widget.Toast.makeText(ctx, "Couldn't save the $what.", android.widget.Toast.LENGTH_LONG).show()
        else { android.widget.Toast.makeText(ctx, "$what saved to Downloads", android.widget.Toast.LENGTH_SHORT).show(); shareFile(ctx, uri, mime) }
    }
    Box {
        Row(
            Modifier.clip(CircleShape).background(Color(0x26FFFFFF)).clickable(enabled = !busy) { open = true }.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp) else Icon(Icons.Rounded.FileDownload, null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp)); Text(if (busy) "Preparing…" else "Download", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
        DropdownMenu(open, { open = false }, containerColor = Color.White) {
            DropdownMenuItem(
                leadingIcon = { Icon(Icons.Rounded.PictureAsPdf, null, tint = Dxb.Rose) },
                text = { Column { Text("PDF report", fontWeight = FontWeight.SemiBold); Text("Photo, scores and suggestions", fontSize = 11.sp, color = Dxb.Muted) } },
                onClick = { open = false; busy = true; scope.launch { done(exportPdf(ctx, scan, userName, loader), "application/pdf", "PDF report") } },
            )
            DropdownMenuItem(
                leadingIcon = { Icon(Icons.Rounded.DataObject, null, tint = Dxb.Rose) },
                text = { Column { Text("API data (JSON)", fontWeight = FontWeight.SemiBold); Text("Everything the AI returned", fontSize = 11.sp, color = Dxb.Muted) } },
                onClick = { open = false; done(exportJson(ctx, scan), "application/json", "JSON data") },
            )
        }
    }
}
