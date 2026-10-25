package com.dxbbeauty.app.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dxbbeauty.app.R
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin

/** Animated brand splash: pulsing scan rings, sweeping scan line, floating sparkles, logo + tagline reveal. */
@Composable
fun SplashScreen(onDone: () -> Unit) {
    val intro = remember { Animatable(0f) }
    val text = remember { Animatable(0f) }
    val inf = rememberInfiniteTransition(label = "splash")
    val pulse by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(2400, easing = LinearEasing)), label = "pulse")
    val sweep by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "sweep")
    val drift by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(9000, easing = LinearEasing)), label = "drift")

    LaunchedEffect(Unit) {
        intro.animateTo(1f, tween(1100, easing = FastOutSlowInEasing))
        text.animateTo(1f, tween(800))
        delay(1100)
        onDone()
    }

    Box(Modifier.fillMaxSize().background(Dxb.NightGradient), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val c = Offset(size.width / 2, size.height * 0.40f)
            val base = size.minDimension * 0.22f
            // expanding rings
            for (i in 0 until 3) {
                val t = (pulse + i / 3f) % 1f
                drawCircle(
                    Dxb.Gold.copy(alpha = (1f - t) * 0.35f * intro.value),
                    radius = base + t * size.minDimension * 0.45f,
                    center = c,
                    style = Stroke(width = 1.5.dp.toPx()),
                )
            }
            // sparkles
            for (i in 0 until 22) {
                val a = i * 2.399f + drift * 6.283f * (if (i % 2 == 0) 1 else -1) * 0.15f
                val r = size.minDimension * (0.18f + (i * 37 % 100) / 100f * 0.55f)
                val p = Offset(c.x + cos(a) * r, c.y + sin(a) * r * 1.15f)
                val tw = (sin((drift * 6.283f * 3f) + i) + 1f) / 2f
                drawCircle(Color.White.copy(alpha = (0.15f + 0.6f * tw) * intro.value), radius = (1.2f + (i % 3)).dp.toPx(), center = p)
            }
            // scan line across the emblem
            val half = base * 1.05f
            val y = c.y - half + (half * 2) * sweep
            drawLine(
                Brush.horizontalGradient(
                    listOf(Color.Transparent, Dxb.Gold, Color.Transparent),
                    startX = c.x - half, endX = c.x + half,
                ),
                Offset(c.x - half, y), Offset(c.x + half, y),
                strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round, alpha = intro.value,
            )
        }

        Column(
            Modifier.fillMaxSize().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.weight(0.40f))
            Box(
                Modifier.size(150.dp).scale(0.6f + 0.4f * intro.value).alpha(intro.value)
                    .background(Brush.radialGradient(listOf(Color(0x33E3B9A0), Color.Transparent)), androidx.compose.foundation.shape.CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Image(painterResource(R.drawable.logo_mark), null, Modifier.size(130.dp))
            }
            Spacer(Modifier.weight(0.12f))
            Column(Modifier.alpha(text.value), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "DXB BEAUTY",
                    color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Light,
                    letterSpacing = 8.sp, fontFamily = Dxb.Serif,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    "AI POWERED SKIN ANALYSIS & SOLUTIONS",
                    color = Dxb.Gold, fontSize = 10.sp, letterSpacing = 2.6.sp,
                    textAlign = TextAlign.Center, fontWeight = FontWeight.Medium,
                )
            }
            Spacer(Modifier.weight(0.48f))
        }
    }
}
