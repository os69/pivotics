#!/usr/bin/python

# Copyright Jon Berg , turtlemeat.com
# Modified by nikomu @ code.google.com     

import string,cgi,time
from os import curdir, sep
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SocketServer import ThreadingMixIn
import threading
import json


FILE_LOCK = threading.Lock()

class MultiThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass

import os # os. path

CWD = os.path.abspath('.')
MIMETYPES = { '.css'  : 'text/css',
              'json' :'application/json'
            }

## print CWD

# PORT = 8080     
UPLOAD_PAGE = 'upload.html' # must contain a valid link with address and port of the server     s


def make_index( relpath ):     

    abspath = os.path.abspath(relpath) # ; print abspath
    flist = os.listdir( abspath ) # ; print flist
    
    rellist = []
    for fname in flist :     
        relname = os.path.join(relpath, fname)
        rellist.append(relname)
    
    # print rellist
    inslist = []
    for r in rellist :     
        inslist.append( '<a href="%s">%s</a><br>' % (r,r) )
    
    # print inslist
    
    page_tpl = "<html><head></head><body>%s</body></html>"     
    
    ret = page_tpl % ( '\n'.join(inslist) , )
    
    return ret


# -----------------------------------------------------------------------

class MyHandler(BaseHTTPRequestHandler):

    def getMimeType(self,path):
        ext = path[-4:].lower()
        try:
            return MIMETYPES[ext]
        except KeyError:
            return "'application/octet-stream'"
        
    def do_GET(self):
        try:
            
            path = self.path.split("?",1)[0]
            
            if path == '/' :     
                page = make_index( '.' )
                self.send_response(200)
                self.send_header('Content-type',    'text/html')
                self.end_headers()
                self.wfile.write(page)
                return     

            if path.endswith(".html"):
                print "xx ",curdir + sep + path
                f = open(curdir + sep + path)
                #note that this potentially makes every file on your computer readable by the internet

                self.send_response(200)
                self.send_header('Content-type',    'text/html')
                self.end_headers()
                self.wfile.write(f.read())
                f.close()
                return
                
            else : # default: just send the file     
                
                filepath = path[1:] # remove leading '/'     
            
                f = open( os.path.join(CWD, filepath), 'rb' ) 
                #note that this potentially makes every file on your computer readable by the internet

                self.send_response(200)
                self.send_header('Content-type',    self.getMimeType(filepath))
                self.end_headers()
                self.wfile.write(f.read())
                f.close()
                return

            return # be sure not to fall into "except:" clause ?       
                
        except IOError as e :  
            # debug     
            print e
            self.send_error(404,'File Not Found: %s' % self.path)
     

    def do_POST(self):

        # read data
        length = int(self.headers.getheader('content-length'))
        data = self.rfile.read(length) # Why Does this line break persistance!
        version = self.getVersion(data)
        
        # assemble filename
        filename = os.path.join(curdir,self.path[1:])
        
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
                versionOld = self.getVersion(dataOld)
            except IOError,e:
                versionOld=0
            
            # check version
            if version!=1 and versionOld+1!=version:        
                self.send_error(500,"Version error, file was saved by other user")
                return
                                    
            # save
            f = open(filename,"w")
            f.write(data)
            f.close()
                     
            # send response        
            self.send_response(200)
            self.end_headers()        
            self.wfile.write("{}");
            
            print "saved"
            
        finally:
            FILE_LOCK.release()
            

    def getVersion(self,data):
        data = json.loads(data)
        return data['header']['version']            

def main():

    try:
        server = MultiThreadedHTTPServer(('', 51000), MyHandler)
        print 'started httpserver...'
        server.serve_forever()
    except KeyboardInterrupt:
        print '^C received, shutting down server'
        server.socket.close()

if __name__ == '__main__':
    main()
