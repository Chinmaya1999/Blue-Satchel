package com.dxbbeauty.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Bell sound + system notifications for new in-app notifications. */
object Notifier {
    private const val CHANNEL = "dxb_alerts_v1"
    private const val CHANNEL_QUIET = "dxb_alerts_quiet_v1"
    private var pool: SoundPool? = null
    private var soundId = 0
    private var loaded = false

    fun init(ctx: Context) {
        runCatching { createChannel(ctx) }
        if (pool == null) {
            pool = SoundPool.Builder().setMaxStreams(2).setAudioAttributes(
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build(),
            ).build().also { p ->
                p.setOnLoadCompleteListener { _, _, status -> loaded = status == 0 }
                soundId = p.load(ctx, R.raw.notify_bell, 1)
            }
        }
    }

    private fun createChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_QUIET) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL_QUIET, "Skin alerts (silent)", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Same alerts without the bell sound"
                setSound(null, null)
            })
        }
        if (nm.getNotificationChannel(CHANNEL) != null) return
        val ch = NotificationChannel(CHANNEL, "Skin alerts", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Scan results, orders and account updates"
            setSound(
                Uri.parse("android.resource://${ctx.packageName}/${R.raw.notify_bell}"),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build(),
            )
            enableVibration(true)
        }
        nm.createNotificationChannel(ch)
    }

    /**
     * Plays the bell inside the app (respects the user's sound setting and silent mode).
     * Never throws: a missing sound, vibrator or audio service must not take the app down.
     */
    fun ring(ctx: Context, force: Boolean = false) {
        runCatching {
            if (!force && !Store(ctx).soundOn) return
            val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            when (am.ringerMode) {
                AudioManager.RINGER_MODE_SILENT -> return
                AudioManager.RINGER_MODE_VIBRATE -> buzz(ctx)
                else -> if (loaded) pool?.play(soundId, 1f, 1f, 1, 0, 1f) else buzz(ctx)
            }
        }
    }

    private fun buzz(ctx: Context) {
        runCatching {
            val v = if (Build.VERSION.SDK_INT >= 31) ctx.getSystemService(VibratorManager::class.java)?.defaultVibrator
            else @Suppress("DEPRECATION") ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (v?.hasVibrator() == true) v.vibrate(VibrationEffect.createOneShot(250, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }

    fun canPost(ctx: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    /** Posts a heads-up system notification (the channel carries the bell sound). */
    fun post(ctx: Context, n: Notif) {
        if (!canPost(ctx)) return
        createChannel(ctx)
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(ctx, if (Store(ctx).soundOn) CHANNEL else CHANNEL_QUIET)
            .setSmallIcon(android.R.drawable.star_on)
            .setContentTitle(n.title).setContentText(n.message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(n.message))
            .setAutoCancel(true).setContentIntent(open).setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        ctx.getSystemService(NotificationManager::class.java).notify(n.id.hashCode(), notification)
    }

    /**
     * Compares the server's notifications with what we've already announced.
     * Returns the new unread ones; the first ever sync only records what exists.
     */
    fun newOnes(ctx: Context, all: List<Notif>): List<Notif> {
        val store = Store(ctx)
        val seen = store.seenNotifs
        val fresh = if (!store.hasSynced) emptyList() else all.filter { !it.read && it.id !in seen }
        store.seenNotifs = seen + all.map { it.id }
        store.hasSynced = true
        return fresh
    }

    fun schedule(ctx: Context) {
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
            "dxb-notify", ExistingPeriodicWorkPolicy.KEEP, PeriodicWorkRequestBuilder<NotifyWorker>(15, TimeUnit.MINUTES).build(),
        )
    }

    fun cancel(ctx: Context) {
        WorkManager.getInstance(ctx).cancelUniqueWork("dxb-notify")
    }
}

/** Checks for new notifications while the app is closed (Android's minimum interval is 15 minutes). */
class NotifyWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val session = Store(applicationContext).session ?: return Result.success()
        Api.me(session.token).onSuccess { me -> Notifier.newOnes(applicationContext, me.notifs).forEach { Notifier.post(applicationContext, it) } }
        return Result.success()
    }
}
