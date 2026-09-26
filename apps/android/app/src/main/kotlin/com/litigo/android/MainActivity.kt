package com.litigo.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.litigo.android.ui.screens.*
import com.litigo.android.ui.theme.LitigoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LitigoTheme {
                LitigoApp()
            }
        }
    }
}

private val Archivo = FontFamily(
    Font(R.font.archivo_regular, FontWeight.Normal),
    Font(R.font.archivo_medium, FontWeight.Medium),
    Font(R.font.archivo_semibold, FontWeight.SemiBold),
    Font(R.font.archivo_bold, FontWeight.Bold)
)

@Composable
fun LitigoApp() {
    val navController = rememberNavController()
    val items = listOf(
        Screen.Home,
        Screen.Rules,
        Screen.Activity,
        Screen.Chatbots,
        Screen.Settings
    )

    Scaffold(
        containerColor = Color(0xFFFAFAFA),
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = androidx.compose.ui.unit.dp
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = {
                            Text(
                                screen.title,
                                fontFamily = Archivo,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color(0xFF0A0A0A),
                            selectedTextColor = Color(0xFF0A0A0A),
                            unselectedIconColor = Color(0xFF6B7280),
                            unselectedTextColor = Color(0xFF6B7280),
                            indicatorColor = Color(0x1AB45309)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Rules.route) { RulesScreen() }
            composable(Screen.Activity.route) { ActivityScreen() }
            composable(Screen.Chatbots.route) { ChatbotsScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
        }
    }
}

sealed class Screen(val route: String, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    object Home : Screen("home", "Home", androidx.compose.material.icons.Icons.Default.Home)
    object Rules : Screen("rules", "Rules", androidx.compose.material.icons.Icons.Default.Checklist)
    object Activity : Screen("activity", "Activity", androidx.compose.material.icons.Icons.Default.History)
    object Chatbots : Screen("chatbots", "Chatbots", androidx.compose.material.icons.Icons.Default.Apps)
    object Settings : Screen("settings", "Settings", androidx.compose.material.icons.Icons.Default.Settings)
}
