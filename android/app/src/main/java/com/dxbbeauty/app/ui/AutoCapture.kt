package com.dxbbeauty.app.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.MediaActionSound
import android.speech.tts.TextToSpeech
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.min

// Thresholds mirror the website's guided capture (client/src/pages/ScanCapture.jsx) so the AI providers accept the photos.
private const val ANALYSE_EVERY_MS = 250L
private const val HOLD_MS = 800L
private const val MIN_BRIGHTNESS = 40
private const val MAX_BRIGHTNESS = 245
private const val MAX_DRIFT = 0.05f          // face-centre movement between checks, as a fraction of the frame
private const val FRONT_MIN_WIDTH = 0.5f     // detailed scan: the provider wants the face to fill most of the shot
private const val QUICK_MIN_WIDTH = 0.3f     // quick / focus scan: a whole face with margin
private const val SIDE_MIN_WIDTH = 0.12f
private const val MAX_WIDTH = 0.85f
private const val FRONT_MAX_YAW = 12f
private const val SIDE_MIN_YAW = 18f
private const val SIDE_MAX_YAW = 55f
const val OUTPUT_SIZE = 1280                 // providers reject images whose short side is under ~1080px
private const val FACE_CROP_RATIO = 0.78f

private enum class Posture { Searching, Align, Dim, Bright, Turn, Hold, Locking }

private class Verdict(val posture: Posture, val caption: String, val voice: String)

private class Look(val box: FloatArray /* cx, cy, w (normalised to the upright frame) */, val yaw: Float, val faces: Int, val brightness: Int)

private fun judge(look: Look?, step: String, quick: Boolean, leftSign: Int, steady: Boolean): Verdict {
    if (look == null || look.faces == 0) return Verdict(Posture.Searching, "No face found — look at the camera", "I can't see your face. Please look at the camera.")
    if (look.faces > 1) return Verdict(Posture.Align, "Only one face please", "Only one face please.")
    if (look.brightness < MIN_BRIGHTNESS) return Verdict(Posture.Dim, "Too dark — move to better light", "It's too dark. Please move to better lighting.")
    if (look.brightness > MAX_BRIGHTNESS) return Verdict(Posture.Bright, "Too bright — step back a little", "Too much direct light. Step back a little.")
    val (cx, cy, w) = look.box.let { Triple(it[0], it[1], it[2]) }
    val minW = if (step == "front") (if (quick) QUICK_MIN_WIDTH else FRONT_MIN_WIDTH) else SIDE_MIN_WIDTH
    if (w < minW) return Verdict(Posture.Align, "Move closer", "Move a little closer.")
    if (w > MAX_WIDTH) return Verdict(Posture.Align, "Move back a little", "Move back a little.")
    val centred = cy in 0.1f..0.9f && (step != "front" || cx in 0.24f..0.76f)
    if (!centred) return Verdict(Posture.Align, "Center your face in the oval", "Center your face in the oval.")
    when (step) {
        "front" -> if (abs(look.yaw) > FRONT_MAX_YAW) return Verdict(Posture.Turn, "Look straight at the camera", "Look straight at the camera.")
        "left", "right" -> {
            val want = if (step == "left") leftSign else -leftSign
            val turned = look.yaw * want
            if (turned < SIDE_MIN_YAW) return Verdict(Posture.Turn, "Turn slowly to your $step", "Turn slowly to your $step.")
            if (turned > SIDE_MAX_YAW) return Verdict(Posture.Turn, "A little less — turn back slightly", "Turn back just a little.")
        }
    }
    if (!steady) return Verdict(Posture.Hold, "Hold still…", "Hold still.")
    return Verdict(Posture.Locking, "Perfect — hold it…", "Perfect. Hold still.")
}

@androidx.annotation.OptIn(ExperimentalGetImage::class)
@Composable
fun AutoCameraScreen(
    modeKey: String, steps: List<Pair<String, String>>,
    onCancel: () -> Unit, onCaptured: (Map<String, File>) -> Unit, onError: (String) -> Unit,
) {
    val ctx = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val quick = modeKey != "detailed"
    val taken = remember { mutableStateMapOf<String, File>() }
    var step by remember { mutableIntStateOf(0) }
    var verdict by remember { mutableStateOf(Verdict(Posture.Searching, "Starting camera…", "")) }
    var holdPct by remember { mutableFloatStateOf(0f) }
    var voiceOn by remember { mutableStateOf(true) }
    var flash by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val currentStep by rememberUpdatedState(steps[step].first)
    val voiceFlag by rememberUpdatedState(voiceOn)

    // Voice coach.
    val tts = remember {
        var ready = false
        lateinit var engine: TextToSpeech
        engine = TextToSpeech(ctx) { status -> if (status == TextToSpeech.SUCCESS) { engine.language = Locale.US; engine.setSpeechRate(0.95f); ready = true } }
        object { fun say(text: String) { if (ready && text.isNotBlank()) engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "coach") }; fun shutdown() { engine.stop(); engine.shutdown() } }
    }
    val sound = remember { MediaActionSound().apply { load(MediaActionSound.SHUTTER_CLICK) } }
    var lastSpoken by remember { mutableStateOf("" to 0L) }
    fun coach(text: String, force: Boolean = false) {
        if (!voiceFlag) return
        val now = System.currentTimeMillis()
        // Repeat a hint only every ~4.5s so the coach doesn't talk over itself.
        if (force || text != lastSpoken.first || now - lastSpoken.second > 4500) { tts.say(text); lastSpoken = text to now }
    }
    LaunchedEffect(step) {
        kotlinx.coroutines.delay(600)
        coach(when (steps[step].first) { "front" -> "Please look straight at the camera and center your face in the oval."; "left" -> "Now, slowly turn your head to your left."; else -> "Now, slowly turn your head to your right." }, force = true)
    }

    val capture = remember {
        ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .setResolutionSelector(ResolutionSelector.Builder().setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY).setResolutionStrategy(ResolutionStrategy.HIGHEST_AVAILABLE_STRATEGY).build()).build()
    }
    val analysisExecutor = remember { Executors.newSingleThreadExecutor() }
    val detector = remember {
        FaceDetection.getClient(FaceDetectorOptions.Builder().setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST).build())
    }
    DisposableEffect(Unit) { onDispose { detector.close(); analysisExecutor.shutdown(); tts.shutdown(); sound.release() } }

    // Shared between the analyzer thread and the UI.
    val lastBox = remember { arrayOfNulls<FloatArray>(1) }
    var leftSign by remember { mutableIntStateOf(0) }        // which yaw sign the user's "left" turn produced (set on the first side shot)
    val state = remember { object { var holdStart = 0L; var prevCx = -1f; var prevCy = -1f; var lastRun = 0L; var capturing = false; var pausedUntil = 0L } }

    fun finishStep(file: File) {
        taken[currentStep] = file
        sound.play(MediaActionSound.SHUTTER_CLICK)
        flash = true
        scope.launch { kotlinx.coroutines.delay(180); flash = false }
        if (step + 1 < steps.size) {
            coach(when (currentStep) { "front" -> "Great, got your front view."; else -> "Perfect, got it." }, force = true)
            state.pausedUntil = System.currentTimeMillis() + 2600
            state.holdStart = 0; holdPct = 0f
            step++
            busy = false; state.capturing = false
        } else {
            coach("Excellent. Analysing your skin now.", force = true)
            onCaptured(taken.toMap())
        }
    }

    fun takePhoto() {
        if (state.capturing) return
        state.capturing = true; busy = true
        val stepKey = currentStep
        val box = lastBox[0]
        val file = File.createTempFile("scan", ".jpg", ctx.cacheDir)
        capture.takePicture(ImageCapture.OutputFileOptions.Builder(file).build(), ContextCompat.getMainExecutor(ctx), object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(r: ImageCapture.OutputFileResults) {
                scope.launch {
                    val out = withContext(Dispatchers.Default) { cropSquare(file, if (stepKey == "front" && !quick) box else null) }
                    finishStep(out)
                }
            }
            override fun onError(e: ImageCaptureException) { state.capturing = false; busy = false; onError("Could not take the photo. Please try again.") }
        })
    }

    val pickFromGallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { u ->
        if (u != null) scope.launch {
            busy = true; state.capturing = true
            val f = withContext(Dispatchers.IO) { copyToCache(ctx, u) }
            if (f == null) { busy = false; state.capturing = false; return@launch }
            finishStep(withContext(Dispatchers.Default) { cropSquare(f, null) })
        }
    }
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
                            val selector43 = ResolutionSelector.Builder().setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY).build()
                            val preview = Preview.Builder().setResolutionSelector(selector43).build().also { it.surfaceProvider = surfaceProvider }
                            val analysis = ImageAnalysis.Builder().setResolutionSelector(selector43).setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                            analysis.setAnalyzer(analysisExecutor) { proxy ->
                                val now = System.currentTimeMillis()
                                val media = proxy.image
                                if (media == null || now - state.lastRun < ANALYSE_EVERY_MS || state.capturing || now < state.pausedUntil) { proxy.close(); return@setAnalyzer }
                                state.lastRun = now
                                val rot = proxy.imageInfo.rotationDegrees
                                val uw = if (rot % 180 == 0) proxy.width else proxy.height
                                val uh = if (rot % 180 == 0) proxy.height else proxy.width
                                val yBuf = proxy.planes[0].buffer
                                var sum = 0L; var n = 0
                                var i = 0
                                while (i < yBuf.limit()) { sum += yBuf.get(i).toInt() and 0xFF; n++; i += 37 }
                                val brightness = if (n == 0) 0 else (sum / n).toInt()
                                detector.process(InputImage.fromMediaImage(media, rot))
                                    .addOnSuccessListener { faces ->
                                        val face = faces.maxByOrNull { it.boundingBox.width() }
                                        val look = if (face == null) Look(floatArrayOf(0f, 0f, 0f), 0f, 0, brightness) else {
                                            val b = face.boundingBox
                                            Look(floatArrayOf(b.exactCenterX() / uw, b.exactCenterY() / uh, b.width().toFloat() / uw), face.headEulerAngleY, faces.size, brightness)
                                        }
                                        val steady = face != null && state.prevCx >= 0 && abs(look.box[0] - state.prevCx) < MAX_DRIFT && abs(look.box[1] - state.prevCy) < MAX_DRIFT
                                        if (face != null) { state.prevCx = look.box[0]; state.prevCy = look.box[1]; lastBox[0] = look.box } else { state.prevCx = -1f }
                                        // The side shots: whichever way the user turns first counts as "left"; "right" must be the opposite.
                                        if (leftSign == 0 && currentStep == "left" && abs(look.yaw) >= SIDE_MIN_YAW) leftSign = if (look.yaw > 0) 1 else -1
                                        val v = judge(look, currentStep, quick, if (leftSign == 0) (if (look.yaw >= 0) 1 else -1) else leftSign, steady)
                                        val locking = v.posture == Posture.Locking
                                        if (locking) { if (state.holdStart == 0L) state.holdStart = now } else state.holdStart = 0
                                        val held = if (state.holdStart == 0L) 0L else now - state.holdStart
                                        ContextCompat.getMainExecutor(c).execute {
                                            verdict = v; holdPct = if (locking) min(1f, held / HOLD_MS.toFloat()) else 0f
                                            if (!locking || held < HOLD_MS) coach(v.voice)
                                            if (locking && held >= HOLD_MS && !state.capturing) takePhoto()
                                        }
                                    }
                                    .addOnCompleteListener { proxy.close() }
                            }
                            provider.unbindAll()
                            provider.bindToLifecycle(owner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, capture, analysis)
                        }.onFailure { onError("Could not open the camera.") }
                    }, ContextCompat.getMainExecutor(c))
                }
            },
            Modifier.fillMaxSize(),
        )

        // Guide oval with the hold-progress ring.
        val tone = when (verdict.posture) { Posture.Locking -> Color(0xFF34D399); Posture.Hold -> Color(0xFFFBBF24); Posture.Searching -> Color(0xFFF87171); else -> Color(0xFFFB923C) }
        Canvas(Modifier.fillMaxSize()) {
            val w = size.width * 0.74f; val h = w * 1.32f
            val tl = Offset((size.width - w) / 2f, size.height * 0.40f - h / 2f)
            drawOval(tone, tl, Size(w, h), style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(16f, 12f))))
            if (holdPct > 0f) drawArc(Color(0xFF34D399), -90f, 360f * holdPct, false, Offset(tl.x - 10.dp.toPx(), tl.y - 10.dp.toPx()), Size(w + 20.dp.toPx(), h + 20.dp.toPx()), style = Stroke(5.dp.toPx(), cap = StrokeCap.Round))
        }
        if (flash) Box(Modifier.fillMaxSize().background(Color(0xCCFFFFFF)))

        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton({ taken.values.forEach { it.delete() }; onCancel() }, Modifier.clip(CircleShape).background(Color(0x66000000))) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Color.White) }
            Spacer(Modifier.weight(1f))
            if (steps.size > 1) Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.clip(CircleShape).background(Color(0x66000000)).padding(horizontal = 12.dp, vertical = 8.dp)) {
                steps.forEachIndexed { i, (k, _) ->
                    Text(k.replaceFirstChar { it.uppercase() }, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        color = if (taken.containsKey(k)) Color(0xFF34D399) else if (i == step) Color.White else Color(0x88FFFFFF))
                }
            }
            Spacer(Modifier.weight(1f))
            IconButton({ voiceOn = !voiceOn; if (voiceOn) tts.say("Voice guidance on") }, Modifier.clip(CircleShape).background(Color(0x66000000))) {
                Icon(if (voiceOn) Icons.Rounded.VolumeUp else Icons.Rounded.VolumeOff, "Voice guidance", tint = Color.White)
            }
        }

        Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(horizontal = 20.dp, vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(verdict.caption, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, textAlign = TextAlign.Center,
                modifier = Modifier.clip(CircleShape).background(Color(0x99000000)).border(1.5.dp, tone, CircleShape).padding(horizontal = 20.dp, vertical = 11.dp))
            Spacer(Modifier.height(6.dp))
            Text(if (steps.size > 1) "Photo ${step + 1} of ${steps.size} · captures automatically" else "Captures automatically when you're in position", color = Color(0xCCFFFFFF), fontSize = 12.sp)
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).clip(CircleShape).background(Color(0x66000000)).clickable(enabled = !busy) { pickFromGallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.PhotoLibrary, "Choose from gallery", tint = Color.White)
                }
                Spacer(Modifier.width(28.dp))
                // Manual shutter, in case the user prefers to take the photo themselves.
                Box(Modifier.size(64.dp).clip(CircleShape).border(3.dp, Color.White, CircleShape).padding(6.dp).clip(CircleShape).background(if (busy) Color.Gray else Color.White).clickable(enabled = !busy) { takePhoto() })
                Spacer(Modifier.width(76.dp))
            }
        }
    }
}

/** Reads an image file, applies its EXIF rotation, crops a square and writes it back as a 1280×1280 JPEG. */
fun cropSquare(file: File, faceBox: FloatArray?, ratio: Float = FACE_CROP_RATIO): File {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 4200) sample *= 2
    val raw = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return file
    val degrees = when (ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f; ExifInterface.ORIENTATION_ROTATE_180 -> 180f; ExifInterface.ORIENTATION_ROTATE_270 -> 270f; else -> 0f
    }
    val upright = if (degrees == 0f) raw else Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, Matrix().apply { postRotate(degrees) }, true)
    val maxSide = min(upright.width, upright.height)
    var size = maxSide
    var sx = (upright.width - size) / 2
    var sy = (upright.height - size) / 2
    if (faceBox != null) {
        // Detailed scan: the provider wants the face to fill most of the frame, so crop tightly around the detected face.
        size = min(maxSide, (faceBox[2] * upright.width / ratio).toInt())
        sx = (faceBox[0] * upright.width - size / 2f).toInt().coerceIn(0, upright.width - size)
        sy = (faceBox[1] * upright.height - size / 2f).toInt().coerceIn(0, upright.height - size)
    }
    val square = Bitmap.createBitmap(upright, sx, sy, size, size)
    val scaled = if (size == OUTPUT_SIZE) square else Bitmap.createScaledBitmap(square, OUTPUT_SIZE, OUTPUT_SIZE, true)
    file.outputStream().use { scaled.compress(Bitmap.CompressFormat.JPEG, 92, it) }
    return file
}

/**
 * Prepares a photo picked from the gallery: finds the face with ML Kit and crops a square around it so it meets the
 * providers' "face must fill the frame" rule. Falls back to a centred square if no face is found.
 */
suspend fun prepareGalleryPhoto(file: File, tight: Boolean): File = withContext(Dispatchers.Default) {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 1600) sample *= 2
    val small = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample })
    val degrees = when (ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f; ExifInterface.ORIENTATION_ROTATE_180 -> 180f; ExifInterface.ORIENTATION_ROTATE_270 -> 270f; else -> 0f
    }
    val box = small?.let { b ->
        val detector = FaceDetection.getClient(FaceDetectorOptions.Builder().setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE).build())
        try {
            val faces = kotlinx.coroutines.suspendCancellableCoroutine<List<com.google.mlkit.vision.face.Face>> { cont ->
                detector.process(InputImage.fromBitmap(b, degrees.toInt())).addOnSuccessListener { cont.resume(it) {} }.addOnFailureListener { cont.resume(emptyList()) {} }
            }
            faces.maxByOrNull { it.boundingBox.width() }?.let { f ->
                val uw = if (degrees % 180f == 0f) b.width else b.height
                val uh = if (degrees % 180f == 0f) b.height else b.width
                floatArrayOf(f.boundingBox.exactCenterX() / uw, f.boundingBox.exactCenterY() / uh, f.boundingBox.width().toFloat() / uw)
            }
        } finally { detector.close() }
    }
    cropSquare(file, box, if (tight) FACE_CROP_RATIO else 0.55f)
}
