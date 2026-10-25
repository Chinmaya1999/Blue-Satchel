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
fun ScanTab(session: Session?, settings: StoreSettings, onLogin: () -> Unit, onCredits: () -> Unit, onResult: (Scan) -> Unit) {
    val ctx = LocalContext.current
    val store = remember { Store(ctx) }
    val scope = rememberCoroutineScope()
    var phase by remember { mutableStateOf(Phase.Idle) }
    var mode by remember { mutableStateOf(modes[0]) }
    var credits by remember { mutableStateOf<Credits?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var askConsent by remember { mutableStateOf(false) }
    LaunchedEffect(session?.token, phase) { session?.let { s -> Api.credits(s.token).onSuccess { credits = it } } }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) phase = Phase.Camera else error = "Camera permission is needed to scan your skin."
    }

    fun startCamera() {
        error = null
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) phase = Phase.Camera
        else permission.launch(Manifest.permission.CAMERA)
    }

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
        Phase.Camera -> CameraScreen(mode.steps, onCancel = { phase = Phase.Idle }, onCaptured = ::analyze, onError = { error = it; phase = Phase.Idle })
        Phase.Analyzing -> AnalyzingScreen()
        Phase.Idle -> ScanIntro(
            mode = mode, onMode = { mode = it }, credits = credits, settings = settings, error = error,
            needsLogin = session == null,
            onStart = {
                if (session == null) onLogin()
                else if (!store.consented) askConsent = true
                else startCamera()
            },
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
                        .onSuccess { store.consented = true; startCamera() }
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
    needsLogin: Boolean, onStart: () -> Unit, onCredits: () -> Unit,
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
        PrimaryButton(if (needsLogin) "Sign in to scan" else "Start ${mode.title.lowercase()} scan", Modifier.fillMaxWidth(), enabled = enabled, onClick = onStart)
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

@Composable
private fun CameraScreen(steps: List<Pair<String, String>>, onCancel: () -> Unit, onCaptured: (Map<String, File>) -> Unit, onError: (String) -> Unit) {
    val ctx = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val capture = remember { ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build() }
    val t by rememberInfiniteTransition(label = "ring").animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "t")
    val sweep by rememberInfiniteTransition(label = "sw").animateFloat(0.15f, 0.85f, infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "s")
    val taken = remember { mutableStateMapOf<String, File>() }
    var step by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    BackHandler { taken.values.forEach { it.delete() }; onCancel() }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            { c ->
                PreviewView(c).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    val future = ProcessCameraProvider.getInstance(c)
                    future.addListener({
                        runCatching {
                            val provider = future.get()
                            val preview = Preview.Builder().build().also { it.surfaceProvider = surfaceProvider }
                            provider.unbindAll()
                            provider.bindToLifecycle(owner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, capture)
                        }.onFailure { onError("Could not open the camera.") }
                    }, ContextCompat.getMainExecutor(c))
                }
            },
            Modifier.fillMaxSize(),
        )
        Canvas(Modifier.fillMaxSize()) { faceFrame(t, sweep) }
        IconButton({ taken.values.forEach { it.delete() }; onCancel() }, Modifier.statusBarsPadding().padding(12.dp).clip(CircleShape).background(Color(0x66000000))) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Color.White)
        }
        Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 36.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            if (steps.size > 1) Text("Photo ${step + 1} of ${steps.size}", color = Dxb.Gold, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
            Text(steps[step].second, color = Color.White, modifier = Modifier.clip(CircleShape).background(Color(0x66000000)).padding(horizontal = 16.dp, vertical = 8.dp))
            Spacer(Modifier.height(20.dp))
            Box(
                Modifier.size(78.dp).clip(CircleShape).border(4.dp, Color.White, CircleShape).padding(7.dp).clip(CircleShape).background(if (busy) androidx.compose.ui.graphics.SolidColor(Dxb.Line) else Dxb.RoseGradient)
                    .clickable(enabled = !busy) {
                        busy = true
                        val file = File.createTempFile("scan", ".jpg", ctx.cacheDir)
                        capture.takePicture(ImageCapture.OutputFileOptions.Builder(file).build(), ContextCompat.getMainExecutor(ctx),
                            object : ImageCapture.OnImageSavedCallback {
                                override fun onImageSaved(r: ImageCapture.OutputFileResults) {
                                    scope.launch {
                                        taken[steps[step].first] = withContext(Dispatchers.Default) { normalize(file) }
                                        if (step + 1 < steps.size) { step++; busy = false } else onCaptured(taken.toMap())
                                    }
                                }
                                override fun onError(e: ImageCaptureException) { busy = false; onError("Could not take the photo.") }
                            })
                    },
            )
        }
    }
}

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
fun ResultScreen(scan: Scan, loader: ImageLoader, onBack: () -> Unit, onProduct: (Product) -> Unit) {
    BackHandler(onBack = onBack)
    val anim = remember { Animatable(0f) }
    LaunchedEffect(scan.id) { anim.animateTo(1f, tween(1400, easing = FastOutSlowInEasing)) }
    LazyColumn(Modifier.fillMaxSize().background(Dxb.Cream), contentPadding = PaddingValues(bottom = 40.dp)) {
        item {
            Column(Modifier.fillMaxWidth().background(Dxb.NightGradient, RoundedCornerShape(bottomStart = 36.dp, bottomEnd = 36.dp)).statusBarsPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onBack, Modifier.clip(CircleShape).background(Color(0x22FFFFFF))) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Color.White) }
                    Spacer(Modifier.weight(1f))
                    Text(scan.createdAt, color = Dxb.Gold, fontSize = 13.sp)
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
        item { Text("Your concerns", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink, modifier = Modifier.padding(20.dp, 24.dp, 20.dp, 10.dp)) }
        items(scan.concerns) { c ->
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

private fun levelColor(level: String) = when (level) { "High" -> Color(0xFFC0504D); "Medium" -> Color(0xFFD99A4E); else -> Dxb.Sage }

@Composable
fun ProductDetail(p: Product, loader: ImageLoader, shopEnabled: Boolean, onBack: () -> Unit, onBag: () -> Unit) {
    val ctx = LocalContext.current
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Dxb.Cream).navigationBarsPadding()) {
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
            p.productUrl.isNotBlank() -> PrimaryButton("View on brand site", Modifier.fillMaxWidth().padding(20.dp)) { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(p.productUrl))) }
            else -> Text("Online ordering opens soon.", color = Dxb.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(20.dp))
        }
    }
}

@Composable
fun HistoryScreen(session: Session, onBack: () -> Unit, onOpen: (Scan) -> Unit) {
    BackHandler(onBack = onBack)
    var scans by remember { mutableStateOf<List<Scan>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { Api.scans(session.token).onSuccess { scans = it }.onFailure { err = it.message } }
    Column(Modifier.fillMaxSize().background(Dxb.Cream).statusBarsPadding().padding(20.dp)) {
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
                        Box(Modifier.size(56.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Text("${s.score}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp) }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) { Text(s.label, fontWeight = FontWeight.SemiBold, color = Dxb.Ink); Text(s.createdAt, color = Dxb.Muted, fontSize = 13.sp) }
                        Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                    }
                }
            }
        }
    }
}
