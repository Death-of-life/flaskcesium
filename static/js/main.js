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
    const fileInput = document.getElementById("fileInput");

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
                const hurricaneBillboard = viewer.entities.add({
                    id: `hurricane-${data.id}`,
                    position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude),
                    billboard: {
                        image: "static/img/hurricane.png",
                        width: 64,
                        height: 64,
                        color: Cesium.Color.WHITE,
                        scale: 1.5,
                        // verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER, // 将纵向原点设置为中心
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER, // 将横向原点设置为中心
                        pixelOffset: new Cesium.Cartesian2(0, 0), // 调整图标的位置，如果需要的话
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
                        </table>
                        `,
                });
                            // 旋转飓风图标
            let rotation = 0;
            viewer.scene.postRender.addEventListener(() => {
                rotation += 0.01;
                if (rotation > Cesium.Math.TWO_PI) {
                    rotation -= Cesium.Math.TWO_PI;
                }
                hurricaneBillboard.billboard.rotation = rotation;
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

    const formData = new FormData(uploadForm);
    const file = fileInput.files[0];
    formData.append("file", file);

    fetch("/upload_file", {
        method: "POST",
        body: formData
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
// 打开上传台风模态框
uploadBtn.addEventListener("click", () => {
    $("#uploadModal").modal("show");
});

// 处理表单提交
uploadForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(uploadForm);
    const file = fileInput.files[0];
    formData.append("file", file);

    fetch("/upload_file", {
        method: "POST",
        body: formData
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