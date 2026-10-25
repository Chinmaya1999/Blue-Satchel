package com.dxbbeauty.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import com.dxbbeauty.app.Api
import com.dxbbeauty.app.Scan
import org.json.JSONArray
import org.json.JSONObject

// Mirrors the website's "Full AI analysis" (RupamAnalysisPanel / ApiAnalysisPanel): the analysed photo with the AI's
// overlay, a summary, every detected condition with its grade and detail, and the suggestions.

private val gradeColor = mapOf(
    "A" to Color(0xFF10B981), "B" to Color(0xFF65A30D), "C" to Color(0xFFF59E0B), "D" to Color(0xFFF97316), "F" to Color(0xFFF43F5E),
)

private fun severityColor(sev: String) = when (sev.lowercase()) {
    "none" -> gradeColor.getValue("A"); "mild" -> gradeColor.getValue("B"); "moderate" -> gradeColor.getValue("C"); else -> gradeColor.getValue("F")
}

/** Perfect Corp ui_score: higher = healthier. Same cut-offs as the website. */
private fun uiTone(score: Int) = when { score > 66 -> "Good" to Color(0xFF10B981); score > 33 -> "Fair" to Color(0xFFF59E0B); else -> "Needs care" to Color(0xFFF43F5E) }

fun titleCase(s: String?) = s.orEmpty().replace('_', ' ').replace('-', ' ').split(' ').joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }

private fun JSONArray?.objects(): List<JSONObject> = this?.let { a -> List(a.length()) { a.optJSONObject(it) }.filterNotNull() } ?: emptyList()

private val metricLabels = mapOf(
    "age_spot" to "Spots", "pore" to "Pores", "texture" to "Texture", "redness" to "Redness", "dark_circle_v2" to "Dark Circles", "acne" to "Acne",
    "oiliness" to "Oiliness", "moisture" to "Moisture", "firmness" to "Firmness", "radiance" to "Radiance", "eye_bag" to "Eye Bags",
    "droopy_upper_eyelid" to "Upper Eyelid", "droopy_lower_eyelid" to "Lower Eyelid", "tear_trough" to "Under-Eye Hollows", "wrinkle" to "Wrinkles",
)
private val regionLabels = mapOf(
    "whole" to "Whole face", "forehead" to "Forehead", "glabellar" to "Glabellar", "crowfeet" to "Crow's Feet", "periocular" to "Periocular",
    "nasolabial" to "Nasolabial", "marionette" to "Marionette",
)

@Composable
private fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) =
    Column(modifier.fillMaxWidth().glass(24).padding(16.dp), content = content)

@Composable
private fun Dial(value: Int, color: Color, size: Int = 56, light: Boolean = false) {
    Box(Modifier.size(size.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize().padding(3.dp)) {
            val sw = 5.dp.toPx()
            drawArc(if (light) Color(0x33FFFFFF) else Dxb.Line, -90f, 360f, false, style = Stroke(sw, cap = StrokeCap.Round))
            drawArc(color, -90f, 360f * value.coerceIn(0, 100) / 100f, false, style = Stroke(sw, cap = StrokeCap.Round))
        }
        Text("$value", fontWeight = FontWeight.Bold, fontSize = (size * 0.3f).sp, color = if (light) Color.White else Dxb.Ink)
    }
}

@Composable
private fun StatTile(label: String, value: String, hint: String?, modifier: Modifier) =
    Column(modifier.glass(20).padding(14.dp)) {
        Text(label.uppercase(), color = Dxb.Muted, fontSize = 10.sp, letterSpacing = 0.8.sp, fontWeight = FontWeight.SemiBold)
        Text(value, color = Dxb.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, modifier = Modifier.padding(top = 2.dp))
        hint?.let { Text(it, color = Dxb.Muted, fontSize = 11.sp) }
    }

@Composable
private fun BarRow(name: String, fraction: Float, text: String, color: Color = Dxb.Rose) =
    Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(titleCase(name), Modifier.width(96.dp), fontSize = 11.sp, color = Dxb.Muted, maxLines = 1)
        Box(Modifier.weight(1f).height(6.dp).clip(CircleShape).background(Dxb.Line)) {
            Box(Modifier.fillMaxHeight().fillMaxWidth(fraction.coerceIn(0f, 1f)).clip(CircleShape).background(color))
        }
        Text(text, Modifier.width(78.dp), fontSize = 10.sp, color = Dxb.Muted, textAlign = androidx.compose.ui.text.style.TextAlign.End)
    }

@Composable
private fun SectionLabel(text: String) = Text(text.uppercase(), color = Dxb.Rose, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 20.dp, top = 22.dp, bottom = 10.dp))

/** The analysed photo with the AI's overlay on top and a toggle to show/hide it. */
@Composable
private fun AnalysedPhoto(base: String, overlay: String?, loader: ImageLoader, caption: String?) {
    var showOverlay by remember { mutableStateOf(true) }
    Column(Modifier.padding(horizontal = 20.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(28.dp)).background(Color(0xFF1A0B33))) {
            AsyncImage(base, "Your photo", loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (overlay != null && showOverlay) AsyncImage(overlay, "AI overlay", loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (overlay != null) Row(
                Modifier.align(Alignment.BottomEnd).padding(12.dp).clip(CircleShape).background(Color(0x99000000)).clickable { showOverlay = !showOverlay }.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(if (showOverlay) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, null, tint = Color.White, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp)); Text(if (showOverlay) "Hide overlay" else "Show overlay", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        caption?.let { Text(it, color = Dxb.Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp, start = 4.dp)) }
    }
}

/** Adds the full analysis (Rupam or Perfect Corp) for [scan] to a result list; adds nothing for scans that have no AI detail. */
fun LazyListScope.fullAnalysis(scan: Scan, loader: ImageLoader) {
    val raw = scan.raw ?: return
    raw.optJSONObject("rupamOutput")?.let { rupam(scan, raw, it, loader); return }
    raw.optJSONArray("perfectCorpOutput")?.let { perfectCorp(scan, raw, it, loader); return }
}

private fun LazyListScope.header(subtitle: String) {
    item {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 28.dp)) {
            Text("FULL AI ANALYSIS", color = Dxb.Rose, style = MaterialTheme.typography.labelSmall)
            Text("Every measurement, on your photo", style = MaterialTheme.typography.headlineMedium, color = Dxb.Ink, fontSize = 24.sp)
            Text(subtitle, color = Dxb.Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp, bottom = 14.dp))
        }
    }
}

// ───────────────────────── Rupam (Quick scan) ─────────────────────────

private fun LazyListScope.rupam(scan: Scan, raw: JSONObject, out: JSONObject, loader: ImageLoader) {
    val overlay = raw.optString("savedCompositeUrl").takeIf { it.isNotBlank() && it != "null" }?.let(Api::media)
    val profile = out.optJSONObject("skin_profile")
    val tone = profile?.optJSONObject("skin_tone")
    val type = profile?.optJSONObject("skin_type")
    val quality = out.optJSONObject("image_quality")
    val conditions = out.optJSONArray("conditions").objects()
    val suggestions = out.optJSONArray("suggestions").objects()

    header("Condition scores run 0–100, where higher means healthier skin.")
    item { AnalysedPhoto(scan.photo, overlay, loader, if (overlay != null) "Detected spots and zones marked on your photo." else null) }
    item {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("Overall score", "${out.optInt("overall_skin_health_score")}", "AI composite", Modifier.weight(1f))
                StatTile("Skin type", titleCase(type?.optString("classification")).ifBlank { "—" }, type?.optDouble("confidence")?.takeIf { !it.isNaN() }?.let { "${Math.round(it * 100)}% confidence" }, Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("Fitzpatrick", tone?.optInt("fitzpatrick_estimate")?.let { "F$it" } ?: "—", tone?.optString("skin_tone_label"), Modifier.weight(1f))
                StatTile("Skin tone", tone?.optString("category")?.ifBlank { null } ?: "—", tone?.optDouble("ita_angle")?.takeIf { !it.isNaN() }?.let { "ITA $it°" }, Modifier.weight(1f))
            }
        }
    }
    item { SectionLabel("Detected conditions") }
    items(conditions) { c -> RupamCondition(c) }
    if (suggestions.isNotEmpty()) {
        item { SectionLabel("Suggestions") }
        items(suggestions) { s ->
            Row(Modifier.padding(horizontal = 20.dp, vertical = 5.dp).fillMaxWidth().glass(20).padding(14.dp), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(28.dp).clip(CircleShape).background(Dxb.Blush), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.AutoAwesome, null, tint = Dxb.RoseDeep, modifier = Modifier.size(15.dp)) }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(s.optString("text"), color = Dxb.Ink, fontSize = 13.sp, lineHeight = 18.sp)
                    val rel = s.optJSONArray("related_conditions")?.optString(0)?.ifBlank { null } ?: s.optString("condition_id")
                    Text(titleCase(rel) + s.optString("priority").takeIf { it.isNotBlank() }?.let { " · $it priority" }.orEmpty(), color = Dxb.Muted, fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp), letterSpacing = 0.6.sp)
                }
            }
        }
    }
    if (quality != null) {
        item { SectionLabel("Capture quality") }
        item {
            Card(Modifier.padding(horizontal = 20.dp)) {
                BarRow("Lighting", quality.optDouble("lighting_score").toFloat(), "${Math.round(quality.optDouble("lighting_score") * 100)}%", Dxb.Sage)
                BarRow("Sharpness", quality.optDouble("sharpness_score").toFloat(), "${Math.round(quality.optDouble("sharpness_score") * 100)}%", Dxb.Sage)
                Text(if (quality.optBoolean("face_detected")) "✓ Face detected · image acceptable" else "No face detected", color = Dxb.Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
            }
        }
    }
}

@Composable
private fun RupamCondition(c: JSONObject) {
    val grade = c.optString("grade")
    val gc = gradeColor[grade] ?: Color(0xFFF59E0B)
    val score = c.optInt("score")
    Column(Modifier.padding(horizontal = 20.dp, vertical = 5.dp).fillMaxWidth().glass(22).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(c.optString("condition_name").ifBlank { titleCase(c.optString("condition_id")) }, fontWeight = FontWeight.Bold, color = Dxb.Ink)
                Text(titleCase(c.optString("severity")), color = severityColor(c.optString("severity")), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
            Box(Modifier.size(38.dp).clip(CircleShape).background(gc.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) { Text(grade.ifBlank { "–" }, color = gc, fontWeight = FontWeight.ExtraBold) }
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.fillMaxWidth().height(7.dp).clip(CircleShape).background(Dxb.Line)) { Box(Modifier.fillMaxHeight().fillMaxWidth(score / 100f).clip(CircleShape).background(gc)) }
        Text("Health score $score/100", color = Dxb.Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))

        val facts = buildList {
            fun add(l: String, v: String?) { if (!v.isNullOrBlank() && v != "null") add(l to v) }
            fun num(k: String) = if (c.has(k) && !c.isNull(k)) c.opt(k).toString() else null
            add("Detections", num("detection_count")); add("Dominant depth", c.optString("dominant_depth").takeIf { it.isNotBlank() }?.let(::titleCase))
            add("Distribution", c.optString("distribution").takeIf { it.isNotBlank() }?.let(::titleCase)); add("Coverage", num("coverage_pct")?.let { "$it%" })
            add("Spots", num("spot_count")); add("Circle type", c.optString("circle_type").takeIf { it.isNotBlank() }?.let(::titleCase))
            add("Puffiness", if (c.has("puffiness_detected")) (if (c.optBoolean("puffiness_detected")) "Detected" else "None") else null)
            add("Melanin ratio", num("melanin_ratio")); add("Hemoglobin ratio", num("hemoglobin_ratio"))
            add("Oiliness class", c.optString("oiliness_class").takeIf { it.isNotBlank() }?.let(::titleCase)); add("Erythema index", num("erythema_index"))
            add("Affected area", num("affected_pct")?.let { "$it%" }); add("Roughness index", num("roughness_index"))
            add("Confidence", if (c.has("confidence")) "${Math.round(c.optDouble("confidence") * 100)}%" else null)
        }
        if (facts.isNotEmpty()) {
            Spacer(Modifier.height(10.dp)); Box(Modifier.fillMaxWidth().height(1.dp).background(Dxb.Line)); Spacer(Modifier.height(10.dp))
            facts.chunked(2).forEach { pair ->
                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                    pair.forEach { (k, v) -> Column(Modifier.weight(1f)) { Text(k.uppercase(), color = Dxb.Muted, fontSize = 9.sp, letterSpacing = 0.6.sp); Text(v, color = Dxb.Ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1) } }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
        val regions = c.optJSONArray("regions").objects().mapNotNull { r ->
            val name = r.optString("region").ifBlank { r.optString("region_name") }
            when {
                r.has("coverage_pct") -> Triple(name, r.optDouble("coverage_pct").toFloat() / 25f, "${r.opt("coverage_pct")}% coverage")
                r.has("region_score") -> Triple(name, r.optDouble("region_score").toFloat() / 100f, "${r.opt("region_score")}/100")
                else -> null
            }
        }
        if (regions.isNotEmpty()) {
            Text("BY REGION", color = Dxb.Muted, fontSize = 9.sp, letterSpacing = 0.8.sp, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
            regions.forEach { (n, f, t) -> BarRow(n, f, t) }
        }
        c.optJSONObject("probabilities")?.let { p ->
            Text("CLASSIFICATION PROBABILITY", color = Dxb.Muted, fontSize = 9.sp, letterSpacing = 0.8.sp, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
            p.keys().forEach { k -> BarRow(k, p.optDouble(k).toFloat(), "${Math.round(p.optDouble(k) * 100)}%") }
        }
    }
}

// ───────────────────────── Perfect Corp (Detailed scan) ─────────────────────────

private data class Metric(val type: String, val region: String?, val label: String, val ui: Int, val rawScore: Double?, val mask: String?, val hd: Boolean)

private fun LazyListScope.perfectCorp(scan: Scan, raw: JSONObject, output: JSONArray, loader: ImageLoader) {
    val saved = raw.optJSONObject("savedImages")
    val masks = saved?.optJSONArray("masks").objects().associate { (it.optString("type") + "|" + it.optString("region").takeIf { r -> r != "null" }.orEmpty()) to Api.media(it.optString("url")) }
    val base = saved?.optString("resizeImageUrl")?.takeIf { it.isNotBlank() && it != "null" }?.let(Api::media) ?: scan.photo
    val entries = output.objects()
    val metrics = entries.filter { it.has("ui_score") && !it.isNull("ui_score") && it.optString("type") != "all" }.map { e ->
        val type = e.optString("type"); val region = e.optString("region").takeIf { it.isNotBlank() && it != "null" }
        val hd = type.startsWith("hd_")
        Metric(type, region, if (hd) regionLabels[region] ?: titleCase(region) else metricLabels[type] ?: titleCase(type), e.optInt("ui_score"),
            e.optDouble("raw_score").takeIf { !it.isNaN() }, masks[type + "|" + region.orEmpty()], hd)
    }
    val overalls = entries.filter { it.optString("type") == "all" }.map { it.optInt("score") }
    val skinAge = entries.firstOrNull { it.optString("type") == "skin_age" }?.optInt("score")
    val standard = metrics.filter { !it.hd }; val hd = metrics.filter { it.hd }
    val suggestions = emptyList<JSONObject>()

    header("Every measurement the AI returned, shown on your photo. Tap a measurement to see the area it detected.")
    item { PerfectCorpViewer(base, standard + hd, overalls, skinAge, loader) }
    if (standard.isNotEmpty()) item { SectionLabel("Standard skin analysis · ${standard.size} measurements") }
    items(standard.chunked(2)) { pair -> MetricRow(pair, base, loader) }
    if (hd.isNotEmpty()) item { SectionLabel("HD wrinkle analysis · ${hd.size} regions") }
    items(hd.chunked(2)) { pair -> MetricRow(pair, base, loader) }
    if (suggestions.isNotEmpty()) item { SectionLabel("Suggestions") }
}

@Composable
private fun PerfectCorpViewer(base: String, metrics: List<Metric>, overalls: List<Int>, skinAge: Int?, loader: ImageLoader) {
    val selectable = metrics.filter { it.mask != null }
    var selected by remember { mutableStateOf(selectable.firstOrNull()) }
    var showOverlay by remember { mutableStateOf(true) }
    Column(Modifier.padding(horizontal = 20.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(28.dp)).background(Color(0xFF1A0B33))) {
            AsyncImage(base, "Your photo", loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            selected?.mask?.takeIf { showOverlay }?.let { AsyncImage(it, selected?.label, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
            selected?.let { m ->
                val (label, color) = uiTone(m.ui)
                Row(Modifier.align(Alignment.BottomStart).padding(12.dp).clip(RoundedCornerShape(18.dp)).background(Color(0x99000000)).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Dial(m.ui, color, 44, light = true); Spacer(Modifier.width(10.dp))
                    Column { Text(m.label, color = Color.White, fontWeight = FontWeight.Bold); Text(label, color = color, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                }
            }
            if (selectable.isNotEmpty()) Row(
                Modifier.align(Alignment.BottomEnd).padding(12.dp).clip(CircleShape).background(Color(0x99000000)).clickable { showOverlay = !showOverlay }.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) { Icon(if (showOverlay) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, null, tint = Color.White, modifier = Modifier.size(15.dp)) }
        }
        if (selectable.isNotEmpty()) LazyRow(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(selectable) { m ->
                val on = m == selected
                Text(m.label, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = if (on) Color.White else Dxb.Ink,
                    modifier = Modifier.clip(CircleShape).background(if (on) Dxb.Rose else Color.White).clickable { selected = m; showOverlay = true }.padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }
        Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            overalls.getOrNull(0)?.let { StatTile("Overall (standard)", "$it", "AI composite", Modifier.weight(1f)) }
            overalls.getOrNull(1)?.let { StatTile("Overall (HD wrinkle)", "$it", "Wrinkle composite", Modifier.weight(1f)) }
            skinAge?.let { StatTile("Skin age", "$it", "Estimated by the AI", Modifier.weight(1f)) }
        }
    }
}

@Composable
private fun MetricRow(pair: List<Metric>, base: String, loader: ImageLoader) {
    var zoom by remember { mutableStateOf<Metric?>(null) }
    Row(Modifier.padding(horizontal = 20.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        pair.forEach { m ->
            val (label, color) = uiTone(m.ui)
            Column(Modifier.weight(1f).clip(RoundedCornerShape(22.dp)).background(Color.White).clickable { zoom = m }) {
                // The analysed photo with this measurement's overlay, exactly like the website's cards.
                Box(Modifier.fillMaxWidth().aspectRatio(0.9f).background(Color(0xFF1A0B33))) {
                    AsyncImage(base, m.label, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    m.mask?.let { AsyncImage(it, null, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
                    Text("${m.ui}", color = color, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp,
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.92f)).padding(horizontal = 9.dp, vertical = 3.dp))
                }
                Column(Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(m.label, Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Dxb.Ink, fontSize = 13.sp, maxLines = 1)
                        Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Dxb.Line)) { Box(Modifier.fillMaxHeight().fillMaxWidth(m.ui / 100f).clip(CircleShape).background(color)) }
                    Text("raw ${m.rawScore?.let { "%.1f".format(it) } ?: "—"} · ${m.type}", color = Dxb.Muted, fontSize = 10.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, modifier = Modifier.padding(top = 6.dp), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                }
            }
        }
        if (pair.size == 1) Spacer(Modifier.weight(1f))
    }
    zoom?.let { m ->
        val (label, color) = uiTone(m.ui)
        androidx.compose.ui.window.Dialog(onDismissRequest = { zoom = null }) {
            Column(Modifier.clip(RoundedCornerShape(28.dp)).background(Color.White)) {
                Box(Modifier.fillMaxWidth().aspectRatio(1f).background(Color(0xFF1A0B33))) {
                    AsyncImage(base, m.label, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    m.mask?.let { AsyncImage(it, null, loader, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
                }
                Column(Modifier.padding(18.dp)) {
                    Text(m.label, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Dxb.Ink)
                    Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatTile("Score", "${m.ui}", null, Modifier.weight(1f)); StatTile("Raw score", m.rawScore?.let { "%.1f".format(it) } ?: "—", null, Modifier.weight(1f)); StatTile("Rating", label, null, Modifier.weight(1f))
                    }
                    Text(m.type, color = color, fontSize = 11.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, modifier = Modifier.padding(top = 10.dp))
                }
            }
        }
    }
}
