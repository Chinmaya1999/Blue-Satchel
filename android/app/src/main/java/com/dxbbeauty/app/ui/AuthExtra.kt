package com.dxbbeauty.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.dxbbeauty.app.*
import kotlinx.coroutines.launch

@Composable
fun RegisterScreen(onSession: (Session) -> Unit, onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val ok = name.isNotBlank() && email.contains("@") && phone.filter { it.isDigit() }.length >= 7 && password.length >= 6

    Column(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Dxb.BlushSoft, Dxb.Cream))).statusBarsPadding().navigationBarsPadding().imePadding()
            .verticalScroll(rememberScrollState()).padding(24.dp),
    ) {
        ScreenHeader("Create account", onBack)
        Text("Join DXB Beauty to scan your skin and get a routine made for you.", color = Dxb.Muted, modifier = Modifier.padding(bottom = 20.dp))
        FormField(name, { name = it }, "Full name")
        FormField(email, { email = it }, "Email", keyboard = KeyboardType.Email)
        FormField(phone, { phone = it }, "Phone with country code", keyboard = KeyboardType.Phone)
        FormField(password, { password = it }, "Password (6+ characters)", keyboard = KeyboardType.Password)
        error?.let { Text(it, color = Color(0xFFC0392B), modifier = Modifier.padding(bottom = 10.dp)) }
        Spacer(Modifier.height(8.dp))
        PrimaryButton(if (busy) "Creating…" else "Create account", Modifier.fillMaxWidth(), enabled = ok && !busy) {
            busy = true; error = null
            scope.launch { Api.register(name, email, phone, password).onSuccess(onSession).onFailure { error = it.message }; busy = false }
        }
    }
}

@Composable
fun VerifyScreen(session: Session, onVerified: () -> Unit, onSkip: () -> Unit) {
    BackHandler(onBack = onSkip)
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Dxb.BlushSoft, Dxb.Cream))).statusBarsPadding().navigationBarsPadding().imePadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
    ) {
        Text("Verify your email", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        Spacer(Modifier.height(8.dp))
        Text("Enter the 6-digit code we sent to ${session.email}.", color = Dxb.Muted, modifier = Modifier.padding(bottom = 24.dp))
        FormField(code, { code = it.filter(Char::isDigit).take(6) }, "Verification code", keyboard = KeyboardType.NumberPassword)
        error?.let { Text(it, color = Color(0xFFC0392B), modifier = Modifier.padding(bottom = 8.dp)) }
        info?.let { Text(it, color = Dxb.Sage, modifier = Modifier.padding(bottom = 8.dp)) }
        PrimaryButton(if (busy) "Verifying…" else "Verify", Modifier.fillMaxWidth(), enabled = code.length == 6 && !busy) {
            busy = true; error = null
            scope.launch { Api.verifyEmail(session.token, code).onSuccess { onVerified() }.onFailure { error = it.message }; busy = false }
        }
        Spacer(Modifier.height(18.dp))
        Text("Resend code", color = Dxb.Rose, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable {
            scope.launch { Api.resendCode(session.token).onSuccess { info = it; error = null }.onFailure { error = it.message } }
        })
        Spacer(Modifier.height(14.dp))
        Text("Verify later", color = Dxb.Muted, modifier = Modifier.clickable(onClick = onSkip))
    }
}
