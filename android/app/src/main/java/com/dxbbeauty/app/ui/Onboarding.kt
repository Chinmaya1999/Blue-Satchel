package com.dxbbeauty.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dxbbeauty.app.R
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue

private data class Slide(@DrawableRes val img: Int, val tag: String, val title: String, val body: String)

private val slides = listOf(
    Slide(R.drawable.onb_portrait, "AI SKIN SCAN", "Know your skin,\nin seconds", "A guided face scan reads spots, pores, texture, redness and dark circles — and gives you a skin health score."),
    Slide(R.drawable.onb_sunset, "PERSONALISED", "A routine made\nfor your glow", "Recommendations matched to your concerns and skin type, so every product earns its place."),
    Slide(R.drawable.onb_serum, "TRACK PROGRESS", "Watch your skin\nimprove", "Re-scan any time, compare results and talk to our AI advisor or find a dermatologist near you."),
)

@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
    val pager = rememberPagerState { slides.size }
    val scope = rememberCoroutineScope()
    val last = pager.currentPage == slides.lastIndex

    Column(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Dxb.BlushSoft, Dxb.Cream)))
            .statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo_mark), null, Modifier.size(34.dp))
            Spacer(Modifier.width(8.dp))
            BrandWord()
            Spacer(Modifier.weight(1f))
            if (!last) Text("Skip", color = Dxb.Muted, fontWeight = FontWeight.Medium, modifier = Modifier.clip(CircleShape).clickable(onClick = onFinish).padding(8.dp))
        }

        HorizontalPager(pager, Modifier.weight(1f).fillMaxWidth(), pageSpacing = 16.dp) { page ->
            val s = slides[page]
            val offset = ((pager.currentPage - page) + pager.currentPageOffsetFraction).absoluteValue
            Column(Modifier.fillMaxSize().graphicsLayer { alpha = 1f - offset.coerceIn(0f, 1f) * 0.6f }, horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.height(16.dp))
                Box(
                    Modifier.weight(1f).fillMaxWidth().graphicsLayer { translationX = -offset * 0f; scaleX = 1f - offset * 0.06f; scaleY = 1f - offset * 0.06f }
                        .clip(RoundedCornerShape(topStart = 160.dp, topEnd = 160.dp, bottomStart = 32.dp, bottomEnd = 32.dp)),
                ) {
                    Image(painterResource(s.img), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x552A1519)))))
                    if (page == 0) ScanOverlay()
                    if (page == 1) FloatingChip("Skin score", "86", Modifier.align(Alignment.BottomStart).padding(16.dp))
                    if (page == 2) FloatingChip("Hydration", "+24%", Modifier.align(Alignment.BottomEnd).padding(16.dp))
                }
                Spacer(Modifier.height(22.dp))
                Text(s.tag, color = Dxb.Rose, style = androidx.compose.material3.MaterialTheme.typography.labelSmall)
                Spacer(Modifier.height(8.dp))
                Text(s.title, color = Dxb.Ink, style = androidx.compose.material3.MaterialTheme.typography.headlineLarge, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(10.dp))
                Text(s.body, color = Dxb.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.padding(horizontal = 8.dp))
            }
        }

        Row(Modifier.fillMaxWidth().padding(vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                repeat(slides.size) { i ->
                    val w by animateDpAsState(if (i == pager.currentPage) 26.dp else 8.dp, label = "dot")
                    Box(Modifier.height(8.dp).width(w).clip(CircleShape).background(if (i == pager.currentPage) Dxb.Rose else Dxb.Line))
                }
            }
            Spacer(Modifier.weight(1f))
            PrimaryButton(if (last) "Get started" else "Next", Modifier.width(if (last) 170.dp else 130.dp), trailing = {
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, Modifier.size(18.dp), tint = Color.White)
            }) {
                if (last) onFinish() else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) }
            }
        }
    }
}

@Composable
private fun ScanOverlay() {
    val t by rememberInfiniteTransition(label = "scan").animateFloat(0.08f, 0.92f, infiniteRepeatable(tween(2400, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "y")
    Canvas(Modifier.fillMaxSize()) {
        val y = size.height * t
        drawRect(Brush.verticalGradient(listOf(Color.Transparent, Color(0x55E3B9A0), Color.Transparent), startY = y - 60.dp.toPx(), endY = y + 4.dp.toPx()))
        drawLine(Color.White.copy(alpha = 0.9f), Offset(0f, y), Offset(size.width, y), strokeWidth = 2.dp.toPx())
        val pts = listOf(0.42f to 0.34f, 0.55f to 0.42f, 0.38f to 0.5f, 0.5f to 0.58f, 0.6f to 0.52f, 0.46f to 0.68f)
        pts.forEach { (x, py) -> drawCircle(Color.White, 3.5.dp.toPx(), Offset(size.width * x, size.height * py)); drawCircle(Color.White.copy(alpha = 0.3f), 8.dp.toPx(), Offset(size.width * x, size.height * py)) }
        for (i in 0 until pts.size - 1) drawLine(Color.White.copy(alpha = 0.55f), Offset(size.width * pts[i].first, size.height * pts[i].second), Offset(size.width * pts[i + 1].first, size.height * pts[i + 1].second), 1.dp.toPx())
    }
}

@Composable
private fun FloatingChip(label: String, value: String, modifier: Modifier) {
    Row(modifier.clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = 0.92f)).padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Text(value.take(2), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
        Spacer(Modifier.width(10.dp))
        Column { Text(label, color = Dxb.Muted, fontSize = 11.sp); Text(value, color = Dxb.Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
    }
}
