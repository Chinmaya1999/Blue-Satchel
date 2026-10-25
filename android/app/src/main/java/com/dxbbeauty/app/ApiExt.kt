package com.dxbbeauty.app

import com.dxbbeauty.app.Api.mapNetworkError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class StoreSettings(val shopEnabled: Boolean = false, val enabled: Map<String, Boolean> = emptyMap())
data class Plan(val id: String, val name: String, val credits: Int, val price: String, val popular: Boolean, val bestValue: Boolean)
data class Credits(val balance: Int, val unlimited: Boolean, val costs: Map<String, Int>)
data class PayOrder(val orderId: String, val amount: Long, val currency: String, val keyId: String)
data class Quote(val subtotal: Double, val shipping: Double, val tax: Double, val taxLabel: String, val total: Double, val codAvailable: Boolean)
data class Address(val line1: String, val line2: String, val city: String, val state: String, val postalCode: String, val country: String)
data class PlacedOrder(val id: String, val number: String, val total: Double, val status: String, val payment: String, val createdAt: String, val itemCount: Int, val pay: PayOrder?)

private fun JSONObject.credits(): Credits {
    val c = optJSONObject("costs")
    return Credits(optInt("balance"), optBoolean("unlimited"), listOf("quick", "detailed", "focus").associateWith { c?.optInt(it) ?: 0 })
}

private fun JSONObject.order(pay: PayOrder? = null) = PlacedOrder(
    optString("_id"), optString("orderNumber"), optDouble("total"), optString("status"), optString("paymentStatus"),
    optString("createdAt").take(10), optJSONArray("items")?.length() ?: 0, pay,
)

private fun currencySymbol(c: String) = when (c.uppercase()) { "INR" -> "₹"; "USD" -> "$"; "AED" -> "AED "; "EUR" -> "€"; "GBP" -> "£"; else -> "$c " }

suspend fun Api.settings(): StoreSettings = withContext(Dispatchers.IO) {
    runCatching {
        val j = call("GET", "/settings")
        StoreSettings(j.optBoolean("shopEnabled"), listOf("quick", "detailed", "focus").associateWith { j.optBoolean("${it}ScanEnabled", true) })
    }.getOrDefault(StoreSettings())
}

suspend fun Api.register(name: String, email: String, phone: String, password: String): Result<Session> = withContext(Dispatchers.IO) {
    runCatching {
        val res = call("POST", "/auth/register", JSONObject().put("name", name.trim()).put("email", email.trim()).put("phone", phone.trim()).put("password", password))
        val u = res.getJSONObject("user")
        Session(res.getString("token"), u.optString("name"), u.optString("email"), u.optBoolean("emailVerified", false))
    }.mapNetworkError()
}

suspend fun Api.verifyEmail(token: String, code: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/auth/verify-email", JSONObject().put("code", code.trim()), token); Unit }.mapNetworkError()
}

suspend fun Api.resendCode(token: String): Result<String> = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/auth/resend-code", JSONObject(), token).optString("message", "A new code was sent.") }.mapNetworkError()
}

suspend fun Api.credits(token: String): Result<Credits> = withContext(Dispatchers.IO) {
    runCatching { call("GET", "/credits/me", token = token).getJSONObject("credits").credits() }.mapNetworkError()
}

suspend fun Api.plans(): Result<List<Plan>> = withContext(Dispatchers.IO) {
    runCatching {
        val a = call("GET", "/credits/plans").getJSONArray("plans")
        List(a.length()) {
            val p = a.getJSONObject(it)
            val ch = p.optJSONObject("charge")
            val major = ch?.optDouble("amount") ?: 0.0   // already in major units (rupees / dollars)
            val price = if (ch != null) currencySymbol(ch.optString("currency")) + "%,.2f".format(major).removeSuffix(".00") else "$" + p.optDouble("priceUsd")
            Plan(p.optString("id"), p.optString("name"), p.optInt("credits"), price, p.optBoolean("popular"), p.optBoolean("bestValue"))
        }
    }.mapNetworkError()
}

suspend fun Api.createCreditOrder(token: String, planId: String): Result<PayOrder> = withContext(Dispatchers.IO) {
    runCatching {
        val r = call("POST", "/credits/order", JSONObject().put("planId", planId), token)
        val o = r.getJSONObject("order")
        PayOrder(o.getString("id"), o.getLong("amount"), o.getString("currency"), r.getString("keyId"))
    }.mapNetworkError()
}

suspend fun Api.verifyCredits(token: String, r: PayResult): Result<Credits> = withContext(Dispatchers.IO) {
    runCatching {
        val body = JSONObject().put("razorpay_order_id", r.orderId).put("razorpay_payment_id", r.paymentId).put("razorpay_signature", r.signature)
        call("POST", "/credits/verify", body, token).getJSONObject("credits").credits()
    }.mapNetworkError()
}

suspend fun Api.quote(token: String, lines: List<CartLine>, country: String): Result<Quote> = withContext(Dispatchers.IO) {
    runCatching {
        val j = call("POST", "/orders/quote", JSONObject().put("items", lines.toJson()).put("country", country), token)
        Quote(j.optDouble("subtotal"), j.optDouble("shippingFee"), j.optDouble("tax"), j.optString("taxLabel"), j.optDouble("total"), j.optBoolean("codAvailable"))
    }.mapNetworkError()
}

suspend fun Api.placeOrder(token: String, lines: List<CartLine>, a: Address, method: String): Result<PlacedOrder> = withContext(Dispatchers.IO) {
    runCatching {
        val addr = JSONObject().put("line1", a.line1).put("line2", a.line2).put("city", a.city).put("state", a.state).put("postalCode", a.postalCode).put("country", a.country)
        val j = call("POST", "/orders", JSONObject().put("items", lines.toJson()).put("shippingAddress", addr).put("paymentMethod", method), token)
        val rz = j.optJSONObject("razorpay")
        j.getJSONObject("order").order(rz?.let { PayOrder(it.getString("orderId"), it.getLong("amount"), it.getString("currency"), it.getString("keyId")) })
    }.mapNetworkError()
}

suspend fun Api.verifyOrder(token: String, id: String, r: PayResult): Result<PlacedOrder> = withContext(Dispatchers.IO) {
    runCatching {
        val body = JSONObject().put("razorpay_order_id", r.orderId).put("razorpay_payment_id", r.paymentId).put("razorpay_signature", r.signature)
        call("POST", "/orders/$id/verify", body, token).getJSONObject("order").order()
    }.mapNetworkError()
}

suspend fun Api.orderPaymentFailed(token: String, id: String, reason: String) = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/orders/$id/payment-failed", JSONObject().put("reason", reason), token) }
}

suspend fun Api.orders(token: String): Result<List<PlacedOrder>> = withContext(Dispatchers.IO) {
    runCatching {
        val j = call("GET", "/orders", token = token)
        val a = j.optJSONArray("orders") ?: JSONArray()
        List(a.length()) { a.getJSONObject(it).order() }
    }.mapNetworkError()
}

private fun List<CartLine>.toJson() = JSONArray().also { arr -> forEach { arr.put(JSONObject().put("productId", it.productId).put("quantity", it.qty)) } }
