package com.bethratfikra.mirab

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * مِعْراب — غلاف WebView يحمّل موقع التطبيق من أصول التطبيق (offline بالكامل).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#f4f1ea"))
        // يُمكّن نوافذ JS (alert/confirm) كشبكة أمان؛ التطبيق يعتمد أساسًا على نوافذ داخلية
        web.webChromeClient = WebChromeClient()
        setContentView(web)

        with(web.settings) {
            javaScriptEnabled = true          // التطبيق يعتمد على JS
            domStorageEnabled = true          // لحفظ التقدّم (localStorage)
            cacheMode = WebSettings.LOAD_DEFAULT
            textZoom = 100
            allowFileAccess = true
        }

        web.loadUrl("file:///android_asset/index.html")

        // زر الرجوع يتنقّل داخل صفحات الويب أولًا
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) {
                    web.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
}
