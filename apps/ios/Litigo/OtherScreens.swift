//
//  ActivityScreen.swift & SettingsScreen.swift
//  Litigo iOS
//

import SwiftUI
import SwiftData

// ─── Activity Screen ──────────────────────────────────────────────

struct ActivityScreen: View {
    @Query(sort: \ActivityEvent.timestamp, order: .reverse) private var activity: [ActivityEvent]
    @State private var filter: String = "all"

    private let filters = [
        ("all", "All"),
        ("passed", "Passed"),
        ("warning", "Warnings"),
        ("violated", "Violations")
    ]

    private var filteredActivity: [ActivityEvent] {
        if filter == "all" { return activity }
        return activity.filter { $0.result == filter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filters, id: \.0) { f in
                            Button(action: { filter = f.0 }) {
                                Text(f.1)
                                    .font(.system(size: 13, weight: .medium))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .foregroundColor(filter == f.0 ? Color.litigoBg : Color.litigoMuted)
                                    .background(filter == f.0 ? Color.litigoText : Color.clear)
                                    .overlay(
                                        Capsule()
                                            .stroke(filter == f.0 ? Color.litigoText : Color.litigoBorder, lineWidth: 1)
                                    )
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .background(Color.litigoBg)

                if filteredActivity.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: "clock",
                        title: "No activity",
                        message: "Evaluated responses will appear here."
                    )
                    Spacer()
                } else {
                    List {
                        ForEach(filteredActivity) { event in
                            ActivityRow(event: event)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color.litigoBg)
            .navigationTitle("Activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                            .cornerRadius(4)
                        Text("Activity")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
            }
        }
    }
}

// ─── Settings Screen ─────────────────────────────────────────────

struct SettingsScreen: View {
    @Query private var chatbots: [ChatbotConfig]
    @Environment(\.modelContext) private var modelContext

    @State private var notificationsEnabled = true
    @State private var telemetryEnabled = false
    @State private var launchAtStartup = false

    var body: some View {
        NavigationStack {
            List {
                // Account
                Section {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.litigoAccent.opacity(0.10))
                                .frame(width: 44, height: 44)
                            Text("L")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(Color.litigoAccent)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Not signed in")
                                .font(.system(size: 15, weight: .semibold))
                            Text("Sign in to sync rules across devices")
                                .font(.system(size: 13))
                                .foregroundColor(Color.litigoMuted)
                        }
                        Spacer()
                        Button("Sign in") {}
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .padding(.vertical, 4)
                }

                // Protected Chatbots
                Section("Protected Chatbots") {
                    ForEach(chatbots) { chatbot in
                        HStack {
                            Text(chatbot.name)
                                .font(.system(size: 14))
                            Spacer()
                            Toggle("", isOn: Binding(
                                get: { chatbot.enabled },
                                set: { chatbot.enabled = $0 }
                            ))
                            .labelsHidden()
                            .tint(Color.litigoSuccess)
                        }
                    }
                }

                // General
                Section("General") {
                    Toggle("Notifications", isOn: $notificationsEnabled)
                        .tint(Color.litigoSuccess)
                }

                // Privacy
                Section("Privacy") {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Local processing only")
                                .font(.system(size: 14))
                            Text("All rule evaluation happens on your device")
                                .font(.system(size: 12))
                                .foregroundColor(Color.litigoMuted)
                        }
                        Spacer()
                        Text("Always on")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.litigoSuccess)
                    }

                    Toggle("Help improve Litigo", isOn: $telemetryEnabled)
                        .tint(Color.litigoSuccess)
                } footer: {
                    Text("Send anonymous usage statistics. No conversation content is ever transmitted.")
                        .font(.system(size: 12))
                }

                // About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(Color.litigoMuted)
                            .font(.system(size: 13, design: .monospaced))
                    }
                    Link("Documentation", destination: URL(string: "https://litigo-ai.vercel.app/")!)
                        .foregroundColor(Color.litigoText)
                }

                // iOS Limitation
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("iOS Platform Limitations")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color.litigoAccent)
                        Text("On iPhone, Litigo works through a custom keyboard. It cannot automatically monitor chatbot responses due to iOS platform restrictions. Switch to the Litigo keyboard inside your chatbot app to analyze responses.")
                            .font(.system(size: 12))
                            .foregroundColor(Color.litigoMuted)
                            .lineSpacing(2)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                            .cornerRadius(4)
                        Text("Settings")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
            }
        }
    }
}
