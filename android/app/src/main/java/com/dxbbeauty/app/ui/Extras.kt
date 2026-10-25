package com.dxbbeauty.app.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.compose.ui.viewinterop.AndroidView
import coil.ImageLoader
import coil.compose.AsyncImage
import com.dxbbeauty.app.*
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
private fun PageColumn(title: String, onBack: () -> Unit, trailing: (@Composable () -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Dxb.PageGradient).statusBarsPadding().navigationBarsPadding().padding(20.dp)) {
        ScreenHeader(title, onBack, trailing)
        content()
    }
}

// ───────────────────────── Notifications ─────────────────────────

@Composable
fun NotificationsScreen(session: Session, notifs: List<Notif>, onChanged: () -> Unit, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val unread = notifs.count { !it.read }
    PageColumn("Notifications", onBack, trailing = {
        if (unread > 0) Text("Mark all read", color = Dxb.Rose, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.clickable {
            scope.launch { notifs.filter { !it.read }.forEach { Api.markRead(session.token, it.id) }; onChanged() }
        })
    }) {
        if (notifs.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🔔", fontSize = 44.sp); Spacer(Modifier.height(8.dp))
                Text("You're all caught up", fontWeight = FontWeight.Bold, color = Dxb.Ink)
                Text("Scan results, orders and credits will show up here.", color = Dxb.Muted, fontSize = 13.sp)
                Spacer(Modifier.height(16.dp))
                Text("Play test sound", color = Dxb.Rose, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable { Notifier.ring(ctx, force = true) })
            }
        } else LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(notifs, key = { it.id }) { n ->
                Row(
                    Modifier.fillMaxWidth().glass(22).clickable(enabled = !n.read) { scope.launch { Api.markRead(session.token, n.id); onChanged() } }.padding(16.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(Modifier.size(40.dp).clip(CircleShape).background(if (n.read) Dxb.Blush else Dxb.Rose), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Notifications, null, tint = if (n.read) Dxb.RoseDeep else Color.White, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(n.title, fontWeight = if (n.read) FontWeight.Medium else FontWeight.Bold, color = Dxb.Ink)
                        Text(n.message, color = Dxb.Muted, fontSize = 13.sp)
                        Text(n.createdAt.take(10), color = Dxb.Muted.copy(alpha = 0.7f), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                    if (!n.read) Box(Modifier.padding(top = 6.dp).size(9.dp).clip(CircleShape).background(Dxb.Coral))
                }
            }
        }
    }
}

// ───────────────────────── Edit profile / delete account ─────────────────────────

@Composable
fun EditProfileScreen(session: Session, me: Me?, onSaved: () -> Unit, onDeleted: () -> Unit, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var name by remember(me) { mutableStateOf(me?.name ?: session.name) }
    var phone by remember(me) { mutableStateOf(me?.phone ?: "") }
    var skin by remember(me) { mutableStateOf(me?.skinType ?: "") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var askDelete by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }
    var pw by remember { mutableStateOf("") }
    PageColumn("Edit profile", onBack) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            FormField(name, { name = it }, "Full name")
            FormField(phone, { phone = it }, "Phone with country code", keyboard = KeyboardType.Phone)
            Text("Skin type", fontWeight = FontWeight.SemiBold, color = Dxb.Ink, modifier = Modifier.padding(vertical = 8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                listOf("normal", "oily", "dry", "combination", "sensitive").forEach { t ->
                    val sel = skin == t
                    Text(t.replaceFirstChar { it.uppercase() }, color = if (sel) Color.White else Dxb.Ink, fontWeight = FontWeight.Medium,
                        modifier = Modifier.clip(CircleShape).background(if (sel) Dxb.Rose else Color.White).clickable { skin = t }.padding(horizontal = 16.dp, vertical = 9.dp))
                }
            }
            error?.let { Text(it, color = Color(0xFFC0392B), modifier = Modifier.padding(top = 10.dp)) }
            Spacer(Modifier.height(20.dp))
            PrimaryButton(if (busy) "Saving…" else "Save changes", Modifier.fillMaxWidth(), enabled = !busy && name.isNotBlank()) {
                busy = true; error = null
                scope.launch { Api.updateProfile(session.token, name, phone, skin).onSuccess { onSaved() }.onFailure { error = it.message }; busy = false }
            }
            Spacer(Modifier.height(28.dp))
            Text("Delete my account", color = Color(0xFFC0392B), fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.CenterHorizontally).clickable { deleteError = null; askDelete = true }.padding(12.dp))
        }
    }
    if (askDelete) AlertDialog(
        onDismissRequest = { askDelete = false }, containerColor = Color.White,
        title = { Text("Delete account?") },
        text = {
            Column {
                Text("This permanently deletes your account, scans and photos. Enter your password to confirm.")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(pw, { pw = it }, singleLine = true, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
                deleteError?.let { Text(it, color = Color(0xFFC0392B), fontSize = 13.sp) }
            }
        },
        confirmButton = {
            TextButton({ scope.launch { Api.deleteAccount(session.token, pw).onSuccess { askDelete = false; onDeleted() }.onFailure { deleteError = it.message } } }) { Text("Delete", color = Color(0xFFC0392B), fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton({ askDelete = false }) { Text("Cancel", color = Dxb.Muted) } },
    )
}

// ───────────────────────── AI advisor / K-beauty chat ─────────────────────────

private data class Bubble(val text: String, val mine: Boolean)

@Composable
fun ChatScreen(session: Session, scan: Scan, kind: String, loader: ImageLoader, onBack: () -> Unit, onProduct: (Product) -> Unit) {
    val title = if (kind == "kbeauty") "K-beauty guide" else "Skin advisor"
    val scope = rememberCoroutineScope()
    val bubbles = remember { mutableStateListOf<Bubble>() }
    var state by remember { mutableStateOf<JSONObject?>(null) }
    var quick by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var total by remember { mutableStateOf(0.0) }
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var multi by remember { mutableStateOf(false) }
    val selected = remember { mutableStateListOf<String>() }
    val list = rememberLazyListState()

    fun apply(r: Result<ChatTurn>) {
        r.onSuccess { t ->
            state = t.state; quick = t.quick; multi = t.input == "multi" && t.quick.isNotEmpty(); selected.clear()
            t.messages.forEach { bubbles += Bubble(it, false) }
            if (t.products.isNotEmpty()) { products = t.products; total = t.total }
            error = null
        }.onFailure { error = it.message }
        busy = false
    }
    // Single-choice replies are sent as text (like the website); multi-choice sends the selected values.
    fun send(shown: String, text: String = "", values: List<String> = emptyList()) {
        if (busy || shown.isBlank()) return
        busy = true; quick = emptyList()
        bubbles += Bubble(shown, true)
        scope.launch { apply(Api.chat(session.token, scan.id, kind, state, text = text, values = values)) }
    }
    LaunchedEffect(Unit) { apply(Api.chat(session.token, scan.id, kind, null, init = true)) }
    LaunchedEffect(bubbles.size, products.size) { if (bubbles.isNotEmpty()) list.animateScrollToItem(bubbles.size + (if (products.isNotEmpty()) 1 else 0)) }

    PageColumn(title, onBack) {
        LazyColumn(Modifier.weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(bubbles.size) { i ->
                val b = bubbles[i]
                Box(Modifier.fillMaxWidth(), contentAlignment = if (b.mine) Alignment.CenterEnd else Alignment.CenterStart) {
                    Text(
                        b.text, color = if (b.mine) Color.White else Dxb.Ink,
                        modifier = Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(20.dp)).background(if (b.mine) Dxb.Rose else Color.White).padding(horizontal = 14.dp, vertical = 10.dp),
                    )
                }
            }
            if (products.isNotEmpty()) item {
                Column {
                    Text("Your picks · ₹${"%,.0f".format(total)} total", fontWeight = FontWeight.Bold, color = Dxb.Ink, modifier = Modifier.padding(vertical = 6.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(products) { p ->
                            Column(Modifier.width(140.dp).clip(RoundedCornerShape(18.dp)).background(Color.White).clickable { onProduct(p) }.padding(8.dp)) {
                                AsyncImage(p.imageUrl, p.name, loader, Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(12.dp)).background(Dxb.BlushSoft), contentScale = ContentScale.Fit)
                                Text(p.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, color = Dxb.Ink, modifier = Modifier.padding(top = 6.dp))
                                Text(formatPrice(p), color = Dxb.RoseDeep, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
            if (busy) item { Text("…", color = Dxb.Muted, modifier = Modifier.padding(8.dp)) }
        }
        error?.let { Text(it, color = Color(0xFFC0392B), fontSize = 13.sp, modifier = Modifier.padding(vertical = 4.dp)) }
        if (quick.isNotEmpty()) @OptIn(ExperimentalLayoutApi::class) FlowRow(Modifier.heightIn(max = 170.dp).verticalScroll(rememberScrollState()).padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            quick.forEach { (label, value) ->
                val on = value in selected
                Text(
                    (if (on) "✓ " else "") + label, color = if (on) Color.White else Dxb.RoseDeep, fontWeight = FontWeight.Medium, fontSize = 13.sp,
                    modifier = Modifier.clip(CircleShape).background(if (on) Dxb.Rose else Color.White).border(1.dp, Dxb.Rose, CircleShape)
                        .clickable { if (multi) { if (on) selected.remove(value) else selected.add(value) } else send(label, text = value) }.padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
            if (multi) Text(
                if (selected.isEmpty()) "You choose for me" else "Done (${selected.size})", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                modifier = Modifier.clip(CircleShape).background(Dxb.RoseGradient).clickable {
                    if (selected.isEmpty()) send("You choose for me", text = "you choose")
                    else send(selected.joinToString(", ") { v -> quick.firstOrNull { it.second == v }?.first?.substringBefore(" ·") ?: v }, values = selected.toList())
                }.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                text, { text = it }, Modifier.weight(1f), placeholder = { Text("Type your message…") }, singleLine = true, shape = CircleShape,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Dxb.Rose, unfocusedBorderColor = Color.Transparent, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, cursorColor = Dxb.Rose),
            )
            Spacer(Modifier.width(8.dp))
            Box(Modifier.size(50.dp).clip(CircleShape).background(Dxb.RoseGradient).clickable(enabled = text.isNotBlank() && !busy) { val t = text; text = ""; send(t, text = t, values = if (multi) selected.toList() else emptyList()) }, contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Rounded.Send, "Send", tint = Color.White)
            }
        }
    }
}

// ───────────────────────── Dermatologists near me ─────────────────────────

@SuppressLint("MissingPermission")
private fun lastLocation(ctx: Context): Location? {
    val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return lm.getProviders(true).mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
}

@Composable
fun DermsScreen(session: Session, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var places by remember { mutableStateOf<List<Place>?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    fun load() {
        val loc = lastLocation(ctx)
        if (loc == null) { status = "We couldn't get your location. Turn on location services and try again."; return }
        loading = true; status = null
        scope.launch { Api.dermatologists(session.token, loc.latitude, loc.longitude).onSuccess { places = it; if (it.isEmpty()) status = "No clinics found nearby." }.onFailure { status = it.message }; loading = false }
    }
    val perm = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { r ->
        if (r.values.any { it }) load() else status = "Location permission is needed to find clinics near you."
    }
    LaunchedEffect(Unit) {
        val granted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (granted) load() else perm.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
    }
    PageColumn("Dermatologists", onBack) {
        Text("Skin clinics near your current location.", color = Dxb.Muted, modifier = Modifier.padding(bottom = 12.dp))
        if (loading) Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
        status?.let { Text(it, color = Dxb.Muted) }
        places?.let { list ->
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(list) { p ->
                    Column(Modifier.fillMaxWidth().glass(22).padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(p.name, Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Dxb.Ink)
                            Text("${p.distanceKm} km", color = Dxb.RoseDeep, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                        if (p.address.isNotBlank()) Text(p.address, color = Dxb.Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            ActionPill("Directions", Icons.Rounded.Directions) { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${Uri.encode(p.name)})"))) }
                            if (p.phone.isNotBlank()) ActionPill("Call", Icons.Rounded.Call) { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${p.phone}"))) }
                            if (p.website.isNotBlank()) ActionPill("Website", Icons.Rounded.Language) { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(p.website))) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionPill(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(Modifier.clip(CircleShape).background(Dxb.Blush).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = Dxb.RoseDeep, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)); Text(label, color = Dxb.RoseDeep, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

// ───────────────────────── Salons ─────────────────────────

@Composable
fun SalonsScreen(loader: ImageLoader, onBack: () -> Unit, onOpen: (String) -> Unit) {
    var q by remember { mutableStateOf("") }
    var salons by remember { mutableStateOf<List<Salon>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(q) { kotlinx.coroutines.delay(250); Api.salons(q).onSuccess { salons = it; err = null }.onFailure { err = it.message } }
    PageColumn("Partner salons", onBack) {
        OutlinedTextField(
            q, { q = it }, Modifier.fillMaxWidth(), placeholder = { Text("Search by name, city or service") }, singleLine = true, shape = CircleShape,
            leadingIcon = { Icon(Icons.Rounded.Search, null, tint = Dxb.Muted) },
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Dxb.Rose, unfocusedBorderColor = Color.Transparent, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, cursorColor = Dxb.Rose),
        )
        Spacer(Modifier.height(14.dp))
        when {
            err != null -> Text(err!!, color = Dxb.Muted)
            salons == null -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
            salons!!.isEmpty() -> Text("No partner salons found yet.", color = Dxb.Muted)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(salons!!) { s ->
                    Row(Modifier.fillMaxWidth().glass(24).clickable { onOpen(s.slug) }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(64.dp).clip(RoundedCornerShape(18.dp)).background(Dxb.Blush), contentAlignment = Alignment.Center) {
                            if (s.coverUrl.isNotBlank()) AsyncImage(Api.absolute(s.coverUrl), s.name, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) else Text("✦", color = Dxb.Rose, fontSize = 24.sp)
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(s.name, fontWeight = FontWeight.Bold, color = Dxb.Ink)
                            Text(s.address.ifBlank { s.tagline }, color = Dxb.Muted, fontSize = 12.sp, maxLines = 1)
                            if (s.ratingCount > 0) Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Rounded.Star, null, tint = Color(0xFFE6A23C), modifier = Modifier.size(14.dp)); Text(" %.1f (${s.ratingCount})".format(s.rating), fontSize = 12.sp, color = Dxb.Muted) }
                        }
                        Icon(Icons.Rounded.ChevronRight, null, tint = Dxb.Muted)
                    }
                }
            }
        }
    }
}

@Composable
fun SalonDetailScreen(slug: String, session: Session?, loader: ImageLoader, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<Pair<Salon, List<Review>>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    var rating by remember { mutableIntStateOf(0) }
    var comment by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf<String?>(null) }
    fun load() { scope.launch { Api.salonDetail(slug).onSuccess { data = it }.onFailure { err = it.message } } }
    LaunchedEffect(slug) { load() }
    PageColumn("Salon", onBack) {
        val d = data
        if (d == null) { if (err != null) Text(err!!, color = Dxb.Muted) else CircularProgressIndicator(color = Dxb.Rose); return@PageColumn }
        val (s, reviews) = d
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (s.coverUrl.isNotBlank()) AsyncImage(Api.absolute(s.coverUrl), s.name, loader, Modifier.fillMaxWidth().height(160.dp).clip(RoundedCornerShape(24.dp)), contentScale = ContentScale.Crop)
            Text(s.name, style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
            if (s.tagline.isNotBlank()) Text(s.tagline, color = Dxb.RoseDeep, fontWeight = FontWeight.Medium)
            if (s.description.isNotBlank()) Text(s.description, color = Dxb.Ink.copy(alpha = 0.8f))
            if (s.services.isNotEmpty()) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                s.services.forEach { Text(it, color = Dxb.RoseDeep, fontSize = 12.sp, modifier = Modifier.clip(CircleShape).background(Dxb.Blush).padding(horizontal = 12.dp, vertical = 6.dp)) }
            }
            if (s.address.isNotBlank()) Text("📍 ${s.address}", color = Dxb.Muted)
            if (s.hours.isNotBlank()) Text(s.hours, color = Dxb.Muted, fontSize = 13.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (s.phone.isNotBlank()) ActionPill("Call", Icons.Rounded.Call) { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${s.phone}"))) }
                if (s.website.isNotBlank()) ActionPill("Website", Icons.Rounded.Language) { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.website))) }
            }
            Text("Reviews (${reviews.size})", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
            reviews.forEach { r ->
                Column(Modifier.fillMaxWidth().glass(18).padding(12.dp)) {
                    Text("${r.name} · ${"★".repeat(r.rating)}", fontWeight = FontWeight.SemiBold, color = Dxb.Ink, fontSize = 13.sp)
                    if (r.comment.isNotBlank()) Text(r.comment, color = Dxb.Muted, fontSize = 13.sp)
                }
            }
            if (session != null) {
                Text("Leave a review", fontWeight = FontWeight.Bold, color = Dxb.Ink)
                Row { (1..5).forEach { i -> Icon(Icons.Rounded.Star, "$i stars", tint = if (i <= rating) Color(0xFFE6A23C) else Dxb.Line, modifier = Modifier.size(34.dp).clickable { rating = i }) } }
                FormField(comment, { comment = it }, "Your comment (optional)")
                msg?.let { Text(it, color = Dxb.Muted) }
                PrimaryButton("Submit review", Modifier.fillMaxWidth(), enabled = rating > 0) {
                    scope.launch { Api.reviewSalon(session.token, slug, rating, comment).onSuccess { msg = "Thanks for your review!"; comment = ""; load() }.onFailure { msg = it.message } }
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

// ───────────────────────── In-app web page (legal pages, brand sites) ─────────────────────────

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebPageScreen(title: String, url: String, onBack: () -> Unit) {
    var web by remember { mutableStateOf<android.webkit.WebView?>(null) }
    var loading by remember { mutableStateOf(true) }
    // Back walks the page history first, then leaves the screen.
    BackHandler { if (web?.canGoBack() == true) web?.goBack() else onBack() }
    DisposableEffect(Unit) { onDispose { web?.destroy() } }
    Column(Modifier.fillMaxSize().background(Dxb.PageGradient).statusBarsPadding().navigationBarsPadding()) {
        Box(Modifier.padding(start = 20.dp, end = 20.dp, top = 20.dp)) { ScreenHeader(title, onBack) }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Dxb.Rose, trackColor = Dxb.Blush)
        AndroidView(
            factory = { c ->
                android.webkit.WebView(c).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    webViewClient = object : android.webkit.WebViewClient() {
                        override fun onPageFinished(v: android.webkit.WebView?, u: String?) { loading = false }
                    }
                    loadUrl(url)
                    web = this
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
    }
}
