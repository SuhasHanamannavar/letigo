package com.litigo.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ActivityDisplay(
    val time: String,
    val chatbot: String,
    val rule: String,
    val result: String,
    val color: Color
)

@Composable
fun ActivityScreen() {
    var filter by remember { mutableStateOf("all") }
    val filters = listOf("all", "passed", "warning", "violated")

    val allActivity = listOf(
        ActivityDisplay("10:32", "ChatGPT", "Use bullet points", "Passed", Color(0xFF166534)),
        ActivityDisplay("10:28", "Claude", "Always cite sources", "Violation", Color(0xFF991B1B)),
        ActivityDisplay("09:51", "Gemini", "Keep under 100 words", "Passed", Color(0xFF166534)),
        ActivityDisplay("09:45", "ChatGPT", "Professional tone", "Warning", Color(0xFF92400E)),
        ActivityDisplay("Yesterday", "Copilot", "Always cite sources", "Passed", Color(0xFF166534))
    )

    val filtered = if (filter == "all") allActivity else allActivity.filter { it.result.lowercase() == filter }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAFAFA))
    ) {
        // Header with logo
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BrandLogo(size = 32)
            Column {
                Text(
                    text = "Activity",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.02).sp,
                    color = Color(0xFF0A0A0A)
                )
                Text(
                    text = "Complete audit trail",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
            }
        }

        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            filters.forEach { f ->
                FilterChip(
                    selected = filter == f,
                    onClick = { filter = f },
                    label = { Text(f.capitalize(), fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF0A0A0A),
                        selectedLabelColor = Color(0xFFFAFAFA)
                    )
                )
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                ) {
                    Column {
                        filtered.forEachIndexed { idx, a ->
                            ActivityRow(a.time, a.chatbot, a.rule, a.result, a.color)
                            if (idx < filtered.size - 1) {
                                HorizontalDivider(color = Color(0x140A0A0A), thickness = 1.dp)
                            }
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun ChatbotsScreen() {
    val chatbots = listOf(
        Triple("ChatGPT", true, "Protected"),
        Triple("Claude", true, "Protected"),
        Triple("Gemini", true, "Protected"),
        Triple("Perplexity", false, "Disabled"),
        Triple("Copilot", true, "Protected"),
        Triple("Grok", false, "Disabled")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAFAFA))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BrandLogo(size = 32)
            Column {
                Text(
                    text = "Protected Chatbots",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.02).sp,
                    color = Color(0xFF0A0A0A)
                )
                Text(
                    text = "Litigo operates only within these environments",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(chatbots) { (name, enabled, status) ->
                var isEnabled by remember { mutableStateOf(enabled) }
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = name,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF0A0A0A)
                            )
                            Text(
                                text = status,
                                fontSize = 11.sp,
                                color = Color(0xFF6B7280),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                        androidx.compose.material3.Switch(
                            checked = isEnabled,
                            onCheckedChange = { isEnabled = it },
                            colors = androidx.compose.material3.SwitchDefaults.colors(
                                checkedTrackColor = Color(0xFF166534)
                            )
                        )
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun SettingsScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAFAFA))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BrandLogo(size = 32)
            Column {
                Text(
                    text = "Settings",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.02).sp,
                    color = Color(0xFF0A0A0A)
                )
                Text(
                    text = "Configure Litigo behavior",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                SettingsGroup("General") {
                    SettingRow("Notifications", "Show system notifications", true)
                }
            }
            item {
                SettingsGroup("Privacy") {
                    SettingRow("Local processing only", "All evaluation happens on device", true, isStatic = true)
                    SettingRow("Help improve Litigo", "Anonymous usage statistics", false)
                }
            }
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0x1AB45309)),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            BrandLogo(size = 20)
                            Text(
                                text = "iOS Platform Limitations",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFB45309)
                            )
                        }
                        Text(
                            text = "On iPhone, Litigo works through a custom keyboard. Due to iOS platform restrictions, Litigo cannot automatically monitor chatbot responses. Switch to the Litigo keyboard inside your chatbot app to analyze responses.",
                            fontSize = 12.sp,
                            color = Color(0xFF6B7280),
                            lineHeight = 18.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun SettingsGroup(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
        Text(
            text = title.uppercase(),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF6B7280),
            letterSpacing = 0.12.sp,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            content()
        }
    }
}

@Composable
fun SettingRow(label: String, desc: String, checked: Boolean, isStatic: Boolean = false) {
    var isChecked by remember { mutableStateOf(checked) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color(0xFF0A0A0A))
            Text(text = desc, fontSize = 12.sp, color = Color(0xFF6B7280), modifier = Modifier.padding(top = 2.dp))
        }
        if (isStatic) {
            Text(
                text = "Always on",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF166534)
            )
        } else {
            androidx.compose.material3.Switch(
                checked = isChecked,
                onCheckedChange = { isChecked = it },
                colors = androidx.compose.material3.SwitchDefaults.colors(
                    checkedTrackColor = Color(0xFF166534)
                )
            )
        }
    }
}
