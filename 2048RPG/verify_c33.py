import subprocess
import time
import json
import os
import sys

results_file = os.path.join(r"C:\Antigravity\2048RPG\Commercial_Edition", "test_results.json")
if os.path.exists(results_file):
    os.remove(results_file)

# Launch Edge headless on already running port 8081
edge_cmd = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "--headless",
    "--disable-gpu",
    "http://localhost:8081/runner.html"
]

print("Launching Edge...")
edge_proc = subprocess.Popen(edge_cmd)

# Wait for test_results.json
max_wait = 20
start_time = time.time()
found = False

while time.time() - start_time < max_wait:
    if os.path.exists(results_file):
        try:
            with open(results_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "results" in data or "error" in data:
                    print("Test results detected!")
                    print(f"Summary: {data.get('summary')}")
                    print(f"Passed: {data.get('passed')} / {data.get('total')}")
                    if "error" in data:
                        print(f"Error: {data.get('error')}")
                        print(f"Stack: {data.get('stack')}")
                    failures = [r for r in data.get('results', []) if r.get('status') != 'PASS']
                    if failures:
                        print(f"Failures ({len(failures)}):")
                        for fl in failures:
                            print(f"  - {fl.get('name')}: {fl.get('error')}")
                    found = True
                    break
        except Exception:
            pass
    time.sleep(0.5)

edge_proc.terminate()

if not found:
    print("FAILED: Timeout waiting for test results.")
    sys.exit(1)
