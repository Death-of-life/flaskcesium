import sqlite3
from faker import Faker
import random
import uuid
import datetime

# 数据库名称
db_name = "instance/typhoons.db"

# 连接到数据库
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

# 创建Faker实例
faker = Faker()

# 要插入的记录数量
num_entries = 10

# 循环生成随机数据并插入数据库
for _ in range(num_entries):
    typhoon_id = str(uuid.uuid4())
    name = faker.word()
    time = faker.date(pattern="%Y-%m-%d %H:%M:%S")
    upload_time = faker.date(pattern="%Y-%m-%d %H:%M:%S")
    wind_speed = random.uniform(50, 200)
    intensity = random.uniform(0, 100)
    latitude = random.uniform(-90, 90)
    longitude = random.uniform(-180, 180)

    cursor.execute(
        "INSERT INTO typhoons (id, name, time, upload_time, wind_speed, intensity, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (typhoon_id, name, time, upload_time, wind_speed, intensity, latitude, longitude)
    )

# 提交更改并关闭数据库连接
conn.commit()
conn.close()

print(f"{num_entries} random typhoon records have been inserted into {db_name}.")
