package com.dxbbeauty.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.dxbbeauty.app.ui.DxbApp
import com.dxbbeauty.app.ui.DxbTheme
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Cart.init(applicationContext)
        Notifier.init(applicationContext)
        setContent { DxbTheme { DxbApp() } }
    }

    override fun onPaymentSuccess(paymentId: String?, data: PaymentData?) {
        Pay.pending?.invoke(PayResult(true, data?.orderId, data?.paymentId ?: paymentId, data?.signature))
        Pay.pending = null
    }

    override fun onPaymentError(code: Int, message: String?, data: PaymentData?) {
        Pay.pending?.invoke(PayResult(false, data?.orderId, message = message?.takeIf { it.isNotBlank() } ?: "Payment was cancelled."))
        Pay.pending = null
    }
}
