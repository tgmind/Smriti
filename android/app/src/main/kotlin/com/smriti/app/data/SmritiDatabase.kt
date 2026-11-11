package com.smriti.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        CachedAudioEntity::class,
        PendingPlaybackEventEntity::class,
        OfflineRevisionEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class SmritiDatabase : RoomDatabase() {
    abstract fun audioDao(): AudioDao
    abstract fun playbackEventDao(): PlaybackEventDao
    abstract fun revisionDao(): RevisionDao

    companion object {
        @Volatile
        private var INSTANCE: SmritiDatabase? = null

        fun getInstance(context: Context): SmritiDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SmritiDatabase::class.java,
                    "smriti_operational.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
