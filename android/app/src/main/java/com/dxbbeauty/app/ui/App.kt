package com.dxbbeauty.app.ui

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.dxbbeauty.app.Notifier
import com.dxbbeauty.app.Session
import com.dxbbeauty.app.Store

private enum class Screen { Splash, Onboarding, Login, Register, Verify, Forgot, Main }

@Composable
fun DxbApp() {
    val ctx = LocalContext.current
    val store = remember { Store(ctx) }
    var session by remember { mutableStateOf(store.session) }
    var screen by remember { mutableStateOf(Screen.Splash) }

    Crossfade(screen, animationSpec = tween(600), label = "screen") { s ->
        when (s) {
            Screen.Splash -> SplashScreen {
                screen = when {
                    session != null -> Screen.Main
                    !store.onboarded -> Screen.Onboarding
                    else -> Screen.Login
                }
            }
            Screen.Onboarding -> OnboardingScreen { store.onboarded = true; screen = Screen.Login }
            Screen.Login -> LoginScreen(
                onSession = { store.session = it; session = it; Notifier.schedule(ctx); screen = Screen.Main },
                onGuest = { screen = Screen.Main },
                onRegister = { screen = Screen.Register },
                onForgot = { screen = Screen.Forgot },
            )
            Screen.Forgot -> ForgotScreen(onBack = { screen = Screen.Login })
            Screen.Register -> RegisterScreen(
                onSession = { store.session = it; session = it; Notifier.schedule(ctx); screen = if (it.verified) Screen.Main else Screen.Verify },
                onBack = { screen = Screen.Login },
            )
            Screen.Verify -> session?.let { cur ->
                VerifyScreen(cur, onVerified = { val v = cur.copy(verified = true); store.session = v; session = v; screen = Screen.Main }, onSkip = { screen = Screen.Main })
            }
            Screen.Main -> MainShell(
                session,
                onLogout = { store.session = null; session = null; Notifier.cancel(ctx); screen = Screen.Login },
                onLogin = { screen = Screen.Login },
            )
        }
    }
}
