package com.litigo.android.engine

import android.content.Context
import com.litigo.android.data.SupportedChatbot
import com.litigo.android.data.repository.RuleRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/**
 * Android Rule Engine
 *
 * Evaluates chatbot responses against user-defined rules.
 * This is the Android port of the shared Litigo rule engine.
 * All processing happens locally on the device.
 */
class RuleEngine(context: Context) {

    private val repository = RuleRepository(context)
    private var rules: List<Rule> = runBlocking { repository.getActiveRules().first() }

    fun refreshRules() {
        rules = runBlocking { repository.getActiveRules().first() }
    }

    fun evaluate(responseText: String, chatbotId: String?): ComplianceStatus {
        val applicableRules = chatbotId?.let { id ->
            rules.filter { it.appliedTo.isEmpty() || it.appliedTo.contains(id) }
        } ?: rules

        val evaluations = applicableRules.map { rule ->
            evaluateRule(rule, responseText)
        }

        val passed = evaluations.count { it.result == EvaluationResult.PASSED }
        val warnings = evaluations.count { it.result == EvaluationResult.WARNING }
        val violations = evaluations.count { it.result == EvaluationResult.VIOLATED }
        val applicable = evaluations.count { it.result != EvaluationResult.NOT_APPLICABLE }

        val score = if (applicable > 0) {
            ((passed + warnings * 0.5) / applicable * 100).toInt()
        } else 100

        return ComplianceStatus(
            score = score,
            totalRules = applicableRules.size,
            passed = passed,
            warnings = warnings,
            violations = violations,
            evaluations = evaluations
        )
    }

    private fun evaluateRule(rule: Rule, text: String): RuleEvaluation {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) {
            return RuleEvaluation(rule.id, rule.name, EvaluationResult.NOT_APPLICABLE, 0)
        }

        return when (rule.type) {
            RuleType.WORD_COUNT -> evaluateWordCount(rule, trimmed)
            RuleType.FORMATTING -> evaluateFormatting(rule, trimmed)
            RuleType.CITATION -> evaluateCitation(rule, trimmed)
            RuleType.TONE -> evaluateTone(rule, trimmed)
            RuleType.KEYWORD_EXCLUDE -> evaluateKeywordExclude(rule, trimmed)
            RuleType.KEYWORD_REQUIRE -> evaluateKeywordRequire(rule, trimmed)
            else -> RuleEvaluation(rule.id, rule.name, EvaluationResult.NOT_APPLICABLE, 0)
        }
    }

    private fun evaluateWordCount(rule: Rule, text: String): RuleEvaluation {
        val words = text.split("\\s+").filter { it.isNotBlank() }.size
        val maxWords = rule.config["maxWords"] as? Int ?: 100

        return if (words > maxWords) {
            RuleEvaluation(
                ruleId = rule.id,
                ruleName = rule.name,
                result = EvaluationResult.VIOLATED,
                severity = ((words - maxWords).toFloat() / maxWords * 100).toInt().coerceAtMost(100),
                details = "Detected $words words, limit is $maxWords"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0, "$words words")
        }
    }

    private fun evaluateFormatting(rule: Rule, text: String): RuleEvaluation {
        val format = rule.config["format"] as? String ?: "bullet_points"
        val hasBullets = text.contains(Regex("^\\s*[-*•]\\s", RegexOption.MULTILINE)) ||
                text.contains(Regex("^\\s*\\d+\\.\\s", RegexOption.MULTILINE))

        return if (!hasBullets && text.split("\\s+").size > 30) {
            RuleEvaluation(
                rule.id, rule.name, EvaluationResult.VIOLATED, 60,
                "No bullet points or numbered lists detected"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0)
        }
    }

    private fun evaluateCitation(rule: Rule, text: String): RuleEvaluation {
        val citationPatterns = listOf(
            Regex("\\[\\d+\\]"),
            Regex("\\([A-Z][a-z]+,\\s*\\d{4}\\)"),
            Regex("https?://[^\\s)]+"),
            Regex("according to", RegexOption.IGNORE_CASE),
            Regex("source:", RegexOption.IGNORE_CASE)
        )

        val found = citationPatterns.sumOf { pattern ->
            pattern.findAll(text).count()
        }

        val minCitations = rule.config["minCitations"] as? Int ?: 1

        return if (found < minCitations && text.split("\\s+").size > 40) {
            RuleEvaluation(
                rule.id, rule.name, EvaluationResult.VIOLATED, 70,
                "No citation indicators found in substantial response"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0, "$found citation indicator(s)")
        }
    }

    private fun evaluateTone(rule: Rule, text: String): RuleEvaluation {
        val tone = rule.config["tone"] as? String ?: "professional"
        val lower = text.lowercase()

        val informalMarkers = listOf("gonna", "wanna", "gotta", "yo", "hey", "cool", "awesome", "totally")
        val hits = informalMarkers.count { lower.contains(it) }

        return if (tone == "professional" && hits >= 3) {
            RuleEvaluation(
                rule.id, rule.name, EvaluationResult.WARNING,
                (hits * 15).coerceAtMost(60),
                "$hits informal language marker(s) detected"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0)
        }
    }

    private fun evaluateKeywordExclude(rule: Rule, text: String): RuleEvaluation {
        val keywords = rule.config["keywords"] as? List<String> ?: emptyList()
        val lower = text.lowercase()
        val found = keywords.filter { lower.contains(it.lowercase()) }

        return if (found.isNotEmpty()) {
            RuleEvaluation(
                rule.id, rule.name, EvaluationResult.VIOLATED,
                (found.size * 40).coerceAtMost(100),
                "Excluded keyword(s) found: ${found.joinToString(", ")}"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0)
        }
    }

    private fun evaluateKeywordRequire(rule: Rule, text: String): RuleEvaluation {
        val keywords = rule.config["keywords"] as? List<String> ?: emptyList()
        val lower = text.lowercase()
        val missing = keywords.filter { !lower.contains(it.lowercase()) }

        return if (missing.isNotEmpty()) {
            RuleEvaluation(
                rule.id, rule.name, EvaluationResult.WARNING,
                (missing.size * 35).coerceAtMost(70),
                "Missing required keyword(s): ${missing.joinToString(", ")}"
            )
        } else {
            RuleEvaluation(rule.id, rule.name, EvaluationResult.PASSED, 0)
        }
    }

    suspend fun logActivity(chatbot: SupportedChatbot, status: ComplianceStatus, snippet: String) {
        // Log violations to local database
        status.evaluations
            .filter { it.result == EvaluationResult.VIOLATED || it.result == EvaluationResult.WARNING }
            .forEach { evaluation ->
                repository.logActivity(
                    chatbotId = chatbot.id,
                    chatbotName = chatbot.name,
                    ruleId = evaluation.ruleId,
                    ruleName = evaluation.ruleName,
                    result = evaluation.result.name.lowercase(),
                    complianceScore = status.score,
                    snippet = snippet
                )
            }
    }
}

// ─── Supporting Types ─────────────────────────────────────────────

data class Rule(
    val id: String,
    val name: String,
    val type: RuleType,
    val config: Map<String, Any> = emptyMap(),
    val priority: String = "medium",
    val appliedTo: List<String> = emptyList(),
    val enabled: Boolean = true
)

enum class RuleType {
    WORD_COUNT, FORMATTING, CITATION, TONE, KEYWORD_EXCLUDE, KEYWORD_REQUIRE, CUSTOM
}

data class RuleEvaluation(
    val ruleId: String,
    val ruleName: String,
    val result: EvaluationResult,
    val severity: Int,
    val details: String? = null
)

enum class EvaluationResult {
    PASSED, WARNING, VIOLATED, NOT_APPLICABLE
}

data class ComplianceStatus(
    val score: Int,
    val totalRules: Int,
    val passed: Int,
    val warnings: Int,
    val violations: Int,
    val evaluations: List<RuleEvaluation> = emptyList()
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        parcel.readInt(),
        parcel.readInt(),
        parcel.readInt(),
        parcel.readInt(),
        parcel.readInt(),
        parcel.createTypedArrayList(CREATOR) ?: emptyList()
    )

    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeInt(score)
        parcel.writeInt(totalRules)
        parcel.writeInt(passed)
        parcel.writeInt(warnings)
        parcel.writeInt(violations)
        parcel.writeTypedList(evaluations)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : android.os.Parcelable.Creator<ComplianceStatus> {
        override fun createFromParcel(parcel: android.os.Parcel): ComplianceStatus = ComplianceStatus(parcel)
        override fun newArray(size: Int): Array<ComplianceStatus?> = arrayOfNulls(size)
    }
}
