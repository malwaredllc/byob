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
echo ""
echo ""
# Run app
cd ..
echo "Don't use 0.0.0.0:5000 - That is just a testing IP."
echo "Due to the ever developing of BYOB, 0.0.0.0:5000 stays for now"
echo ""
echo ""
echo "Open URL in browser: ""$HOSTNAME"".local:5000"
echo ""
echo ""
python3 run.py >& /dev/null