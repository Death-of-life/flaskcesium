document.addEventListener("DOMContentLoaded", function () {
    // 初始化 Cesium Viewer
    const viewer = new Cesium.Viewer("cesiumContainer", {
        imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        }),
        baseLayerPicker: false,

    });
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    // 获取 HTML 元素
    const historyBtn = document.getElementById("historyBtn");
    const typhoonList = document.getElementById("typhoonList");
    const uploadBtn = document.getElementById("uploadBtn");
    const uploadForm = document.getElementById("uploadForm");

    // 获取历史台风数据并更新下拉列表
    function fetchTyphoons() {
        fetch("/typhoons", {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                // 清空现有选项
                typhoonList.innerHTML = "";

                // 添加新的台风选项
                data.forEach((typhoon) => {
                    const option = document.createElement("option");
                    option.value = JSON.stringify({id: typhoon.id, time: typhoon.time});
                    option.text = `${typhoon.name} (${typhoon.time})`;
                    typhoonList.add(option);
                });
            });
    }

    // 点击查看历史台风按钮时，获取台风数据
    historyBtn.addEventListener("click", () => {
        fetchTyphoons();
        $("#historyModal").modal("show");
    });

    // 选择历史台风后，在 Cesium Viewer 中显示台风
    typhoonList.addEventListener("change", (event) => {
        const typhoonData = JSON.parse(event.target.value);
        const typhoonId = typhoonData.id;
        const typhoonTime = typhoonData.time;

        fetch(`/typhoons?id=${typhoonId}&time=${typhoonTime}`, {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                // 清除现有实体
                viewer.entities.removeAll();

                // 添加台风实体
                viewer.entities.add({
                    id: data.id, // 添加此行以将数据 ID 设置为实体 ID
                    position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude),
                    point: {
                        pixelSize: 10,
                        color: Cesium.Color.RED,
                    },
                    label: {
                        text: data.name,
                        font: "14px sans-serif",
                        fillColor: Cesium.Color.BLACK,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -9),
                    },
                    description: `
                        <table>
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
                                <td>${data.wind_speed} km/h</td>
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
                        </table>
                    `,
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
                // 将视图定位到台风位置
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 1000000)
                });
            });
    });


    // 打开上传台风模态框
    uploadBtn.addEventListener("click", () => {
        $("#uploadModal").modal("show");
    });

    // 处理表单提交
    uploadForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const typhoonData = {
            id: Date.now().toString(),
            name: document.getElementById("typhoonName").value,
            time: document.getElementById("typhoonTime").value,
            wind_speed: document.getElementById("windSpeed").value,
            intensity: "未知",
            latitude: parseFloat(document.getElementById("latitude").value),
            longitude: parseFloat(document.getElementById("longitude").value),
        };    // 提交台风数据
        fetch("/typhoons", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(typhoonData)
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("台风数据上传成功！");
                    $("#uploadModal").modal("hide");
                    uploadForm.reset();
                } else {
                    alert("上传失败，请重试。");
                }
            });
    });
});
