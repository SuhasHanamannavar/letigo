package com.litigo.android.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log
import com.litigo.android.data.SupportedChatbot
import com.litigo.android.engine.RuleEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Litigo Accessibility Service
 *
 * Detects when the user is inside a supported chatbot application,
 * extracts AI response text from the accessibility node tree,
 * and evaluates responses against user rules using the local rule engine.
 *
 * This is the legitimate Android mechanism for observing UI content.
 * Litigo only processes text from explicitly supported chatbot packages.
 */
class LitigoAccessibilityService : AccessibilityService() {

    private val TAG = "LitigoAccessibility"
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var currentPackage: String? = null
    private var lastResponseHash: Int = 0
    private var ruleEngine: RuleEngine? = null
    private var overlayController: OverlayController? = null

    // Supported chatbot packages
    private val supportedChatbots = mapOf(
        "com.openai.chatgpt" to SupportedChatbot("chatgpt", "ChatGPT", true),
        "com.anthropic.claude" to SupportedChatbot("claude", "Claude", true),
        "com.google.android.apps.bard" to SupportedChatbot("gemini", "Gemini", true),
        "ai.perplexity.android" to SupportedChatbot("perplexity", "Perplexity", false),
        "com.microsoft.copilot" to SupportedChatbot("copilot", "Copilot", true),
        "com.x.android" to SupportedChatbot("grok", "Grok", false),
        // Also support browsers where users may access web versions
        "com.android.chrome" to SupportedChatbot("chrome", "Chrome", true),
        "org.mozilla.firefox" to SupportedChatbot("firefox", "Firefox", false)
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "Litigo Accessibility Service connected")

        ruleEngine = RuleEngine(applicationContext)
        overlayController = OverlayController(applicationContext)

        serviceInfo = serviceInfo.apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return

        val packageName = event.packageName?.toString() ?: return
        val chatbot = supportedChatbots[packageName] ?: return

        if (!chatbot.enabled) return

        // Track current app
        if (packageName != currentPackage) {
            currentPackage = packageName
            Log.d(TAG, "Entered supported chatbot: ${chatbot.name}")
            overlayController?.showIndicator(chatbot.id, chatbot.name)
        }

        // Handle content changes (potential new AI response)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {

            // Debounce to avoid excessive processing during streaming
            serviceScope.launch {
                delay(800) // Wait for streaming to pause

                val rootNode = rootInActiveWindow ?: return@launch
                val responseText = extractResponseText(rootNode, chatbot.id)

                if (responseText.length >= 20) {
                    val hash = responseText.hashCode()
                    if (hash != lastResponseHash) {
                        lastResponseHash = hash
                        evaluateResponse(responseText, chatbot)
                    }
                }

                rootNode.recycle()
            }
        }
    }

    /**
     * Extract AI response text from the accessibility node tree.
     * Uses heuristics to find the most recent assistant message.
     */
    private fun extractResponseText(root: AccessibilityNodeInfo, chatbotId: String): String {
        val textNodes = mutableListOf<String>()

        // Traverse the node tree collecting text
        traverseNodes(root, textNodes)

        // For chatbots, the last substantial text block is likely the AI response
        val substantialTexts = textNodes.filter { it.split("\\s+").size >= 10 }
        return substantialTexts.lastOrNull() ?: textNodes.lastOrNull() ?: ""
    }

    private fun traverseNodes(node: AccessibilityNodeInfo, collected: MutableList<String>) {
        try {
            node.text?.let { text ->
                if (text.isNotBlank()) {
                    collected.add(text.toString())
                }
            }

            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { child ->
                    traverseNodes(child, collected)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            // Node may become stale during traversal
        }
    }

    private fun evaluateResponse(text: String, chatbot: SupportedChatbot) {
        val engine = ruleEngine ?: return
        val status = engine.evaluate(text, chatbot.id)

        Log.d(TAG, "Evaluated response for ${chatbot.name}: ${status.score}% compliance, " +
                "${status.violations} violations, ${status.warnings} warnings")

        // Update floating overlay with compliance status
        overlayController?.updateCompliance(status)

        // Log to local database
        serviceScope.launch(Dispatchers.IO) {
            engine.logActivity(chatbot, status, text.take(200))
        }
    }

    override fun onInterrupt() {
        Log.i(TAG, "Litigo Accessibility Service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        overlayController?.hide()
        Log.i(TAG, "Litigo Accessibility Service destroyed")
    }

    companion object {
        var isRunning: Boolean = false
            private set
    }

    init {
        isRunning = true
    }
}
