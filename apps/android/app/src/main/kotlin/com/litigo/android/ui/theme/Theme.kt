package com.litigo.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF0A0A0A),
    secondary = Color(0xFFB45309),
    tertiary = Color(0xFF166534),
    background = Color(0xFFFAFAFA),
    surface = Color.White,
    onPrimary = Color(0xFFFAFAFA),
    onSecondary = Color.White,
    onBackground = Color(0xFF0A0A0A),
    onSurface = Color(0xFF0A0A0A),
    surfaceVariant = Color(0xFFF5F5F5),
    outline = Color(0x140A0A0A)
)

@Composable
fun LitigoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
