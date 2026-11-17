package com.smriti.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        CachedAudioEntity::class,
        PendingPlaybackEventEntity::class,
        OfflineRevisionEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class SmritiDatabase : RoomDatabase() {
    abstract fun audioDao(): AudioDao
    abstract fun playbackEventDao(): PlaybackEventDao
    abstract fun revisionDao(): RevisionDao

    companion object {
        @Volatile
        private var INSTANCE: SmritiDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE cached_audio_items ADD COLUMN playCount INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE cached_audio_items ADD COLUMN lastPlayedAt INTEGER")
                db.execSQL("ALTER TABLE pending_playback_events ADD COLUMN verifiedFullPlay INTEGER NOT NULL DEFAULT 0")
            }
        }

        fun getInstance(context: Context): SmritiDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SmritiDatabase::class.java,
                    "smriti_operational.db"
                )
                    .addMigrations(MIGRATION_1_2)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
