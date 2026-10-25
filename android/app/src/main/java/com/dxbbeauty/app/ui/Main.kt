package com.dxbbeauty.app.ui

import android.Manifest
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import com.dxbbeauty.app.*
import kotlinx.coroutines.delay
import java.util.Calendar

enum class Tab { Home, Analytic, Scan, Products, Profile }

private sealed interface Overlay {
    data class Detail(val product: Product) : Overlay
    data class Result(val scan: Scan) : Overlay
    data class Done(val order: PlacedOrder) : Overlay
    data class Chat(val scan: Scan, val kind: String) : Overlay
    data class SalonPage(val slug: String) : Overlay
    data object History : Overlay
    data object Bag : Overlay
    data object Checkout : Overlay
    data object Credits : Overlay
    data object Orders : Overlay
    data object Notifications : Overlay
    data object EditProfile : Overlay
    data object Salons : Overlay
    data object Derms : Overlay
    data class Web(val title: String, val url: String) : Overlay
}

fun Modifier.glass(radius: Int = 24) = this.clip(RoundedCornerShape(radius.dp)).background(Color.White.copy(alpha = 0.78f)).border(1.dp, Color.White, RoundedCornerShape(radius.dp))

@Composable
fun MainShell(session: Session?, onLogout: () -> Unit, onLogin: () -> Unit) {
    var tab by remember { mutableStateOf(Tab.Home) }
    val stack = remember { mutableStateListOf<Overlay>() }
    var settings by remember { mutableStateOf(StoreSettings()) }
    var me by remember { mutableStateOf<Me?>(null) }
    var scans by remember { mutableStateOf<List<Scan>?>(null) }
    var refreshTick by remember { mutableIntStateOf(0) }
    var uploadRequest by remember { mutableStateOf(false) }
    var fullscreen by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val loader = remember { ImageLoader.Builder(ctx).components { add(SvgDecoder.Factory()) }.build() }

    LaunchedEffect(Unit) { settings = Api.settings() }

    // Ask once for permission to show system notifications (Android 13+).
    val askNotifPerm = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(session?.token) {
        if (session != null && Build.VERSION.SDK_INT >= 33 && !Notifier.canPost(ctx)) askNotifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    // Live notification polling: rings the bell (and posts a system notification) when something new arrives.
    LaunchedEffect(session?.token, refreshTick) {
        val s = session ?: run { me = null; scans = null; return@LaunchedEffect }
        Api.scans(s.token).onSuccess { scans = it }
        while (true) {
            Api.me(s.token).onSuccess { m ->
                me = m
                val fresh = Notifier.newOnes(ctx, m.notifs)
                if (fresh.isNotEmpty()) {
                    // The system notification carries the bell itself; ring in-app only when it can't be shown.
                    if (!Notifier.canPost(ctx)) Notifier.ring(ctx)
                    fresh.forEach { Notifier.post(ctx, it) }
                }
            }
            delay(20_000)
        }
    }
    val unread = me?.notifs?.count { !it.read } ?: 0

    fun push(o: Overlay) { stack += o }
    fun pop() { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }

    when (val top = stack.lastOrNull()) {
        is Overlay.Detail -> { ProductDetail(top.product, loader, settings.shopEnabled, ::pop, { push(Overlay.Bag) }) { push(Overlay.Web(top.product.name, it)) }; return }
        is Overlay.Result -> {
            ResultScreen(top.scan, me?.name ?: session?.name.orEmpty(), loader, ::pop, onProduct = { push(Overlay.Detail(it)) }, onChat = { kind -> push(Overlay.Chat(top.scan, kind)) }, onDerms = { push(Overlay.Derms) })
            return
        }
        is Overlay.Chat -> { if (session != null) ChatScreen(session, top.scan, top.kind, loader, ::pop) { push(Overlay.Detail(it)) }; return }
        Overlay.History -> { if (session != null) HistoryScreen(session, loader, ::pop) { push(Overlay.Result(it)) }; return }
        Overlay.Bag -> { BagScreen(loader, session != null, ::pop, { push(Overlay.Checkout) }, onLogin); return }
        Overlay.Checkout -> { if (session != null) CheckoutScreen(session, ::pop) { stack.clear(); refreshTick++; push(Overlay.Done(it)) }; return }
        is Overlay.Done -> { OrderDoneScreen(top.order) { stack.clear(); tab = Tab.Products }; return }
        Overlay.Credits -> { if (session != null) CreditsScreen(session, ::pop); return }
        Overlay.Orders -> { if (session != null) OrdersScreen(session, ::pop); return }
        Overlay.Notifications -> { if (session != null) NotificationsScreen(session, me?.notifs.orEmpty(), { refreshTick++ }, ::pop); return }
        Overlay.EditProfile -> { if (session != null) EditProfileScreen(session, me, onSaved = { refreshTick++; pop() }, onDeleted = { stack.clear(); onLogout() }, onBack = ::pop); return }
        Overlay.Salons -> { SalonsScreen(loader, ::pop) { push(Overlay.SalonPage(it)) }; return }
        is Overlay.SalonPage -> { SalonDetailScreen(top.slug, session, loader, ::pop); return }
        is Overlay.Web -> { WebPageScreen(top.title, top.url, ::pop); return }
        Overlay.Derms -> { if (session != null) DermsScreen(session, ::pop); return }
        null -> Unit
    }

    Box(Modifier.fillMaxSize().background(Dxb.PageGradient)) {
        Box(Modifier.fillMaxSize()) {
            when (tab) {
                Tab.Home -> HomeTab(
                    loader, session, me, unread, scans?.firstOrNull(), settings,
                    onBell = { if (session != null) push(Overlay.Notifications) else onLogin() },
                    onScan = { tab = Tab.Scan }, onUpload = { uploadRequest = true; tab = Tab.Scan },
                    onAdvisor = { s -> if (s != null) push(Overlay.Chat(s, "advisor")) else tab = Tab.Scan },
                    onDerms = { if (session != null) push(Overlay.Derms) else onLogin() },
                    onSalons = { push(Overlay.Salons) }, onCredits = { if (session != null) push(Overlay.Credits) else onLogin() },
                    onOpenScan = { push(Overlay.Result(it)) }, onLogin = onLogin,
                )
                Tab.Analytic -> AnalyticTab(session, scans, loader, onLogin, onUpload = { uploadRequest = true; tab = Tab.Scan }, onOpen = { push(Overlay.Result(it)) }, onHistory = { push(Overlay.History) })
                Tab.Scan -> ScanTab(session, settings, uploadRequest, { uploadRequest = false }, { fullscreen = it }, onLogin, { push(Overlay.Credits) }) { refreshTick++; push(Overlay.Result(it)) }
                Tab.Products -> ProductsTab(loader, settings.shopEnabled, onBag = { push(Overlay.Bag) }) { push(Overlay.Detail(it)) }
                Tab.Profile -> ProfileTab(
                    session, me, onLogout, onLogin,
                    onHistory = { push(Overlay.History) }, onCredits = { push(Overlay.Credits) }, onOrders = { push(Overlay.Orders) },
                    onWeb = { t, path -> push(Overlay.Web(t, BuildConfig.SITE_URL + path)) }, onNotifs = { push(Overlay.Notifications) }, onEdit = { push(Overlay.EditProfile) }, onSalons = { push(Overlay.Salons) }, onDerms = { push(Overlay.Derms) },
                    unread = unread,
                )
            }
        }
        if (!(fullscreen && tab == Tab.Scan)) DxbBottomBar(tab, { tab = it }, Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun DxbBottomBar(tab: Tab, onTab: (Tab) -> Unit, modifier: Modifier) {
    val glow by rememberInfiniteTransition(label = "fab").animateFloat(0.35f, 0.8f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "g")
    Box(modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 14.dp).padding(bottom = 10.dp).height(92.dp)) {
        Row(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(68.dp)
                .shadow(18.dp, RoundedCornerShape(30.dp), ambientColor = Dxb.Rose, spotColor = Dxb.Rose)
                .clip(RoundedCornerShape(30.dp)).background(Color.White),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BarItem("Home", Icons.Rounded.Home, tab == Tab.Home, Modifier.weight(1f)) { onTab(Tab.Home) }
            BarItem("Analytic", Icons.Rounded.Analytics, tab == Tab.Analytic, Modifier.weight(1f)) { onTab(Tab.Analytic) }
            Spacer(Modifier.weight(1f))
            BarItem("Products", Icons.Rounded.ShoppingBag, tab == Tab.Products, Modifier.weight(1f)) { onTab(Tab.Products) }
            BarItem("Profile", Icons.Rounded.Person, tab == Tab.Profile, Modifier.weight(1f)) { onTab(Tab.Profile) }
        }
        Box(
            Modifier.align(Alignment.TopCenter).size(68.dp)
                .shadow(14.dp, CircleShape, ambientColor = Dxb.Rose.copy(alpha = glow), spotColor = Dxb.Coral.copy(alpha = glow))
                .clip(CircleShape).background(Color.White).padding(5.dp).clip(CircleShape).background(Dxb.RoseGradient)
                .clickable { onTab(Tab.Scan) },
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Rounded.AutoAwesome, "Scan", tint = Color.White, modifier = Modifier.size(28.dp)) }
    }
}

@Composable
private fun BarItem(label: String, icon: ImageVector, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.fillMaxHeight().clickable(indication = null, interactionSource = remember { MutableInteractionSource() }, onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(icon, label, tint = if (selected) Dxb.Ink else Dxb.Muted.copy(alpha = 0.7f), modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(3.dp))
        Text(label, fontSize = 11.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, color = if (selected) Dxb.Ink else Dxb.Muted.copy(alpha = 0.7f))
    }
}

private fun greeting(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) { in 5..11 -> "Good morning"; in 12..16 -> "Good afternoon"; in 17..21 -> "Good evening"; else -> "Hello" }

@Composable
fun Avatar(name: String?, size: Int = 44) = Box(Modifier.size(size.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) {
    Text((name?.trim()?.firstOrNull() ?: 'G').uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size * 0.42f).sp)
}

@Composable
fun BellButton(unread: Int, onClick: () -> Unit) = BadgedBox({ if (unread > 0) Badge(containerColor = Dxb.Coral) { Text("$unread") } }) {
    Box(Modifier.size(46.dp).clip(CircleShape).background(Color.White).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(Icons.Rounded.NotificationsNone, "Notifications", tint = Dxb.Ink)
    }
}

@Composable
private fun HomeTab(
    loader: ImageLoader, session: Session?, me: Me?, unread: Int, latest: Scan?, settings: StoreSettings,
    onBell: () -> Unit, onScan: () -> Unit, onUpload: () -> Unit, onAdvisor: (Scan?) -> Unit, onDerms: () -> Unit,
    onSalons: () -> Unit, onCredits: () -> Unit, onOpenScan: (Scan) -> Unit, onLogin: () -> Unit,
) {
    val name = (me?.name ?: session?.name)?.substringBefore(' ')?.ifBlank { null }
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(name ?: "G")
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(greeting(), color = Dxb.Muted, fontSize = 12.sp)
                    Text("Hello, ${name ?: "there"} 👋", fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 17.sp)
                }
                BellButton(unread, onBell)
            }
        }
        item {
            Column {
                Text("Skin Analysis", style = MaterialTheme.typography.headlineLarge, color = Dxb.Ink)
                Text("Scan your face in 3D and get a personalised skin report.", color = Dxb.Muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item {
            Box(Modifier.fillMaxWidth().height(460.dp).clip(RoundedCornerShape(36.dp)).background(Dxb.NightGradient)) {
                Hero3D(latest, Modifier.fillMaxSize().padding(bottom = 128.dp))
                Column(Modifier.align(Alignment.BottomCenter).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrimaryButton("Scan Your Face", Modifier.fillMaxWidth(), leading = { Icon(Icons.Rounded.CameraAlt, null, tint = Color.White, modifier = Modifier.size(20.dp)) }, onClick = onScan)
                    Row(
                        Modifier.fillMaxWidth().height(52.dp).clip(CircleShape).background(Color.White).clickable(onClick = onUpload),
                        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.FileUpload, null, tint = Dxb.Ink, modifier = Modifier.size(20.dp)); Spacer(Modifier.width(8.dp))
                        Text("Upload Photo", color = Dxb.Ink, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        item {
            if (latest != null) {
                Row(Modifier.fillMaxWidth().glass(28).clickable { onOpenScan(latest) }.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (latest.photo.isNotBlank()) ScanThumb(latest, loader, 84) else ScoreRing(latest.score, 84)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Latest skin health", color = Dxb.Muted, fontSize = 12.sp)
                        Text("${latest.score}/100 · ${latest.label}", fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 18.sp)
                        Text(latest.createdAt, color = Dxb.Muted, fontSize = 12.sp)
                    }
                    Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                }
            } else {
                Row(Modifier.fillMaxWidth().glass(28).clickable(onClick = if (session == null) onLogin else onScan).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("✨", fontSize = 28.sp); Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(if (session == null) "Sign in to save your results" else "No scan yet", fontWeight = FontWeight.Bold, color = Dxb.Ink)
                        Text("Your first scan takes under a minute.", color = Dxb.Muted, fontSize = 13.sp)
                    }
                    Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                }
            }
        }
        item {
            Text("Explore", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
            Spacer(Modifier.height(12.dp))
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickTile("AI Advisor", "Chat about your skin", Icons.Rounded.SmartToy, Modifier.weight(1f)) { onAdvisor(latest) }
                    QuickTile("Dermatologists", "Clinics near you", Icons.Rounded.LocationOn, Modifier.weight(1f), onDerms)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickTile("Salons", "Book a skin scan", Icons.Rounded.Spa, Modifier.weight(1f), onSalons)
                    QuickTile("Scan credits", me?.let { "${it.credits} available" } ?: "Top up", Icons.Rounded.Stars, Modifier.weight(1f), onCredits)
                }
            }
        }
        item {
            Text("What we analyse", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(listOf("✦ Spots", "◎ Pores", "≋ Texture", "♡ Redness", "☾ Dark circles", "💧 Hydration", "〰 Wrinkles")) {
                    Text(it, color = Dxb.RoseDeep, fontWeight = FontWeight.Medium, modifier = Modifier.clip(CircleShape).background(Color.White.copy(alpha = 0.8f)).padding(horizontal = 16.dp, vertical = 10.dp))
                }
            }
        }
    }
}

@Composable
private fun FloatChip(label: String, value: String, modifier: Modifier, phase: Int) {
    val bob by rememberInfiniteTransition(label = "chip").animateFloat(-5f, 5f, infiniteRepeatable(tween(2200 + phase * 400, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "b")
    Row(
        modifier.offset(y = bob.dp).clip(RoundedCornerShape(16.dp)).background(Color(0x33FFFFFF)).border(1.dp, Color(0x55FFFFFF), RoundedCornerShape(16.dp)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(Dxb.Cyan)); Spacer(Modifier.width(8.dp))
        Column { Text(label, color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp); Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
    }
}

@Composable
private fun QuickTile(title: String, sub: String, icon: ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.glass(24).clickable(onClick = onClick).padding(16.dp)) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp)) }
        Spacer(Modifier.height(12.dp))
        Text(title, fontWeight = FontWeight.Bold, color = Dxb.Ink)
        Text(sub, color = Dxb.Muted, fontSize = 12.sp)
    }
}

@Composable
fun ScoreRing(score: Int, size: Int, animate: Boolean = true) {
    val v = remember { Animatable(if (animate) 0f else 1f) }
    LaunchedEffect(score) { if (animate) v.animateTo(1f, tween(1200, easing = FastOutSlowInEasing)) }
    Box(Modifier.size(size.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize().padding((size * 0.07f).dp)) {
            val sw = size * 0.11f * density
            drawArc(Dxb.Line, -90f, 360f, false, style = Stroke(sw, cap = StrokeCap.Round))
            drawArc(Dxb.RoseGradient, -90f, 360f * score / 100f * v.value, false, style = Stroke(sw, cap = StrokeCap.Round))
        }
        Text("${(score * v.value).toInt()}%", fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = (size * 0.22f).sp)
    }
}

@Composable
private fun AnalyticTab(session: Session?, scans: List<Scan>?, loader: ImageLoader, onLogin: () -> Unit, onUpload: () -> Unit, onOpen: (Scan) -> Unit, onHistory: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { Text("Analytic", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
        item {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Brush.linearGradient(listOf(Color(0xFFF3C6F0), Color(0xFFC9D8FF), Color(0xFFFFD6C9)))).padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.size(54.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.CameraAlt, null, tint = Dxb.Rose) }
                Spacer(Modifier.height(10.dp))
                Text("Upload a clear photo", fontWeight = FontWeight.Bold, color = Dxb.Ink)
                Text("for best results", color = Dxb.Muted, fontSize = 12.sp)
                Spacer(Modifier.height(14.dp))
                PrimaryButton("Upload Photo", Modifier.width(190.dp), onClick = if (session == null) onLogin else onUpload)
            }
        }
        val latest = scans?.firstOrNull()
        if (session == null) item { Text("Sign in to see your skin analytics.", color = Dxb.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        else if (scans == null) item { Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) } }
        else if (latest == null) item { Text("No scans yet — tap ✦ to take your first one.", color = Dxb.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        else {
            item {
                Text("Detected Areas", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
                Spacer(Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(latest.concerns) { c ->
                        Column(Modifier.width(104.dp).glass(22).clickable { onOpen(latest) }.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.CenterFocusWeak, null, tint = Dxb.Rose, modifier = Modifier.size(20.dp)) }
                            Spacer(Modifier.height(8.dp))
                            Text(c.label, fontSize = 11.sp, color = Dxb.Ink, textAlign = TextAlign.Center, maxLines = 2, minLines = 2)
                            Text(c.level, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = levelColor(c.level))
                        }
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth().glass(28).padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Skin Health Score", fontWeight = FontWeight.Bold, color = Dxb.Ink)
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text("${latest.score}", fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Dxb.Ink)
                            Text(" /100\n${latest.label}", color = Dxb.Muted, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp, bottom = 6.dp))
                        }
                        Text(if (latest.score >= 70) "Keep going! Your skin is on the right track." else "A consistent routine will lift this — see your picks.", color = Dxb.Muted, fontSize = 12.sp)
                    }
                    ScoreRing(latest.score, 96)
                }
            }
            if (scans.size > 1) item {
                Column(Modifier.fillMaxWidth().glass(28).padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Score trend", Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Dxb.Ink)
                        Text("All scans", color = Dxb.Rose, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable(onClick = onHistory))
                    }
                    Spacer(Modifier.height(12.dp))
                    TrendChart(scans.take(10).reversed().map { it.score })
                }
            }
            item {
                Text("Recent scans", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
                Spacer(Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    scans.take(4).forEach { s ->
                        Row(Modifier.fillMaxWidth().glass(22).clickable { onOpen(s) }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            ScanThumb(s, loader, 52)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) { Text(s.label, fontWeight = FontWeight.SemiBold, color = Dxb.Ink); Text(s.createdAt, color = Dxb.Muted, fontSize = 12.sp) }
                            Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TrendChart(points: List<Int>) {
    Canvas(Modifier.fillMaxWidth().height(90.dp)) {
        if (points.size < 2) return@Canvas
        val step = size.width / (points.size - 1)
        val lo = (points.min() - 5).coerceAtLeast(0).toFloat(); val hi = (points.max() + 5).coerceAtMost(100).toFloat().coerceAtLeast(lo + 1)
        val pts = points.mapIndexed { i, v -> androidx.compose.ui.geometry.Offset(i * step, size.height - (v - lo) / (hi - lo) * size.height) }
        val path = androidx.compose.ui.graphics.Path().apply { moveTo(pts[0].x, pts[0].y); pts.drop(1).forEach { lineTo(it.x, it.y) } }
        drawPath(path, Dxb.RoseGradient, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round))
        pts.forEach { drawCircle(Color.White, 5.dp.toPx(), it); drawCircle(Dxb.Rose, 3.dp.toPx(), it) }
    }
}

private val morning = setOf("cleanser", "toner", "serum", "moisturizer", "sunscreen", "eye-care")
private val evening = setOf("cleanser", "treatment", "serum", "moisturizer", "mask", "eye-care")

private val fallback = listOf(
    Product("1", "Vitamin C Serum", "DXB Beauty", "serum", 1299.0, 1599.0, "INR", "", 4.8, "", tags = listOf("brightening")),
    Product("2", "Hyaluronic Serum", "DXB Beauty", "serum", 1199.0, null, "INR", "", 4.7, "", tags = listOf("hydration")),
    Product("3", "SPF 50 Sunscreen", "DXB Beauty", "sunscreen", 899.0, null, "INR", "", 4.9, "", tags = listOf("spots")),
    Product("4", "Hydra Cream Cleanser", "DXB Beauty", "cleanser", 699.0, null, "INR", "", 4.6, "", tags = listOf("hydration")),
)

@Composable
private fun ProductsTab(loader: ImageLoader, shopEnabled: Boolean, onBag: () -> Unit, onProduct: (Product) -> Unit) {
    val ctx = LocalContext.current
    var items by remember { mutableStateOf<List<Product>?>(null) }
    var offline by remember { mutableStateOf(false) }
    var filter by remember { mutableStateOf("all") }
    var query by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { Api.products().onSuccess { items = it }.onFailure { items = fallback; offline = true } }
    val all = items
    val cats = listOf("all", "morning", "evening") + (all?.map { it.category }?.distinct().orEmpty())
    val shown = all.orEmpty().filter {
        (filter == "all" || (filter == "morning" && it.category in morning) || (filter == "evening" && it.category in evening) || it.category == filter) &&
            (query.isBlank() || it.name.contains(query, true) || it.brand.contains(query, true))
    }

    Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Products", Modifier.weight(1f), style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
            BadgedBox({ if (Cart.count > 0) Badge(containerColor = Dxb.Coral) { Text("${Cart.count}") } }) {
                Box(Modifier.size(46.dp).clip(CircleShape).background(Color.White).clickable(onClick = onBag), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.ShoppingCart, "Bag", tint = Dxb.Ink) }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text("Essentials", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Dxb.Ink)
        Text(if (offline) "Offline — showing sample products" else "Curated treatments for your targeted concerns.", color = Dxb.Muted, fontSize = 12.sp)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            query, { query = it }, Modifier.fillMaxWidth(), placeholder = { Text("Search products") }, singleLine = true,
            leadingIcon = { Icon(Icons.Rounded.Search, null, tint = Dxb.Muted) }, shape = CircleShape,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Dxb.Rose, unfocusedBorderColor = Color.Transparent, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, cursorColor = Dxb.Rose),
        )
        Spacer(Modifier.height(12.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(cats) { c ->
                val sel = c == filter
                val label = when (c) { "morning" -> "☀ Morning"; "evening" -> "☾ Evening"; else -> c.replaceFirstChar { it.uppercase() }.replace('-', ' ') }
                Text(
                    label, color = if (sel) Color.White else Dxb.Ink, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                    modifier = Modifier.clip(CircleShape).background(if (sel) Dxb.RoseGradient else Brush.linearGradient(listOf(Color.White, Color.White))).clickable { filter = c }.padding(horizontal = 16.dp, vertical = 9.dp),
                )
            }
        }
        Spacer(Modifier.height(14.dp))
        if (all == null) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
        else if (shown.isEmpty()) Text("No products match.", color = Dxb.Muted, modifier = Modifier.padding(24.dp))
        else LazyVerticalGrid(GridCells.Fixed(2), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(bottom = 120.dp)) {
            items(shown, key = { it.id }) { p ->
                ProductCard(p, loader, shopEnabled, onClick = { onProduct(p) }) {
                    Cart.add(p); Toast.makeText(ctx, "${p.name} added to bag", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}

@Composable
private fun ProductCard(p: Product, loader: ImageLoader, shopEnabled: Boolean, onClick: () -> Unit, onAdd: () -> Unit) {
    Column(Modifier.clip(RoundedCornerShape(24.dp)).background(Color.White).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).background(Dxb.BlushSoft), contentAlignment = Alignment.Center) {
            if (p.imageUrl.isNotBlank()) AsyncImage(p.imageUrl, p.name, loader, Modifier.fillMaxSize().padding(8.dp), contentScale = ContentScale.Fit)
            else Text("✦", color = Dxb.Rose, fontSize = 32.sp)
            val night = p.category in evening && p.category !in morning
            Box(Modifier.align(Alignment.TopEnd).padding(8.dp).size(28.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.9f)), contentAlignment = Alignment.Center) {
                Icon(if (night) Icons.Rounded.DarkMode else Icons.Rounded.LightMode, null, tint = Dxb.Ink, modifier = Modifier.size(15.dp))
            }
            if (p.compareAt != null && p.compareAt > p.price)
                Text("SALE", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).clip(CircleShape).background(Dxb.RoseGradient).padding(horizontal = 8.dp, vertical = 3.dp))
        }
        Column(Modifier.padding(12.dp)) {
            Text(p.brand.uppercase(), color = Dxb.Muted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(p.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis, color = Dxb.Ink)
            Text(p.tags.firstOrNull()?.let { "Targeting ${it.replace('-', ' ').replaceFirstChar { c -> c.uppercase() }}" } ?: p.category.replaceFirstChar { it.uppercase() }, color = Dxb.Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(formatPrice(p), Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 16.sp)
                Box(Modifier.size(30.dp).clip(CircleShape).background(Dxb.Ink).clickable(onClick = if (shopEnabled) onAdd else onClick), contentAlignment = Alignment.Center) {
                    Icon(if (shopEnabled) Icons.Rounded.Add else Icons.Rounded.ArrowOutward, if (shopEnabled) "Add to bag" else "View", tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

fun formatPrice(p: Product): String = money(p.price, p.currency)

@Composable
private fun ProfileTab(
    session: Session?, me: Me?, onLogout: () -> Unit, onLogin: () -> Unit, onHistory: () -> Unit, onCredits: () -> Unit, onOrders: () -> Unit,
    onNotifs: () -> Unit, onEdit: () -> Unit, onSalons: () -> Unit, onDerms: () -> Unit, unread: Int, onWeb: (String, String) -> Unit,
) {
    val ctx = LocalContext.current
    val store = remember { Store(ctx) }
    var sound by remember { mutableStateOf(store.soundOn) }
    fun gated(f: () -> Unit) = if (session != null) f() else onLogin()

    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 120.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        item {
            Avatar(me?.name ?: session?.name, 92)
            Spacer(Modifier.height(12.dp))
            Text((me?.name ?: session?.name)?.ifBlank { null } ?: "Guest", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
            Text(session?.email ?: "Sign in to save your scans", color = Dxb.Muted)
            if (me != null) Text("${me.credits} scan credits", color = Dxb.RoseDeep, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp).clip(CircleShape).background(Color.White).padding(horizontal = 14.dp, vertical = 6.dp))
            Spacer(Modifier.height(22.dp))
        }
        item {
            Section("Account") {
                ProfileRow(Icons.Rounded.Edit, "Edit profile") { gated(onEdit) }
                ProfileRow(Icons.Rounded.Notifications, "Notifications", badge = unread) { gated(onNotifs) }
                ProfileRow(Icons.Rounded.Stars, "Scan credits") { gated(onCredits) }
                ProfileRow(Icons.Rounded.Inventory2, "My orders") { gated(onOrders) }
                ProfileRow(Icons.Rounded.History, "Scan history") { gated(onHistory) }
            }
            Section("Discover") {
                ProfileRow(Icons.Rounded.LocationOn, "Dermatologists near me") { gated(onDerms) }
                ProfileRow(Icons.Rounded.Spa, "Partner salons", onClick = onSalons)
            }
            Section("Preferences") {
                Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconBubble(Icons.Rounded.VolumeUp); Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) { Text("Notification sound", color = Dxb.Ink, fontWeight = FontWeight.Medium); Text("Bell chime for new alerts", color = Dxb.Muted, fontSize = 12.sp) }
                    Switch(sound, { sound = it; store.soundOn = it; if (it) Notifier.ring(ctx, force = true) }, colors = SwitchDefaults.colors(checkedTrackColor = Dxb.Rose))
                }
            }
            Section("Help & legal") {
                ProfileRow(Icons.Rounded.SupportAgent, "Contact us") { onWeb("Contact us", "/contact") }
                ProfileRow(Icons.Rounded.PrivacyTip, "Privacy policy") { onWeb("Privacy policy", "/privacy") }
                ProfileRow(Icons.Rounded.Description, "Terms of service") { onWeb("Terms of service", "/terms") }
                ProfileRow(Icons.Rounded.Gavel, "Refund policy") { onWeb("Refund policy", "/refund-policy") }
            }
            Spacer(Modifier.height(8.dp))
            if (session != null) PrimaryButton("Sign out", Modifier.fillMaxWidth(), onClick = onLogout)
            else PrimaryButton("Sign in", Modifier.fillMaxWidth(), onClick = onLogin)
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
    Text(title.uppercase(), color = Dxb.Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.fillMaxWidth().padding(start = 6.dp, bottom = 8.dp))
    Column(Modifier.fillMaxWidth().padding(bottom = 18.dp).glass(24), content = content)
}

@Composable
private fun IconBubble(icon: ImageVector) = Box(Modifier.size(38.dp).clip(CircleShape).background(Dxb.Blush), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Dxb.RoseDeep, modifier = Modifier.size(20.dp)) }

@Composable
private fun ProfileRow(icon: ImageVector, label: String, badge: Int = 0, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        IconBubble(icon); Spacer(Modifier.width(14.dp))
        Text(label, Modifier.weight(1f), color = Dxb.Ink, fontWeight = FontWeight.Medium)
        if (badge > 0) Text("$badge", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 8.dp).clip(CircleShape).background(Dxb.Coral).padding(horizontal = 8.dp, vertical = 2.dp))
        Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
    }
}
