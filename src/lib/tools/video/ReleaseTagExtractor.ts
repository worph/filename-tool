/**
 * ReleaseTagExtractor — title-derived video release tags: resolution `quality`,
 * `codec`, and audio/subtitle `languages`.
 *
 * These are a faithful TypeScript port of the gateway feeders' Rust
 * `filename_meta.rs` (`extract_quality` / `extract_codec` / `extract_languages`).
 * Keeping the two in lockstep means a record enriched by the meta-sort
 * filename-parser plugin and one stamped by a gateway feeder agree on the same
 * normalized vocabulary (METADATA_KEYS: `quality` §3, `codec` §12, `languages`
 * §1 in the ISO 639-2/B `fre`/`ger`/`chi` space meta-share's language chips use).
 *
 * All three are **title-string guesses** — for a locally-ingested file the
 * authoritative values come from probing the real stream (ffmpeg / language
 * plugin), which a consumer should prefer (`real-probe > title-guess`).
 */

/** Resolution tier regex (progressive/interlaced collapse to the `p` tier). */
const QUALITY_TIER = /\b(2160p|4k|1080p|1080i|720p|720i|576p|480p)\b/i;
/** `WxH` token — mapped to a tier by height. */
const QUALITY_WXH = /\b\d{3,4}\s*x\s*(\d{3,4})\b/i;

/**
 * Normalized resolution tier (`"2160p"`/`"1080p"`/…) or `undefined`. `4k`→2160p,
 * `1080i`→1080p, `720i`→720p; a `1920x1080` token maps by height.
 */
export function extractQuality(title: string): string | undefined {
    const t = title.replace(/[._]/g, " ");
    const tier = t.match(QUALITY_TIER);
    if (tier) {
        const tok = tier[1].toLowerCase();
        switch (tok) {
            case "4k":
                return "2160p";
            case "1080i":
                return "1080p";
            case "720i":
                return "720p";
            default:
                return tok;
        }
    }
    const wxh = t.match(QUALITY_WXH);
    if (wxh) {
        const h = parseInt(wxh[1], 10);
        if (h >= 2000) return "2160p";
        if (h >= 1000) return "1080p";
        if (h >= 700) return "720p";
        if (h >= 500) return "576p";
        return "480p";
    }
    return undefined;
}

/** Codec regex → ffmpeg-style normalized token. */
const CODEC_RE = /\b(x265|h\s?265|hevc|x264|h\s?264|avc|av1|xvid|divx|vp9)\b/i;

/**
 * Normalized video codec (`hevc`/`h264`/`av1`/`xvid`/`divx`/`vp9`) or
 * `undefined`. `x265`/`h265`→`hevc`, `x264`/`avc`→`h264`.
 */
export function extractCodec(title: string): string | undefined {
    const t = title.replace(/[._]/g, " ");
    const m = t.match(CODEC_RE);
    if (!m) return undefined;
    const cleaned = m[1].toLowerCase().replace(/\s/g, "");
    switch (cleaned) {
        case "x265":
        case "h265":
        case "hevc":
            return "hevc";
        case "x264":
        case "h264":
        case "avc":
            return "h264";
        default:
            return cleaned; // av1, xvid, divx, vp9
    }
}

/** `www.<domain>` noise, stripped while the dots are still intact. */
const URL_STRIP = /\bwww\.\S+/gi;
/**
 * Guard phrases removed before language matching because each contains a
 * substring that would false-positive a tag (reproduces lookbehind guards
 * without lookaround): `shang chi`→`chi`, `tel aviv`→`tel`, `web dl`/`webdl`→`dl`.
 */
const LANG_GUARD = /\b(?:shang\s+chi|tel\s+aviv|web\s+dl|webdl)\b/gi;

/**
 * Release-title language tags → ISO 639-2/B (alpha-3). Codes match meta-share's
 * UI vocabulary (`fre`/`ger`/`chi`, not 639-3 `fra`/`deu`/`zho`). `mul` is the
 * honest marker for `MULTi`/dual-audio. Every matching pattern contributes its
 * code, so the result is a set (a `MULTi VOSTFR` release → `{fre, mul}`).
 */
const LANGUAGE_TAGS: ReadonlyArray<readonly [RegExp, string]> = [
    [/\bmulti(?:lang)?\b|\bmultisubs?\b|\bdual\s?audio\b|\bdual\b|\bdl\b/i, "mul"],
    [
        /\btruefrench\b|\bvostfr\b|\bsubfrench\b|\bfrench\b|\bvf[fqi2]?\b|\bstfr\b|\bfra\b|\bfre\b/i,
        "fre",
    ],
    [/\benglish\b|\beng\s?sub\b|\beng\b/i, "eng"],
    [/\bjapanese\b|\bjpn\b|\bjap\b/i, "jpn"],
    [/\bitalian\b|\bita\b/i, "ita"],
    [/\bgerman\b|\bger\b|\bdeu\b/i, "ger"],
    [/\bspanish\b|\bcastellano\b|\bespa[nñ]ol\b|\blatino\b|\besp\b|\bspa\b/i, "spa"],
    [/\bportuguese\b|\bdublado\b|\blegendado\b|\bpor\b/i, "por"],
    [/\bkorean\b|\bkor\b/i, "kor"],
    [/\bchinese\b|\bmandarin\b|\bcantonese\b|\bchs\b|\bcht\b|\bzho\b|\bchi\b/i, "chi"],
    [/\brussian\b|\brus\b/i, "rus"],
    [/\bdutch\b|\bflemish\b|\bnld\b|\bdut\b/i, "dut"],
    [/\bpolish\b|\bpl\s?dub\b|\bdub\s?pl\b|\blektor\b|\bpol\b/i, "pol"],
    [/\bczech\b|\bcze\b|\bces\b/i, "cze"],
    [/\bslovak\b|\bslo\b|\bslk\b/i, "slo"],
    [/\bhungarian\b|\bhundub\b|\bhun\b/i, "hun"],
    [/\bromanian\b|\brosub(?:bed)?\b|\brodubbed\b|\brum\b|\bron\b/i, "rum"],
    [/\bgreek\b|\bgre\b|\bell\b/i, "gre"],
    [/\bukrainian\b|\bukr\b/i, "ukr"],
    [/\bbulgarian\b|\bbgaudio\b|\bbul\b/i, "bul"],
    [/\bswedish\b|\bswesub\b|\bswe\b/i, "swe"],
    [/\bnorwegian\b|\bnorsk\b/i, "nor"],
    [/\bdanish\b|\bdansk\b/i, "dan"],
    [/\bfinnish\b|\bsuomi\b/i, "fin"],
    [/\bturkish\b|\btur\b/i, "tur"],
    [/\barabic\b|\bara\b/i, "ara"],
    [/\bhindi\b|\bhin\b/i, "hin"],
    [/\btamil\b|\btam\b/i, "tam"],
    [/\btelugu\b|\btel\b/i, "tel"],
    [/\bmalayalam\b|\bmal\b/i, "mal"],
    [/\bvietnamese\b|\bvie\b/i, "vie"],
    [/\bthai\b|\btha\b/i, "tha"],
];

/**
 * The set of ISO 639-2/B language codes detected from a release title, sorted
 * (deterministic). Empty when no tag matches.
 */
export function extractLanguages(title: string): string[] {
    const stripped = title.replace(URL_STRIP, " ");
    // Normalize `.`/`_`/`-` to spaces so `\b`-anchored tags + guards match
    // regardless of the original separator.
    const norm = stripped.replace(/[._-]/g, " ");
    const guarded = norm.replace(LANG_GUARD, " ");
    const out = new Set<string>();
    for (const [re, code] of LANGUAGE_TAGS) {
        if (re.test(guarded)) out.add(code);
    }
    return Array.from(out).sort();
}
