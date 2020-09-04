import os
import time

print("Running BYOB app startup...")

# Install Python if necessary
status = os.system("which python3")

if status == "":
	print("Installing Python 3.6...")
  	print("In 5 secconds there will be a popup asking for you to put in an admin password. This is the python install exe running. This is NOT a virus the hashes for this file are in 'hashes.txt'.")
	time.sleep(5)
  	os.system("python-3.8.5-amd64.exe")
else:
	print("Confirmed Python is installed.")

# Install Docker if necessary
status2 = os.system("which docker")

if test $status -ne 0
then
	echo "Installing Docker..."
	apt-get install docker.io -y
else
	echo "Confirmed Docker is installed."
fi

# Install Python packages
print("Installing Python packages...")
os.system("python3 -m pip install -r requirements.txt")
# Build Docker images
os.system("Building Docker images - this will take a while, please be patient...")
os.system("cd docker-pyinstaller1")
os.system("docker build -f Dockerfile-py3-amd64 -t nix-amd64 .")
os.system("docker build -f Dockerfile-py3-i386 -t nix-i386 .")
os.system("docker build -f Dockerfile-py3-win32 -t win-x32 .")

# Run app
os.system("cd ..")
os.system("python3 run.py")
