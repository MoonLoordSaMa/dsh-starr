"""按需加载免费本地 ASR；stdout 仅输出协议，依赖日志写入 stderr。"""
import contextlib
import json
import sys

with contextlib.redirect_stdout(sys.stderr):
    from faster_whisper import WhisperModel
    source, model_name, language, cache = sys.argv[1:]
    model = WhisperModel(model_name, device="cpu", compute_type="int8", download_root=cache)
    segments, info = model.transcribe(source, language=language or None, vad_filter=True)
    text = "".join(segment.text for segment in segments).strip()
print(json.dumps({"text": text, "language": info.language}, ensure_ascii=False))
