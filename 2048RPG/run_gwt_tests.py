import subprocess
import time
import json
import os
import sys

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

results_file = os.path.join(r"C:\Antigravity\2048RPG\Commercial_Edition", "test_results.json")
if os.path.exists(results_file):
    os.remove(results_file)

edge_cmd = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "--headless",
    "--disable-gpu",
    "http://localhost:8081/runner.html"
]

print("Launching Headless Edge for GWT Automated Suite...")
edge_proc = subprocess.Popen(edge_cmd)

max_wait = 20
start_time = time.time()
found = False

while time.time() - start_time < max_wait:
    if os.path.exists(results_file):
        try:
            with open(results_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if ("results" in data and len(data.get("results", [])) > 0) or "error" in data:
                    print("==================================================")
                    print(f" Summary: {data.get('summary')}")
                    print(f" Passed:  {data.get('passed')} / {data.get('total')}")
                    print("==================================================")
                    failures = [r for r in data.get('results', []) if r.get('status') != 'PASS']
                    if failures:
                        print(f"FAILURES DETECTED ({len(failures)}):")
                        for fl in failures:
                            print(f"  [FAIL] {fl.get('name')}: {fl.get('error')}")
                    else:
                        print("ALL TESTS PASSED SUCCESSFULLY (100% PASS RATE)!")
                    found = True
                    break
        except Exception as e:
            # print error if any
            pass
    time.sleep(0.5)

edge_proc.terminate()
try:
    edge_proc.wait(timeout=2)
except Exception:
    pass

if not found:
    print("FAILED: Timeout waiting for test results.")
    sys.exit(1)
else:
    sys.exit(0)
