package com.smriti.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_audio_items")
data class CachedAudioEntity(
    @PrimaryKey val id: String,
    val title: String,
    val subjectName: String,
    val durationSeconds: Double,
    val localFilePath: String?,
    val googleDriveFileId: String?,
    val fileSizeBytes: Long,
    val isFavorite: Boolean = false,
    val lastListenedAt: Long? = null,
    val addedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "pending_playback_events")
data class PendingPlaybackEventEntity(
    @PrimaryKey val id: String, // UUID generated on client
    val audioId: String,
    val startTimestamp: Long,
    val endTimestamp: Long,
    val actualDurationSeconds: Double,
    val completionPercentage: Double,
    val isCompletedPlay: Boolean,
    val playbackSpeed: Float,
    val clientRecordedAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0
)

@Entity(tableName = "offline_revisions")
data class OfflineRevisionEntity(
    @PrimaryKey val id: String,
    val assessmentId: String,
    val audioId: String,
    val prompt: String,
    val correctAnswer: String,
    val optionsJson: String?,
    val easeFactor: Float = 2.5f,
    val repetitionCount: Int = 0,
    val intervalDays: Int = 1,
    val nextReviewDue: String, // YYYY-MM-DD
    val status: String = "learning", // learning, review, mastered
    val updatedAt: Long = System.currentTimeMillis()
)
