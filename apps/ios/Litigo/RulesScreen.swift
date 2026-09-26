//
//  RulesScreen.swift
//  Litigo iOS Rules View
//

import SwiftUI
import SwiftData

struct RulesScreen: View {
    @Query(sort: \Rule.updatedAt, order: .reverse) private var rules: [Rule]
    @Environment(\.modelContext) private var modelContext
    @State private var showingNewRule = false

    var body: some View {
        NavigationStack {
            Group {
                if rules.isEmpty {
                    EmptyStateView(
                        icon: "checklist",
                        title: "No rules yet",
                        message: "Create your first rule to start enforcing AI output."
                    )
                } else {
                    List {
                        ForEach(rules) { rule in
                            RuleCard(rule: rule)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color.litigoBg)
            .navigationTitle("Rules")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                            .cornerRadius(4)
                        Text("Rules")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewRule = true }) {
                        Image(systemName: "plus")
                            .foregroundColor(Color.litigoText)
                    }
                }
            }
            .sheet(isPresented: $showingNewRule) {
                NewRuleView()
            }
        }
    }
}

struct RuleCard: View {
    let rule: Rule
    @Environment(\.modelContext) private var modelContext

    private var priorityColor: Color {
        switch rule.priority {
        case "high": return Color.litigoError
        case "medium": return Color.litigoWarning
        default: return Color.litigoMuted
        }
    }

    private var priorityBg: Color {
        priorityColor.opacity(0.10)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(rule.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color.litigoText)

                    if !rule.ruleDescription.isEmpty {
                        Text(rule.ruleDescription)
                            .font(.system(size: 13))
                            .foregroundColor(Color.litigoMuted)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Toggle("", isOn: Binding(
                    get: { rule.enabled },
                    set: { newValue in
                        rule.enabled = newValue
                        rule.updatedAt = Date()
                    }
                ))
                .labelsHidden()
                .tint(Color.litigoSuccess)
            }

            HStack(spacing: 10) {
                Text(rule.priority.capitalized)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(priorityColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(priorityBg)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Text(rule.type.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.system(size: 11))
                    .foregroundColor(Color.litigoMuted)

                Spacer()

                if rule.violationCount > 0 {
                    Text("\(rule.violationCount) violations")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundColor(Color.litigoError)
                }
            }
        }
        .padding(16)
        .background(Color.litigoCard)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.litigoBorder, lineWidth: 1)
        )
    }
}

struct NewRuleView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var ruleType = "word_count"
    @State private var priority = "medium"
    @State private var configValue = "100"

    private let ruleTypes = [
        ("word_count", "Word count limit"),
        ("formatting", "Formatting requirement"),
        ("citation", "Citation requirement"),
        ("tone", "Tone guideline"),
        ("keyword_exclude", "Exclude keywords"),
        ("keyword_require", "Require keywords")
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Rule Details") {
                    TextField("Rule name", text: $name)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3)
                }

                Section("Configuration") {
                    Picker("Rule Type", selection: $ruleType) {
                        ForEach(ruleTypes, id: \.0) { type in
                            Text(type.1).tag(type.0)
                        }
                    }

                    Picker("Priority", selection: $priority) {
                        Text("High").tag("high")
                        Text("Medium").tag("medium")
                        Text("Low").tag("low")
                    }

                    TextField("Configuration value", text: $configValue)
                }
            }
            .navigationTitle("New Rule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        createRule()
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private func createRule() {
        var config: [String: Any] = [:]
        switch ruleType {
        case "word_count":
            config["maxWords"] = Int(configValue) ?? 100
        case "formatting":
            config["format"] = configValue.isEmpty ? "bullet_points" : configValue
        case "citation":
            config["minCitations"] = Int(configValue) ?? 1
        case "tone":
            config["tone"] = configValue.isEmpty ? "professional" : configValue
        case "keyword_exclude", "keyword_require":
            config["keywords"] = configValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        default:
            config["value"] = configValue
        }

        let rule = Rule(
            name: name,
            ruleDescription: description,
            type: ruleType,
            config: config,
            priority: priority
        )
        modelContext.insert(rule)
    }
}
