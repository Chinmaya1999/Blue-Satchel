package com.dxbbeauty.app.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object Dxb {
    // Soft lavender → pink → peach, glassy white cards, orchid-to-coral gradient accents.
    val Cream = Color(0xFFF8F1FC)
    val Blush = Color(0xFFEBDDF8)
    val BlushSoft = Color(0xFFF6EEFB)
    val Rose = Color(0xFFB86CDC)
    val RoseDeep = Color(0xFF8A45B5)
    val Coral = Color(0xFFF58BAE)
    val Gold = Color(0xFFF6B3D0)
    val Ink = Color(0xFF1E1530)
    val Plum = Color(0xFF1A0B33)
    val Muted = Color(0xFF7C7390)
    val Line = Color(0xFFE6DAF2)
    val Sage = Color(0xFF4FAE8B)
    val Cyan = Color(0xFF6FE7FF)

    val RoseGradient = Brush.linearGradient(listOf(Color(0xFFC784EA), Color(0xFFF58BAE)))
    val NightGradient = Brush.verticalGradient(listOf(Color(0xFF2B1650), Color(0xFF1A0B33), Color(0xFF0F0620)))
    val PageGradient = Brush.verticalGradient(listOf(Color(0xFFEDE0FA), Color(0xFFFBE8F1), Color(0xFFFFF1EA)))
    val Serif = FontFamily.SansSerif
}

private val scheme = lightColorScheme(
    primary = Dxb.Rose,
    onPrimary = Color.White,
    secondary = Dxb.Gold,
    background = Dxb.Cream,
    surface = Color.White,
    onSurface = Dxb.Ink,
    onBackground = Dxb.Ink,
    outline = Dxb.Line,
)

private val type = Typography(
    headlineLarge = TextStyle(fontFamily = Dxb.Serif, fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 40.sp),
    headlineMedium = TextStyle(fontFamily = Dxb.Serif, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 32.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 15.sp, letterSpacing = 0.3.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 1.2.sp),
)

private val shapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
)

@Composable
fun DxbTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = scheme, typography = type, shapes = shapes, content = content)
