package com.litigo.android.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.litigo.android.R
import com.litigo.android.engine.ComplianceStatus
import kotlin.math.abs

/**
 * Floating Overlay Service
 *
 * Displays a compact, movable Litigo indicator on top of supported chatbot apps.
 * Tapping the indicator expands it to show compliance details.
 *
 * Requires SYSTEM_ALERT_WINDOW permission.
 */
class FloatingOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var indicatorView: View? = null
    private var expandedView: View? = null
    private var isExpanded = false
    private var currentChatbotId: String? = null
    private var currentChatbotName: String? = null

    private val indicatorLayoutParams by lazy {
        WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = 16
            y = 100
        }
    }

    private val expandedLayoutParams by lazy {
        WindowManager.LayoutParams(
            (resources.displayMetrics.widthPixels * 0.85).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 80
        }
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val chatbotId = intent.getStringExtra(EXTRA_CHATBOT_ID)
                val chatbotName = intent.getStringExtra(EXTRA_CHATBOT_NAME)
                showIndicator(chatbotId, chatbotName)
            }
            ACTION_HIDE -> hide()
            ACTION_UPDATE_COMPLIANCE -> {
                val status = intent.getParcelableExtra<ComplianceStatus>(EXTRA_COMPLIANCE_STATUS)
                status?.let { updateCompliance(it) }
            }
        }
        return START_STICKY
    }

    private fun showIndicator(chatbotId: String?, chatbotName: String?) {
        currentChatbotId = chatbotId
        currentChatbotName = chatbotName

        if (indicatorView == null) {
            indicatorView = LayoutInflater.from(this).inflate(R.layout.litigo_overlay_indicator, null)
            setupIndicatorTouch()
            indicatorView?.setOnClickListener { toggleExpanded() }
        }

        indicatorView?.findViewById<TextView>(R.id.chatbotName)?.text = chatbotName ?: "Litigo"

        try {
            if (indicatorView?.parent == null) {
                windowManager.addView(indicatorView, indicatorLayoutParams)
            }
        } catch (e: Exception) {
            // Window manager may throw if permission not granted
        }
    }

    private fun setupIndicatorTouch() {
        val view = indicatorView ?: return
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = indicatorLayoutParams.x
                    initialY = indicatorLayoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()

                    // Only move if actually dragged (not just tap)
                    if (abs(dx) > 5 || abs(dy) > 5) {
                        indicatorLayoutParams.x = initialX - dx
                        indicatorLayoutParams.y = initialY + dy
                        try {
                            windowManager.updateViewLayout(view, indicatorLayoutParams)
                        } catch (_: Exception) {}
                        true
                    } else false
                }
                else -> false
            }
        }
    }

    private fun toggleExpanded() {
        if (isExpanded) {
            collapse()
        } else {
            expand()
        }
    }

    private fun expand() {
        isExpanded = true
        indicatorView?.visibility = View.GONE

        if (expandedView == null) {
            expandedView = LayoutInflater.from(this).inflate(R.layout.litigo_overlay_expanded, null)
            expandedView?.findViewById<View>(R.id.btnClose)?.setOnClickListener { collapse() }
            expandedView?.findViewById<View>(R.id.btnMinimize)?.setOnClickListener { collapse() }
        }

        try {
            if (expandedView?.parent == null) {
                windowManager.addView(expandedView, expandedLayoutParams)
            }
        } catch (_: Exception) {}
    }

    private fun collapse() {
        isExpanded = false
        try {
            expandedView?.let {
                if (it.parent != null) windowManager.removeView(it)
            }
        } catch (_: Exception) {}
        indicatorView?.visibility = View.VISIBLE
    }

    fun updateCompliance(status: ComplianceStatus) {
        indicatorView?.findViewById<TextView>(R.id.complianceScore)?.text = "${status.score}%"
        indicatorView?.findViewById<LinearLayout>(R.id.indicatorRoot)?.setBackgroundResource(
            when {
                status.violations > 0 -> R.drawable.indicator_bg_error
                status.warnings > 0 -> R.drawable.indicator_bg_warning
                else -> R.drawable.indicator_bg_success
            }
        )

        expandedView?.findViewById<TextView>(R.id.expandedScore)?.text = "${status.score}%"
        expandedView?.findViewById<TextView>(R.id.expandedPassed)?.text = "${status.passed}"
        expandedView?.findViewById<TextView>(R.id.expandedWarnings)?.text = "${status.warnings}"
        expandedView?.findViewById<TextView>(R.id.expandedViolations)?.text = "${status.violations}"
    }

    private fun hide() {
        try {
            indicatorView?.let { if (it.parent != null) windowManager.removeView(it) }
            expandedView?.let { if (it.parent != null) windowManager.removeView(it) }
        } catch (_: Exception) {}
        indicatorView = null
        expandedView = null
        stopSelf()
    }

    private fun createNotification(): Notification {
        val channelId = "litigo_overlay_service"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Litigo Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Indicates Litigo is actively protecting your chatbot conversations"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }

        return Notification.Builder(this, channelId)
            .setContentTitle("Litigo Active")
            .setContentText("Protecting chatbot conversations")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(Notification.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        hide()
        super.onDestroy()
    }

    companion object {
        const val ACTION_SHOW = "com.litigo.action.SHOW_OVERLAY"
        const val ACTION_HIDE = "com.litigo.action.HIDE_OVERLAY"
        const val ACTION_UPDATE_COMPLIANCE = "com.litigo.action.UPDATE_COMPLIANCE"

        const val EXTRA_CHATBOT_ID = "chatbot_id"
        const val EXTRA_CHATBOT_NAME = "chatbot_name"
        const val EXTRA_COMPLIANCE_STATUS = "compliance_status"

        private const val NOTIFICATION_ID = 1001

        fun start(context: Context, chatbotId: String, chatbotName: String) {
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = ACTION_SHOW
                putExtra(EXTRA_CHATBOT_ID, chatbotId)
                putExtra(EXTRA_CHATBOT_NAME, chatbotName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = ACTION_HIDE
            }
            context.startService(intent)
        }
    }
}
