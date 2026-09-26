//
//  KeyboardViewController.swift
//  Litigo Keyboard Extension
//
//  iOS keyboard extension that provides Litigo rule enforcement
//  status inside chatbot applications.
//
//  Due to iOS platform restrictions, this is the legitimate way
//  Litigo interacts with other apps on iPhone.
//

import UIKit
import SwiftUI

class KeyboardViewController: UIInputViewController {

    private var hostingController: UIHostingController<LitigoKeyboardView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let keyboardView = LitigoKeyboardView(
            needsFullAccess: !self.hasFullAccess,
            onDismiss: { [weak self] in
                self?.advanceToNextInputMode()
            },
            onTextInsert: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            onAnalyzeClipboard: { [weak self] in
                self?.analyzeClipboard()
            }
        )

        let hostingController = UIHostingController(rootView: keyboardView)
        hostingController.view.backgroundColor = UIColor(red: 0.98, green: 0.98, blue: 0.98, alpha: 1.0)
        self.hostingController = hostingController

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func analyzeClipboard() {
        // Analyze clipboard content against rules
        // In production, this would load rules from the App Group shared container
        // and evaluate the clipboard text
        UIPasteboard.general.string.map { text in
            // Evaluation would happen here via the shared rule engine
            print("[Litigo Keyboard] Analyzing \(text.count) characters from clipboard")
        }
    }

    override func textDidChange(_ textInput: UITextInput?) {
        // React to text changes in the document proxy
    }
}

// ─── SwiftUI Keyboard View ────────────────────────────────────────

struct LitigoKeyboardView: View {
    let needsFullAccess: Bool
    let onDismiss: () -> Void
    let onTextInsert: (String) -> Void
    let onAnalyzeClipboard: () -> Void

    @State private var expanded = false
    @State private var complianceScore: Int = 93
    @State private var passed = 3
    @State private var warnings = 1
    @State private var violations = 0

    private let keyRows: [[String]] = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M"]
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Litigo Status Bar
            statusBar
                .padding(.horizontal, 8)
                .padding(.top, 6)
                .padding(.bottom, 4)

            if expanded {
                compliancePanel
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Standard keyboard keys
            VStack(spacing: 6) {
                ForEach(keyRows, id: \.self) { row in
                    HStack(spacing: 5) {
                        ForEach(row, id: \.self) { key in
                            KeyButton(title: key) {
                                onTextInsert(key.lowercased())
                            }
                        }
                    }
                }

                // Bottom row
                HStack(spacing: 5) {
                    SpecialKey(title: "next", width: 44, action: onDismiss)
                    KeyButton(title: "space", width: .infinity) {
                        onTextInsert(" ")
                    }
                    SpecialKey(title: "⌫", width: 44) {
                        // Delete last character
                    }
                }
            }
            .padding(.horizontal, 6)
            .padding(.bottom, 8)
        }
        .background(Color(red: 0.98, green: 0.98, blue: 0.98))
        .animation(.easeInOut(duration: 0.2), value: expanded)
    }

    private var statusBar: some View {
        HStack(spacing: 10) {
            Button(action: { expanded.toggle() }) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(complianceColor)
                        .frame(width: 7, height: 7)
                    Text("Litigo")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.04))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.black.opacity(0.08), lineWidth: 1)
                )
            }

            Spacer()

            Text("\(complianceScore)%")
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(complianceColor)

            Button(action: onAnalyzeClipboard) {
                Text("Analyze")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(red: 0.98, green: 0.98, blue: 0.98))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.04, green: 0.04, blue: 0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Button(action: onDismiss) {
                Image(systemName: "globe")
                    .font(.system(size: 14))
                    .foregroundColor(Color(red: 0.42, green: 0.45, blue: 0.50))
                    .frame(width: 36, height: 32)
                    .background(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.black.opacity(0.08), lineWidth: 1)
                    )
            }
        }
    }

    private var compliancePanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 16) {
                VStack(spacing: 2) {
                    Text("\(complianceScore)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(complianceColor)
                    Text("Compliance")
                        .font(.system(size: 10))
                        .foregroundColor(Color(red: 0.42, green: 0.45, blue: 0.50))
                        .textCase(.uppercase)
                        .tracking(0.8)
                }
                .frame(width: 70)

                VStack(spacing: 6) {
                    RuleStatusRow(icon: "✓", label: "Word limit", status: .passed)
                    RuleStatusRow(icon: "✓", label: "Bullet formatting", status: .passed)
                    RuleStatusRow(icon: "⚠", label: "Citation", status: .warning)
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }

    private var complianceColor: Color {
        if violations > 0 { return Color(red: 0.60, green: 0.11, blue: 0.11) }
        if warnings > 0 { return Color(red: 0.57, green: 0.25, blue: 0.05) }
        return Color(red: 0.09, green: 0.40, blue: 0.20)
    }
}

enum RuleStatus { case passed, warning, violated }

struct RuleStatusRow: View {
    let icon: String
    let label: String
    let status: RuleStatus

    private var color: Color {
        switch status {
        case .passed: return Color(red: 0.09, green: 0.40, blue: 0.20)
        case .warning: return Color(red: 0.57, green: 0.25, blue: 0.05)
        case .violated: return Color(red: 0.60, green: 0.11, blue: 0.11)
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(color)
                .frame(width: 16)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(Color(red: 0.42, green: 0.45, blue: 0.50))
        }
    }
}

struct KeyButton: View {
    let title: String
    var width: CGFloat? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 18, weight: .regular))
                .foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.04))
                .frame(maxWidth: width.map { .init($0) } ?? .infinity)
                .frame(height: 42)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .shadow(color: Color.black.opacity(0.15), radius: 0, x: 0, y: 1)
        }
    }
}

struct SpecialKey: View {
    let title: String
    var width: CGFloat = 44
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.04))
                .frame(width: width, height: 42)
                .background(Color(red: 0.88, green: 0.89, blue: 0.91))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .shadow(color: Color.black.opacity(0.15), radius: 0, x: 0, y: 1)
        }
    }
}
