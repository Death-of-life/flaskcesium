import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
from werkzeug.utils import secure_filename
from typhoon_cnn import detect_image
from PIL import Image
from sqlalchemy import and_, or_
from predict_double import predict_double

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///typhoons.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = './uploads'
db = SQLAlchemy(app)








class Typhoon(db.Model):
    __tablename__ = 'typhoons'
    id = db.Column(db.Integer, primary_key=True)
    time = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    wind_speed = db.Column(db.Float, nullable=False)
    intensity = db.Column(db.String(10), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    upload_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<Typhoon {self.id} - {self.name}>"


class TyphoonHistory(db.Model):
    __tablename__ = 'typhoon_history'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    times = db.Column(db.String, nullable=False)

    def __repr__(self):
        return f"<TyphoonHistory {self.id} - {self.name}>"

def update_history():
    # 删除 typhoon_history 表中的所有记录
    db.engine.execute("DELETE FROM typhoon_history")

    # 使用新数据重新插入到 typhoon_history 表
    db.engine.execute("""
    INSERT INTO typhoon_history (id, name, times)
    SELECT typhoons.id, typhoons.name, GROUP_CONCAT(typhoons.time, ',')
    FROM typhoons
    GROUP BY typhoons.id, typhoons.name;
    """)

@app.route('/')
def index():
    return render_template("index.html")


@app.route('/admin')
def admin():
    return render_template("admin.html")


@app.route('/upload_file', methods=['POST'])
def upload_file():
    file1 = request.files.get('file1')
    file2 = request.files.get('file2')
    prediction_method = request.form.get('prediction_method')
    intensity = -1
    wind_speed = -1
    # 保存图片
    if file1:
        filename1 = secure_filename(file1.filename)
        file1_path = os.path.join(app.config['UPLOAD_FOLDER'], filename1)
        file1.save(file1_path)

    # if prediction_method == 'double' and file2:
    if file2:
        filename2 = secure_filename(file2.filename)
        file2_path = os.path.join(app.config['UPLOAD_FOLDER'], filename2)
        file2.save(file2_path)

    if file1 and file2:
        img1 = Image.open(file1_path).convert('L')
        img2 = Image.open(file2_path).convert('L')
        # 在这里调用处理第二个图片的预测函数
        wind_speed, intensity = predict_double(img1, img2)

    elif file1:
        img1 = Image.open(file1_path).convert('L')
        intensity = detect_image(img1)
    # 预测结果示例:
    predict_wind_speed = wind_speed
    predicted_intensity = intensity

    if prediction_method == 'single':
        prediction = {"intensity": predicted_intensity}
    else:
        prediction = {"wind_speed": predict_wind_speed, "intensity": predicted_intensity}

    return jsonify({"status": "success", "prediction": prediction})


@app.route('/typhoons', methods=['POST', 'GET', 'PUT', 'DELETE'])
def typhoons():
    if request.method == 'POST':
        typhoon_data = request.get_json()

        new_typhoon = Typhoon(
            id=typhoon_data['id'],
            name=typhoon_data['name'],
            time=typhoon_data['time'],
            upload_time=datetime.now(),
            wind_speed=typhoon_data['wind_speed'],
            intensity=typhoon_data['intensity'],
            longitude=typhoon_data['longitude'],
            latitude=typhoon_data['latitude']
        )

        db.session.add(new_typhoon)
        db.session.commit()
        update_history()
        return jsonify({"message": "台风添加成功"}), 201


    elif request.method == 'GET':

        typhoon_id = request.args.get('id')

        if typhoon_id:

            # 如果传入了 id 参数

            typhoon_history = TyphoonHistory.query.filter_by(id=typhoon_id).first()

            if typhoon_history:

                typhoon_times = typhoon_history.times.split(',')

                typhoon_data_list = []

                for time in typhoon_times:

                    typhoon = Typhoon.query.filter_by(id=typhoon_id, time=time).first()

                    if typhoon:
                        typhoon_data = {

                            'id': typhoon.id,

                            'name': typhoon.name,

                            'time': typhoon.time,

                            'upload_time': typhoon.upload_time,

                            'wind_speed': typhoon.wind_speed,

                            'intensity': typhoon.intensity,

                            'longitude': typhoon.longitude,

                            'latitude': typhoon.latitude

                        }

                        typhoon_data_list.append(typhoon_data)
                print(typhoon_data_list)
                return jsonify(typhoon_data_list)

            else:

                return jsonify({"message": "未找到台风"}), 404


        else:

            # 如果没有传入 id 参数，返回最新的 10 个台风

            typhoon_history = TyphoonHistory.query.order_by(TyphoonHistory.id.desc()).limit(10).all()

            latest_typhoons = []

            for typhoon in typhoon_history:
                typhoon_data = {

                    'id': typhoon.id,

                    'name': typhoon.name

                }

                latest_typhoons.append(typhoon_data)

            return jsonify(latest_typhoons)

    elif request.method == 'PUT':
        typhoon_data = request.get_json()
        typhoon_id = request.args.get('id')
        typhoon_time = request.args.get('time')
        typhoon = Typhoon.query.filter_by(id=typhoon_id, time=typhoon_time).first()

        if typhoon:
            typhoon.name = typhoon_data['name']
            typhoon.wind_speed = typhoon_data['wind_speed']
            typhoon.intensity = typhoon_data['intensity']
            typhoon.longitude = typhoon_data['longitude']
            typhoon.latitude = typhoon_data['latitude']
            db.session.commit()
            update_history()
            return jsonify({"message": "台风数据已修改", "status": "success"}), 200
        else:
            return jsonify({"message": "未找到台风"}), 404

    elif request.method == 'DELETE':
        typhoon_id = request.args.get('id')
        typhoon_time = request.args.get('time')

        if typhoon_id and typhoon_time:
            typhoon = Typhoon.query.filter_by(id=typhoon_id, time=typhoon_time).first()

            if typhoon:
                db.session.delete(typhoon)
                db.session.commit()
                update_history()
                return jsonify({"message": "台风删除成功", "status": "success"}), 200
            else:
                return jsonify({"message": "未找到台风"}), 404
        else:
            return jsonify({"message": "缺少必须参数"}), 400


@app.route('/search_typhoons', methods=['GET'])
def search_typhoons():
    query = request.args.get('query')
    if query:
        # 使用模糊查询匹配部分ID
        typhoon_history = TyphoonHistory.query.filter(
            or_(
                TyphoonHistory.id.like(f"%{query}%"),
                TyphoonHistory.name.like(f"%{query}%")
            )
        ).all()

        if typhoon_history:
            search_results = []
            for typhoon in typhoon_history:
                typhoon_data = {
                    'id': typhoon.id,
                    'name': typhoon.name
                }
                search_results.append(typhoon_data)
            return jsonify(search_results)
        else:
            return jsonify({"message": "未找到台风"}), 404
    else:
        return jsonify({"message": "缺少必须参数"}), 400


if __name__ == 'main':
    db.create_all()
    app.run(debug=True)
