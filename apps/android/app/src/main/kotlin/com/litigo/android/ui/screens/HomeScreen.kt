package com.litigo.android.ui.screens

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.litigo.android.R

/**
 * Reusable Litigo brand logo composable
 */
@Composable
fun BrandLogo(modifier: Modifier = Modifier, size: Int = 28) {
    Image(
        painter = painterResource(id = R.drawable.ic_logo_small),
        contentDescription = "Litigo",
        modifier = modifier
            .size(size.dp)
            .clip(RoundedCornerShape(6.dp)),
        contentScale = ContentScale.Fit
    )
}

@Composable
fun HomeScreen() {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAFAFA))
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(24.dp))

            // Brand Header with Logo
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                BrandLogo(size = 36)
                Column {
                    Text(
                        text = "Litigo",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.02).sp,
                        color = Color(0xFF0A0A0A)
                    )
                    Text(
                        text = "AI Rule Enforcement",
                        fontSize = 12.sp,
                        color = Color(0xFF6B7280),
                        letterSpacing = 0.08.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Protection Status
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .background(Color(0xFFE7F5EC), RoundedCornerShape(16.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(Color(0xFF166534), CircleShape)
                )
                Text(
                    text = "Protection active",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF166534)
                )
            }
        }

        item {
            // Compliance Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    // Score Circle
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .background(Color.White, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(92.dp)
                                .background(Color.Transparent, CircleShape)
                                .clip(CircleShape)
                        )
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "93",
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF166534)
                            )
                            Text(
                                text = "Compliance",
                                fontSize = 10.sp,
                                color = Color(0xFF6B7280),
                                letterSpacing = 0.08.sp
                            )
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                            StatBox("24", "Rules checked today")
                            StatBox("2", "Violations", Color(0xFF991B1B))
                        }
                        Row {
                            StatBox("6", "Protected conversations")
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Protected Chatbots",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF6B7280),
                letterSpacing = 0.12.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ChatbotPill("ChatGPT")
                ChatbotPill("Claude")
                ChatbotPill("Gemini")
                ChatbotPill("Copilot")
            }
        }

        item {
            Text(
                text = "Recent Activity",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF6B7280),
                letterSpacing = 0.12.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column {
                    ActivityRow("10:32", "ChatGPT", "Use bullet points", "Passed", Color(0xFF166534))
                    HorizontalDivider(color = Color(0x140A0A0A), thickness = 1.dp)
                    ActivityRow("10:28", "Claude", "Always cite sources", "Violation", Color(0xFF991B1B))
                    HorizontalDivider(color = Color(0x140A0A0A), thickness = 1.dp)
                    ActivityRow("09:51", "Gemini", "Keep under 100 words", "Passed", Color(0xFF166534))
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun StatBox(value: String, label: String, color: Color = Color(0xFF0A0A0A)) {
    Column {
        Text(
            text = value,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            fontSize = 11.sp,
            color = Color(0xFF6B7280)
        )
    }
}

@Composable
fun ChatbotPill(name: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .background(Color.White, RoundedCornerShape(20.dp))
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(Color(0xFF166534), CircleShape)
        )
        Text(
            text = name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF0A0A0A)
        )
    }
}

@Composable
fun ActivityRow(time: String, chatbot: String, rule: String, result: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = time,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            color = Color(0xFF6B7280),
            modifier = Modifier.width(50.dp)
        )
        Text(
            text = chatbot,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.width(80.dp)
        )
        Text(
            text = "\"$rule\"",
            fontSize = 13.sp,
            color = Color(0xFF0A0A0A),
            modifier = Modifier.weight(1f)
        )
        Text(
            text = result,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier
                .background(color.copy(alpha = 0.10f), RoundedCornerShape(12.dp))
                .padding(horizontal = 10.dp, vertical = 3.dp)
        )
    }
}
