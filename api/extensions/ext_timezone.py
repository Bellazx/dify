import os
import time

from dify_app import DifyApp


def init_app(app: DifyApp):
    os.environ["TZ"] = "Asia/Shanghai"
    # windows platform not support tzset
    if hasattr(time, "tzset"):
        time.tzset()
