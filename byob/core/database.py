#!/usr/bin/python
# -*- coding: utf-8 -*-
'Database (Build Your Own Botnet)'

# standard library
import os
import json
import sqlite3
import hashlib
import datetime
import collections

# modules
import util

try:
    unicode        # Python 2
except NameError:
    unicode = str  # Python 3

class Database(sqlite3.Connection):
    """
    Builds and manages a persistent Sqlite3 database for the
    sessions & tasks handled by byob.server.Server instances

    """
    _tbl_tasks = """BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS tbl_tasks (
    id serial,
    uid varchar(32) NOT NULL,
    session varchar(32) NOT NULL,
    task text DEFAULT NULL,
    result text DEFAULT NULL,
    issued DATETIME DEFAULT NULL,
    completed DATETIME DEFAULT NULL
);
COMMIT;
"""
    _tbl_sessions = """BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS tbl_sessions (
    id serial,
    uid varchar(32) NOT NULL,
    online boolean DEFAULT 0,
    joined DATETIME DEFAULT NULL,
    last_online DATETIME DEFAULT NULL,
    sessions tinyint(3) DEFAULT 1,
    public_ip varchar(42) DEFAULT NULL,
    mac_address varchar(17) DEFAULT NULL,
    local_ip varchar(42) DEFAULT NULL,
    username text DEFAULT NULL,
    administrator boolean DEFAULT 0,
    platform text DEFAULT NULL,
    device text DEFAULT NULL,
    architecture text DEFAULT NULL,
    longitude float DEFAULT NULL,
    latitude float DEFAULT NULL,
    owner varchar(120) DEFAULT NULL
);
COMMIT;
"""

    def __init__(self, database=':memory:'):
        """
        Create new Sqlite3 Conection instance and setup the BYOB database

        `Optional`
        :param str database:    name of the persistent database file

        """
        super(Database, self).__init__(database, check_same_thread=False)
        self.row_factory = sqlite3.Row
        self.text_factory = str
        self._database = database
        self._tasks = ['escalate','keylogger','outlook','packetsniffer','persistence','phone','portscan','process','ransom','screenshot','webcam']
        self.execute_file(sql=self._tbl_sessions, returns=False, display=False)
        self.execute_file(sql=self._tbl_tasks, returns=False, display=False)

    def _display(self, data, indent=4):
        c = globals().get('_color')

        if isinstance(data, dict):
            for k,v in data.items():
                if isinstance(v, unicode):
                    try:
                        j = json.loads(v.encode())
                        self._display(j, indent+2)
                    except:
                        util.display(str(k).ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                        util.display(str(v).replace('\n',' ')[:40].encode(), color=c, style='dim')

                elif isinstance(v, list):
                    for i in v:
                        if isinstance(v, dict):
                            util.display(str(k).ljust(4  * indent).center(5 * indent).encode())
                            self._display(v, indent+2)
                        else:
                            util.display(str(i).ljust(4  * indent).center(5 * indent).encode())

                elif isinstance(v, dict):
                    util.display(str(k).ljust(4  * indent).center(5 * indent).encode())
                    self._display(v, indent+1)

                elif isinstance(v, int):
                    if v in (0,1):
                        util.display(str(k).ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                        util.display(str(bool(v)).encode(), color=c, style='dim')
                    else:
                        util.display(str(k).ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                        util.display(str(v).encode(), color=c, style='dim')

                else:
                    util.display(str(k).ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                    util.display(str(v).encode(), color=c, style='dim')

        elif isinstance(data, list):
            for row in data:
                if isinstance(row, dict):
                    self._display(row, indent+2)
                else:
                    util.display(str(row).ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                    util.display(str(v).encode(), color=c, style='dim')
        else:
            try:
                data = dict(data)
            except: pass

            if isinstance(data, collections.OrderedDict):
                data = dict(data)

            if isinstance(data, dict):
                self._display(data, indent+2)
            else:
                util.display(data.ljust(4  * indent).center(5 * indent).encode(), color=c, style='bright', end=' ')
                util.display(str(v).encode(), color=c, style='dim')

    def _client_sessions(self, uid):
        for i in self.execute('select sessions from tbl_sessions where uid=:uid', {"uid": uid}):
            if isinstance(i, int):
                s = i + 1
                break
        else:
            s = 1
        return s

    def _count_sessions(self):
        return len(self.get_sessions(verbose=False))

    def debug(self, output):
        """
        Print debugging output to console
        """
        util.log(str(output), level='debug')

    def error(self, output):
        """
        Print error output to console
        """
        util.log(str(output), level='error')

    def exists(self, uid):
        """
        Check if a client exists in the database
        """
        result = bool(len([_ for _ in self.execute("select * from tbl_sessions where uid=:uid", {"uid": uid})]))
        return result

    def update_status(self, session, online):
        """
        Update session status to online/offline

        `Required`
        :param int session:     session ID
        :param bool online:     True/False = online/offline

        """
        try:
            if online:
                if isinstance(session, str):
                    self.execute_query("UPDATE tbl_sessions SET online=1 WHERE uid=:uid", params={"uid": session}, returns=False)
                elif isinstance(session, int):
                    self.execute_query("UPDATE tbl_sessions SET online=1 WHERE id=:uid", params={"uid": session}, returns=False)
            else:
                if isinstance(session, str):
                    self.execute_query("UPDATE tbl_sessions SET online=0, last_online=:last_online WHERE uid=:uid", params={"uid": session, "last_online": datetime.datetime.now()}, returns=False)
                elif isinstance(session, int):
                    self.execute_query("UPDATE tbl_sessions SET online=0, last_online=:last_online WHERE id=:uid", params={"uid": session, "last_online": datetime.datetime.now()}, returns=False)
        except Exception as e:
            self.error("{} error: {}".format(self.update_status.__name__, str(e)))

    def get_sessions(self, verbose=False):
        """
        Fetch sessions from database

        `Optional`
        :param bool verbose:    include full session information
        :param bool display:    display o self.error("{} error: {}".format(self.update_status.__name__, str(e)))

        Fetch sessions from database

        `Optional`
        :param bool verbose:    include full session information
        :param bool display:    display ouutput

        """
        sql = "select * from tbl_sessions" if verbose else "public_ip, uid, platform from tbl_sessions"
        statement = self.execute(sql)
        columns = [_[0] for _ in statement.description]
        return [{k:v for (k,v) in zip(columns, rows)} for rows in statement.fetchall()]

    def get_tasks(self):
        """
        Fetch tasks from database

        `Optional`
        :param int session:     session ID
        :param bool display:    display output

        Returns tasks as dictionary (JSON) object
        """
        sql = "select * from tbl_tasks"
        statement = self.execute(sql)
        columns = [_[0] for _ in statement.description]
        return [{k:v for k,v in zip(columns, rows)} for rows in statement.fetchall()]

    def handle_session(self, info):
        """
        Handle a new/current client by adding/updating database

        `Required`
        :param dict info:    session host machine information

        Returns the session information as a dictionary (JSON) object
        """
        if isinstance(info, dict):

            if not info.get('uid'):
                buid = str(info['public_ip'] + info['mac_address']).encode()
                info['uid'] = hashlib.md5(buid).hexdigest()
                info['joined'] = datetime.datetime.now()

            info['online'] = 1
            info['sessions'] = self._client_sessions(info['uid'])
            info['last_online'] = datetime.datetime.now()

            newclient = False
            if not self.exists(info['uid']):
                newclient = True
                self.execute_query("insert into tbl_sessions ({}) values (:{})".format(','.join(info.keys()), ',:'.join(info.keys())), params=info, returns=False, display=False)
            else:
                self.execute_query("update tbl_sessions set online=:online, sessions=:sessions, last_online=:last_online where uid=:uid", params=info, returns=False, display=False)

            for row in self.execute("select * from tbl_sessions where uid=:uid", info):
                if isinstance(row, dict):
                    info = row
                    break

            if newclient:
                info['new'] = True

            self.commit()
            return info

        else:
            self.error("Error: invalid input type received from server (expected '{}', receieved '{}')".format(dict, type(info)))

    def handle_task(self, task):
        """
        Adds issued tasks to the database and updates completed tasks with results

        `Task`
        :attr str client:          client ID assigned by server
        :attr str task:            task assigned by server
        :attr str uid:             task ID assigned by server
        :attr str result:          task result completed by client
        :attr datetime issued:     time task was issued by server
        :attr datetime completed:  time task was completed by client

        Returns task assigned by database as a dictionary (JSON) object

        """
        if isinstance(task, dict):
            if 'uid' not in task:
                buid = str(task['session'] + task['task'] + datetime.datetime.now().ctime()).encode()
                task['uid'] = hashlib.md5(buid).hexdigest()
                task['issued'] = datetime.datetime.now()
                self.execute_query('insert into tbl_tasks (uid, session, task, issued) values (:uid, :session, :task, :issued)', params={"uid": task['uid'],  "session": task['session'], "task": task['task'], "issued": task['issued']}, returns=False)
                task['issued'] = task['issued'].ctime()
            else:
                task['completed'] = datetime.datetime.now()
                self.execute_query('update tbl_tasks set result=:result, completed=:completed where uid=:uid', params={"result": task['result'], "completed": task['completed'], "uid": task['uid']}, returns=False)
                task['completed'] = task['completed'].ctime()

            self.commit()

            return task

        else:
            self.debug("{} error: invalid input type (expected {}, received {})".format(self.handle_task.__name__, dict, type(task)))

    def execute_query(self, stmt, params={}, returns=True, display=False):
        """
        Query the database with a SQL statement and return result

        `Required`
        :param str sql:         SQL expression to query the database with

        `Optional`
        :param dict params:     dictionary of statement paramaters
        :param bool returns:    returns output if True
        :param bool display:    display output from database if True

        Returns a list of output rows formatted as dictionary (JSON) objects

        """
        result = []
        for row in self.execute(stmt, params):
            result.append(row)
            if display:
                self._display(row)

        self.commit()

        if returns:
            return result

    def execute_file(self, filename=None, sql=None, returns=True, display=False):
        """
        Execute SQL commands sequentially from a string or file

        `Optional`
        :param str filename:    name of the SQL batch file to execute
        :param bool returns:    returns output from database if True
        :param bool display:    display output from database if True

        Returns a list of output rows formatted as dictionary (JSON) objects

        """
        try:
            result = []
            if isinstance(filename, str):
                assert os.path.isfile(filename), "keyword argument 'filename' must be a valid filename"

                with open(filename) as stmts:
                    for line in self.executescript(stmts.read()):
                        result.append(line)
                        if display:
                            self._display(line)

            elif isinstance(sql, str):
                for line in self.executescript(sql):
                    result.append(line)
                    if display:
                        self._display(line)

            else:
                raise Exception("missing required keyword argument 'filename' or 'sql'")

            self.commit()

            if returns:
                return result

        except Exception as e:
            self.error("{} error: {}".format(self.execute_file.__name__, str(e)))
