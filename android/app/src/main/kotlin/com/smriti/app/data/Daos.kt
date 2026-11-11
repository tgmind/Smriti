package com.smriti.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface AudioDao {
    @Query("SELECT * FROM cached_audio_items ORDER BY lastListenedAt DESC")
    fun getAllCachedAudio(): Flow<List<CachedAudioEntity>>

    @Query("SELECT * FROM cached_audio_items WHERE id = :audioId LIMIT 1")
    suspend fun getAudioById(audioId: String): CachedAudioEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateAudio(audio: CachedAudioEntity)

    @Query("DELETE FROM cached_audio_items WHERE id = :audioId")
    suspend fun deleteAudio(audioId: String)

    @Query("SELECT SUM(fileSizeBytes) FROM cached_audio_items")
    suspend fun getTotalStorageBytes(): Long?
}

@Dao
interface PlaybackEventDao {
    @Query("SELECT * FROM pending_playback_events ORDER BY clientRecordedAt ASC")
    suspend fun getPendingEvents(): List<PendingPlaybackEventEntity>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertEvent(event: PendingPlaybackEventEntity)

    @Query("DELETE FROM pending_playback_events WHERE id IN (:eventIds)")
    suspend fun deleteSyncedEvents(eventIds: List<String>)

    @Query("SELECT COUNT(*) FROM pending_playback_events")
    suspend fun getPendingEventsCount(): Int
}

@Dao
interface RevisionDao {
    @Query("SELECT * FROM offline_revisions WHERE nextReviewDue <= :todayDate ORDER BY nextReviewDue ASC")
    fun getDueRevisions(todayDate: String): Flow<List<OfflineRevisionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateRevision(revision: OfflineRevisionEntity)

    @Query("SELECT COUNT(*) FROM offline_revisions")
    suspend fun getTotalCount(): Int
}
