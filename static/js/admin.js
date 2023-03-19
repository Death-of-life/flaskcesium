document.addEventListener("DOMContentLoaded", function () {
    const fetchTyphoonsBtn = document.getElementById("fetchTyphoons");
    const typhoonTableBody = document.getElementById("typhoonTable").querySelector("tbody");

    function fetchTyphoons() {
        fetch("/typhoons", {
            method: "GET"
        })
            .then((response) => response.json())
            .then((data) => {
                // 清空现有表格数据
                typhoonTableBody.innerHTML = "";

                // 添加新的台风数据到表格
                data.forEach((typhoon) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${typhoon.id}</td>
                        <td>${typhoon.name}</td>
                        <td>${typhoon.time}</td>
                        <td>${typhoon.wind_speed}</td>
                        <td>${typhoon.intensity}</td>
                        <td>${typhoon.latitude}</td>
                        <td>${typhoon.longitude}</td>
                        <td>
                            <button class="btn btn-warning btn-sm editBtn" data-typhoon-id="${typhoon.id}" data-typhoon-time="${typhoon.time}">编辑</button>
                        </td>
                        <td>
                            <button class="btn btn-danger btn-sm deleteBtn" data-typhoon-id="${typhoon.id}" data-typhoon-time="${typhoon.time}">删除</button>
                        </td>
                    `;
                    typhoonTableBody.appendChild(row);
                });

                // 为删除按钮添加点击事件
                typhoonTableBody.querySelectorAll(".deleteBtn").forEach((deleteBtn) => {
                    deleteBtn.addEventListener("click", (event) => {
                        const typhoonId = event.target.getAttribute("data-typhoon-id");
                        const typhoonTime = event.target.getAttribute("data-typhoon-time");
                        deleteTyphoon(typhoonId, typhoonTime);
                    });
                });

                // 为编辑按钮添加点击事件
                typhoonTableBody.querySelectorAll(".editBtn").forEach((editBtn) => {
                    editBtn.addEventListener("click", (event) => {
                        const typhoon = event.target.closest("tr").querySelectorAll("td");
                        const typhoonId = event.target.getAttribute("data-typhoon-id");
                        const typhoonTime = event.target.getAttribute("data-typhoon-time");
                        document.getElementById("editTyphoonId").value = typhoonId;
                        document.getElementById("editTyphoonTime").value = typhoonTime;
                        editTyphoon(typhoon, typhoonTime);
                    });
                });
            });
    }

    function addTyphoon() {
        // 此处添加添加台风数据的逻辑
    }

    function editTyphoon(typhoon) {
        // 填充表单字段
        //ToDo 1. 为什么这里的typhoon[0]是undefined 2.添加更多可编辑字段
        // 填充表单字段
        // document.getElementById("editTyphoonId").value = typhoon.id;
        // document.getElementById("editTyphoonTime").value = typhoon.time;
        document.getElementById("editTyphoonName").value = typhoon.name;
        document.getElementById("editLatitude").value = typhoon.latitude;
        document.getElementById("editLongitude").value = typhoon.longitude;
        document.getElementById("editWindSpeed").value = typhoon.wind_speed;
        document.getElementById("editIntensity").value = typhoon.intensity;

        // 显示模态框
        $("#editTyphoonModal").modal("show");
    }

    // 处理编辑台风表单提交
    document.getElementById("editTyphoonForm").addEventListener("submit", (event) => {
        event.preventDefault();

        // 从表单中获取更新后的数据
        const typhoonId = document.getElementById("editTyphoonId").value;
        const typhoonTime = document.getElementById("editTyphoonTime").value;
        const typhoonName = document.getElementById("editTyphoonName").value === "" ? "未修改" : document.getElementById("editTyphoonName").value;
        const typhoonLatitude = document.getElementById("editLatitude").value === "" ? "未修改" : parseFloat(document.getElementById("editLatitude").value);
        const typhoonLongitude = document.getElementById("editLongitude").value === "" ? "未修改" : parseFloat(document.getElementById("editLongitude").value);
        const typhoonWindSpeed = document.getElementById("editWindSpeed").value === "" ? "未修改" : parseInt(document.getElementById("editWindSpeed").value);
        const typhoonIntensity = document.getElementById("editIntensity").value === "" ? "未修改" : document.getElementById("editIntensity").value;
        // Add more fields as needed

        // 将更新后的数据发送到服务器
        fetch(`/typhoons?id=${typhoonId}&time=${typhoonTime}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: typhoonName,
                latitude: parseFloat(typhoonLatitude),
                longitude: parseFloat(typhoonLongitude),
                wind_speed: parseInt(typhoonWindSpeed),
                intensity: typhoonIntensity
                // Add more fields as needed
            })
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    // 更新成功，关闭模态框并刷新台风数据
                    $("#editTyphoonModal").modal("hide");
                    fetchTyphoons();
                } else {
                    alert("更新失败，请重试。");
                }
            });
    });

    function deleteTyphoon(typhoonId, typhoonTime) {
        fetch(`/typhoons?id=${typhoonId}&time=${typhoonTime}`, {
            method: "DELETE"
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("台风数据删除成功！");
                    fetchTyphoons();
                } else {
                    alert("删除失败，请重试。");
                }
            });
    }

    fetchTyphoonsBtn.addEventListener("click", fetchTyphoons);
});
