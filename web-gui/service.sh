#/bin/sh
# Build Docker images
echo "Building Docker images - this will take a while, please be patient..."
echo ""
echo "Please wait about 15-30 min before the server is started up..."
echo "On slower PC's it can be as long as up to 1-2 hours..."
echo ""
cd docker-pyinstaller1 \
; docker build -f Dockerfile-py3-amd64 -t nix-amd64 . >& /dev/null \
; docker build -f Dockerfile-py3-i386 -t nix-i386 . >& /dev/null \
; docker build -f Dockerfile-py3-win32 -t win-x32 . >& /dev/null \
# Run app
cd ..
echo ""
echo "Open URL in browser: ""$HOSTNAME"".local:5000"
python3 run.py