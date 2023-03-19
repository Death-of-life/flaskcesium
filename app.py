import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
from werkzeug.utils import secure_filename
from typhoon_cnn import detect_image

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


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/admin')
def admin():
    return render_template("admin.html")


@app.route('/upload_file', methods=['POST'])
def upload_file():
    file1 = request.files['file1']
    file2 = request.files['file2']
    prediction_method = request.form.get('prediction_method')

    # 保存图片
    filename1 = secure_filename(file1.filename)
    file1.save(os.path.join(app.config['UPLOAD_FOLDER'], filename1))

    if prediction_method == 'double':
        filename2 = secure_filename(file2.filename)
        file2.save(os.path.join(app.config['UPLOAD_FOLDER'], filename2))

    # 在这里添加您的预测代码
    # ToDo

    # 预测结果示例:
    predicted_intensity = random.uniform(1, 5)
    predicted_wind_speed = random.uniform(30, 60)

    if prediction_method == 'single':
        prediction = {"intensity": predicted_intensity}
    else:
        prediction = {"wind_speed": predicted_wind_speed, "intensity": predicted_intensity}

    return jsonify({"status": "success", "prediction": prediction})


@app.route('/typhoons', methods=['POST', 'GET', 'PUT', 'DELETE'])
def typhoons():
    if request.method == 'POST':
        typhoon_data = request.get_json()

        new_typhoon = Typhoon(
            id=typhoon_data['id'],
            name=typhoon_data['name'],
            time=typhoon_data['time'],
            upload_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            wind_speed=typhoon_data['wind_speed'],
            intensity=typhoon_data['intensity'],
            longitude=typhoon_data['longitude'],
            latitude=typhoon_data['latitude']
        )

        db.session.add(new_typhoon)
        db.session.commit()

        return jsonify({"message": "New typhoon added"}), 201

    elif request.method == 'GET':
        typhoon_id = request.args.get('id')
        typhoon_time = request.args.get('time')

        if typhoon_id and typhoon_time:
            # 如果传入了 id 和 time 参数
            typhoon = Typhoon.query.filter_by(id=typhoon_id, time=typhoon_time).first()

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

                return jsonify(typhoon_data)
            else:
                return jsonify({"message": "Typhoon not found"}), 404
        else:
            # 如果没有传入 id 和 time 参数，返回所有台风
            typhoons = Typhoon.query.all()
            all_typhoons = []

            for typhoon in typhoons:
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
                all_typhoons.append(typhoon_data)

            return jsonify(all_typhoons)

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

                return jsonify({"message": "台风删除成功", "status": "success"}), 200
            else:
                return jsonify({"message": "未找到台风"}), 404
        else:
            return jsonify({"message": "缺少必须参数"}), 400


if __name__ == 'main':
    db.create_all()
    app.run(debug=True)
