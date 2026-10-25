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
    val Cream = Color(0xFFFBF4EF)
    val Blush = Color(0xFFF6DDD6)
    val BlushSoft = Color(0xFFFBEAE5)
    val Rose = Color(0xFFB76E79)
    val RoseDeep = Color(0xFF8E4A56)
    val Gold = Color(0xFFE3B9A0)
    val Ink = Color(0xFF2B1B1E)
    val Plum = Color(0xFF2A1519)
    val Muted = Color(0xFF8A7478)
    val Line = Color(0xFFEFDDD6)
    val Sage = Color(0xFF8FA68E)

    val RoseGradient = Brush.linearGradient(listOf(Color(0xFFD9A08F), Color(0xFFB76E79)))
    val NightGradient = Brush.verticalGradient(listOf(Color(0xFF3A1D24), Color(0xFF2A1519), Color(0xFF170A0D)))
    val Serif = FontFamily.Serif
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
    headlineLarge = TextStyle(fontFamily = Dxb.Serif, fontWeight = FontWeight.Medium, fontSize = 34.sp, lineHeight = 40.sp),
    headlineMedium = TextStyle(fontFamily = Dxb.Serif, fontWeight = FontWeight.Medium, fontSize = 26.sp, lineHeight = 32.sp),
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
