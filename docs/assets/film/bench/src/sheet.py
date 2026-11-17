"""python3 sheet.py out.jpg cols w h img1 img2 ...  -> contact sheet"""
import subprocess, sys
out, cols, w, h, *names = sys.argv[1:]; cols, w, h = int(cols), int(w), int(h)
while len(names) % cols: names.append(names[-1])
args = []
for n in names: args += ["-i", n]
f = "".join(f"[{i}]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=gray[v{i}];" for i in range(len(names)))
rows = len(names) // cols
for r in range(rows): f += "".join(f"[v{r*cols+j}]" for j in range(cols)) + f"hstack={cols}[r{r}];"
f += "".join(f"[r{r}]" for r in range(rows)) + (f"vstack={rows}" if rows > 1 else "null")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args, "-filter_complex", f, out], check=True)
