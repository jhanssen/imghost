/*global FormData*/

const data = {
    pendingUploads: []
};

function go() {
    const form = document.querySelector(".box");
    ["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach(function(event) {
        form.addEventListener(event, function(e) {
            // preventing the unwanted behaviours
            e.preventDefault();
            e.stopPropagation();
        });
    });
    form.addEventListener("drop", function(e) {
        console.log("dropped", e.dataTransfer.files);
        const preview = document.querySelector(".preview");
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; ++i) {
            let file = files[i];
            var img = document.createElement('img');
            img.onload = function () {
                window.URL.revokeObjectURL(this.src);
            };
            img.height = 100;
            img.src = window.URL.createObjectURL(file);
            preview.append(img);

            data.pendingUploads.push(file);
        }
    });
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("uploading", data.pendingUploads);

        const formdata = new FormData(form);
        for (let i = 0; i < data.pendingUploads.length; ++i) {
            formdata.append("photos", data.pendingUploads[i]);
        }
        const req = new XMLHttpRequest();
        req.open("POST", "/images/upload", true /*async*/);
        req.onload = function() {
            console.log("uploaded");
        };
        req.onerror = function() {
            console.error("error uploading");
        };
        req.send(formdata);
        console.log("ehm");
    });
    console.log("go", form);
}
