import random

import urllib
import urllib2

######################################################################

def getRandNumber(n):
	r = int(random.random() * 1000) % n
	return r

def getRandChar():
	s = "abcdefghijklmnopqrstuvwxyz"
	n = len(s)
	v = getRandNumber(n)
	c = s[v]
	return str(c)

def getRandString(n):
	s = ""
	for i in range(0,n):
		s = s + getRandChar()
	return s

######################################################################

def assertEqual(valueReal, valueNormal):
	message = ""
	if(valueNormal != valueReal):
		message += "\n"
		message += "----------------------------------------------"
		message += "\n"
		message += "Result not correct:"
		message += "\n"
		message += "Normal result: " + str(valueNormal);
		message += "\n"
		message += "Real result: " + str(valueReal);
		message += "\n\n"
		raise Exception(message)
	else:
		message += "\n"
		message = "----------------------------"
		message += "\n"
		message += "Test OK"
		message += "\n"
		message += "Normal and Real value: " + str(valueReal);
		message += "\n\n"
		print(message)

######################################################################

def getUrl(s):
	url = 'http://localhost:5333/' + s + '/' + getRandString(25)
	return url

def sendGet(s):
	url = 'http://localhost:5333/' + getRandString(25) + "/" + s
	data = urllib.urlopen(url).read()
	return data

def sendPost(s, body):
	headers = { 'User-Agent' : 'python urllib2' }
	data = body
	url = getUrl(s)
	req = urllib2.Request(url, data, headers)
	response = urllib2.urlopen(req)
	result = response.read()
	return result


######################################################################

query = 0

while(True):
	query += 1;
	print( "POST Query: " + str(query) );
	n = getRandNumber(300) + 5;
	server_answer = sendPost( "api", str(n) );
	normal_answer = n * n * n;
	assertEqual( str(server_answer), str(normal_answer) );

	query += 1;
	print( "GET Query: " + str(query) );
	n = getRandNumber(300) + 5;
	server_answer = sendGet(str(n));
	normal_answer = n * n * n;
	assertEqual( str(server_answer), str(normal_answer) );






	



