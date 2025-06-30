// popup.js

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

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const surveyItems = document.querySelectorAll("a.title");
      const surveyData = [];

      surveyItems.forEach((item, index) => {
        const subjectSpan = item.querySelector("span:nth-child(1)");
        const subjectText = subjectSpan?.textContent?.trim() || "";
        const subjectMatch = subjectText.match(/- (\d+) - (.+)/);
        const subjectCode = subjectMatch ? subjectMatch[1] : "";
        const subjectName = subjectMatch ? subjectMatch[2] : "";

        const dateSpan = item.querySelector("span.date");
        const dateText = dateSpan?.textContent?.trim() || "";
        const dateMatch = dateText.match(
          /Khảo sát Môn học (HK\d) (\d{4}-\d{4})/
        );
        const semester = dateMatch ? dateMatch[1] : "";
        const academicYear = dateMatch ? dateMatch[2] : "";

        const lecturerLabel = item.querySelector("label b");
        const lecturer = lecturerLabel?.textContent?.trim() || "";

        surveyData.push({
          id: index + 1,
          subjectName,
          subjectCode,
          semester,
          academicYear,
          lecturer,
        });
      });

      chrome.runtime.sendMessage({ type: "SURVEY_DATA", data: surveyData });
    },
  });
});

// Sự kiện cho nút "Đánh giá nhanh"
document.getElementById("selectRadio").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
    args: [predefinedValues],
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractAndFillForm,
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const guiBtn = document.getElementById("btnGui");
      if (guiBtn) guiBtn.click();
    },
  });

  const selectedCheckbox = document.querySelector(".survey-checkbox:checked");
  if (selectedCheckbox) {
    const selectedId = parseInt(selectedCheckbox.dataset.id);

    chrome.storage.local.get(["surveyData"], (result) => {
      let currentList = result.surveyData || [];
      const updatedList = currentList.filter((item) => item.id !== selectedId);

      chrome.storage.local.set({ surveyData: updatedList }, () => {
        displaySurveyList(updatedList);
      });
    });
  }
});

function selectMultipleRadioButtons(valueArray) {
  valueArray.forEach((value) => {
    let radios = document.querySelectorAll(
      `input[type="radio"][value="${value}"]`
    );
    radios.forEach((radio) => (radio.checked = true));
  });
}

function displaySurveyList(surveyList) {
  const surveyListElement = document.getElementById("surveyList");
  surveyListElement.innerHTML = "";

  if (surveyList.length === 0) {
    surveyListElement.innerHTML = "<p>Không tìm thấy dữ liệu khảo sát.</p>";
    return;
  }

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

    const checkbox = surveyItem.querySelector(".survey-checkbox");
    checkbox.addEventListener("change", async (e) => {
      if (e.target.checked) {
        document.querySelectorAll(".survey-checkbox").forEach((cb) => {
          if (cb !== e.target) cb.checked = false;
        });

        const departmentInput =
          document.getElementById("departmentInput").value || "";

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
            departmentInput,
            survey.semester,
            survey.academicYear,
          ],
        });
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SURVEY_DATA") {
    const surveyList = message.data;
    chrome.storage.local.set({ surveyData: surveyList }, () => {
      displaySurveyList(surveyList);
    });
  }
});

document.getElementById("clearSurvey").addEventListener("click", () => {
  chrome.storage.local.remove("surveyData", () => {
    displaySurveyList([]);
  });
});

function fillSurveyForm(
  subjectName,
  lecturer,
  subjectCode,
  department,
  semester,
  academicYear
) {
  const fields = {
    LayYKien_3211_3211: subjectName,
    LayYKien_3212_3212: lecturer,
    LayYKien_3215_3215: subjectCode,
    LayYKien_3216_3216: department,
    LayYKien_3219_3219: semester,
    LayYKien_3220_3220: academicYear,
  };

  Object.keys(fields).forEach((fieldId) => {
    const textarea = document.getElementById(fieldId);
    if (textarea) {
      textarea.value = fields[fieldId];
    }
  });
}

function extractAndFillForm() {
  // placeholder nếu bạn cần điền thêm từ surveyList
}
