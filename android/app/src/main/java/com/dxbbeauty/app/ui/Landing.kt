package com.dxbbeauty.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dxbbeauty.app.R

/** Fades + lifts its content in the first time it scrolls into composition. */
@Composable
private fun Reveal(delayMs: Int = 0, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(delayMs.toLong()); shown = true }
    AnimatedVisibility(shown, modifier, enter = fadeIn(tween(600)) + slideInVertically(tween(600, easing = FastOutSlowInEasing)) { it / 6 }) { content() }
}

private fun gradientText(prefix: String, hot: String, suffix: String = "") = buildAnnotatedString {
    append(prefix)
    withStyle(SpanStyle(brush = Brush.linearGradient(listOf(Color(0xFF8E5CF0), Color(0xFFF2689B))))) { append(hot) }
    append(suffix)
}

@Composable
fun LandingScreen(onGetStarted: () -> Unit, onSignIn: () -> Unit) {
    val list = rememberLazyListState()
    // The bottom bar slides in once the user scrolls past the hero's own buttons.
    val showBar by remember { derivedStateOf { list.firstVisibleItemIndex > 0 || list.firstVisibleItemScrollOffset > 900 } }

    Box(Modifier.fillMaxSize().background(Dxb.PageGradient)) {
        LazyColumn(Modifier.fillMaxSize(), state = list, contentPadding = PaddingValues(bottom = 130.dp)) {
            item { HeroSection(onGetStarted, onSignIn) }
            item { StatsStrip() }
            item { HowItWorks() }
            item { ResultShowcase() }
            item { FeatureGrid() }
            item { Trust() }
            item { FinalCta(onGetStarted, onSignIn) }
        }
        AnimatedVisibility(
            showBar, Modifier.align(Alignment.BottomCenter),
            enter = fadeIn(tween(300)) + slideInVertically(tween(350)) { it },
        ) {
            Row(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp)
                    .shadow(18.dp, RoundedCornerShape(30.dp), ambientColor = Dxb.Rose, spotColor = Dxb.Rose)
                    .clip(RoundedCornerShape(30.dp)).background(Color.White).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Sign in", Modifier.clip(CircleShape).clickable(onClick = onSignIn).padding(horizontal = 18.dp, vertical = 14.dp), color = Dxb.RoseDeep, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))
                PrimaryButton("Get started free", Modifier.width(210.dp), onClick = onGetStarted, trailing = { Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, Modifier.size(18.dp), tint = Color.White) })
            }
        }
    }
}

@Composable
private fun HeroSection(onGetStarted: () -> Unit, onSignIn: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        // Dark stage with the real 3D head, fading into the light page below.
        Box(Modifier.fillMaxWidth().height(600.dp).background(Dxb.NightGradient, RoundedCornerShape(bottomStart = 40.dp, bottomEnd = 40.dp))) {
                        Hero3D(null, Modifier.fillMaxWidth().height(450.dp).align(Alignment.BottomCenter))
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.logo_mark), null, Modifier.size(36.dp))
                Spacer(Modifier.width(8.dp))
                Text(buildAnnotatedString { withStyle(SpanStyle(color = Color.White)) { append("DXB ") }; withStyle(SpanStyle(color = Dxb.Gold)) { append("BEAUTY") } }, fontSize = 16.sp, letterSpacing = 3.sp, fontWeight = FontWeight.Medium)
                Spacer(Modifier.weight(1f))
                Text("Sign in", color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.clip(CircleShape).background(Color(0x26FFFFFF)).border(1.dp, Color(0x33FFFFFF), CircleShape).clickable(onClick = onSignIn).padding(horizontal = 16.dp, vertical = 8.dp))
            }
            Reveal(200, Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 66.dp)) {
                Row(Modifier.clip(CircleShape).background(Color(0x26FFFFFF)).border(1.dp, Color(0x33FFFFFF), CircleShape).padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(7.dp).clip(CircleShape).background(Dxb.Cyan)); Spacer(Modifier.width(8.dp))
                    Text("AI SKIN ANALYSIS · 3D FACE MAPPING", color = Color.White.copy(alpha = 0.85f), fontSize = 9.sp, letterSpacing = 1.5.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
        Column(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 28.dp)) {
            Reveal(300) {
                Text(
                    gradientText("See your skin\nthe way ", "AI sees it."),
                    color = Dxb.Ink, fontSize = 40.sp, lineHeight = 46.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp,
                )
            }
            Spacer(Modifier.height(12.dp))
            Reveal(450) {
                Text(
                    "One selfie. A 3D face map, six skin concerns scored zone by zone, and a routine matched to your results — in under a minute.",
                    color = Dxb.Muted, style = MaterialTheme.typography.bodyLarge,
                )
            }
            Spacer(Modifier.height(22.dp))
            Reveal(600) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrimaryButton("Start free skin scan", Modifier.fillMaxWidth(), leading = { Icon(Icons.Rounded.CenterFocusStrong, null, tint = Color.White, modifier = Modifier.size(20.dp)) }, onClick = onGetStarted)
                    Row(
                        Modifier.fillMaxWidth().height(54.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.8f)).border(1.dp, Dxb.Line, CircleShape).clickable(onClick = onSignIn),
                        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                    ) { Text("I already have an account", color = Dxb.RoseDeep, fontWeight = FontWeight.SemiBold) }
                }
            }
        }
    }
}

@Composable
private fun StatsStrip() {
    Reveal(modifier = Modifier.padding(horizontal = 20.dp).padding(top = 32.dp, bottom = 24.dp).fillMaxWidth().glass(26).padding(vertical = 18.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Stat("68", "facial landmarks"); Divider(); Stat("6", "concerns scored"); Divider(); Stat("<60s", "to your results")
        }
    }
}

@Composable private fun Divider() = Box(Modifier.width(1.dp).height(40.dp).background(Dxb.Line))

@Composable
private fun Stat(value: String, label: String) = Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(gradientText("", value), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
    Text(label, color = Dxb.Muted, fontSize = 11.sp)
}

@Composable
private fun SectionHead(eyebrow: String, title: String, sub: String? = null) = Column(Modifier.padding(horizontal = 24.dp)) {
    Text(eyebrow, color = Dxb.Rose, style = MaterialTheme.typography.labelSmall)
    Spacer(Modifier.height(6.dp))
    Text(title, style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink, fontSize = 28.sp)
    sub?.let { Spacer(Modifier.height(6.dp)); Text(it, color = Dxb.Muted, style = MaterialTheme.typography.bodyMedium) }
}

@Composable
private fun HowItWorks() {
    Column(Modifier.padding(top = 8.dp, bottom = 40.dp)) {
        Reveal { SectionHead("HOW IT WORKS", "Three steps to better skin", "No appointment. No guesswork.") }
        Spacer(Modifier.height(20.dp))
        val steps = listOf(
            Triple(Icons.Rounded.CameraAlt, "Take a selfie", "Use the camera or pick a photo. Soft, even light gives the best read."),
            Triple(Icons.Rounded.AutoAwesome, "AI maps your face", "A 3D mesh scores spots, pores, texture, redness and dark circles zone by zone."),
            Triple(Icons.Rounded.Spa, "Get your routine", "Products matched to your concerns and skin type, plus an advisor to answer questions."),
        )
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            steps.forEachIndexed { i, (icon, title, body) ->
                Reveal(i * 120) {
                    Row(Modifier.fillMaxWidth().glass(26).padding(18.dp), verticalAlignment = Alignment.Top) {
                        Box(Modifier.size(52.dp).clip(RoundedCornerShape(18.dp)).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) {
                            Icon(icon, null, tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text("STEP 0${i + 1}", color = Dxb.Rose, style = MaterialTheme.typography.labelSmall)
                            Text(title, fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 18.sp, modifier = Modifier.padding(vertical = 2.dp))
                            Text(body, color = Dxb.Muted, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultShowcase() {
    // A sample report that animates when it scrolls into view — shows what the user will get.
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(300); progress.animateTo(1f, tween(1500, easing = FastOutSlowInEasing)) }
    Column(Modifier.padding(bottom = 40.dp)) {
        Reveal { SectionHead("YOUR REPORT", "Know exactly what your skin needs") }
        Spacer(Modifier.height(18.dp))
        Reveal(100, Modifier.padding(horizontal = 20.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(32.dp)).background(Dxb.NightGradient).padding(22.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(104.dp), contentAlignment = Alignment.Center) {
                        androidx.compose.foundation.Canvas(Modifier.fillMaxSize().padding(6.dp)) {
                            val sw = 11.dp.toPx()
                            drawArc(Color(0x22FFFFFF), 135f, 270f, false, style = androidx.compose.ui.graphics.drawscope.Stroke(sw, cap = androidx.compose.ui.graphics.StrokeCap.Round))
                            drawArc(Dxb.RoseGradient, 135f, 270f * 0.86f * progress.value, false, style = androidx.compose.ui.graphics.drawscope.Stroke(sw, cap = androidx.compose.ui.graphics.StrokeCap.Round))
                        }
                        Text("${(86 * progress.value).toInt()}", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text("SKIN HEALTH", color = Dxb.Gold, style = MaterialTheme.typography.labelSmall)
                        Text("Good", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                        Text("Sample report", color = Color.White.copy(alpha = 0.55f), fontSize = 12.sp)
                    }
                }
                Spacer(Modifier.height(18.dp))
                listOf("Hydration" to 0.82f, "Texture" to 0.64f, "Pores" to 0.48f, "Redness" to 0.22f).forEach { (n, v) ->
                    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(n, Modifier.width(84.dp), color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                        Box(Modifier.weight(1f).height(8.dp).clip(CircleShape).background(Color(0x1FFFFFFF))) {
                            Box(Modifier.fillMaxHeight().fillMaxWidth(v * progress.value).clip(CircleShape).background(Dxb.RoseGradient))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FeatureGrid() {
    val items = listOf(
        Triple(Icons.Rounded.ViewInAr, "3D face map", "68 landmarks, scored zone by zone"),
        Triple(Icons.Rounded.SmartToy, "AI skin advisor", "Ask anything, get a personal plan"),
        Triple(Icons.Rounded.Inventory2, "Smart routine", "Morning & evening picks that fit you"),
        Triple(Icons.Rounded.Spa, "K-beauty guide", "Korean picks for your concerns"),
        Triple(Icons.Rounded.LocationOn, "Find dermatologists", "Skin clinics near you"),
        Triple(Icons.Rounded.Timeline, "Track progress", "Re-scan and watch your score rise"),
    )
    Column(Modifier.padding(bottom = 40.dp)) {
        Reveal { SectionHead("EVERYTHING INCLUDED", "A skin clinic in your pocket") }
        Spacer(Modifier.height(18.dp))
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items.chunked(2).forEachIndexed { r, pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEachIndexed { c, (icon, title, sub) ->
                        Reveal((r * 2 + c) * 90, Modifier.weight(1f)) {
                            Column(Modifier.fillMaxWidth().height(150.dp).glass(24).padding(16.dp)) {
                                Box(Modifier.size(42.dp).clip(CircleShape).background(Dxb.Blush), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Dxb.RoseDeep, modifier = Modifier.size(22.dp)) }
                                Spacer(Modifier.weight(1f))
                                Text(title, fontWeight = FontWeight.Bold, color = Dxb.Ink)
                                Text(sub, color = Dxb.Muted, fontSize = 12.sp, lineHeight = 16.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Trust() {
    Reveal(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 40.dp)) {
        Row(Modifier.fillMaxWidth().glass(28).padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(52.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.VerifiedUser, null, tint = Color.White) }
            Spacer(Modifier.width(16.dp))
            Column {
                Text("Private by design", fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 17.sp)
                Text("You agree before any scan. Your photos are used only for your analysis, and you can delete your account and data anytime.", color = Dxb.Muted, fontSize = 13.sp, lineHeight = 18.sp)
            }
        }
    }
}

@Composable
private fun FinalCta(onGetStarted: () -> Unit, onSignIn: () -> Unit) {
    val glow by rememberInfiniteTransition(label = "cta").animateFloat(0.85f, 1f, infiniteRepeatable(tween(1800), RepeatMode.Reverse), label = "g")
    Reveal(modifier = Modifier.padding(horizontal = 20.dp)) {
        Column(
            Modifier.fillMaxWidth().graphicsLayer { scaleX = glow; scaleY = glow }.clip(RoundedCornerShape(36.dp)).background(Dxb.RoseGradient).padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Ready to meet\nyour best skin?", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center, lineHeight = 36.sp)
            Spacer(Modifier.height(8.dp))
            Text("Your first scan takes less than a minute.", color = Color.White.copy(alpha = 0.9f), textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))
            Row(
                Modifier.fillMaxWidth().height(54.dp).clip(CircleShape).background(Color.White).clickable(onClick = onGetStarted),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) { Text("Create free account", color = Dxb.RoseDeep, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
            Spacer(Modifier.height(14.dp))
            Text("Already a member? Sign in", color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable(onClick = onSignIn).padding(6.dp))
        }
    }
}
