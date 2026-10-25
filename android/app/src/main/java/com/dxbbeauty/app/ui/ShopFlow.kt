package com.dxbbeauty.app.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import com.dxbbeauty.app.*
import kotlinx.coroutines.launch

tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

fun money(amount: Double, currency: String = "INR"): String {
    val sym = when (currency) { "INR" -> "₹"; "USD" -> "$"; "AED" -> "AED "; "EUR" -> "€"; "GBP" -> "£"; else -> "$currency " }
    return sym + "%,.0f".format(amount)
}

@Composable
fun ScreenHeader(title: String, onBack: () -> Unit, trailing: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(bottom = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onBack, Modifier.clip(CircleShape).background(Color.White)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", tint = Dxb.Ink) }
        Spacer(Modifier.width(12.dp))
        Text(title, Modifier.weight(1f), style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        trailing?.invoke()
    }
}

@Composable
fun BagScreen(loader: ImageLoader, signedIn: Boolean, onBack: () -> Unit, onCheckout: () -> Unit, onLogin: () -> Unit) {
    BackHandler(onBack = onBack)
    val lines = Cart.lines
    Column(Modifier.fillMaxSize().background(Dxb.Cream).statusBarsPadding().navigationBarsPadding().padding(20.dp)) {
        ScreenHeader("Your bag", onBack)
        if (lines.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🛍", fontSize = 48.sp)
                    Spacer(Modifier.height(10.dp))
                    Text("Your bag is empty", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
                    Text("Add a few favourites from the shop.", color = Dxb.Muted)
                }
            }
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(lines.toList(), key = { it.productId }) { l ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(l.imageUrl, l.name, loader, Modifier.size(76.dp).clip(RoundedCornerShape(16.dp)).background(Dxb.BlushSoft), contentScale = ContentScale.Fit)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(l.name, fontWeight = FontWeight.SemiBold, color = Dxb.Ink, maxLines = 2, fontSize = 14.sp)
                            Text(money(l.price, l.currency), color = Dxb.RoseDeep, fontWeight = FontWeight.Bold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            QtyButton("−") { Cart.setQty(l.productId, l.qty - 1) }
                            Text("${l.qty}", Modifier.padding(horizontal = 10.dp), fontWeight = FontWeight.Bold)
                            QtyButton("+") { Cart.setQty(l.productId, l.qty + 1) }
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text("Subtotal", Modifier.weight(1f), color = Dxb.Muted)
                Text(money(Cart.subtotal, lines.first().currency), fontWeight = FontWeight.Bold, color = Dxb.Ink)
            }
            PrimaryButton(if (signedIn) "Checkout" else "Sign in to checkout", Modifier.fillMaxWidth()) { if (signedIn) onCheckout() else onLogin() }
        }
    }
}

@Composable
private fun QtyButton(label: String, onClick: () -> Unit) =
    Box(Modifier.size(30.dp).clip(CircleShape).background(Dxb.Blush).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(label, color = Dxb.RoseDeep, fontWeight = FontWeight.Bold)
    }

@Composable
fun CheckoutScreen(session: Session, onBack: () -> Unit, onDone: (PlacedOrder) -> Unit) {
    BackHandler(onBack = onBack)
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var line1 by remember { mutableStateOf("") }
    var line2 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var postal by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("India") }
    var method by remember { mutableStateOf("razorpay") }
    var quote by remember { mutableStateOf<Quote?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val lines = Cart.lines.toList()

    LaunchedEffect(country, lines.size, lines.sumOf { it.qty }) {
        if (country.isNotBlank()) Api.quote(session.token, lines, country).onSuccess { quote = it; if (!it.codAvailable) method = "razorpay" }
    }
    val complete = line1.isNotBlank() && city.isNotBlank() && state.isNotBlank() && postal.isNotBlank() && country.isNotBlank()

    fun place() {
        busy = true; error = null
        scope.launch {
            val order = Api.placeOrder(session.token, lines, Address(line1, line2, city, state, postal, country), method).getOrElse { error = it.message; busy = false; return@launch }
            if (method == "cod" || order.pay == null) { Cart.clear(); busy = false; onDone(order); return@launch }
            val activity = ctx.findActivity() ?: run { error = "Could not open the payment window."; busy = false; return@launch }
            val res = Pay.checkout(activity, order.pay, "Order ${order.number}", session.email)
            if (!res.ok) {
                Api.orderPaymentFailed(session.token, order.id, res.message ?: "Payment cancelled")
                error = (res.message ?: "Payment cancelled") + " — your bag is saved, you can try again."
            } else {
                Api.verifyOrder(session.token, order.id, res)
                    .onSuccess { Cart.clear(); onDone(it) }
                    .onFailure { error = it.message ?: "We couldn't confirm your payment. If you were charged, please contact support." }
            }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().background(Dxb.Cream).statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Checkout", onBack)
        Text("Shipping address", style = MaterialTheme.typography.titleMedium, color = Dxb.Ink)
        Spacer(Modifier.height(10.dp))
        FormField(line1, { line1 = it }, "Address line 1")
        FormField(line2, { line2 = it }, "Address line 2 (optional)")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FormField(city, { city = it }, "City", Modifier.weight(1f))
            FormField(state, { state = it }, "State", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FormField(postal, { postal = it }, "Postal code", Modifier.weight(1f))
            FormField(country, { country = it }, "Country", Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        Text("Payment", style = MaterialTheme.typography.titleMedium, color = Dxb.Ink)
        Spacer(Modifier.height(10.dp))
        PayOption("Pay online", "Cards, UPI, netbanking", method == "razorpay") { method = "razorpay" }
        if (quote?.codAvailable != false) { Spacer(Modifier.height(8.dp)); PayOption("Cash on delivery", "Pay when it arrives (India only)", method == "cod") { method = "cod" } }
        Spacer(Modifier.height(18.dp))
        quote?.let { q ->
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                TotalRow("Subtotal", money(q.subtotal))
                TotalRow("Shipping", if (q.shipping == 0.0) "Free" else money(q.shipping))
                if (q.tax > 0) TotalRow(q.taxLabel, money(q.tax))
                HorizontalDivider(color = Dxb.Line)
                TotalRow("Total", money(q.total), bold = true)
            }
        }
        error?.let { Text(it, color = Color(0xFFC0392B), modifier = Modifier.padding(top = 12.dp)) }
        Spacer(Modifier.height(18.dp))
        PrimaryButton(if (busy) "Processing…" else if (method == "cod") "Place order" else "Pay " + (quote?.let { money(it.total) } ?: ""), Modifier.fillMaxWidth(), enabled = complete && !busy && quote != null) { place() }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun TotalRow(label: String, value: String, bold: Boolean = false) = Row {
    Text(label, Modifier.weight(1f), color = if (bold) Dxb.Ink else Dxb.Muted, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
    Text(value, color = if (bold) Dxb.RoseDeep else Dxb.Ink, fontWeight = FontWeight.Bold)
}

@Composable
private fun PayOption(title: String, sub: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(if (selected) Dxb.Blush else Color.White).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected, onClick, colors = RadioButtonDefaults.colors(selectedColor = Dxb.Rose))
        Column { Text(title, fontWeight = FontWeight.SemiBold, color = Dxb.Ink); Text(sub, color = Dxb.Muted, fontSize = 12.sp) }
    }
}

@Composable
fun FormField(value: String, onChange: (String) -> Unit, label: String, modifier: Modifier = Modifier, keyboard: KeyboardType = KeyboardType.Text) =
    OutlinedTextField(
        value, onChange, modifier.fillMaxWidth().padding(bottom = 10.dp), label = { Text(label) }, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard), shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Dxb.Rose, unfocusedBorderColor = Dxb.Line, focusedLabelColor = Dxb.Rose,
            focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, cursorColor = Dxb.Rose,
        ),
    )

@Composable
fun OrderDoneScreen(order: PlacedOrder, onDone: () -> Unit) {
    BackHandler(onBack = onDone)
    Column(Modifier.fillMaxSize().background(Dxb.Cream).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(Modifier.size(96.dp).clip(CircleShape).background(Dxb.RoseGradient), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(52.dp)) }
        Spacer(Modifier.height(24.dp))
        Text("Order confirmed", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        Spacer(Modifier.height(8.dp))
        Text("Order ${order.number}", color = Dxb.RoseDeep, fontWeight = FontWeight.SemiBold)
        Text("Total ${money(order.total)}", color = Dxb.Muted)
        Spacer(Modifier.height(32.dp))
        PrimaryButton("Continue shopping", Modifier.fillMaxWidth(), onClick = onDone)
    }
}

@Composable
fun OrdersScreen(session: Session, onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    var orders by remember { mutableStateOf<List<PlacedOrder>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { Api.orders(session.token).onSuccess { orders = it }.onFailure { err = it.message } }
    Column(Modifier.fillMaxSize().background(Dxb.Cream).statusBarsPadding().padding(20.dp)) {
        ScreenHeader("My orders", onBack)
        when {
            err != null -> Text(err!!, color = Dxb.Muted)
            orders == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Dxb.Rose) }
            orders!!.isEmpty() -> Text("No orders yet.", color = Dxb.Muted)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(orders!!) { o ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(o.number, fontWeight = FontWeight.SemiBold, color = Dxb.Ink)
                            Text("${o.createdAt} · ${o.itemCount} item${if (o.itemCount == 1) "" else "s"}", color = Dxb.Muted, fontSize = 13.sp)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(money(o.total), fontWeight = FontWeight.Bold, color = Dxb.RoseDeep)
                            Text(o.status.replaceFirstChar { it.uppercase() }, color = Dxb.Sage, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CreditsScreen(session: Session, onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var credits by remember { mutableStateOf<Credits?>(null) }
    var plans by remember { mutableStateOf<List<Plan>?>(null) }
    var busyPlan by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        Api.credits(session.token).onSuccess { credits = it }
        Api.plans().onSuccess { plans = it }.onFailure { message = it.message }
    }
    fun buy(plan: Plan) {
        busyPlan = plan.id; message = null
        scope.launch {
            val order = Api.createCreditOrder(session.token, plan.id).getOrElse { message = it.message; busyPlan = null; return@launch }
            val activity = ctx.findActivity() ?: run { message = "Could not open the payment window."; busyPlan = null; return@launch }
            val res = Pay.checkout(activity, order, "${plan.name} – ${plan.credits} credits", session.email)
            if (!res.ok) message = res.message
            else Api.verifyCredits(session.token, res)
                .onSuccess { credits = it; message = "${plan.credits} credits added!" }
                .onFailure { message = it.message ?: "We couldn't confirm your payment. If you were charged, please contact support." }
            busyPlan = null
        }
    }
    Column(Modifier.fillMaxSize().background(Dxb.Cream).statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Scan credits", onBack)
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Dxb.NightGradient).padding(22.dp)) {
            Text("BALANCE", color = Dxb.Gold, style = MaterialTheme.typography.labelSmall)
            Text(credits?.let { if (it.unlimited) "Unlimited" else "${it.balance}" } ?: "—", color = Color.White, fontFamily = Dxb.Serif, fontSize = 46.sp)
            credits?.costs?.let { c -> Text("Quick ${c["quick"]} · Detailed ${c["detailed"]} · Focus ${c["focus"]} credits per scan", color = Dxb.Gold, fontSize = 12.sp) }
        }
        message?.let { Text(it, color = if (it.endsWith("added!")) Dxb.Sage else Color(0xFFC0392B), modifier = Modifier.padding(top = 12.dp), fontWeight = FontWeight.Medium) }
        Spacer(Modifier.height(20.dp))
        Text("Buy more credits", style = MaterialTheme.typography.titleLarge, color = Dxb.Ink)
        Spacer(Modifier.height(12.dp))
        if (plans == null && message == null) CircularProgressIndicator(color = Dxb.Rose)
        plans?.forEach { p ->
            Row(
                Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(22.dp)).background(Color.White).clickable(enabled = busyPlan == null) { buy(p) }.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(p.name, fontWeight = FontWeight.Bold, color = Dxb.Ink)
                        val tag = if (p.bestValue) "BEST VALUE" else if (p.popular) "POPULAR" else null
                        tag?.let { Text(it, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp).clip(CircleShape).background(Dxb.Rose).padding(horizontal = 8.dp, vertical = 3.dp)) }
                    }
                    Text("${p.credits} credits", color = Dxb.Muted, fontSize = 13.sp)
                }
                if (busyPlan == p.id) CircularProgressIndicator(Modifier.size(22.dp), color = Dxb.Rose, strokeWidth = 2.dp)
                else Text(p.price, color = Dxb.RoseDeep, fontWeight = FontWeight.Bold, fontSize = 18.sp, textAlign = TextAlign.End)
            }
        }
    }
}
