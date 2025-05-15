// Tải dữ liệu khảo sát đã lưu khi popup mở
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["surveyData"], (result) => {
    const surveyList = result.surveyData || [];
    displaySurveyList(surveyList);
  });
});

// Sự kiện cho nút "Hiển thị khảo sát"
document.getElementById("showSurvey").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Thực thi script để trích xuất dữ liệu khảo sát
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const surveyItems = document.querySelectorAll("a.title");
      const surveyData = [];

      surveyItems.forEach((item, index) => {
        // Trích xuất mã môn học và tên môn học
        const subjectSpan = item.querySelector("span:nth-child(1)");
        const subjectText = subjectSpan?.textContent?.trim() || "";
        const subjectMatch = subjectText.match(/- (\d+) - (.+)/);
        const subjectCode = subjectMatch ? subjectMatch[1] : "";
        const subjectName = subjectMatch ? subjectMatch[2] : "";

        // Trích xuất học kỳ và năm học
        const dateSpan = item.querySelector("span.date");
        const dateText = dateSpan?.textContent?.trim() || "";
        const dateMatch = dateText.match(
          /Khảo sát Môn học (HK\d) (\d{4}-\d{4})/
        );
        const semester = dateMatch ? dateMatch[1] : "";
        const academicYear = dateMatch ? dateMatch[2] : "";

        // Trích xuất giảng viên
        const lecturerLabel = item.querySelector("label b");
        const lecturer = lecturerLabel?.textContent?.trim() || "";

        // Thêm vào mảng dữ liệu
        surveyData.push({
          id: index + 1,
          subjectName,
          subjectCode,
          semester,
          academicYear,
          lecturer,
        });
      });

      // Gửi dữ liệu khảo sát về background
      chrome.runtime.sendMessage({ type: "SURVEY_DATA", data: surveyData });
    },
  });
});

document.getElementById("selectRadio").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Danh sách giá trị radio cần chọn (Đánh giá)
  let predefinedValues = [
    "13525",
    "13524",
    "13526",
    "13527",
    "13528",
    "13529",
    "13530",
    "13531",
    "13532",
    "13533",
    "13534",
    "13535",
    "13536",
    "13537",
    "13538",
    "13539",
    "13540",
    "13541",
    "13546",
    "13551",
  ];

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: selectMultipleRadioButtons,
    args: [predefinedValues], // Truyền danh sách giá trị vào hàm bên dưới
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractAndFillForm,
  });
});

function selectMultipleRadioButtons(valueArray) {
  valueArray.forEach((value) => {
    let radios = document.querySelectorAll(
      `input[type="radio"][value="${value}"]`
    );
    radios.forEach((radio) => (radio.checked = true));
  });
}

// Hàm hiển thị danh sách khảo sát
function displaySurveyList(surveyList) {
  const surveyListElement = document.getElementById("surveyList");
  surveyListElement.innerHTML = ""; // Xóa nội dung cũ

  if (surveyList.length === 0) {
    surveyListElement.innerHTML = "<p>Không tìm thấy dữ liệu khảo sát.</p>";
    return;
  }

  // Tạo danh sách khảo sát
  surveyList.forEach((survey) => {
    const surveyItem = document.createElement("div");
    surveyItem.className = "survey-item";
    surveyItem.innerHTML = `
      <div class="survey-header">
        <input type="checkbox" class="survey-checkbox" data-id="${survey.id}">
        <h4>${survey.id}. ${survey.subjectName}</h4>
      </div>
      <p><strong>Mã môn học:</strong> ${survey.subjectCode}</p>
      <p><strong>Giảng viên:</strong> ${survey.lecturer}</p>
      <p><strong>Học kỳ:</strong> ${survey.semester}</p>
      <p><strong>Năm học:</strong> ${survey.academicYear}</p>
    `;
    surveyListElement.appendChild(surveyItem);

    // Thêm sự kiện cho checkbox
    const checkbox = surveyItem.querySelector(".survey-checkbox");
    checkbox.addEventListener("change", async (e) => {
      if (e.target.checked) {
        // Bỏ chọn các checkbox khác
        document.querySelectorAll(".survey-checkbox").forEach((cb) => {
          if (cb !== e.target) cb.checked = false;
        });

        // Lấy giá trị "Khoa" từ ô nhập liệu
        const departmentInput =
          document.getElementById("departmentInput").value || "";

        // Điền dữ liệu vào trang
        let [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: fillSurveyForm,
          args: [
            survey.subjectName,
            survey.lecturer,
            survey.subjectCode,
            departmentInput, // Giá trị Khoa từ ô nhập liệu
            survey.semester,
            survey.academicYear,
          ],
        });
      }
    });
  });
}

// Nhận dữ liệu từ background và hiển thị trên popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SURVEY_DATA") {
    const surveyList = message.data;
    // Lưu dữ liệu vào chrome.storage.local
    chrome.storage.local.set({ surveyData: surveyList }, () => {
      displaySurveyList(surveyList);
    });
  }
});

// Sự kiện cho nút "Xóa danh sách"
document.getElementById("clearSurvey").addEventListener("click", () => {
  // Xóa dữ liệu khỏi chrome.storage.local
  chrome.storage.local.remove("surveyData", () => {
    // Hiển thị lại danh sách trống
    displaySurveyList([]);
  });
});

// Hàm điền dữ liệu vào form khảo sát
function fillSurveyForm(
  subjectName,
  lecturer,
  subjectCode,
  department,
  semester,
  academicYear
) {
  const fields = {
    LayYKien_3211_3211: subjectName, // Tên môn học
    LayYKien_3212_3212: lecturer, // Giảng viên
    LayYKien_3215_3215: subjectCode, // Mã môn học
    LayYKien_3216_3216: department, // Khoa
    LayYKien_3219_3219: semester, // Học kỳ
    LayYKien_3220_3220: academicYear, // Năm học
  };

  Object.keys(fields).forEach((fieldId) => {
    const textarea = document.getElementById(fieldId);
    if (textarea) {
      textarea.value = fields[fieldId];
    }
  });
}
