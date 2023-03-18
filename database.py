from app import app, db

with app.app_context():
    # 删除现有表（如果需要重新创建表）
    db.drop_all()

    # 创建表
    db.create_all()
    # 输出新建的表
    print(db.metadata.tables)
