#/bin/sh
spin()
{
spinner="/|\\-/|\\-"
while :
do
    for i in `seq 0 7`
    do
    echo -n "${spinner:$i:1}"
    echo -en "\010"
    sleep .15
    done
done
}
spin &
SPIN_PID=$!
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
; kill -9 $SPIN_PID > /dev/null
sleep .05
echo "This = line 28: 111695 Killed spin  (wd: ~/byob/web-gui) = Is not an error. Please ignore"
echo ""
# Run app
cd ..
echo ""
echo "Open URL in browser: ""$HOSTNAME"".local:5000"
python3 run.py >& /dev/null