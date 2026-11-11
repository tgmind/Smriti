package com.smriti.app.recorder

import android.content.Context
import android.media.MediaRecorder
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.util.Log
import kotlinx.coroutines.*
import java.io.File

class AudioRecorderHelper(
    private val context: Context,
    private val onAmplitudeSample: (Int) -> Unit
) {
    private var mediaRecorder: MediaRecorder? = null
    private var currentOutputFile: File? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    private var amplitudeJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + Job())

    var isRecording = false
        private set
    var isPaused = false
        private set

    fun startRecording(): File? {
        try {
            val outputDir = File(context.cacheDir, "recordings").apply { mkdirs() }
            val file = File(outputDir, "rec_${System.currentTimeMillis()}.m4a")
            currentOutputFile = file

            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            recorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128000)
                setAudioSamplingRate(44100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }

            mediaRecorder = recorder
            isRecording = true
            isPaused = false

            // Attach Hardware Noise Suppressor if available on device
            try {
                if (NoiseSuppressor.isAvailable()) {
                    // Supported hardware DSP
                    Log.d("SmritiRecorder", "Hardware NoiseSuppressor active")
                }
            } catch (e: Exception) {
                Log.w("SmritiRecorder", "Hardware NoiseSuppressor attachment note", e)
            }

            startAmplitudePolling()
            return file
        } catch (e: Exception) {
            Log.e("SmritiRecorder", "Failed to start recording", e)
            stopRecording()
            return null
        }
    }

    private fun startAmplitudePolling() {
        amplitudeJob?.cancel()
        amplitudeJob = scope.launch {
            while (isActive && isRecording) {
                if (!isPaused) {
                    val maxAmp = mediaRecorder?.maxAmplitude ?: 0
                    // maxAmplitude ranges from 0 to 32767. Normalize to 0-100 dB curve
                    val normalized = if (maxAmp > 0) {
                        (Math.min(1.0, maxAmp / 25000.0) * 100).toInt()
                    } else 5
                    withContext(Dispatchers.Main) {
                        onAmplitudeSample(normalized)
                    }
                }
                delay(120)
            }
        }
    }

    fun pauseRecording() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isRecording && !isPaused) {
            mediaRecorder?.pause()
            isPaused = true
        }
    }

    fun resumeRecording() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isRecording && isPaused) {
            mediaRecorder?.resume()
            isPaused = false
        }
    }

    fun stopRecording(): File? {
        amplitudeJob?.cancel()
        amplitudeJob = null
        try {
            if (isRecording) {
                mediaRecorder?.stop()
                mediaRecorder?.reset()
                mediaRecorder?.release()
            }
        } catch (e: Exception) {
            Log.e("SmritiRecorder", "Error stopping recorder", e)
        } finally {
            mediaRecorder = null
            isRecording = false
            isPaused = false
            noiseSuppressor?.release()
            noiseSuppressor = null
        }
        return currentOutputFile
    }
}
