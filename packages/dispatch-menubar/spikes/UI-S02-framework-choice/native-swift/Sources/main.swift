// UI-S02 native-Swift hello-world. Throwaway spike code.
//
// Demonstrates AppKit NSStatusItem tray + UserNotifications delivery.
// Swift can't import TS types directly — see schema-check.ts in this
// same subdirectory for the Node-side TS proof (the "+node bridge"
// part of this candidate: Swift handles tray/notifications, Node
// handles TypeScript business logic + contract consumption).

import Cocoa
import UserNotifications

class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    var statusItem: NSStatusItem!
    var helloCount: Int = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        print("[UI-S02/native-swift] hello-world ready")

        // Menu-bar-only; no Dock icon, no main window.
        NSApp.setActivationPolicy(.accessory)

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.title = "●"

        let menu = NSMenu()

        let helloItem = NSMenuItem(title: "Hello", action: #selector(onHello), keyEquivalent: "")
        helloItem.target = self
        menu.addItem(helloItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit", action: #selector(onQuit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu

        // UserNotifications is the modern API; needs authorization.
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    @objc func onHello() {
        helloCount += 1
        statusItem.button?.title = "● \(helloCount)"

        let content = UNMutableNotificationContent()
        content.title = "UI-S02 Native Swift"
        content.body = "Hello #\(helloCount) fired from Swift tray"
        let req = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(req) { _ in }
    }

    @objc func onQuit() {
        NSApp.terminate(nil)
    }

    // Show notifications even when app is focused.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
