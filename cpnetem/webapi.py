#!/usr/bin/env python3
"""
    Copyright © 2016 Cradlepoint, Inc. <www.cradlepoint.com>.  All rights reserved.

    This file contains confidential information of Cradlepoint, Inc. and your
    use of this file is subject to the Cradlepoint Software License Agreement
    distributed with this file. Unauthorized reproduction or distribution of
    this file is subject to civil and criminal penalties.

    Desc:

"""

# davep 20160906 ;  tinker with Requests library and WiFi
# davep 20161206 ; move core requests wrapper to own file

import os
import logging
import json
import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import certifi

logger = logging.getLogger("webapi")


class WebAPIError(Exception):
    pass


class HTTPError(WebAPIError):
    """Raised when HTTP status code != 200. Contains the Response instance."""

    def __init__(self, response):
        self.response = response


class TransactionFailed(WebAPIError):
    """Raised when the firmware reports a config tree transaction failure.
    Contains the JSON response from the firmware."""

    def __init__(self, response_json):
        super().__init__()
        # put all the fields of the response JSON into the exception so user
        # can most easily get to details of the failure
        for key, value in response_json.items():
            # for safety, don't overwrite something already in the class
            if getattr(self, key, None):
                logger.warning('ignoring response field "%s"' % key)
            else:
                setattr(self, key, value)


class WebAPI(object):
    # make James Comey sad and default to HTTPS
    def __init__(
        self,
        hostname="192.168.0.1",
        scheme="https",
        port=443,
        username="admin",
        password=None,
        verify=None,
    ):
        # require ip, password
        self.my_ip = hostname

        self.scheme = scheme
        self.my_port = port

        self.username = username

        if password is None:
            password = os.getenv("CP_PASSWORD") or "12345"
        self.auth = HTTPBasicAuth(self.username, password)
        # 		self.auth = HTTPDigestAuth(self.username, password)
        self.session = requests.Session()

        if verify is None:
            self.verify = False
        else:
            self.verify = verify

        if self.scheme == "https":
            if not self.verify:
                # try the curl CURL_CA_BUNDLE env var
                curl_ca_bundle = os.getenv("CURL_CA_BUNDLE")
                if curl_ca_bundle:
                    self.verify = curl_ca_bundle
                else:
                    # default to the python packaged certificates
                    self.verify = certifi.where()
        elif self.scheme == "http":
            if self.verify is not False:
                raise ValueError("verify with http makes no sense")

    def __str__(self):
        return "router ip={}".format(self.my_ip)

    def _mkpath(self, path):
        # require absolute path from caller because I'm a jerk
        if not path[0] == "/":
            raise ValueError

        path = "{0.scheme}://{0.my_ip}:{0.my_port}{1}".format(self, path)
        return path

    def haz_error(self, response):
        # "If we don't succeed, we run the risk of failure."
        if response.status_code != 200:
            logger.error(response.headers)
            logger.error(response.text)
            # caller can peek at the response fields
            raise HTTPError(response)

        # HTTP says all is well.
        # What says the firmware of our little request?
        r_json = response.json()
        if not r_json["success"]:
            # davep 20170422 ; error can have no value, usually because I've
            # pushed down something completely messed up like a bad path
            try:
                logger.error(
                    'router refused key="%s" value="%s" path="%s" reason="%s"'
                    % (
                        r_json["data"].get("key", "(No Key!)"),
                        r_json["data"]["value"],
                        r_json["data"]["path"],
                        r_json["data"]["reason"],
                    )
                )
            except KeyError:
                logger.error(
                    'router refused key="%s" reason="%s"'
                    % (r_json["data"].get("key", "(No Key!)"), r_json["data"]["reason"])
                )
            raise TransactionFailed(r_json["data"])
        return r_json

    def get(self, path):
        path = self._mkpath(path)
        logger.debug("get path=%s" % path)
        try:
            response = self.session.get(path, auth=self.auth, verify=self.verify)
        except requests.exceptions.ConnectionError as err:
            logger.error(err)
            return {}
        response_json = self.haz_error(response)
        return response_json["data"]

    def put(self, path, data):
        path = self._mkpath(path)
        logger.debug("put path=%s" % path)
        response = self.session.put(
            path, auth=self.auth, verify=self.verify, data={"data": json.dumps(data)}
        )
        self.haz_error(response)
        # nothing to return

    def post(self, path, data):
        path = self._mkpath(path)
        logger.debug("post path=%s" % path)
        response = self.session.post(
            path, auth=self.auth, verify=self.verify, data={"data": json.dumps(data)}
        )
        response_json = self.haz_error(response)
        return response_json["data"]

    def delete(self, path, data):
        path = self._mkpath(path)
        logger.debug("delete path=%s" % path)
        response = self.session.delete(
            path, auth=self.auth, verify=self.verify, data={"data": json.dumps(data)}
        )
        response_json = self.haz_error(response)
        return response_json["data"]

    def post_file(self, path, files):
        path = self._mkpath(path)
        logger.debug("post_file path=%s" % path)
        response = self.session.post(
            path, auth=self.auth, verify=self.verify, files=files
        )
        response_json = self.haz_error(response)

    def set_readonly(self, flag):
        """Set the global /control/system/readonlyconfig flag. When True, all control
        store changes are not written to non-volatile storage. Not writing saves
        wear on the flash during testing. Also useful to avoid leaving a config in
        a strange state after testing (just reboot and all previous settings are
        back.)
        """
        self.put("/api/control/system", {"readonlyconfig": bool(flag)})

    def get_readonly(self):
        return self.get("/api/control/system/readonlyconfig")



def set_readonly(conn, flag):
    """Set the global /control/system/readonlyconfig flag. When True, all control
    store changes are not written to non-volatile storage. Not writing saves
    wear on the flash during testing. Also useful to avoid leaving a config in
    a strange state after testing (just reboot and all previous settings are
    back.)
    """
    conn.put("/api/control/system", {"readonlyconfig": bool(flag)})


def get_readonly(conn):
    return conn.get("/api/control/system/readonlyconfig")


def want_array(mystery_object):
    # Sometimes can get back a single dict. Or sometimes get back an array. We
    # want to iterate over the entries so have to be careful to always have an
    # array.
    try:
        # note I am not calling the sort just testing for its existence
        mystery_object.sort
    except AttributeError:
        return [
            mystery_object,
        ]

    return mystery_object
