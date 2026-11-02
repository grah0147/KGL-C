#!/usr/bin/env python3
"""
Kigali Connect (kgl-c) Launcher
================================
Installs dependencies and starts the FastAPI server with the SQLite database.

Usage:
    python launch_kglc_db.py          # Start on port 8000
    python launch_kglc_db.py 9000     # Start on custom port
"""

import subprocess
import sys
import os

def pip_install(pkg):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    # Install required packages
    print("Installing dependencies...")
    pip_install("fastapi")
    pip_install("uvicorn[standard]")
    pip_install("pydantic")

    # Server path is in same directory as this launcher
    server_dir = os.path.dirname(os.path.abspath(__file__))
    server_file = os.path.join(server_dir, "kglc_api_server.py")

    if not os.path.exists(server_file):
        print(f"ERROR: Server file not found at {server_file}")
        sys.exit(1)

    db_file = os.path.join(server_dir, "kglc.db")
    if not os.path.exists(db_file):
        print(f"ERROR: Database not found at {db_file}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  🚌  Kigali Connect — Starting Server")
    print(f"  📍  http://0.0.0.0:{port}")
    print(f"  👤  Client:    http://localhost:{port}/client")
    print(f"  🚐  Driver:    http://localhost:{port}/driver")
    print(f"  🏢  Company:   http://localhost:{port}/company")
    print(f"  📊  API:       http://localhost:{port}/api")
    print(f"  ❤️  Health:    http://localhost:{port}/api/health")
    print(f"{'='*60}\n")

    # Start uvicorn
    import uvicorn
    # We need to import the app module, adjust sys.path
    sys.path.insert(0, server_dir)
    os.chdir(server_dir)
    uvicorn.run("kglc_api_server:app", host="0.0.0.0", port=port, reload=False)

if __name__ == "__main__":
    main()
