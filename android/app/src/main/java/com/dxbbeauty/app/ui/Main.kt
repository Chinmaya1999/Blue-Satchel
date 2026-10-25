package com.dxbbeauty.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
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
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import com.dxbbeauty.app.*
import com.dxbbeauty.app.R

private enum class Tab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Rounded.Home), Scan("Scan", Icons.Rounded.CenterFocusStrong),
    Shop("Shop", Icons.Rounded.ShoppingBag), Profile("Profile", Icons.Rounded.Person)
}

private sealed interface Overlay {
    data class Detail(val product: Product) : Overlay
    data class Result(val scan: Scan) : Overlay
    data class Done(val order: PlacedOrder) : Overlay
    data object History : Overlay
    data object Bag : Overlay
    data object Checkout : Overlay
    data object Credits : Overlay
    data object Orders : Overlay
}

@Composable
fun MainShell(session: Session?, onLogout: () -> Unit, onLogin: () -> Unit) {
    var tab by remember { mutableStateOf(Tab.Home) }
    val stack = remember { mutableStateListOf<Overlay>() }
    var settings by remember { mutableStateOf(StoreSettings()) }
    val ctx = LocalContext.current
    val loader = remember { ImageLoader.Builder(ctx).components { add(SvgDecoder.Factory()) }.build() }
    LaunchedEffect(Unit) { settings = Api.settings() }
    fun push(o: Overlay) { stack += o }
    fun pop() { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }
    // Overlays sit on top of the tab shell; each one pops itself on back.
    when (val top = stack.lastOrNull()) {
        is Overlay.Detail -> { ProductDetail(top.product, loader, settings.shopEnabled, ::pop) { push(Overlay.Bag) }; return }
        is Overlay.Result -> { ResultScreen(top.scan, loader, ::pop) { push(Overlay.Detail(it)) }; return }
        Overlay.History -> { if (session != null) HistoryScreen(session, ::pop) { push(Overlay.Result(it)) }; return }
        Overlay.Bag -> { BagScreen(loader, session != null, ::pop, { push(Overlay.Checkout) }, onLogin); return }
        Overlay.Checkout -> { if (session != null) CheckoutScreen(session, ::pop) { stack.clear(); push(Overlay.Done(it)) }; return }
        is Overlay.Done -> { OrderDoneScreen(top.order) { stack.clear(); tab = Tab.Shop }; return }
        Overlay.Credits -> { if (session != null) CreditsScreen(session, ::pop); return }
        Overlay.Orders -> { if (session != null) OrdersScreen(session, ::pop); return }
        null -> Unit
    }
    Scaffold(
        containerColor = Dxb.Cream,
        bottomBar = {
            Row(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 10.dp)
                    .shadow(16.dp, CircleShape, ambientColor = Dxb.Rose, spotColor = Dxb.Rose)
                    .clip(CircleShape).background(Color.White).padding(6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Tab.entries.forEach { t ->
                    val sel = t == tab
                    val bg by animateColorAsState(if (sel) Dxb.Rose else Color.Transparent, label = "bg")
                    Row(
                        Modifier.clip(CircleShape).background(bg).clickable { tab = t }.padding(horizontal = if (sel) 18.dp else 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(t.icon, t.label, tint = if (sel) Color.White else Dxb.Muted, modifier = Modifier.size(22.dp))
                        AnimatedVisibility(sel) { Text(t.label, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp)) }
                    }
                }
            }
        },
    ) { pad ->
        Box(Modifier.padding(bottom = pad.calculateBottomPadding())) {
            when (tab) {
                Tab.Home -> HomeTab(session, onScan = { tab = Tab.Scan }, onShop = { tab = Tab.Shop })
                Tab.Scan -> ScanTab(session, settings, onLogin, { push(Overlay.Credits) }) { push(Overlay.Result(it)) }
                Tab.Shop -> ShopTab(loader, settings.shopEnabled, { push(Overlay.Bag) }) { push(Overlay.Detail(it)) }
                Tab.Profile -> ProfileTab(session, onLogout, onLogin, { push(Overlay.History) }, { push(Overlay.Credits) }, { push(Overlay.Orders) })
            }
        }
    }
}

@Composable
private fun HomeTab(session: Session?, onScan: () -> Unit, onShop: () -> Unit) {
    val name = session?.name?.substringBefore(' ')?.ifBlank { null }
    LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Hello${name?.let { ", $it" } ?: ""} 👋", color = Dxb.Muted)
                    Text("Your skin, decoded", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
                }
                Box(Modifier.size(46.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.NotificationsNone, null, tint = Dxb.Rose)
                }
            }
        }
        item {
            Box(Modifier.fillMaxWidth().height(210.dp).clip(RoundedCornerShape(32.dp))) {
                Image(painterResource(R.drawable.promo_closeup), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color(0xE62A1519), Color(0x222A1519)))))
                Column(Modifier.padding(22.dp).fillMaxHeight(), verticalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("AI SKIN SCAN", color = Dxb.Gold, style = MaterialTheme.typography.labelSmall)
                        Spacer(Modifier.height(6.dp))
                        Text("Get your skin\nhealth score", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                    }
                    PrimaryButton("Start scan", Modifier.width(150.dp), onClick = onScan)
                }
            }
        }
        item {
            SectionTitle("Skin concerns we analyse")
            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(listOf("Spots" to "✦", "Pores" to "◎", "Texture" to "≋", "Redness" to "♡", "Dark circles" to "☾", "Hydration" to "💧")) { (n, g) ->
                    Column(Modifier.clip(RoundedCornerShape(22.dp)).background(Color.White).padding(horizontal = 18.dp, vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(44.dp).clip(CircleShape).background(Dxb.Blush), contentAlignment = Alignment.Center) { Text(g, fontSize = 20.sp, color = Dxb.RoseDeep) }
                        Spacer(Modifier.height(8.dp))
                        Text(n, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Dxb.Ink)
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Dxb.Blush).clickable(onClick = onShop).padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Curated for you", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
                    Spacer(Modifier.height(4.dp))
                    Text("Serums, cleansers & SPF matched to your skin type.", color = Dxb.RoseDeep, style = MaterialTheme.typography.bodyMedium)
                }
                Spacer(Modifier.width(12.dp))
                Box(Modifier.size(46.dp).clip(CircleShape).background(Dxb.Rose), contentAlignment = Alignment.Center) { Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, tint = Color.White) }
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

@Composable
private fun SectionTitle(t: String) = Text(t, style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)

private val fallback = listOf(
    Product("1", "Vitamin C Serum", "DXB Beauty", "serum", 1299.0, 1599.0, "INR", "", 4.8, ""),
    Product("2", "Hyaluronic Serum", "DXB Beauty", "serum", 1199.0, null, "INR", "", 4.7, ""),
    Product("3", "SPF 50 Sunscreen", "DXB Beauty", "sunscreen", 899.0, null, "INR", "", 4.9, ""),
    Product("4", "Hydra Cream Cleanser", "DXB Beauty", "cleanser", 699.0, null, "INR", "", 4.6, ""),
)

@Composable
private fun ShopTab(loader: ImageLoader, shopEnabled: Boolean, onBag: () -> Unit, onProduct: (Product) -> Unit) {
    val ctx = LocalContext.current
    var items by remember { mutableStateOf<List<Product>?>(null) }
    var offline by remember { mutableStateOf(false) }
    var cat by remember { mutableStateOf("all") }
    LaunchedEffect(Unit) {
        Api.products().onSuccess { items = it }.onFailure { items = fallback; offline = true }
    }
    val all = items
    val cats = listOf("all") + (all?.map { it.category }?.distinct().orEmpty())
    val shown = all?.filter { cat == "all" || it.category == cat }.orEmpty()

    Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(20.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Shop", Modifier.weight(1f), style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
            if (shopEnabled) BadgedBox({ if (Cart.count > 0) Badge(containerColor = Dxb.Rose) { Text("${Cart.count}") } }) {
                Box(Modifier.size(46.dp).clip(CircleShape).background(Color.White).clickable(onClick = onBag), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.ShoppingBag, "Bag", tint = Dxb.Rose) }
            }
        }
        if (offline) Text("Offline — showing sample products", color = Dxb.Muted, fontSize = 12.sp)
        Spacer(Modifier.height(14.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(cats) { c ->
                val sel = c == cat
                Text(
                    c.replaceFirstChar { it.uppercase() }.replace('-', ' '), color = if (sel) Color.White else Dxb.Ink, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                    modifier = Modifier.clip(CircleShape).background(if (sel) Dxb.Rose else Color.White).clickable { cat = c }.padding(horizontal = 16.dp, vertical = 9.dp),
                )
            }
        }
        Spacer(Modifier.height(14.dp))
        if (all == null) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
        else LazyVerticalGrid(GridCells.Fixed(2), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            items(shown, key = { it.id }) { p -> ProductCard(p, loader) { onProduct(p) } }
        }
    }
}

@Composable
private fun ProductCard(p: Product, loader: ImageLoader, onClick: () -> Unit) {
    Column(Modifier.clip(RoundedCornerShape(24.dp)).background(Color.White).clickable(onClick = onClick).padding(10.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(18.dp)).background(Dxb.BlushSoft), contentAlignment = Alignment.Center) {
            if (p.imageUrl.isNotBlank()) AsyncImage(p.imageUrl, p.name, loader, Modifier.fillMaxSize().padding(10.dp), contentScale = ContentScale.Fit)
            else Text("✦", color = Dxb.Rose, fontSize = 32.sp)
            if (p.compareAt != null && p.compareAt > p.price)
                Text("SALE", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.TopStart).padding(6.dp).clip(CircleShape).background(Dxb.Rose).padding(horizontal = 8.dp, vertical = 3.dp))
        }
        Spacer(Modifier.height(10.dp))
        Text(p.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, color = Dxb.Ink, modifier = Modifier.heightIn(min = 40.dp))
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(formatPrice(p), fontWeight = FontWeight.Bold, color = Dxb.RoseDeep)
            Spacer(Modifier.weight(1f))
            if (p.rating > 0) { Icon(Icons.Rounded.Star, null, tint = Color(0xFFE6A23C), modifier = Modifier.size(14.dp)); Text(" %.1f".format(p.rating), fontSize = 12.sp, color = Dxb.Muted) }
        }
    }
}

fun formatPrice(p: Product): String {
    val sym = when (p.currency) { "INR" -> "₹"; "USD" -> "$"; "AED" -> "AED "; "EUR" -> "€"; "GBP" -> "£"; else -> p.currency + " " }
    return sym + "%,.0f".format(p.price)
}

@Composable
private fun ProfileTab(session: Session?, onLogout: () -> Unit, onLogin: () -> Unit, onHistory: () -> Unit, onCredits: () -> Unit, onOrders: () -> Unit) {
    val ctx = LocalContext.current
    fun open(path: String) = ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.SITE_URL + path)))
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(20.dp))
        Box(Modifier.size(96.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) {
            Text((session?.name?.firstOrNull() ?: 'G').uppercase(), color = Color.White, fontSize = 38.sp, fontFamily = Dxb.Serif)
        }
        Spacer(Modifier.height(14.dp))
        Text(session?.name?.ifBlank { null } ?: "Guest", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        Text(session?.email ?: "Sign in to save your scans", color = Dxb.Muted)
        Spacer(Modifier.height(28.dp))
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(Color.White)) {
            ProfileRow(Icons.Rounded.History, "Scan history") { if (session != null) onHistory() else onLogin() }
            ProfileRow(Icons.Rounded.Stars, "Scan credits") { if (session != null) onCredits() else onLogin() }
            ProfileRow(Icons.Rounded.Inventory2, "My orders") { if (session != null) onOrders() else onLogin() }
            ProfileRow(Icons.Rounded.LocationOn, "Find a dermatologist") { open("/salons") }
            ProfileRow(Icons.Rounded.PrivacyTip, "Privacy policy") { open("/privacy") }
            ProfileRow(Icons.Rounded.SupportAgent, "Contact us") { open("/contact") }
        }
        Spacer(Modifier.height(24.dp))
        if (session != null) PrimaryButton("Sign out", Modifier.fillMaxWidth(), onClick = onLogout)
        else PrimaryButton("Sign in", Modifier.fillMaxWidth(), onClick = onLogin)
    }
}

@Composable
private fun ProfileRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(Dxb.Blush), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Dxb.RoseDeep, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.width(14.dp))
        Text(label, Modifier.weight(1f), color = Dxb.Ink, fontWeight = FontWeight.Medium)
        Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
    }
}
