import random

import urllib
import urllib2

######################################################################

def getRandNumber(n):
	# random [0, n-1]
	r = int(random.random() * 1000) % n
	return r

def getRandChar():
	s = "abcdefghijklmnopqrstuvwxyz"
	# [0, len-1]
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
# send s (num for cube) and coef kkk => (n^3) * kkk
def sendGet(s, kkk):
	url = 'http://localhost:5333/' + getRandString(25) + "/" + s
	req = urllib2.Request(url);
	# add header kkk
	req.add_header('kkk', str(kkk));
	# obj ans from host
	resp = urllib2.urlopen(req);
	# body of ans
	content = resp.read();
	return content;

def sendPost(s, body, kkk):
	headers = { 'User-Agent' : 'python urllib2', 'kkk' : str(kkk) }
	data = body
	url = 'http://localhost:5333/' + s + '/' + getRandString(25)
	req = urllib2.Request(url, data, headers)
	response = urllib2.urlopen(req)
	result = response.read()
	return result


######################################################################

query = 0

while(True):
	query += 1;
	print( "POST Query: " + str(query) );
	n = getRandNumber(300) + 5; # [5, 304]
	k = getRandNumber(15) + 2; # [2, 16]
	# /api/randstr
	server_answer = sendPost( "api", str(n), str(k) );
	normal_answer = n * n * n * k;
	assertEqual( str(server_answer), str(normal_answer) );

	query += 1;
	print( "GET Query: " + str(query) );
	n = getRandNumber(300) + 5;
	k = getRandNumber(15) + 2;
	# /randstr/333
	server_answer = sendGet(str(n), str(k));
	normal_answer = n * n * n * k;
	assertEqual( str(server_answer), str(normal_answer) );






	



