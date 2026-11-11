package com.smriti.app.bridge

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import com.smriti.app.data.CachedAudioEntity
import com.smriti.app.data.SmritiDatabase
import com.smriti.app.media.SmritiMediaPlaybackService
import com.smriti.app.recorder.AudioRecorderHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

class SmritiWebBridge(
    private val context: Context,
    private val webView: WebView
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val db = SmritiDatabase.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val recorderHelper = AudioRecorderHelper(context) { amp ->
        sendEventToJs("recordingAmplitudeSample", JSONObject().put("amplitude", amp).toString())
    }

    init {
        // Setup listener on ExoPlayer if active
        mainHandler.postDelayed(object : Runnable {
            override fun run() {
                val player = SmritiMediaPlaybackService.activePlayerInstance
                if (player != null && player.isPlaying) {
                    val pos = (player.currentPosition / 1000.0)
                    val dur = (player.duration / 1000.0)
                    sendEventToJs(
                        "playbackPositionUpdated",
                        JSONObject().put("positionSeconds", pos).put("durationSeconds", dur).toString()
                    )
                }
                mainHandler.postDelayed(this, 300)
            }
        }, 300)
    }

    fun sendEventToJs(eventName: String, jsonPayload: String) {
        mainHandler.post {
            val safePayload = jsonPayload.replace("'", "\\'")
            webView.evaluateJavascript(
                "window.onSmritiNativeEvent && window.onSmritiNativeEvent('$eventName', '$safePayload');",
                null
            )
        }
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        return JSONObject().apply {
            put("isNative", true)
            put("appVersion", "1.0.0")
            put("os", "Android")
            put("sdkVersion", android.os.Build.VERSION.SDK_INT)
        }.toString()
    }

    @JavascriptInterface
    fun playAudio(audioJson: String) {
        mainHandler.post {
            try {
                val json = JSONObject(audioJson)
                val fileUrl = json.optString("file_url", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3")
                val title = json.optString("title", "Study Audio")

                val player = SmritiMediaPlaybackService.activePlayerInstance
                if (player != null) {
                    val mediaItem = MediaItem.Builder()
                        .setUri(fileUrl)
                        .setMediaId(json.optString("id", ""))
                        .build()

                    player.setMediaItem(mediaItem)
                    player.prepare()
                    player.play()

                    sendEventToJs("playbackStateChanged", JSONObject().put("isPlaying", true).toString())
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun pauseAudio() {
        mainHandler.post {
            SmritiMediaPlaybackService.activePlayerInstance?.pause()
            sendEventToJs("playbackStateChanged", JSONObject().put("isPlaying", false).toString())
        }
    }

    @JavascriptInterface
    fun resumeAudio() {
        mainHandler.post {
            SmritiMediaPlaybackService.activePlayerInstance?.play()
            sendEventToJs("playbackStateChanged", JSONObject().put("isPlaying", true).toString())
        }
    }

    @JavascriptInterface
    fun seekAudio(positionMs: Long) {
        mainHandler.post {
            SmritiMediaPlaybackService.activePlayerInstance?.seekTo(positionMs)
        }
    }

    @JavascriptInterface
    fun setPlaybackSpeed(speed: Float) {
        mainHandler.post {
            SmritiMediaPlaybackService.activePlayerInstance?.playbackParameters = PlaybackParameters(speed)
        }
    }

    @JavascriptInterface
    fun startRecording() {
        recorderHelper.startRecording()
    }

    @JavascriptInterface
    fun pauseRecording() {
        recorderHelper.pauseRecording()
    }

    @JavascriptInterface
    fun resumeRecording() {
        recorderHelper.resumeRecording()
    }

    @JavascriptInterface
    fun stopRecording() {
        val file = recorderHelper.stopRecording()
        if (file != null) {
            val payload = JSONObject().apply {
                put("fileUri", file.toURI().toString())
                put("filePath", file.absolutePath)
                put("fileSizeBytes", file.length())
            }
            sendEventToJs("recordingCompleted", payload.toString())
        }
    }

    @JavascriptInterface
    fun getStorageInformation(): String {
        val cacheSize = getFolderSize(context.cacheDir)
        val filesSize = getFolderSize(context.filesDir)
        val dbSize = File(context.getDatabasePath("smriti_operational.db").path).length()

        return JSONObject().apply {
            put("cachedAudioBytes", cacheSize)
            put("explicitDownloadsBytes", filesSize)
            put("metadataDbBytes", Math.max(dbSize, 1024 * 1024))
            put("pendingSyncCount", 0)
            put("googleDriveUsedBytes", 2147483648L) // 2 GB
        }.toString()
    }

    @JavascriptInterface
    fun clearTemporaryCache() {
        scope.launch {
            try {
                context.cacheDir.deleteRecursively()
                context.cacheDir.mkdirs()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun downloadForOffline(audioJson: String) {
        scope.launch {
            try {
                val json = JSONObject(audioJson)
                val id = json.getString("id")
                val entity = CachedAudioEntity(
                    id = id,
                    title = json.optString("title", ""),
                    subjectName = json.optString("subject_name", ""),
                    durationSeconds = json.optDouble("duration_seconds", 0.0),
                    localFilePath = null,
                    googleDriveFileId = if (json.has("google_drive_file_id")) json.getString("google_drive_file_id") else null,
                    fileSizeBytes = json.optLong("file_size_bytes", 0L),
                    isFavorite = json.optBoolean("is_favorite", false),
                    lastListenedAt = System.currentTimeMillis()
                )
                db.audioDao().insertOrUpdateAudio(entity)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun removeOfflineDownload(audioId: String) {
        scope.launch {
            db.audioDao().deleteAudio(audioId)
        }
    }

    private fun getFolderSize(file: File?): Long {
        if (file == null || !file.exists()) return 0
        var size: Long = 0
        file.listFiles()?.forEach { child ->
            size += if (child.isDirectory) getFolderSize(child) else child.length()
        }
        return size
    }
}
