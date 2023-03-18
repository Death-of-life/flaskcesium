document.addEventListener("DOMContentLoaded", function () {
    // 初始化 Cesium Viewer
    const viewer = new Cesium.Viewer("cesiumContainer", {
        imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        }),
        baseLayerPicker: false,
    });

    // 获取 HTML 元素
    const historyBtn = document.getElementById("historyBtn");
    const typhoonList = document.getElementById("typhoonList");
    const uploadBtn = document.getElementById("uploadBtn");
    const uploadForm = document.getElementById("uploadForm");

    // 获取历史台风数据并更新下拉列表
    function fetchTyphoons() {
        fetch("/get_typhoons")
            .then((response) => response.json())
            .then((data) => {
                // 清空现有选项
                typhoonList.innerHTML = "";

                // 添加新的台风选项
                data.forEach((typhoon) => {
                    const option = document.createElement("option");
                    option.value = typhoon.id;
                    option.text = `${typhoon.name} (${typhoon.time})`;
                    typhoonList.add(option);
                });
            });
    }

    // 点击查看历史台风按钮时，获取台风数据
    historyBtn.addEventListener("click", fetchTyphoons);

    // 选择历史台风后，在 Cesium Viewer 中显示台风
    typhoonList.addEventListener("change", (event) => {
        const typhoonId = event.target.value;

        fetch(`/get_typhoon/${typhoonId}`)
            .then((response) => response.json())
            .then((data) => {
                // 清除现有实体
                viewer.entities.removeAll();

                // 添加台风实体
                viewer.entities.add({
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
                });

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
            name: document.getElementById("typhoonName").value,
            time: document.getElementById("typhoonTime").value,
            wind_speed: document.getElementById("windSpeed").value,
            latitude: document.getElementById("latitude").value,
            longitude: document.getElementById("longitude").value,
        };

        fetch("/add_typhoon", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(typhoonData),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    // 隐藏模态框
                    $("#uploadModal").modal("hide");
                    // 清空表单
                    uploadForm.reset();
                    // 提示成功信息
                    alert("台风数据已成功上传！");
                } else {
                    // 提示错误信息
                    alert("上传失败，请稍后重试。");
                }
            });
    });
});
