document.addEventListener("DOMContentLoaded", function () {
    // 初始化 Cesium Viewer
    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGZjOWRmNy0xZmZhLTQxNTMtODUzNS1mZmZlOTdkZWE4MmYiLCJpZCI6MTAxMjI1LCJpYXQiOjE2NTc3OTkwNzF9.oyq_VTv5oVMZ8-n1ZIbOUZrgdn4uDdypRVg2r6JIYbM";
    const viewer = new Cesium.Viewer("cesiumContainer", {
        imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        }),
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
    });
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 获取 HTML 元素
    const historyBtn = document.getElementById("historyBtn");
    const typhoonList = document.getElementById("typhoonList");
    const uploadBtn = document.getElementById("uploadBtn");
    const uploadForm = document.getElementById("uploadForm");
    // const fileInput = document.getElementById("fileInput");
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchInput");
    // 获取历史台风数据并更新下拉列表
    // 获取历史台风数据并更新下拉列表
    function fetchTyphoons() {
        fetch("/typhoons", {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                updateTyphoonList(data);
            });
    }

    // 更新台风下拉列表
    function updateTyphoonList(data) {
        // 清空现有选项
        typhoonList.innerHTML = "";

        // 添加新的台风选项
        data.forEach((typhoon) => {
            const option = document.createElement("option");
            option.value = typhoon.id;
            option.text = `${typhoon.name} (${typhoon.id})`;
            typhoonList.add(option);

        });
    }


    // 搜索台风
    function searchTyphoon(query) {
        // 在这里实现搜索台风的逻辑，根据您的后端实现
        // 假设您已经实现了一个用于搜索台风的API端点，我们可以向该端点发送GET请求
        fetch(`/search_typhoons?query=${query}`, {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                updateTyphoonList(data);
            });
    }

    // 点击搜索按钮时，搜索台风
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value;
        searchTyphoon(query);
    });

    // 点击查看历史台风按钮时，获取台风数据
    historyBtn.addEventListener("click", () => {
        fetchTyphoons();
        $("#historyModal").modal("show");
    });

    // 选择历史台风后，在 Cesium Viewer 中显示台风
    typhoonList.addEventListener("change", (event) => {
        const typhoonId = event.target.value;

        fetch(`/typhoons?id=${typhoonId}`, {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                drawTyphoonPath(data);
            });
    });

    // 绘制台风路径
    function drawTyphoonPath(typhoonData) {
        // 清除现有实体
        viewer.entities.removeAll();
        // 初始化坐标数组
        let coordinates = [];

        // 添加台风路径实体
        typhoonData.forEach((data, index) => {
            // 将当前点的经纬度添加到坐标数组中
            coordinates.push(data.longitude);
            coordinates.push(data.latitude);

            // ... 其他代码
            const hurricaneBillboard = viewer.entities.add({
                id: `hurricane-${data.id}-${index}`,
                position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude),
                billboard: {
                    image: index === typhoonData.length - 1 ? "static/img/hurricane.png" : "static/img/hurricane_inactive.png",
                    width: 64,
                    height: 64,
                    color: Cesium.Color.WHITE,
                    scale: 1.5,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    pixelOffset: new Cesium.Cartesian2(0, 0),
                },
                description: `<table>
                <tr>
                    <th>Name</th>
                    <td>${data.name}</td>
                </tr>
                <tr>
                    <th>Time</th>
                    <td>${data.time}</td>
                </tr>
                <tr>
                    <th>Upload Time</th>
                    <td>${data.upload_time}</td>
                </tr>
                <tr>
                    <th>Wind Speed</th>
                    <td>${data.wind_speed} kt</td>
                </tr>
                <tr>
                    <th>Intensity</th>
                    <td>${data.intensity}</td>
</tr>
<tr>
<th>Latitude</th>
<td>${data.latitude}</td>
</tr>
<tr>
<th>Longitude</th>
<td>${data.longitude}</td>
</tr>
</table>`,
            });
            if (index === typhoonData.length - 1) {
                // 旋转飓风图标
                let rotation = 0;
                viewer.scene.postRender.addEventListener(() => {
                    rotation += 0.01;
                    if (rotation > Cesium.Math.TWO_PI) {
                        rotation -= Cesium.Math.TWO_PI;
                    }
                    hurricaneBillboard.billboard.rotation = rotation;
                });
            }
        });

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction((event) => {
            const pickedObject = viewer.scene.pick(event.position);
            if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
                viewer.selectedEntity = pickedObject.id;
            } else {
                viewer.selectedEntity = undefined;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        // 添加台风轨迹线
        viewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(coordinates),
                width: 3,
                material: Cesium.Color.RED.withAlpha(0.8),
            },
        });
        // 将视图定位到台风路径的最新位置
        const latestTyphoonData = typhoonData[typhoonData.length - 1];
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(latestTyphoonData.longitude, latestTyphoonData.latitude, 1000000)
        });
    }

    // 打开上传台风模态框
    uploadBtn.addEventListener("click", () => {
        $("#uploadModal").modal("show");
    });

    // 处理表单提交
    uploadForm.addEventListener("submit", (event) => {
        event.preventDefault();

        // 获取表单数据
        const typhoonID = document.getElementById("typhoonID").value;
        const typhoonName = document.getElementById("typhoonName").value;
        const typhoonTime = document.getElementById("typhoonTime").value;
        var windSpeed = document.getElementById("windSpeed").value;
        var intensity = document.getElementById("intensity").value;
        const latitude = document.getElementById("latitude").value;
        const longitude = document.getElementById("longitude").value;
        const predictionMethod = document.getElementById("predictionMethod").value;
        const imageInput1 = document.getElementById("imageInput1");
        const imageInput2 = document.getElementById("imageInput2");
        // 类型检查
        if (
            isNaN(typhoonID) ||
            isNaN(windSpeed) ||
            isNaN(latitude) ||
            isNaN(longitude)
        ) {
            alert("ID、风速、强度、经度和纬度必须为数字。");
            return;
        }
        // 创建表单数据对象
        const formData = new FormData();
        formData.append("typhoonID", typhoonID);
        formData.append("typhoonName", typhoonName);
        formData.append("typhoonTime", typhoonTime);
        formData.append("windSpeed", windSpeed);
        formData.append("intensity", intensity)
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("predictionMethod", predictionMethod);

        // 添加图片到表单数据
        if (imageInput1.files.length > 0) {
            const file1 = imageInput1.files[0];
            formData.append("file1", file1);
        }
        if (predictionMethod === "double" && imageInput2.files.length > 0) {
            const file2 = imageInput2.files[0];
            formData.append("file2", file2);
        }

        // 显示加载提示
        const loadingAlert = document.createElement("div");
        loadingAlert.className = "alert alert-info";
        loadingAlert.textContent = "上传中，请稍候...";
        uploadForm.appendChild(loadingAlert);

        // 发送请求
        fetch("/upload_file", {
            method: "POST",
            body: formData
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("台风数据上传成功！");
                    if (data.prediction) {
                        alert("预测结果：" + JSON.stringify(data.prediction));
                        if (data.prediction.wind_speed && data.prediction.wind_speed !== -1) {
                            windSpeed = document.getElementById("windSpeed").value = data.prediction.wind_speed;
                        }
                        if (data.prediction.intensity && data.prediction.intensity !== -1) {
                            intensity = document.getElementById("intensity").value = data.prediction.intensity;
                        }
                        // 在这里添加提交表单数据到数据库的代码
                        const typhoonData = {
                            id: typhoonID,
                            name: typhoonName,
                            time: typhoonTime,
                            wind_speed: windSpeed,
                            intensity: intensity,
                            latitude: latitude,
                            longitude: longitude
                        };

                        fetch("/typhoons", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(typhoonData)
                        })
                            .then((response) => response.json())
                            .then((data) => {
                                if (data.message === "New typhoon added") {
                                    alert("台风数据已成功添加到数据库！");
                                    $("#uploadModal").modal("hide");
                                    uploadForm.reset();
                                } else {
                                    alert("添加台风数据到数据库失败，请重试。");
                                }
                            })
                            .catch((error) => {
                                alert("添加台风数据到数据库失败，请重试。");
                            });
                    }
                    $("#uploadModal").modal("hide");
                    uploadForm.reset();
                } else {
                    alert("上传失败，请重试。");
                }
            })
            .catch((error) => {
                alert("上传失败，请重试。");
            })
            .finally(() => {
                // 移除加载提示
                uploadForm.removeChild(loadingAlert);
            });
    });
});