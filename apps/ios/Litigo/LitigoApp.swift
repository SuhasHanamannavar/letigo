//
//  LitigoApp.swift
//  Litigo
//
//  Litigo for iOS — AI Rule Enforcement
//

import SwiftUI
import SwiftData

@main
struct LitigoApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(
                for: Rule.self, ActivityEvent.self, ChatbotConfig.self, UserSettings.self
            )
        } catch {
            fatalError("Failed to initialize SwiftData container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .modelContainer(container)
                .onAppear {
                    // Initialize default chatbots on first launch
                    initializeDefaultChatbots()
                }
        }
    }

    private func initializeDefaultChatbots() {
        // Check if already initialized via UserDefaults
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: "chatbotsInitialized") else { return }

        let context = container.mainContext
        let defaultsChatbots = [
            ("chatgpt", "ChatGPT", "com.openai.chatgpt", true),
            ("claude", "Claude", "com.anthropic.claude", true),
            ("gemini", "Gemini", "com.google.bard", true),
            ("perplexity", "Perplexity", "ai.perplexity.ios", false),
            ("copilot", "Copilot", "com.microsoft.copilot", true),
            ("grok", "Grok", "com.x.grok", false)
        ]

        defaultsChatbots.forEach { id, name, bundleId, enabled in
            let cb = ChatbotConfig(id: id, name: name, bundleId: bundleId, enabled: enabled)
            context.insert(cb)
        }

        defaults.set(true, forKey: "chatbotsInitialized")
    }
}

// ─── Main Tab Navigation ─────────────────────────────────────────

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeScreen()
                .tabItem {
                    Image(systemName: "house")
                    Text("Home")
                }

            RulesScreen()
                .tabItem {
                    Image(systemName: "checklist")
                    Text("Rules")
                }

            ActivityScreen()
                .tabItem {
                    Image(systemName: "clock")
                    Text("Activity")
                }

            SettingsScreen()
                .tabItem {
                    Image(systemName: "gearshape")
                    Text("Settings")
                }
        }
        .tint(Color(red: 0.04, green: 0.04, blue: 0.04))
    }
}

// ─── App Colors ──────────────────────────────────────────────────

extension Color {
    static let litigoBg = Color(red: 0.98, green: 0.98, blue: 0.98)
    static let litigoCard = Color.white
    static let litigoText = Color(red: 0.04, green: 0.04, blue: 0.04)
    static let litigoMuted = Color(red: 0.42, green: 0.45, blue: 0.50)
    static let litigoAccent = Color(red: 0.71, green: 0.33, blue: 0.04)
    static let litigoSuccess = Color(red: 0.09, green: 0.40, blue: 0.20)
    static let litigoWarning = Color(red: 0.57, green: 0.25, blue: 0.05)
    static let litigoError = Color(red: 0.60, green: 0.11, blue: 0.11)
    static let litigoBorder = Color.black.opacity(0.08)
}

// ─── SwiftData Models ────────────────────────────────────────────

@Model
final class Rule {
    var id: String
    var name: String
    var ruleDescription: String
    var type: String
    var configData: Data
    var priority: String
    var category: String
    var enabled: Bool
    var violationCount: Int
    var createdAt: Date
    var updatedAt: Date

    init(id: String = UUID().uuidString,
         name: String,
         ruleDescription: String = "",
         type: String,
         config: [String: Any] = [:],
         priority: String = "medium",
         category: String = "general",
         enabled: Bool = true,
         violationCount: Int = 0) {
        self.id = id
        self.name = name
        self.ruleDescription = ruleDescription
        self.type = type
        self.configData = (try? JSONSerialization.data(withJSONObject: config)) ?? Data()
        self.priority = priority
        self.category = category
        self.enabled = enabled
        self.violationCount = violationCount
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    func configDict() -> [String: Any] {
        (try? JSONSerialization.jsonObject(with: configData) as? [String: Any]) ?? [:]
    }
}

@Model
final class ActivityEvent {
    var id: String
    var timestamp: Date
    var chatbotId: String
    var chatbotName: String
    var ruleId: String?
    var ruleName: String?
    var result: String
    var complianceScore: Int
    var responseSnippet: String?

    init(id: String = UUID().uuidString,
         timestamp: Date = Date(),
         chatbotId: String,
         chatbotName: String,
         ruleId: String? = nil,
         ruleName: String? = nil,
         result: String,
         complianceScore: Int,
         responseSnippet: String? = nil) {
        self.id = id
        self.timestamp = timestamp
        self.chatbotId = chatbotId
        self.chatbotName = chatbotName
        self.ruleId = ruleId
        self.ruleName = ruleName
        self.result = result
        self.complianceScore = complianceScore
        self.responseSnippet = responseSnippet
    }
}

@Model
final class ChatbotConfig {
    var id: String
    var name: String
    var bundleId: String
    var enabled: Bool

    init(id: String, name: String, bundleId: String, enabled: Bool) {
        self.id = id
        self.name = name
        self.bundleId = bundleId
        self.enabled = enabled
    }
}

@Model
final class UserSettings {
    var key: String
    var value: String

    init(key: String, value: String) {
        self.key = key
        self.value = value
    }
}
