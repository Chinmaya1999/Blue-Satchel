package com.dxbbeauty.app.ui

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.graphics.drawable.toBitmap
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.dxbbeauty.app.R
import com.dxbbeauty.app.Scan
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale

// "Download" for a scan, like the website's menu: a printable PDF report, or the raw API data as JSON.
// Files are saved to the phone's Downloads folder and the share sheet opens so the user can send or open them.

private const val W = 595; private const val H = 842; private const val M = 36f
private val ink = Color.parseColor("#1E1530"); private val muted = Color.parseColor("#7C7390"); private val rose = Color.parseColor("#B86CDC")
private val line = Color.parseColor("#E6DAF2")

private fun pdfLevelColor(level: String) = when (level) { "High" -> Color.parseColor("#C0504D"); "Medium" -> Color.parseColor("#D99A4E"); else -> Color.parseColor("#4FAE8B") }
private fun gradeColor(g: String) = when (g) { "A" -> "#10B981"; "B" -> "#65A30D"; "C" -> "#F59E0B"; "D" -> "#F97316"; else -> "#F43F5E" }.let { Color.parseColor(it) }

private class Pdf {
    val doc = PdfDocument()
    private var page: PdfDocument.Page? = null
    lateinit var c: Canvas
    var y = M
    private var n = 0
    fun newPage() { page?.let { doc.finishPage(it) }; n++; page = doc.startPage(PdfDocument.PageInfo.Builder(W, H, n).create()); c = page!!.canvas; y = M }
    fun ensure(h: Float) { if (page == null || y + h > H - M - 14) newPage() }
    fun finish(): PdfDocument { page?.let { doc.finishPage(it) }; return doc }
    fun text(s: String, size: Float, color: Int, bold: Boolean = false, x: Float = M, width: Float = W - 2 * M, gap: Float = 4f): Float {
        val p = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = size; this.color = color; typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT }
        val l = StaticLayout.Builder.obtain(s, 0, s.length, p, width.toInt()).setAlignment(Layout.Alignment.ALIGN_NORMAL).setLineSpacing(2f, 1f).build()
        ensure(l.height + gap)
        c.save(); c.translate(x, y); l.draw(c); c.restore(); y += l.height + gap
        return l.height.toFloat()
    }
    fun heading(s: String) { ensure(40f); y += 10f; text(s.uppercase(), 10f, muted, bold = true, gap = 6f) }
    fun rule() { c.drawLine(M, y, W - M, y, Paint().apply { color = line; strokeWidth = 1f }); y += 8f }
    fun bar(x: Float, w: Float, frac: Float, color: Int) {
        val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = Color.parseColor("#F0E8F8") }
        c.drawRoundRect(RectF(x, y, x + w, y + 7f), 3.5f, 3.5f, bg)
        c.drawRoundRect(RectF(x, y, x + w * frac.coerceIn(0f, 1f), y + 7f), 3.5f, 3.5f, Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color })
    }
}

private suspend fun fetchBitmap(ctx: Context, loader: ImageLoader, url: String): Bitmap? = withContext(Dispatchers.IO) {
    if (url.isBlank()) return@withContext null
    (loader.execute(ImageRequest.Builder(ctx).data(url).allowHardware(false).size(800).build()) as? SuccessResult)?.drawable?.toBitmap()
}

suspend fun exportPdf(ctx: Context, scan: Scan, userName: String, loader: ImageLoader): Uri? {
    val photo = fetchBitmap(ctx, loader, scan.photo)
    return withContext(Dispatchers.Default) {
        val pdf = Pdf(); pdf.newPage()
        val raw = scan.raw
        val rupam = raw?.optJSONObject("rupamOutput")
        val created = scan.createdAtIso.ifBlank { scan.createdAt }.let { runCatching { SimpleDateFormat("d MMM yyyy, HH:mm", Locale.getDefault()).format(java.time.Instant.parse(it).toEpochMilli()) }.getOrDefault(it) }

        // Header
        val logo = BitmapFactory.decodeResource(ctx.resources, R.drawable.logo_mark)
        pdf.c.drawBitmap(logo, null, RectF(M, pdf.y, M + 34f, pdf.y + 34f), Paint(Paint.FILTER_BITMAP_FLAG))
        pdf.c.save(); pdf.c.translate(M + 42f, pdf.y); pdf.y.let { }
        val hp = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 15f; typeface = Typeface.DEFAULT_BOLD; color = ink }
        pdf.c.drawText("DXB Beauty", 0f, 14f, hp); hp.textSize = 9f; hp.typeface = Typeface.DEFAULT; hp.color = muted; pdf.c.drawText("AI Skin Analysis Report", 0f, 28f, hp)
        pdf.c.restore()
        val rp = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 9f; color = muted; textAlign = Paint.Align.RIGHT }
        pdf.c.drawText("Name: $userName", W - M, pdf.y + 9f, rp); pdf.c.drawText("Date: $created", W - M, pdf.y + 21f, rp); pdf.c.drawText("Report ID: ${scan.id}", W - M, pdf.y + 33f, rp)
        pdf.y += 46f; pdf.c.drawLine(M, pdf.y, W - M, pdf.y, Paint().apply { color = rose; strokeWidth = 2f }); pdf.y += 14f

        // Summary: photo + score
        val top = pdf.y
        if (photo != null) {
            val s = minOf(photo.width, photo.height)
            val r = RectF(M, top, M + 130f, top + 130f)
            val path = Path().apply { addRoundRect(r, 12f, 12f, Path.Direction.CW) }
            pdf.c.save(); pdf.c.clipPath(path)
            pdf.c.drawBitmap(photo, Rect((photo.width - s) / 2, (photo.height - s) / 2, (photo.width + s) / 2, (photo.height + s) / 2), r, Paint(Paint.FILTER_BITMAP_FLAG)); pdf.c.restore()
        }
        val tx = if (photo != null) M + 146f else M
        val big = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 46f; typeface = Typeface.DEFAULT_BOLD; color = rose }
        pdf.c.drawText("${scan.score}", tx, top + 44f, big)
        val sm = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 9f; color = muted }
        pdf.c.drawText("out of 100", tx + 70f, top + 22f, sm)
        sm.textSize = 15f; sm.typeface = Typeface.DEFAULT_BOLD; sm.color = ink; pdf.c.drawText(scan.label, tx + 70f, top + 40f, sm)
        val skinAge = raw?.opt("skinAge")?.toString()?.toDoubleOrNull()
        val topC = scan.concerns.sortedByDescending { it.severity }.take(3).joinToString(" · ") { "${it.label} (${it.severity})" }
        pdf.y = top + 58f
        pdf.text("Top concerns: $topC", 10f, ink, x = tx, width = W - M - tx)
        pdf.text("Data source: " + when (scan.provider) { "rupam" -> "Rupam.ai AI"; "perfectcorp" -> "Perfect Corp YouCam AI"; "focus" -> "Focus AI"; else -> scan.provider }, 10f, muted, x = tx, width = W - M - tx)
        skinAge?.let { pdf.text("Estimated skin age: ${Math.round(it)}", 10f, ink, bold = true, x = tx, width = W - M - tx) }
        pdf.y = maxOf(pdf.y, top + 142f)

        // Concerns table
        pdf.heading("Skin concerns"); pdf.text("Severity 0–100, where higher means the concern is more visible.", 8f, muted)
        scan.concerns.forEach { cn ->
            pdf.ensure(20f)
            val lp = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 10f; color = ink; typeface = Typeface.DEFAULT_BOLD }
            pdf.c.drawText(cn.label, M, pdf.y + 9f, lp)
            pdf.y += 2f; pdf.bar(M + 150f, 220f, cn.severity / 100f, pdfLevelColor(cn.level)); pdf.y -= 2f
            lp.typeface = Typeface.DEFAULT; pdf.c.drawText("${cn.severity}", M + 385f, pdf.y + 9f, lp)
            lp.color = pdfLevelColor(cn.level); lp.typeface = Typeface.DEFAULT_BOLD; pdf.c.drawText(cn.level, M + 425f, pdf.y + 9f, lp)
            pdf.y += 17f
        }

        // AI detail
        if (rupam != null) {
            val tone = rupam.optJSONObject("skin_profile")?.optJSONObject("skin_tone"); val type = rupam.optJSONObject("skin_profile")?.optJSONObject("skin_type")
            pdf.heading("Skin profile")
            pdf.text("Skin type: ${titleCase(type?.optString("classification"))}   ·   Fitzpatrick: F${tone?.optInt("fitzpatrick_estimate")} (${tone?.optString("skin_tone_label")})   ·   Skin tone: ${tone?.optString("category")}   ·   Overall: ${rupam.optInt("overall_skin_health_score")}", 10f, ink)
            pdf.heading("Detected conditions")
            val conds = rupam.optJSONArray("conditions")
            for (i in 0 until (conds?.length() ?: 0)) {
                val cd = conds!!.getJSONObject(i); pdf.ensure(34f)
                val lp = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 10f; color = ink; typeface = Typeface.DEFAULT_BOLD }
                pdf.c.drawText(cd.optString("condition_name"), M, pdf.y + 9f, lp)
                lp.typeface = Typeface.DEFAULT; lp.color = muted; pdf.c.drawText(titleCase(cd.optString("severity")), M + 130f, pdf.y + 9f, lp)
                pdf.y += 2f; pdf.bar(M + 200f, 180f, cd.optInt("score") / 100f, gradeColor(cd.optString("grade"))); pdf.y -= 2f
                lp.color = ink; pdf.c.drawText("${cd.optInt("score")}/100", M + 392f, pdf.y + 9f, lp)
                lp.color = gradeColor(cd.optString("grade")); lp.typeface = Typeface.DEFAULT_BOLD; lp.textSize = 12f; pdf.c.drawText(cd.optString("grade"), M + 450f, pdf.y + 10f, lp)
                pdf.y += 18f
                val extras = listOfNotNull(
                    cd.optString("coverage_pct").takeIf { cd.has("coverage_pct") }?.let { "coverage $it%" }, cd.optString("spot_count").takeIf { cd.has("spot_count") }?.let { "$it spots" },
                    cd.optString("detection_count").takeIf { cd.has("detection_count") }?.let { "$it detections" }, cd.optString("dominant_depth").takeIf { it.isNotBlank() }?.let { "depth ${titleCase(it)}" },
                    if (cd.has("confidence")) "confidence ${Math.round(cd.optDouble("confidence") * 100)}%" else null,
                )
                if (extras.isNotEmpty()) pdf.text(extras.joinToString("  ·  "), 8f, muted, x = M + 4f, gap = 5f)
            }
            val sug = rupam.optJSONArray("suggestions")
            if ((sug?.length() ?: 0) > 0) {
                pdf.heading("Suggestions")
                for (i in 0 until sug!!.length()) pdf.text("•  " + sug.getJSONObject(i).optString("text"), 10f, ink, gap = 6f)
            }
        } else raw?.optJSONArray("perfectCorpOutput")?.let { out ->
            pdf.heading("AI measurements")
            val rows = (0 until out.length()).mapNotNull { out.optJSONObject(it) }.filter { it.has("ui_score") && it.optString("type") != "all" }
            rows.forEach { e ->
                pdf.ensure(20f)
                val ui = e.optInt("ui_score"); val color = if (ui > 66) Color.parseColor("#10B981") else if (ui > 33) Color.parseColor("#F59E0B") else Color.parseColor("#F43F5E")
                val lp = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 10f; this.color = ink; typeface = Typeface.DEFAULT_BOLD }
                val label = e.optString("type").let { t -> titleCase(t.removePrefix("hd_")) + (e.optString("region").takeIf { it.isNotBlank() && it != "null" }?.let { " · ${titleCase(it)}" } ?: "") }
                pdf.c.drawText(label, M, pdf.y + 9f, lp)
                pdf.y += 2f; pdf.bar(M + 190f, 190f, ui / 100f, color); pdf.y -= 2f
                lp.typeface = Typeface.DEFAULT; pdf.c.drawText("$ui/100", M + 395f, pdf.y + 9f, lp)
                lp.color = color; lp.typeface = Typeface.DEFAULT_BOLD; pdf.c.drawText(if (ui > 66) "Good" else if (ui > 33) "Fair" else "Needs care", M + 445f, pdf.y + 9f, lp)
                pdf.y += 17f
            }
        }

        if (scan.products.isNotEmpty()) { pdf.heading("Recommended for you"); scan.products.forEach { pdf.text("•  ${it.name} — ${formatPrice(it)}", 10f, ink, gap = 3f) } }
        pdf.y += 14f
        pdf.text("This report is an AI-generated skin analysis for information only. It is not a medical diagnosis. See a dermatologist for medical advice.", 8f, muted)

        val name = "DXB-Beauty-Report-${scan.id.takeLast(6)}.pdf"
        save(ctx, name, "application/pdf") { out -> pdf.finish().writeTo(out); pdf.doc.close() }
    }
}

fun exportJson(ctx: Context, scan: Scan): Uri? =
    save(ctx, "DXB-Beauty-Scan-${scan.id.takeLast(6)}.json", "application/json") { it.write((scan.full ?: JSONObject()).toString(2).toByteArray()) }

private fun save(ctx: Context, name: String, mime: String, write: (java.io.OutputStream) -> Unit): Uri? = runCatching {
    if (Build.VERSION.SDK_INT >= 29) {
        val values = ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME, name); put(MediaStore.Downloads.MIME_TYPE, mime); put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS) }
        val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return@runCatching null
        ctx.contentResolver.openOutputStream(uri)?.use(write); uri
    } else {
        val f = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), name); f.outputStream().use(write); Uri.fromFile(f)
    }
}.getOrNull()

fun shareFile(ctx: Context, uri: Uri, mime: String) {
    val send = Intent(Intent.ACTION_SEND).apply { type = mime; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
    ctx.startActivity(Intent.createChooser(send, "Share your report").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
