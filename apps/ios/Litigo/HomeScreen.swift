//
//  HomeScreen.swift
//  Litigo iOS Home View
//

import SwiftUI
import SwiftData

struct HomeScreen: View {
    @Query(sort: \Rule.updatedAt, order: .reverse) private var rules: [Rule]
    @Query(sort: \ActivityEvent.timestamp, order: .reverse) private var activity: [ActivityEvent]
    @Query(filter: #Predicate<ChatbotConfig> { $0.enabled == true }) private var enabledChatbots: [ChatbotConfig]

    private var activeRules: [Rule] { rules.filter { $0.enabled } }
    private var todayActivity: [ActivityEvent] {
        let calendar = Calendar.current
        return activity.filter { calendar.isDateInToday($0.timestamp) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Brand Header with Logo
                    HStack(spacing: 12) {
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 36, height: 36)
                            .cornerRadius(8)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Litigo")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(Color.litigoText)
                            Text("AI Rule Enforcement")
                                .font(.system(size: 12))
                                .foregroundColor(Color.litigoMuted)
                                .tracking(0.8)
                        }
                    }
                    .padding(.bottom, 4)

                    // Protection Status
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.litigoSuccess)
                            .frame(width: 8, height: 8)
                        Text("Protection active")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color.litigoSuccess)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.litigoSuccess.opacity(0.10))
                    .clipShape(Capsule())

                    // Compliance Score
                    HStack(spacing: 24) {
                        ZStack {
                            Circle()
                                .stroke(Color.litigoSuccess, lineWidth: 3)
                                .frame(width: 100, height: 100)
                            VStack(spacing: 2) {
                                Text("93")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(Color.litigoSuccess)
                                Text("Compliance")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color.litigoMuted)
                                    .textCase(.uppercase)
                                    .tracking(0.8)
                            }
                        }

                        VStack(spacing: 16) {
                            HStack {
                                StatBox(value: "24", label: "Rules checked today")
                                Spacer()
                                StatBox(value: "2", label: "Violations", color: Color.litigoError)
                            }
                            HStack {
                                StatBox(value: "6", label: "Protected conversations")
                                Spacer()
                            }
                        }
                    }
                    .padding(20)
                    .background(Color.litigoCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.litigoBorder, lineWidth: 1)
                    )

                    // Protected Chatbots
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Protected Chatbots")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color.litigoMuted)
                            .textCase(.uppercase)
                            .tracking(1.2)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(enabledChatbots) { chatbot in
                                    HStack(spacing: 6) {
                                        Circle()
                                            .fill(Color.litigoSuccess)
                                            .frame(width: 6, height: 6)
                                        Text(chatbot.name)
                                            .font(.system(size: 12, weight: .medium))
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 6)
                                    .background(Color.litigoCard)
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.litigoBorder, lineWidth: 1)
                                    )
                                }
                            }
                        }
                    }

                    // Recent Activity
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Activity")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color.litigoMuted)
                            .textCase(.uppercase)
                            .tracking(1.2)

                        if activity.isEmpty {
                            EmptyStateView(
                                icon: "clock",
                                title: "No activity yet",
                                message: "Activity will appear here once Litigo evaluates responses."
                            )
                        } else {
                            VStack(spacing: 0) {
                                ForEach(activity.prefix(5)) { event in
                                    ActivityRow(event: event)
                                    if event.id != activity.prefix(5).last?.id {
                                        Divider()
                                            .background(Color.litigoBorder)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .background(Color.litigoCard)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.litigoBorder, lineWidth: 1)
                            )
                        }
                    }

                    // iOS Limitation Notice
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "info.circle")
                                .foregroundColor(Color.litigoAccent)
                            Text("Using Litigo on iPhone")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        Text("On iPhone, Litigo works through a custom keyboard. Switch to the Litigo keyboard inside your chatbot app to analyze responses. Due to iOS platform restrictions, Litigo cannot automatically monitor chatbot responses.")
                            .font(.system(size: 13))
                            .foregroundColor(Color.litigoMuted)
                            .lineSpacing(2)
                    }
                    .padding(16)
                    .background(Color.litigoAccent.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.litigoAccent.opacity(0.2), lineWidth: 1)
                    )
                }
                .padding(20)
            }
            .background(Color.litigoBg)
            .navigationTitle("Litigo")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct StatBox: View {
    let value: String
    let label: String
    var color: Color = Color.litigoText

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Color.litigoMuted)
        }
    }
}

struct ActivityRow: View {
    let event: ActivityEvent

    private var resultColor: Color {
        switch event.result {
        case "passed": return Color.litigoSuccess
        case "warning": return Color.litigoWarning
        case "violated": return Color.litigoError
        default: return Color.litigoMuted
        }
    }

    private var resultLabel: String {
        switch event.result {
        case "passed": return "Passed"
        case "warning": return "Warning"
        case "violated": return "Violation"
        default: return event.result.capitalized
        }
    }

    var body: some View {
        HStack(spacing: 16) {
            Text(event.timestamp, style: .time)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(Color.litigoMuted)
                .frame(width: 50, alignment: .leading)

            Text(event.chatbotName)
                .font(.system(size: 13, weight: .medium))
                .frame(width: 80, alignment: .leading)

            Text(event.ruleName ?? "—")
                .font(.system(size: 13))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(resultLabel)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(resultColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 3)
                .background(resultColor.opacity(0.10))
                .clipShape(Capsule())
        }
        .padding(.vertical, 12)
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(Color.litigoMuted.opacity(0.5))
            Text(title)
                .font(.system(size: 14, weight: .semibold))
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(Color.litigoMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}
