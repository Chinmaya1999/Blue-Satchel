package com.dxbbeauty.app.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import kotlin.math.*

/**
 * A procedural 3D hologram of a face: a lat/long wireframe shaped like a head (tapered jaw, nose,
 * brow), rotated in 3D and projected with perspective. Glows cyan→pink, has a bright scan ring that
 * sweeps up and down the surface, node dots, a projector base and drifting particles. Drag to spin.
 */
private const val LAT = 22
private const val LON = 32

private class Mesh(val x: FloatArray, val y: FloatArray, val z: FloatArray)

private fun gauss(v: Float, c: Float, w: Float) = exp(-((v - c) / w).pow(2))

private fun buildHead(): Mesh {
    val n = (LAT + 1) * LON
    val xs = FloatArray(n); val ys = FloatArray(n); val zs = FloatArray(n)
    for (i in 0..LAT) {
        val yy = 1f - 2.4f * i / LAT                      // +1 crown .. -1.4 base of neck (logical, up = positive)
        val yc = max(yy, -0.72f)                            // below the jaw the head continues as a neck
        val ring = sqrt(max(0f, 1f - yc * yc))              // ellipsoid cross-section
        val neck = ((-0.62f - yy) / 0.25f).coerceIn(0f, 1f)
        for (j in 0 until LON) {
            var th = (2 * PI * j / LON).toFloat()
            val front = if (th > PI) th - (2 * PI).toFloat() else th       // -π..π, 0 = facing the viewer
            val side = abs(sin(th))
            var rx = 0.74f; var rz = 0.84f
            // cranium is full above the brow, face narrows to a chin below the cheekbones
            if (yc < 0.05f) { val t = ((0.05f - yc) / 1.05f).coerceIn(0f, 1f); rx *= 1f - 0.30f * t * t - 0.12f * t; rz *= 1f - 0.24f * t }
            rx *= 1f + 0.06f * gauss(yy, -0.05f, 0.25f)               // cheekbones
            rx *= 1f - 0.20f * neck; rz *= 1f - 0.22f * neck
            var x = rx * ring * sin(th)
            var z = rz * ring * cos(th) - 0.17f * neck
            val f = exp(-(front * front) / 0.12f)                          // weight of the front of the face
            z += f * 0.26f * gauss(yy, -0.08f, 0.20f) * (1f - 0.5f * abs(front))   // nose
            z += f * 0.08f * gauss(yy, 0.30f, 0.09f)                       // brow ridge
            z -= f * 0.07f * gauss(yy, 0.20f, 0.07f) * gauss(abs(front), 0.42f, 0.17f)   // eye sockets
            z += f * 0.07f * gauss(yy, -0.34f, 0.06f)                      // lips
            z -= f * 0.04f * gauss(yy, -0.47f, 0.045f)                     // under-lip dip
            z += f * 0.09f * gauss(yy, -0.66f, 0.10f)                      // chin
            // ears
            x += sign(sin(th)) * 0.07f * gauss(yy, -0.02f, 0.18f) * gauss(abs(front), PI.toFloat() / 2f, 0.28f)
            val k = i * LON + j
            xs[k] = x; ys[k] = -yy * 1.18f; zs[k] = z   // screen-space y points down
        }
    }
    return Mesh(xs, ys, zs)
}

private val labels = listOf("Hydration" to "82%", "Pores" to "Low", "Texture" to "Good")

@Composable
fun HologramHead(modifier: Modifier = Modifier, interactive: Boolean = true) {
    val mesh = remember { buildHead() }
    val inf = rememberInfiniteTransition(label = "holo")
    val spin by inf.animateFloat(0f, 360f, infiniteRepeatable(tween(26000, easing = LinearEasing)), label = "spin")
    val scan by inf.animateFloat(-1f, 1f, infiniteRepeatable(tween(3200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "scan")
    val pulse by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "pulse")
    val flick by inf.animateFloat(0.85f, 1f, infiniteRepeatable(tween(140, easing = LinearEasing), RepeatMode.Reverse), label = "flick")
    var drag by remember { mutableFloatStateOf(0f) }
    var tilt by remember { mutableFloatStateOf(-0.12f) }

    Box(
        modifier.pointerInput(interactive) {
            if (interactive) detectDragGestures { _, d -> drag += d.x * 0.45f; tilt = (tilt + d.y * 0.004f).coerceIn(-0.5f, 0.3f) }
        },
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val ang = Math.toRadians((spin + drag).toDouble()).toFloat()
            drawHologram(mesh, ang, tilt, scan, pulse, flick)
        }
    }
}

private fun DrawScope.drawHologram(m: Mesh, ang: Float, tilt: Float, scan: Float, pulse: Float, flick: Float) {
    val w = size.width; val h = size.height
    val scale = min(w * 0.36f, h * 0.28f)
    val cx = w / 2f; val cy = h / 2f - 0.236f * scale
    val cosA = cos(ang); val sinA = sin(ang); val cosT = cos(tilt); val sinT = sin(tilt)
    val cam = 3.2f

    // projected points
    val n = m.x.size
    val px = FloatArray(n); val py = FloatArray(n); val pz = FloatArray(n)
    for (k in 0 until n) {
        var x = m.x[k]; var y = m.y[k]; var z = m.z[k]
        val rx = x * cosA + z * sinA
        val rz = -x * sinA + z * cosA
        x = rx; z = rz
        val ry = y * cosT - z * sinT
        val rz2 = y * sinT + z * cosT
        y = ry; z = rz2
        val f = cam / (cam - z)
        px[k] = cx + x * scale * f; py[k] = cy + y * scale * f; pz[k] = z
    }

    // soft aura + projector base
    drawCircle(Brush.radialGradient(listOf(Color(0x33C784EA), Color.Transparent), Offset(cx, cy), scale * 1.6f), scale * 1.6f, Offset(cx, cy))
    val baseY = cy + scale * 1.62f
    for (i in 0 until 3) {
        val t = (pulse + i / 3f) % 1f
        val rw = scale * (0.55f + t * 0.95f)
        drawOval(Dxb.Cyan.copy(alpha = (1f - t) * 0.55f * flick), Offset(cx - rw, baseY - rw * 0.22f), Size(rw * 2, rw * 0.44f), style = Stroke(1.4f * density))
    }
    drawOval(Brush.radialGradient(listOf(Color(0x556FE7FF), Color.Transparent), Offset(cx, baseY), scale * 0.9f), Offset(cx - scale * 0.9f, baseY - scale * 0.2f), Size(scale * 1.8f, scale * 0.4f))
    // light cone from base to head
    drawLine(Brush.verticalGradient(listOf(Color.Transparent, Color(0x226FE7FF)), cy, baseY), Offset(cx, cy), Offset(cx, baseY), strokeWidth = scale * 1.1f)

    val scanY = cy + scan * scale * 1.1f
    fun tone(z: Float, py: Float): Color {
        val depth = ((z + 1f) / 2f).coerceIn(0f, 1f)             // 0 back .. 1 front
        val t = ((py - (cy - scale * 1.1f)) / (scale * 2.2f)).coerceIn(0f, 1f)
        val base = lerp(Dxb.Cyan, Color(0xFFFF8FD0), t)
        val near = 1f - (abs(py - scanY) / (scale * 0.22f)).coerceIn(0f, 1f)
        val fade = 1f - ((py - (cy + scale * 1.15f)) / (scale * 0.5f)).coerceIn(0f, 1f)   // neck dissolves into the base
        val a = (0.10f + 0.55f * depth + 0.9f * near) * flick * fade
        return lerp(base, Color.White, near * 0.8f).copy(alpha = a.coerceIn(0f, 1f))
    }

    val sw = 1.1f * density
    // latitude rings
    for (i in 1 until LAT) for (j in 0 until LON) {
        val a = i * LON + j; val b = i * LON + (j + 1) % LON
        drawLine(tone((pz[a] + pz[b]) / 2, (py[a] + py[b]) / 2), Offset(px[a], py[a]), Offset(px[b], py[b]), sw, StrokeCap.Round)
    }
    // longitude lines
    for (j in 0 until LON) for (i in 0 until LAT) {
        val a = i * LON + j; val b = (i + 1) * LON + j
        drawLine(tone((pz[a] + pz[b]) / 2, (py[a] + py[b]) / 2), Offset(px[a], py[a]), Offset(px[b], py[b]), sw, StrokeCap.Round)
    }
    // nodes on the front-facing half
    for (i in 1 until LAT) for (j in 0 until LON step 2) {
        val k = i * LON + j
        if (pz[k] > 0.05f) drawCircle(tone(pz[k], py[k]).copy(alpha = (0.35f + 0.65f * pz[k]).coerceIn(0f, 1f) * flick), 1.7f * density, Offset(px[k], py[k]))
    }
    // bright scan ring
    val ringHalf = scale * 1.02f
    drawLine(Brush.horizontalGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.95f), Color.Transparent), cx - ringHalf, cx + ringHalf), Offset(cx - ringHalf, scanY), Offset(cx + ringHalf, scanY), 2.2f * density, StrokeCap.Round)
    drawLine(Brush.horizontalGradient(listOf(Color.Transparent, Color(0x556FE7FF), Color.Transparent), cx - ringHalf, cx + ringHalf), Offset(cx - ringHalf, scanY), Offset(cx + ringHalf, scanY), 10f * density)

    // drifting particles
    for (i in 0 until 26) {
        val seed = i * 12.9898f
        val fx = (sin(seed) * 43758.55f).let { it - floor(it) }
        val fy = (sin(seed * 1.7f) * 24634.63f).let { it - floor(it) }
        val rise = (fy + pulse * (0.3f + fx * 0.5f)) % 1f
        val x = cx + (fx - 0.5f) * w * 0.95f
        val y = h * (1f - rise)
        drawCircle(Color.White.copy(alpha = 0.55f * sin(rise * PI.toFloat()) * flick), (0.8f + fx * 1.6f) * density, Offset(x, y))
    }
}

private fun lerp(a: Color, b: Color, t: Float) = Color(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t, 1f)

/** Small floating readout chips that hover around the hologram. */
@Composable
fun hologramChips(): List<Pair<String, String>> = labels
