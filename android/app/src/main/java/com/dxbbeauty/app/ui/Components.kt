package com.dxbbeauty.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun BrandWord(modifier: Modifier = Modifier) = Text(
    buildAnnotatedString {
        withStyle(SpanStyle(color = Dxb.Ink)) { append("DXB ") }
        withStyle(SpanStyle(color = Dxb.Rose)) { append("BEAUTY") }
    },
    modifier, fontFamily = Dxb.Serif, fontSize = 17.sp, letterSpacing = 3.sp, fontWeight = FontWeight.Medium,
)

@Composable
fun PrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    onClick: () -> Unit,
) {
    Row(
        modifier.height(54.dp).clip(CircleShape)
            .background(if (enabled) Dxb.RoseGradient else androidx.compose.ui.graphics.SolidColor(Dxb.Line))
            .clickable(enabled = enabled, onClick = onClick).padding(horizontal = 22.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        leading?.let { it(); Spacer(Modifier.width(8.dp)) }
        Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        trailing?.let { Spacer(Modifier.width(8.dp)); it() }
    }
}
