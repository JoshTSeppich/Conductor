// UI-S02 Tauri hello-world. Throwaway spike code.
//
// Demonstrates Tauri 2.x native tray + notification. Tauri uses OS
// WebView (WebKit on macOS), so the runtime footprint is much smaller
// than Electron.
//
// Capabilities:
//   1. Tray icon (macOS menu bar) via TrayIconBuilder
//   2. Badge count — rendered into tray title (same constraint as
//      Electron; macOS NSStatusItem has no badge property)
//   3. Menu with Hello + Quit
//   4. Notification via tauri-plugin-notification
//   5. TS proof sits in schema-check.ts (parallel to other candidates)
//   6. println! on ready

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
};
use tauri_plugin_notification::NotificationExt;

// Dynamic badge update is achievable via a shared AppHandle-captured
// tray handle; this hello-world increments a counter for the
// notification body only and omits the tray setTitle path — see ADR
// UI-S02 for the API-flux note on Tauri 2.x tray handle lookup.
static HELLO_COUNT: AtomicU32 = AtomicU32::new(0);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            println!("[UI-S02/tauri] hello-world ready");

            let hello = MenuItemBuilder::with_id("hello", "Hello").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&hello, &quit]).build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "hello" => {
                        let n = HELLO_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
                        let body = format!("Hello #{} fired from Tauri tray", n);
                        let _ = app
                            .notification()
                            .builder()
                            .title("UI-S02 Tauri")
                            .body(&body)
                            .show();
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
