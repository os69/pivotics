#!/usr/bin/python

# import packages
# ===============================================================
import os 
import string,cgi,time
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SocketServer import ThreadingMixIn
import threading
import json
import getopt
import sys

# global fields
# ===============================================================
FILE_LOCK = threading.Lock()
CWD = os.path.abspath('.')
MIMETYPES = { 'css'  : 'text/css',
              'json' :'application/json',
              'html' : 'text/html',
              'png'  : 'image/png',
              'gif'  : 'image/gif',
              'jpg'  : 'image/jpeg'
            }

# server
# ===============================================================
class MultiThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass

# request handler
# ===============================================================
class PivoticsHandler(BaseHTTPRequestHandler):

    def getMimeType(self,path):
        ext = os.path.splitext(path)[1][1:]
        try:
            return MIMETYPES[ext]
        except KeyError:
            return "'application/octet-stream'"
        
    def do_GET(self):
        try:
            
            path = self.path.split("?",1)[0]
            filepath = path[1:] # remove leading '/'     
            
            f = open( os.path.join(CWD, filepath), 'rb' ) 
          
            self.send_response(200)
            self.send_header('Content-type', self.getMimeType(filepath))
            self.end_headers()
            self.wfile.write(f.read())
            f.close()  
                          
        except IOError as e : 
            print e
            self.send_error(500,'Error for path: %s Error: %s' % (self.path,e))

    def do_POST(self):

        # read data
        length = int(self.headers.getheader('content-length'))
        data = self.rfile.read(length) 
        data = self.extractData(data)
        version = self.getVersion(data)
        
        # assemble filename
        filename = os.path.join(CWD,self.path[1:])
        
        # lock
        if not FILE_LOCK.acquire(False):        
            self.send_error(500,"File locked by other user")
            return

        try:

            # load old version
            try:
                f = open(filename,"r")
                dataOld = f.read()
                f.close()
                versionOld = self.getVersion(json.loads(dataOld))
            except IOError,e:
                versionOld=-1
            
            # check version
            if versionOld+1!=version and versionOld!=-1 and version!=1:        
                self.send_error(500,"Version error, file was saved by other user")
                return
                                    
            # save
            f = open(filename,"w")
            f.write(json.dumps(data))
            f.close()
                     
            # send response        
            self.send_response(200)
            self.end_headers()        
            self.wfile.write("{}");
            
            print "saved"
            
        finally:
            FILE_LOCK.release()
            
    def extractData(self,data):
        data = json.loads(data)
        if data['newData']:
            return data['newData']
        else:
            return data

    def getVersion(self,data):
        #data = json.loads(data)
        return data['header']['version']            

# usage
# ===============================================================
def usage():
    print ""
    print "python server.py OPTIONS"
    print ""
    print "OPTIONS:"
    print "  --help, -h                 print help"
    print "  --port=PORT, -p PORT       server listening port"
    print "  --server=ADDR, -s ADDR     server address" 
    
# main
# ===============================================================
def main():

    # defaults
    host = ''
    port = 51000
    
    # read options
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hs:p:", ["help","server=", "port="])
    except getopt.GetoptError as err:
        print str(err) 
        usage()
        sys.exit(2)
    output = None
    verbose = False
    for o, a in opts:
        if o in ("-p", "--port"):
            port = int(a)
        elif o in ("-s", "--server"):
            host = a
        elif o in ("-h", "--help"):
            usage()
            sys.exit()
        else:
            assert False, "unhandled option"
                
    # start server
    try:
        server = MultiThreadedHTTPServer((host, port), PivoticsHandler)
        print 'started httpserver'
        print 'host:',host
        print 'port:',port
        server.serve_forever()
    except KeyboardInterrupt:
        server.socket.close()

if __name__ == '__main__':
    main()
