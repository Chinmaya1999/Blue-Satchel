package com.dxbbeauty.app

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Product(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val price: Double,
    val compareAt: Double?,
    val currency: String,
    val imageUrl: String,
    val rating: Double,
    val description: String,
    val productUrl: String = "",
)

data class Concern(val label: String, val severity: Int, val level: String)

data class Scan(val id: String, val score: Int, val label: String, val createdAt: String, val concerns: List<Concern>, val products: List<Product>)

data class Session(val token: String, val name: String, val email: String, val verified: Boolean = true)

class Store(context: Context) {
    private val prefs = context.getSharedPreferences("dxb", Context.MODE_PRIVATE)
    var onboarded: Boolean
        get() = prefs.getBoolean("onboarded", false)
        set(v) = prefs.edit().putBoolean("onboarded", v).apply()
    var consented: Boolean
        get() = prefs.getBoolean("consent", false)
        set(v) = prefs.edit().putBoolean("consent", v).apply()
    var session: Session?
        get() = prefs.getString("token", null)?.let {
            Session(it, prefs.getString("name", "") ?: "", prefs.getString("email", "") ?: "")
        }
        set(v) = prefs.edit().apply {
            if (v == null) remove("token").remove("name").remove("email")
            else putString("token", v.token).putString("name", v.name).putString("email", v.email)
        }.apply()
}

object Api {
    fun call(method: String, path: String, body: JSONObject? = null, token: String? = null): JSONObject {
        val conn = URL(BuildConfig.API_URL + path).openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 10_000
        conn.readTimeout = 15_000
        conn.setRequestProperty("Accept", "application/json")
        token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
        if (body != null) {
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val json = runCatching { JSONObject(text) }.getOrDefault(JSONObject())
        if (conn.responseCode !in 200..299) error(json.optString("message", "Something went wrong (${conn.responseCode})."))
        return json
    }

    suspend fun login(email: String, password: String): Result<Session> = withContext(Dispatchers.IO) {
        runCatching {
            val res = call("POST", "/auth/login", JSONObject().put("email", email.trim()).put("password", password))
            val user = res.getJSONObject("user")
            Session(res.getString("token"), user.optString("name"), user.optString("email"), user.optBoolean("emailVerified", true))
        }.mapNetworkError()
    }

    suspend fun products(): Result<List<Product>> = withContext(Dispatchers.IO) {
        runCatching {
            val items = call("GET", "/products?limit=60&sort=-featured").getJSONArray("items")
            List(items.length()) { parseProduct(items.getJSONObject(it)) }
        }.mapNetworkError()
    }

    fun parseProduct(p: JSONObject): Product {
        val img = p.optString("imageUrl")
        return Product(
            id = p.optString("_id"),
            name = p.optString("name"),
            brand = p.optString("brand", "DXB Beauty"),
            category = p.optString("category"),
            price = p.optDouble("price"),
            compareAt = if (p.has("compareAtPrice")) p.optDouble("compareAtPrice") else null,
            currency = p.optString("currency", "INR"),
            imageUrl = if (img.startsWith("http")) img else BuildConfig.SITE_URL + img,
            rating = p.optDouble("rating", 0.0),
            description = p.optString("description"),
            productUrl = p.optString("productUrl"),
        )
    }

    fun parseScan(o: JSONObject): Scan {
        val cs = o.optJSONArray("concerns")
        val ps = o.optJSONArray("recommendedProducts")
        return Scan(
            id = o.optString("_id"),
            score = o.optInt("overallScore"),
            label = o.optString("overallLabel"),
            createdAt = o.optString("createdAt").take(10),
            concerns = List(cs?.length() ?: 0) {
                val c = cs!!.getJSONObject(it)
                Concern(c.optString("label"), c.optInt("severity"), c.optString("level"))
            },
            products = List(ps?.length() ?: 0) { i -> ps!!.optJSONObject(i)?.let(::parseProduct) }.filterNotNull(),
        )
    }

    suspend fun scans(token: String): Result<List<Scan>> = withContext(Dispatchers.IO) {
        runCatching {
            val a = call("GET", "/scans", token = token).getJSONArray("scans")
            List(a.length()) { parseScan(a.getJSONObject(it)) }
        }.mapNetworkError()
    }

    suspend fun acceptConsent(token: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching { call("POST", "/auth/me/consent", JSONObject(), token); Unit }.mapNetworkError()
    }

    /** Scan upload: `photos` maps the form field (front / left / right) to a JPEG file. */
    suspend fun scan(token: String, mode: String, photos: Map<String, java.io.File>): Result<Scan> = withContext(Dispatchers.IO) {
        runCatching {
            val boundary = "dxb" + System.currentTimeMillis()
            val conn = URL(BuildConfig.API_URL + "/scans").openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 150_000
            conn.doOutput = true
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.outputStream.use { out ->
                out.write("--$boundary\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n$mode\r\n".toByteArray())
                photos.forEach { (field, file) ->
                    out.write("--$boundary\r\nContent-Disposition: form-data; name=\"$field\"; filename=\"$field.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".toByteArray())
                    file.inputStream().use { it.copyTo(out) }
                    out.write("\r\n".toByteArray())
                }
                out.write("--$boundary--\r\n".toByteArray())
            }
            val ok = conn.responseCode in 200..299
            val text = (if (ok) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrDefault(JSONObject())
            if (!ok) error(json.optString("message", "Scan failed (${conn.responseCode})."))
            parseScan(json.getJSONObject("scan"))
        }.mapNetworkError()
    }

    fun <T> Result<T>.mapNetworkError(): Result<T> = recoverCatching {
        throw if (it is java.io.IOException) IllegalStateException("No connection. Check your internet and try again.") else it
    }
}
