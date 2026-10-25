package com.dxbbeauty.app

import com.dxbbeauty.app.Api.mapNetworkError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class Notif(val id: String, val title: String, val message: String, val read: Boolean, val createdAt: String)
data class Me(val name: String, val email: String, val phone: String, val skinType: String, val credits: Int, val notifs: List<Notif>)
data class ChatTurn(
    val state: JSONObject?, val messages: List<String>, val quick: List<Pair<String, String>>,
    val input: String, val placeholder: String, val products: List<Product>, val total: Double,
)
data class Place(val name: String, val lat: Double, val lng: Double, val distanceKm: Double, val address: String, val phone: String, val website: String, val osmUrl: String)
data class Salon(
    val slug: String, val name: String, val tagline: String, val description: String, val phone: String, val website: String,
    val address: String, val services: List<String>, val hours: String, val rating: Double, val ratingCount: Int, val distanceKm: Double?, val coverUrl: String,
)
data class Review(val name: String, val rating: Int, val comment: String)

fun Api.absolute(url: String) = if (url.isBlank() || url.startsWith("http")) url else BuildConfig.SITE_URL + url

private fun JSONObject.notif() = Notif(optString("_id"), optString("title"), optString("message"), optBoolean("read"), optString("createdAt"))

suspend fun Api.me(token: String): Result<Me> = withContext(Dispatchers.IO) {
    runCatching {
        val u = call("GET", "/auth/me", token = token).getJSONObject("user")
        val n = u.optJSONArray("notifications") ?: JSONArray()
        Me(
            u.optString("name"), u.optString("email"), u.optString("phone"), u.optString("skinType"), u.optInt("credits"),
            List(n.length()) { n.getJSONObject(it).notif() }.sortedByDescending { it.createdAt },
        )
    }.mapNetworkError()
}

suspend fun Api.markRead(token: String, id: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching { call("PATCH", "/auth/me/notifications/$id/read", JSONObject(), token); Unit }.mapNetworkError()
}

suspend fun Api.updateProfile(token: String, name: String, phone: String, skinType: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching {
        val b = JSONObject().put("name", name.trim()).put("phone", phone.trim())
        if (skinType.isNotBlank()) b.put("skinType", skinType)
        call("PATCH", "/auth/me", b, token); Unit
    }.mapNetworkError()
}

suspend fun Api.deleteAccount(token: String, password: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching { call("DELETE", "/auth/me", JSONObject().put("password", password), token); Unit }.mapNetworkError()
}

suspend fun Api.forgotPassword(email: String): Result<String> = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/auth/forgot-password", JSONObject().put("email", email.trim())).optString("message") }.mapNetworkError()
}

suspend fun Api.verifyResetCode(email: String, code: String): Result<String> = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/auth/verify-reset-code", JSONObject().put("email", email.trim()).put("code", code.trim())).getString("resetToken") }.mapNetworkError()
}

suspend fun Api.resetPassword(email: String, token: String, password: String): Result<String> = withContext(Dispatchers.IO) {
    runCatching {
        call("POST", "/auth/reset-password", JSONObject().put("email", email.trim()).put("resetToken", token).put("password", password).put("confirmPassword", password)).optString("message")
    }.mapNetworkError()
}

/** One turn of the Skin Advisor / K-beauty guide conversation. Pass `state` back each time. */
suspend fun Api.chat(token: String, scanId: String, kind: String, state: JSONObject?, text: String = "", values: List<String> = emptyList(), init: Boolean = false): Result<ChatTurn> =
    withContext(Dispatchers.IO) {
        runCatching {
            val body = JSONObject().put("init", init).put("text", text).put("values", JSONArray(values))
            if (state != null) body.put("state", state)
            val j = call("POST", "/scans/$scanId/$kind", body, token)
            val msgs = j.optJSONArray("messages") ?: JSONArray()
            val q = j.optJSONArray("quickReplies") ?: JSONArray()
            val ps = j.optJSONArray("products")
            ChatTurn(
                j.optJSONObject("state"),
                List(msgs.length()) { msgs.getJSONObject(it).optString("text") },
                List(q.length()) { q.getJSONObject(it).let { o -> o.optString("label") to o.optString("value") } },
                j.optString("input", "text"), j.optString("placeholder", "Type your message…"),
                List(ps?.length() ?: 0) { parseProduct(ps!!.getJSONObject(it)) }, j.optDouble("total", 0.0),
            )
        }.mapNetworkError()
    }

suspend fun Api.dermatologists(token: String, lat: Double, lng: Double): Result<List<Place>> = withContext(Dispatchers.IO) {
    runCatching {
        val a = call("GET", "/scans/dermatologists?lat=$lat&lng=$lng", token = token, readMs = 60_000).optJSONArray("places") ?: JSONArray()
        List(a.length()) {
            val p = a.getJSONObject(it)
            Place(p.optString("name"), p.optDouble("lat"), p.optDouble("lng"), p.optDouble("distanceKm"), p.optString("address").takeIf { s -> s != "null" } ?: "",
                p.optString("phone").takeIf { s -> s != "null" } ?: "", p.optString("website").takeIf { s -> s != "null" } ?: "", p.optString("osmUrl"))
        }
    }.mapNetworkError()
}

private fun JSONObject.salon(): Salon {
    val ad = optJSONObject("address")
    val hours = optJSONObject("hours")
    val sv = optJSONArray("services").strings()
    return Salon(
        optString("slug"), optString("name"), optString("tagline"), optString("description"), optString("phone"), optString("website"),
        listOfNotNull(ad?.optString("line1"), ad?.optString("city"), ad?.optString("state")).filter { it.isNotBlank() && it != "null" }.joinToString(", "),
        sv, hours?.keys()?.asSequence()?.joinToString("\n") { k -> "${k.replaceFirstChar { c -> c.uppercase() }}: ${hours.optString(k)}" } ?: "",
        optDouble("ratingAvg", 0.0), optInt("ratingCount"), if (has("distanceKm")) optDouble("distanceKm") else null, optString("coverUrl"),
    )
}

suspend fun Api.salons(query: String, lat: Double? = null, lng: Double? = null): Result<List<Salon>> = withContext(Dispatchers.IO) {
    runCatching {
        val q = "q=" + java.net.URLEncoder.encode(query, "UTF-8") + if (lat != null && lng != null) "&lat=$lat&lng=$lng&sort=distance" else ""
        val a = call("GET", "/salons?$q").optJSONArray("salons") ?: JSONArray()
        List(a.length()) { a.getJSONObject(it).salon() }
    }.mapNetworkError()
}

suspend fun Api.salonDetail(slug: String): Result<Pair<Salon, List<Review>>> = withContext(Dispatchers.IO) {
    runCatching {
        val j = call("GET", "/salons/$slug")
        val r = j.optJSONArray("reviews") ?: JSONArray()
        j.getJSONObject("salon").salon() to List(r.length()) { r.getJSONObject(it).let { o -> Review(o.optString("name"), o.optInt("rating"), o.optString("comment")) } }
    }.mapNetworkError()
}

suspend fun Api.reviewSalon(token: String, slug: String, rating: Int, comment: String): Result<Unit> = withContext(Dispatchers.IO) {
    runCatching { call("POST", "/salons/$slug/reviews", JSONObject().put("rating", rating).put("comment", comment), token); Unit }.mapNetworkError()
}
