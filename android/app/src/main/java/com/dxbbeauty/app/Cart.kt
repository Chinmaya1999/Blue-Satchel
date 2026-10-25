package com.dxbbeauty.app

import android.app.Activity
import android.content.Context
import androidx.compose.runtime.mutableStateListOf
import com.razorpay.Checkout
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.resume

data class CartLine(val productId: String, val name: String, val imageUrl: String, val price: Double, val currency: String, val qty: Int)

/** The shopping bag: observable by Compose and persisted across launches. */
object Cart {
    val lines = mutableStateListOf<CartLine>()
    private var prefs: android.content.SharedPreferences? = null

    fun init(ctx: Context) {
        if (prefs != null) return
        prefs = ctx.getSharedPreferences("dxb", Context.MODE_PRIVATE)
        runCatching {
            val a = JSONArray(prefs!!.getString("cart", "[]"))
            for (i in 0 until a.length()) a.getJSONObject(i).let {
                lines += CartLine(it.getString("id"), it.getString("name"), it.getString("img"), it.getDouble("price"), it.getString("cur"), it.getInt("qty"))
            }
        }
    }

    val count get() = lines.sumOf { it.qty }
    val subtotal get() = lines.sumOf { it.price * it.qty }

    fun add(p: Product) {
        val i = lines.indexOfFirst { it.productId == p.id }
        if (i >= 0) lines[i] = lines[i].copy(qty = minOf(20, lines[i].qty + 1))
        else lines += CartLine(p.id, p.name, p.imageUrl, p.price, p.currency, 1)
        save()
    }

    fun setQty(id: String, qty: Int) {
        val i = lines.indexOfFirst { it.productId == id }
        if (i < 0) return
        if (qty <= 0) lines.removeAt(i) else lines[i] = lines[i].copy(qty = minOf(20, qty))
        save()
    }

    fun clear() { lines.clear(); save() }

    private fun save() {
        val a = JSONArray()
        lines.forEach { a.put(JSONObject().put("id", it.productId).put("name", it.name).put("img", it.imageUrl).put("price", it.price).put("cur", it.currency).put("qty", it.qty)) }
        prefs?.edit()?.putString("cart", a.toString())?.apply()
    }
}

data class PayResult(val ok: Boolean, val orderId: String? = null, val paymentId: String? = null, val signature: String? = null, val message: String? = null)

/** Bridges Razorpay's Activity callbacks (see MainActivity) to a suspending call. */
object Pay {
    var pending: ((PayResult) -> Unit)? = null

    suspend fun checkout(activity: Activity, o: PayOrder, description: String, email: String): PayResult =
        suspendCancellableCoroutine { cont ->
            pending = { if (cont.isActive) cont.resume(it) }
            cont.invokeOnCancellation { pending = null }
            runCatching {
                val co = Checkout()
                co.setKeyID(o.keyId)
                co.open(
                    activity,
                    JSONObject().put("name", "DXB Beauty").put("description", description).put("order_id", o.orderId)
                        .put("currency", o.currency).put("amount", o.amount)
                        .put("prefill", JSONObject().put("email", email)).put("theme", JSONObject().put("color", "#B76E79")),
                )
            }.onFailure { pending = null; cont.resume(PayResult(false, message = "Could not open the payment window.")) }
        }
}
