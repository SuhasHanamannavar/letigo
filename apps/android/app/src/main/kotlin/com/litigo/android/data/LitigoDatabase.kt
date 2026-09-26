package com.litigo.android.data

import android.content.Context
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import androidx.room.Delete
import kotlinx.coroutines.flow.Flow

// ─── Entities ─────────────────────────────────────────────────────

@Entity(tableName = "rules")
data class RuleEntity(
    @PrimaryKey val id: String,
    val name: String,
    val type: String,
    val configJson: String,
    val priority: String,
    val category: String,
    val appliedToJson: String,
    val enabled: Boolean,
    val violationCount: Int,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(tableName = "activity")
data class ActivityEntity(
    @PrimaryKey val id: String,
    val timestamp: Long,
    val chatbotId: String,
    val chatbotName: String,
    val ruleId: String?,
    val ruleName: String?,
    val result: String,
    val complianceScore: Int,
    val responseSnippet: String?
)

@Entity(tableName = "chatbots")
data class ChatbotEntity(
    @PrimaryKey val id: String,
    val name: String,
    val packageName: String,
    val enabled: Boolean,
    val urlPattern: String?
)

@Entity(tableName = "user_settings")
data class SettingsEntity(
    @PrimaryKey val key: String,
    val value: String
)

// ─── DAOs ─────────────────────────────────────────────────────────

@Dao
interface RuleDao {
    @Query("SELECT * FROM rules ORDER BY updatedAt DESC")
    fun getAll(): Flow<List<RuleEntity>>

    @Query("SELECT * FROM rules WHERE enabled = 1 ORDER BY updatedAt DESC")
    fun getActive(): Flow<List<RuleEntity>>

    @Insert
    suspend fun insert(rule: RuleEntity)

    @Update
    suspend fun update(rule: RuleEntity)

    @Delete
    suspend fun delete(rule: RuleEntity)

    @Query("DELETE FROM rules WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface ActivityDao {
    @Query("SELECT * FROM activity ORDER BY timestamp DESC LIMIT :limit")
    fun getRecent(limit: Int = 100): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activity WHERE chatbotId = :chatbotId ORDER BY timestamp DESC LIMIT :limit")
    fun getByChatbot(chatbotId: String, limit: Int = 50): Flow<List<ActivityEntity>>

    @Insert
    suspend fun insert(activity: ActivityEntity)

    @Query("DELETE FROM activity")
    suspend fun clearAll()
}

@Dao
interface ChatbotDao {
    @Query("SELECT * FROM chatbots ORDER BY name")
    fun getAll(): Flow<List<ChatbotEntity>>

    @Query("SELECT * FROM chatbots WHERE enabled = 1 ORDER BY name")
    fun getEnabled(): Flow<List<ChatbotEntity>>

    @Insert
    suspend fun insertAll(chatbots: List<ChatbotEntity>)

    @Query("UPDATE chatbots SET enabled = :enabled WHERE id = :id")
    suspend fun updateEnabled(id: String, enabled: Boolean)
}

// ─── Database ─────────────────────────────────────────────────────

@Database(
    entities = [RuleEntity::class, ActivityEntity::class, ChatbotEntity::class, SettingsEntity::class],
    version = 1,
    exportSchema = false
)
abstract class LitigoDatabase : RoomDatabase() {
    abstract fun ruleDao(): RuleDao
    abstract fun activityDao(): ActivityDao
    abstract fun chatbotDao(): ChatbotDao

    companion object {
        @Volatile
        private var INSTANCE: LitigoDatabase? = null

        fun getInstance(context: Context): LitigoDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    LitigoDatabase::class.java,
                    "litigo_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

// ─── Supported Chatbot (non-DB model) ────────────────────────────

data class SupportedChatbot(
    val id: String,
    val name: String,
    val enabled: Boolean
)
