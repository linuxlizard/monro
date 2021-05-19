import numpy as np

import tornado.ioloop
import tornado.web

from cpnetem import webapi
import minicom

hostname = "172.16.253.1"

class EthernetPortStatistics:
    def __init__(self):
        self.last = 0
        # note will grow without bound but this little program is only intended
        # to run for a short time anyway
        self.samples = []

    def update(self, n):
        self.samples.append(n)

    def stats(self):
        ndata = np.asarray(self.samples)
        return { "min": ndata.min(),
                "max" : ndata.max(),
                "mean" : ndata.mean(),
                "median" : np.median(ndata),
                "std" : ndata.std() }

# dict of of /status/ethernet sampling
# key: hostanme
# value: dict of
#   key: port number
#   value: EthernetPortStatistics
ethernet_stats = {}

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

class RouterHandler(tornado.web.RequestHandler):
    def get_conn(self):
        router = self.get_argument("router", default=hostname)
        port = self.get_argument("port", default="80")
        conn = webapi.WebAPI(hostname=router, scheme="http", port=port, verify=False)
        return conn

class ProductInfoHandler(RouterHandler):
    def get(self):
        conn = self.get_conn()
        product_info = conn.get("/api/status/product_info")
        print(product_info)
        self.render("product_info.html", 
            product_info = product_info )

class StatusEthernetHandler(RouterHandler):
    def get(self):
        conn = self.get_conn()
        status = conn.get("/api/status/ethernet")
        print(f"status={status}")
        port_numbers = { d["port"] : None for d in status }
        print(f"port_numbers={port_numbers}")
        self.render("ethernet.html", ports=status )

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/product_info", ProductInfoHandler),
        (r"/ethernet", StatusEthernetHandler),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
