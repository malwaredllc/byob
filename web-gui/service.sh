#/bin/sh
# Build Docker images
echo "Building Docker images - this will take a while, please be patient..."
echo ""
cd ~/byob/web-gui/docker-pyinstaller1 \
; docker build -f Dockerfile-py3-amd64 -t nix-amd64 . >& /dev/null \
; docker build -f Dockerfile-py3-i386 -t nix-i386 . >& /dev/null \
; docker build -f Dockerfile-py3-win32 -t win-x32 . >& /dev/null \
# Run app
cd ~/byob/web-gui/
python3 run.py