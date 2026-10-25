package com.dxbbeauty.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.dxbbeauty.app.Api
import com.dxbbeauty.app.BuildConfig
import com.dxbbeauty.app.R
import com.dxbbeauty.app.Session
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onSession: (Session) -> Unit, onGuest: () -> Unit, onRegister: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current
    fun open(path: String) = ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.SITE_URL + path)))

    Column(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Dxb.BlushSoft, Dxb.Cream)))
            .statusBarsPadding().navigationBarsPadding().imePadding()
            .verticalScroll(rememberScrollState()).padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(36.dp))
        Image(painterResource(R.drawable.logo_full), null, Modifier.height(120.dp))
        Spacer(Modifier.height(28.dp))
        Text("Welcome back", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink)
        Spacer(Modifier.height(6.dp))
        Text("Sign in to see your scans and routine", color = Dxb.Muted, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(28.dp))

        Field(email, { email = it }, "Email", Icons.Rounded.MailOutline, keyboard = KeyboardType.Email)
        Spacer(Modifier.height(14.dp))
        Field(
            password, { password = it }, "Password", Icons.Rounded.LockOpen, keyboard = KeyboardType.Password,
            visual = if (show) VisualTransformation.None else PasswordVisualTransformation(),
            trailing = {
                IconButton({ show = !show }) { Icon(if (show) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, null, tint = Dxb.Muted) }
            },
        )
        Text(
            "Forgot password?", color = Dxb.Rose, fontWeight = FontWeight.Medium,
            modifier = Modifier.align(Alignment.End).padding(top = 10.dp).clickable { open("/forgot-password") },
        )
        error?.let { Text(it, color = Color(0xFFC0392B), modifier = Modifier.padding(top = 12.dp), style = MaterialTheme.typography.bodyMedium) }
        Spacer(Modifier.height(22.dp))
        PrimaryButton(if (busy) "Signing in…" else "Sign in", Modifier.fillMaxWidth(), enabled = !busy && email.isNotBlank() && password.isNotBlank()) {
            busy = true; error = null
            scope.launch {
                Api.login(email, password).onSuccess(onSession).onFailure { error = it.message }
                busy = false
            }
        }
        Spacer(Modifier.height(14.dp))
        Box(
            Modifier.fillMaxWidth().height(54.dp).clip(RoundedCornerShape(50)).border(1.5.dp, Dxb.Rose, RoundedCornerShape(50)).clickable(onClick = onGuest),
            contentAlignment = Alignment.Center,
        ) { Text("Continue as guest", color = Dxb.Rose, fontWeight = FontWeight.SemiBold) }
        Spacer(Modifier.height(22.dp))
        Row {
            Text("New to DXB Beauty? ", color = Dxb.Muted)
            Text("Create account", color = Dxb.Rose, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable(onClick = onRegister))
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun Field(
    value: String, onChange: (String) -> Unit, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector,
    keyboard: KeyboardType, visual: VisualTransformation = VisualTransformation.None, trailing: (@Composable () -> Unit)? = null,
) = OutlinedTextField(
    value, onChange, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true,
    leadingIcon = { Icon(icon, null, tint = Dxb.Rose) }, trailingIcon = trailing,
    visualTransformation = visual, keyboardOptions = KeyboardOptions(keyboardType = keyboard),
    shape = RoundedCornerShape(18.dp),
    colors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Dxb.Rose, unfocusedBorderColor = Dxb.Line, focusedLabelColor = Dxb.Rose,
        focusedContainerColor = androidx.compose.ui.graphics.Color.White, unfocusedContainerColor = androidx.compose.ui.graphics.Color.White, cursorColor = Dxb.Rose,
    ),
)
