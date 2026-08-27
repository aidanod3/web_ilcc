#!/usr/bin/env python3
"""OCR every page image with a vision model via Ollama, N pages in flight.
Writes one .txt per page (resumable) and a combined book.txt.
   python3 vlm-book.py <model> <pages_dir> <out_dir> [parallel]
"""
import base64, json, os, sys, time, glob, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

HOST = os.environ.get("OLLAMA", "http://localhost:11435")
PROMPT = ("You are a precise OCR engine. Transcribe ALL text on this textbook page exactly as printed. "
          "Preserve line breaks and indentation. Render source-code listings verbatim inside ``` fences, keeping line numbers if present. "
          "Render tables as Markdown tables. If a region is a diagram with no words, write [diagram]. "
          "Do not summarize, do not add commentary, do not translate. Output only the transcription.")

def ocr(model, path):
    img = base64.b64encode(open(path, "rb").read()).decode()
    body = {"model": model, "stream": False, "keep_alive": "30m",
            "options": {"temperature": 0, "num_predict": 6144},
            "messages": [{"role": "user", "content": PROMPT, "images": [img]}]}
    req = urllib.request.Request(f"{HOST}/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                return json.load(r)["message"]["content"]
        except Exception as e:
            if attempt == 2: raise
            time.sleep(5)

def main():
    model, pages_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    par = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    os.makedirs(out_dir, exist_ok=True)
    pages = sorted(glob.glob(os.path.join(pages_dir, "pg-*.png")))
    todo = [p for p in pages if not os.path.exists(os.path.join(out_dir, os.path.basename(p)[:-4] + ".txt"))]
    print(f"{len(pages)} pages, {len(todo)} to do, parallel={par}", flush=True)
    t0 = time.time(); done = 0
    def work(p):
        txt = ocr(model, p)
        with open(os.path.join(out_dir, os.path.basename(p)[:-4] + ".txt"), "w") as f: f.write(txt)
        return p
    with ThreadPoolExecutor(max_workers=par) as ex:
        futs = {ex.submit(work, p): p for p in todo}
        for fut in as_completed(futs):
            done += 1
            try: fut.result()
            except Exception as e: print(f"FAIL {futs[fut]}: {e}", flush=True)
            if done % 10 == 0 or done == len(todo):
                el = time.time() - t0
                print(f"{done}/{len(todo)}  {el/60:.1f} min  ETA {(el/done)*(len(todo)-done)/60:.1f} min", flush=True)
    # combine
    with open(os.path.join(out_dir, "book.txt"), "w") as out:
        for p in pages:
            t = os.path.join(out_dir, os.path.basename(p)[:-4] + ".txt")
            n = int(os.path.basename(p)[3:-4])
            out.write(f"\n\n<<<<< PAGE {n} >>>>>\n\n")
            out.write(open(t).read() if os.path.exists(t) else "[OCR FAILED]")
    print("wrote book.txt", flush=True)

if __name__ == "__main__": main()
