// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::sync::Mutex;

struct AppState {
    litigo_active: Mutex<bool>,
}

#[tauri::command]
fn get_litigo_status(state: tauri::State<AppState>) -> bool {
    *state.litigo_active.lock().unwrap()
}

#[tauri::command]
fn toggle_litigo(state: tauri::State<AppState>, enabled: bool) -> bool {
    *state.litigo_active.lock().unwrap() = enabled;
    enabled
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            litigo_active: Mutex::new(true),
        })
        .invoke_handler(tauri::generate_handler![
            get_litigo_status,
            toggle_litigo,
        ])
        .setup(|app| {
            // System tray / menu bar setup
            #[cfg(target_os = "macos")]
            {
                // macOS menu bar extra would be configured here
                // Requires additional tauri-plugin-menu-bar or similar
            }

            #[cfg(target_os = "windows")]
            {
                // Windows system tray setup
                let _tray = tauri::SystemTray::new();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Litigo application");
}
